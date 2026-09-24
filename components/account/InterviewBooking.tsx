"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  addDays,
  addMonths,
  minOf,
  monthCells,
  monthOf,
  monthText,
  today,
  weekdayKo,
  WEEK_KO,
} from "@/lib/calendar";
import {
  attachOrder,
  bookMany,
  cancelBooking,
  hasRoomOn,
  inWindow,
  LEAD_DAYS,
  MAX_SLOTS,
  slotsOf,
  useBookings,
  WINDOW_DAYS,
  type Booking,
} from "@/lib/counselStore";
import {
  blankQuery,
  counselModes,
  counselorOf,
  counselTopics,
  feeOf,
  filterCounselors,
  isFiltered,
  spanLabel,
  topicList,
  counselors as allCounselors,
  type CounselMode,
  type Counselor,
  type CounselQuery,
  type Span,
} from "@/lib/counselors";
import { orderMethods, orderWon, placeOrder, useOrders, type OrderMethod } from "@/lib/orderStore";
import { useHydrated } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { useSession } from "@/lib/authStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import { eyebrow } from "@/components/exam/ui";
import Toast from "@/components/exam/Toast";
import ConfirmDialog from "./ConfirmDialog";
import CounselorCard, { CounselorDetail } from "./CounselorCard";
import { card, listTd, listTh } from "./ui";

/**
 * 면담 예약 (/my/interviews) — 결과 해석 면담을 보호자가 직접 잡고 결제한다.
 *
 * 차례는 **상담사 → 날짜 → 시각 → 결제**다. 누구와 이야기하는가가 먼저다 — 결과지를 놓고
 * 한 시간을 나누는 자리라, 시각이 맞는다고 아무 전문가나 만나게 할 수 없다. 사람이
 * 정해지면 달력도 시간표도 그 사람 것 하나뿐이라 그 뒤 걸음이 단순해진다.
 *
 * ── 마흔 명을 앞에 두고 ──
 * 확정 명단은 마흔 명이다. 카드를 마흔 장 세우면 보호자는 맨 위 셋만 보고 고른다. 그래서
 * 목록에 **고르개**(무엇을 물으러 왔나 · 어떻게 만나나 · 얼마나 이야기하나)와 「더 보기」를
 * 먼저 세웠다 — 일곱일 때 필요해서가 아니라 마흔이 되었을 때 화면을 다시 짜지 않으려고.
 *
 * ── 길이는 사람마다 다르다 ──
 * 30분만 받는 이, 60분만 받는 이, 둘 다 받는 이가 있다(lib/counselors.ts의 spans). 그래서
 * 길이 고르개는 사람 **다음**에 선다. 앞에 두면 고를 수 없는 길이를 먼저 고르게 된다.
 *
 * ── 한 번에 여러 자리 ──
 * 30분 두 칸, 60분 두 칸처럼 여러 자리를 한 번에 잡는다. 자리마다 예약 한 줄이 서고
 * 결제는 한 건으로 묶인다(orderId). 겹치는 시각은 고를 수 없고, 넷을 넘기면 전화로
 * 받는 편이 빠르다(MAX_SLOTS).
 *
 * ── 돈은 자리를 확보한 다음에 ──
 * 자리를 먼저 잡고(bookMany) 결제를 적은 뒤(placeOrder) 둘을 잇는다(attachOrder). 결제부터
 * 적으면 그 찰나에 다른 탭이 같은 칸을 가져갔을 때 자리 없는 영수증이 남는다.
 *
 * ⚠ 여기서 잡는 것은 **보호자가 신청하는 해석 면담**이다. 판정이 경계선에 선 사례를
 *   전문가가 불러 확인하는 면담(EXP-06)은 우리가 대상을 고르는 일이라 이 화면에 없다.
 * ⚠ 시연 화면이라 실제 결제창은 열리지 않고 카드번호 같은 결제 정보도 받지 않는다.
 */

const modeNote: Record<CounselMode, string> = {
  video: "신청 확정 뒤 화상 링크를 문자로 보내 드립니다.",
  phone: "예약한 시각에 등록하신 번호로 전화를 드립니다.",
  onsite: "장소는 확정 안내에 함께 적어 보내 드립니다.",
};

const methodOrder: OrderMethod[] = ["card", "kakao", "naver", "transfer"];

/** 한 번에 펼치는 카드 수 — 나머지는 「더 보기」로 잇는다 */
const PER_PAGE = 4;

/** 고르개 알약 */
function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
        on
          ? "border-soft-primary bg-soft-primary text-white"
          : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
      }`}
    >
      {children}
    </button>
  );
}

export default function InterviewBooking({
  /**
   * 결제 화면의 면담 차림표에서 길이를 들고 넘어온다(/my/interviews?span=60).
   * 고르개의 길이 조건으로 놓는다 — 그 길이를 받지 않는 전문가는 목록에 서지 않는다.
   */
  initialSpan,
  variant = 2,
}: {
  initialSpan?: Span;
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const bookings = useBookings();
  const orders = useOrders();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () => roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg],
  );

  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState<CounselQuery>(() => ({
    ...blankQuery(),
    span: initialSpan ?? 0,
  }));
  const [shown, setShown] = useState(PER_PAGE);
  const [counselorId, setCounselorId] = useState("");
  const [span, setSpan] = useState<Span>(30);
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [starts, setStarts] = useState<string[]>([]);
  const [mode, setMode] = useState<CounselMode | "">("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<OrderMethod>("card");
  const [agree, setAgree] = useState(false);
  const [detail, setDetail] = useState<Counselor | null>(null);
  const [done, setDone] = useState<{ rows: Booking[]; orderId: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<Booking | null>(null);

  /* 오늘은 하이드레이션이 끝난 뒤에만 읽는다 — 서버가 그린 달력과 갈리면 칸이 흔들린다 */
  const now = hydrated ? today() : "";
  /* 처음 펴는 달은 이번 달이 아니라 **가장 이른 날이 든 달**이다. 달 말에 이번 달을 펴면
     고를 수 있는 칸이 하나도 없는 달력이 먼저 보인다 */
  const ym = month || (now ? monthOf(addDays(now, LEAD_DAYS)) : "");

  const student = mine.find((s) => s.id === studentId) ?? (mine.length === 1 ? mine[0] : null);
  const counselor = counselorId ? counselorOf(counselorId) : null;

  const found = useMemo(() => filterCounselors(allCounselors, query), [query]);
  const slots = date && counselor ? slotsOf(bookings, counselor, date, span) : [];

  const unit = feeOf(span);
  const total = unit * starts.length;
  const ready = !!student && !!counselor && !!date && starts.length > 0 && !!mode && agree;

  /* 고르개를 건드리면 접힌 목록을 처음으로 되돌린다 — 조건을 좁혔는데 「더 보기」가
     눌린 채로 남아 있으면 몇 명이 걸렸는지가 눈에 안 들어온다 */
  const patchQuery = (patch: Partial<CounselQuery>) => {
    setQuery((v) => ({ ...v, ...patch }));
    setShown(PER_PAGE);
  };

  /* 걸음을 되돌릴 때 아래를 지운다 */
  const pickCounselor = (c: Counselor) => {
    setCounselorId(c.id);
    /* 길이·방식은 그 사람이 받는 것 가운데 첫째로 맞춘다. 고르개에서 길이를 이미 좁혀
       두었으면 그것을 그대로 쓴다 — 30분으로 찾아 놓고 60분 달력이 열리면 안 된다 */
    setSpan(query.span && c.spans.includes(query.span) ? query.span : c.spans[0]);
    setMode(c.modes[0]);
    setDate("");
    setStarts([]);
  };
  const pickSpan = (v: Span) => {
    setSpan(v);
    setStarts([]);
  };
  const pickDate = (v: string) => {
    setDate(v);
    setStarts([]);
  };

  /** 시각 하나를 켜고 끈다 — 겹치는 자리와 넷 넘김은 여기서 막는다 */
  function toggleStart(v: string) {
    setStarts((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (prev.length >= MAX_SLOTS) {
        setToast(`한 번에 ${MAX_SLOTS}자리까지 잡으실 수 있습니다.`);
        return prev;
      }
      /* 60분을 고르면 14:00과 14:30이 서로 겹친다. 눈금이 30분이라 화면만 보고는 모른다 */
      if (prev.some((x) => Math.abs(minOf(x) - minOf(v)) < span)) {
        setToast("앞서 고른 시간과 겹칩니다.");
        return prev;
      }
      return [...prev, v].sort();
    });
  }

  function submit() {
    if (!student || !counselor || !mode || starts.length === 0) return;

    /* ① 자리부터 잡는다 */
    const rows = bookMany(
      {
        studentId: student.id,
        studentName: student.name,
        counselorId: counselor.id,
        date,
        span,
        mode,
        note: note.trim(),
      },
      starts,
    );
    if (!rows) {
      setToast("방금 그 시간이 마감되었습니다. 시간을 다시 골라 주세요.");
      setStarts([]);
      return;
    }

    /* ② 잡힌 뒤에 결제를 적고 ③ 둘을 잇는다 */
    const order = placeOrder({
      productId: `CS-${span}`,
      productName: `결과 해석 면담 ${spanLabel(span)} · ${counselor.person.name} 전문가`,
      grantsTicket: false,
      students: [{ id: student.id, name: student.name }],
      unit,
      qty: rows.length,
      method,
    });
    attachOrder(
      rows.map((r) => r.id),
      order.id,
    );
    setDone({ rows, orderId: order.id });
  }

  function reset() {
    setDone(null);
    setCounselorId("");
    setDate("");
    setStarts([]);
    setMode("");
    setNote("");
    setAgree(false);
  }

  const live = bookings.filter((b) => b.state === "booked");
  const paidOrder = done ? (orders.find((o) => o.id === done.orderId) ?? null) : null;

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>결과 해석 면담</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          면담
        </h1>
        <p className={`mt-2 text-[13px] leading-[1.7] ${t.muted}`}>
          결과지를 함께 읽는 자리입니다. 전문가를 고르시면 그분의 달력과 시간표가 열리고, 시간을
          고르신 뒤 결제하시면 예약이 확정됩니다. 30분 · 60분 자리를 한 번에 여러 개 잡으실 수
          있습니다. 전문가가 결과지를 미리 읽고 들어오므로 신청일로부터 {LEAD_DAYS}일 뒤부터{" "}
          {WINDOW_DAYS}일 안에서 잡으실 수 있습니다.
        </p>
      </header>

      {done && paidOrder ? (
        <section className={`${card} p-7 text-center sm:p-9`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[20px] font-bold text-soft-ink">
            결제가 끝나고 면담이 확정되었습니다
          </h2>
          <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
            {done.rows[0].studentName} 학생 ·{" "}
            {counselorOf(done.rows[0].counselorId)?.person.name ?? "담당 전문가"} 전문가 ·{" "}
            {counselModes[done.rows[0].mode]} 면담
            <br />
            {done.rows.map((r) => (
              <span key={r.id} className="block tabular-nums">
                {r.date.replace(/-/g, ".")}({weekdayKo(r.date)}) {r.start} · {spanLabel(r.span)}
              </span>
            ))}
          </p>
          <p className="mt-3 text-[13px] text-soft-ink">
            주문번호 <b className="tabular-nums">{paidOrder.id}</b> · {orderWon(paidOrder.amount)}{" "}
            결제
          </p>
          <p className="mt-2 text-[12.5px] text-soft-muted">{modeNote[done.rows[0].mode]}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button type="button" onClick={reset} className={t.btnAction}>
              다른 면담 신청하기
            </button>
            <Link href="/my" className={t.btnOutline}>
              홈으로
            </Link>
          </div>
        </section>
      ) : mine.length === 0 ? (
        <section className={`${card} px-5 py-14 text-center`}>
          <p className="text-[15px] font-bold text-soft-ink">아직 등록된 학생이 없습니다</p>
          <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
            면담은 학생 한 명의 결과지를 놓고 나누는 자리입니다. 학생을 먼저 등록해 주세요.
          </p>
          <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
            등록하러 가기
          </Link>
        </section>
      ) : (
        <>
          {/* ① 학생 — 한 명뿐이면 고를 것이 없으므로 그대로 잡힌다 */}
          {mine.length > 1 && (
            <section className="mb-8">
              <SectionTitle note="이 아이의 결과지를 놓고 이야기합니다.">면담할 학생</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {mine.map((s) => {
                  const on = student?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      aria-pressed={on}
                      className={`rounded-full border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                        on
                          ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                          : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                      }`}
                    >
                      {s.name}
                      {s.grade && (
                        <span className="ml-1.5 text-[12px] font-medium">{s.grade}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ② 상담 전문가 — 고르개로 좁히고 카드에서 고른다 */}
          <section>
            <SectionTitle
              note="무엇을 물으러 오셨는지로 좁히실 수 있습니다."
              right={
                isFiltered(query) && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(blankQuery());
                      setShown(PER_PAGE);
                    }}
                    className="text-[13px] font-semibold text-soft-primary hover:underline"
                  >
                    조건 지우기
                  </button>
                )
              }
            >
              상담 전문가
            </SectionTitle>

            <div className={`${card} p-4 sm:p-5`}>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query.q}
                  onChange={(e) => patchQuery({ q: e.target.value })}
                  placeholder="이름 · 직함 · 분야로 찾기"
                  aria-label="전문가 찾기"
                  className="h-[3rem] w-full rounded-[12px] border border-soft-line bg-white pl-10 pr-4 text-[14px] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft"
                />
              </div>

              <div className="mt-3 space-y-2.5">
                <Row label="주제">
                  {topicList.map((v) => (
                    <Chip
                      key={v}
                      on={query.topic === v}
                      onClick={() => patchQuery({ topic: query.topic === v ? "" : v })}
                    >
                      {counselTopics[v]}
                    </Chip>
                  ))}
                </Row>
                <Row label="방식">
                  {(Object.keys(counselModes) as CounselMode[]).map((v) => (
                    <Chip
                      key={v}
                      on={query.mode === v}
                      onClick={() => patchQuery({ mode: query.mode === v ? "" : v })}
                    >
                      {counselModes[v]}
                    </Chip>
                  ))}
                </Row>
                <Row label="길이">
                  {([30, 60] as Span[]).map((v) => (
                    <Chip
                      key={v}
                      on={query.span === v}
                      onClick={() => patchQuery({ span: query.span === v ? 0 : v })}
                    >
                      {spanLabel(v)}
                    </Chip>
                  ))}
                </Row>
              </div>
            </div>

            <p className="mb-2.5 mt-3 text-[13px] text-soft-muted">
              전체 {allCounselors.length}명 중 <b className="text-soft-ink">{found.length}명</b>
              {counselor && (
                <span className="ml-2 font-semibold text-soft-primary">
                  {counselor.person.name} 전문가 선택
                </span>
              )}
            </p>

            {found.length === 0 ? (
              <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                조건에 맞는 전문가가 없습니다. 조건을 하나 지워 보세요.
              </p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {found.slice(0, shown).map((c) => (
                    <li key={c.id}>
                      <CounselorCard
                        c={c}
                        selected={counselorId === c.id}
                        onSelect={() => pickCounselor(c)}
                        onDetail={() => setDetail(c)}
                      />
                    </li>
                  ))}
                </ul>
                {found.length > shown && (
                  <button
                    type="button"
                    onClick={() => setShown((v) => v + PER_PAGE)}
                    className={`${t.btnQuiet} mt-3 w-full`}
                  >
                    더 보기 ({found.length - shown}명)
                  </button>
                )}
              </>
            )}
          </section>

          {/* ③ 날짜 — 고른 전문가의 달력 */}
          {counselor && (
            <section className="mt-8">
              <SectionTitle
                note="회색 날짜는 이 전문가가 면담을 받지 않거나 자리가 다 찬 날입니다."
                right={
                  <div className="flex items-center gap-1.5">
                    {counselor.spans.map((v) => (
                      <Chip key={v} on={span === v} onClick={() => pickSpan(v)}>
                        {spanLabel(v)} {orderWon(feeOf(v))}
                      </Chip>
                    ))}
                  </div>
                }
              >
                날짜
              </SectionTitle>

              {counselor.spans.length === 1 && (
                <p className="mb-2.5 text-[12.5px] text-soft-muted">
                  {counselor.person.name} 전문가는 {spanLabel(counselor.spans[0])} 면담만 받습니다.
                </p>
              )}

              <div className={`${card} p-4 sm:p-5`}>
                {!hydrated ? (
                  <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-center gap-5">
                      <button
                        type="button"
                        onClick={() => setMonth(addMonths(ym, -1))}
                        aria-label="이전 달"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-soft-muted transition-colors hover:bg-slate-100"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </button>
                      <p className="text-[15px] font-bold tabular-nums text-soft-ink">
                        {monthText(ym)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMonth(addMonths(ym, 1))}
                        aria-label="다음 달"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-soft-muted transition-colors hover:bg-slate-100"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEK_KO.map((w, i) => (
                        <p
                          key={w}
                          className={`py-1.5 text-[12px] font-semibold ${
                            i === 0 ? "text-rose-500" : "text-soft-muted"
                          }`}
                        >
                          {w}
                        </p>
                      ))}

                      {monthCells(ym).map((d) => {
                        const other = monthOf(d) !== ym;
                        const open =
                          !other && inWindow(d, now) && hasRoomOn(bookings, counselor, d, span);
                        const on = d === date;
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={!open}
                            onClick={() => pickDate(d)}
                            aria-pressed={on}
                            className={`flex h-11 items-center justify-center rounded-[10px] text-[13.5px] tabular-nums transition-colors ${
                              on
                                ? "bg-soft-primary font-bold text-white"
                                : open
                                  ? "font-semibold text-soft-ink hover:bg-soft-primary-soft"
                                  : other
                                    ? "text-transparent"
                                    : "text-slate-300"
                            }`}
                          >
                            {Number(d.slice(8))}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ④ 시간 — 여러 자리를 고를 수 있다. 찬 자리는 잠근 채로 보인다 */}
          {counselor && date && (
            <section className="mt-8">
              <SectionTitle
                note={`흐린 시간은 이미 예약된 자리입니다. ${MAX_SLOTS}자리까지 한 번에 고르실 수 있습니다.`}
                right={
                  starts.length > 0 && (
                    <span className="text-[13px] font-semibold text-soft-primary">
                      {starts.length}자리 선택
                    </span>
                  )
                }
              >
                {date.slice(5).replace("-", "월 ")}일({weekdayKo(date)}) · {spanLabel(span)}
              </SectionTitle>

              {slots.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  이 날은 면담을 받지 않는 날입니다. 다른 날을 골라 주세요.
                </p>
              ) : (
                <div className={`${card} space-y-4 p-4 sm:p-5`}>
                  {(
                    [
                      ["오전", slots.filter((v) => v.start < "12:00")],
                      ["오후", slots.filter((v) => v.start >= "12:00")],
                    ] as const
                  ).map(([label, list]) =>
                    list.length === 0 ? null : (
                      <div key={label}>
                        <p className="mb-2 text-[12.5px] font-semibold text-soft-muted">{label}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                          {list.map((v) => {
                            const on = starts.includes(v.start);
                            return (
                              <button
                                key={v.start}
                                type="button"
                                disabled={!v.open}
                                onClick={() => toggleStart(v.start)}
                                aria-pressed={on}
                                /* 잠긴 칸에도 「예약 완료」를 붙여 준다 — 흐린 것만으로는
                                   화면을 읽어 주는 장치에 아무것도 남지 않는다 */
                                aria-label={v.open ? v.start : `${v.start} 예약 완료`}
                                className={`rounded-[10px] border py-2.5 text-[13.5px] font-semibold tabular-nums transition-colors ${
                                  on
                                    ? "border-soft-primary bg-soft-primary text-white"
                                    : v.open
                                      ? "border-soft-line bg-white text-soft-ink hover:border-soft-primary"
                                      : "cursor-not-allowed border-transparent bg-slate-50 text-slate-300 line-through"
                                }`}
                              >
                                {v.start}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                  {slots.every((v) => !v.open) && (
                    <p className="text-[12.5px] leading-[1.7] text-soft-muted">
                      이 날 {counselor.person.name} 전문가의 {spanLabel(span)} 자리는 모두
                      찼습니다. 다른 날이나 다른 전문가를 골라 주세요.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ⑤ 방식 · 미리 적어 두는 말 · 결제 */}
          {counselor && date && starts.length > 0 && mode && (
            <section className="mt-8">
              <SectionTitle>면담 방식과 결제</SectionTitle>

              <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <div className={`${card} p-5 sm:p-6`}>
                  <div className="flex flex-wrap gap-2">
                    {counselor.modes.map((m) => (
                      <Chip key={m} on={mode === m} onClick={() => setMode(m)}>
                        {counselModes[m]}
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[12.5px] text-soft-muted">{modeNote[mode]}</p>

                  <label
                    htmlFor="counsel-note"
                    className="mt-5 block text-[13.5px] font-semibold text-soft-ink"
                  >
                    미리 알려 주실 점 <span className="font-medium text-soft-muted">(선택)</span>
                  </label>
                  <textarea
                    id="counsel-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="궁금한 점이나 아이에 대해 먼저 알려 주실 내용을 적어 주세요."
                    className="mt-2 w-full rounded-[12px] border border-soft-line bg-white px-4 py-3 text-[14px] leading-[1.7] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft"
                  />

                  <p className="mt-5 text-[13.5px] font-semibold text-soft-ink">결제 수단</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    {methodOrder.map((m) => {
                      const on = method === m;
                      return (
                        <label
                          key={m}
                          className={`flex cursor-pointer items-center justify-center rounded-[12px] border px-3 py-3 text-[13px] font-semibold transition-colors ${
                            on
                              ? "border-soft-primary bg-soft-primary-soft text-soft-ink"
                              : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                          }`}
                        >
                          <input
                            type="radio"
                            name="counsel-method"
                            checked={on}
                            onChange={() => setMethod(m)}
                            className="sr-only"
                          />
                          {orderMethods[m]}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-[1.7] text-soft-muted">
                    시연용 화면이라 실제 결제창은 열리지 않으며, 카드번호 등 결제 정보는 이 화면이
                    받지 않습니다.
                  </p>
                </div>

                {/* 결제 요약 */}
                <aside className="lg:sticky lg:top-[5rem] lg:self-start">
                  <div className={card}>
                    <p className="border-b border-soft-line px-5 py-4 text-[14px] font-bold text-soft-ink">
                      결제 금액
                    </p>
                    <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
                      <Line k="학생" v={student?.name ?? "—"} />
                      <Line k="전문가" v={counselor.person.name} />
                      <Line k="한 자리" v={`${spanLabel(span)} · ${orderWon(unit)}`} />
                      <Line k="자리 수" v={`${starts.length}자리`} />
                      <div className="border-t border-slate-100 pt-2.5">
                        <p className="text-[12.5px] font-semibold text-soft-muted">잡은 시간</p>
                        {starts.map((v) => (
                          <p key={v} className="mt-1 text-[13px] tabular-nums text-soft-ink">
                            {date.slice(5).replace("-", ".")}({weekdayKo(date)}) {v}
                          </p>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <dt className="font-semibold text-soft-ink">최종 결제금액</dt>
                        <dd className="text-[17px] font-bold tabular-nums text-soft-ink">
                          {orderWon(total)}
                        </dd>
                      </div>
                    </dl>

                    <div className="border-t border-slate-100 px-5 py-4">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={agree}
                          onChange={(e) => setAgree(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#365eef]"
                        />
                        <span className="text-[12.5px] leading-[1.7] text-soft-muted">
                          <b className="text-soft-ink">(필수)</b> 면담 일정과{" "}
                          <Link href="/legal/refund" className="underline">
                            환불·청약철회 규정
                          </Link>
                          을 확인했습니다.
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={submit}
                        disabled={!ready}
                        className={`${t.btnPrimary} mt-4`}
                      >
                        {student ? `${orderWon(total)} 결제하고 신청하기` : "면담할 학생을 골라 주세요"}
                      </button>
                      <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
                        면담 하루 전까지 취소하시면 전액 환불됩니다. 면담 내용은 결과 해석에만
                        쓰이며, 녹음·녹화는 따로 동의를 받은 뒤에만 합니다.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          )}
        </>
      )}

      {/* 신청 내역 */}
      <section className="mt-10">
        <SectionTitle note="이 화면에서 신청한 면담이 쌓입니다.">면담 내역</SectionTitle>
        {/* 줄이 없으면 표를 세우지 않는다 — 가로로 긴 표 한가운데 적은 글은 좁은 화면에서
            화면 밖에 놓여, 빈 상자만 보인다 */}
        {!hydrated || bookings.length === 0 ? (
          <p className={`${card} px-5 py-12 text-center text-[13px] text-soft-muted`}>
            {hydrated ? "아직 신청한 면담이 없습니다." : "확인 중입니다…"}
          </p>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[44rem] border-collapse">
              <caption className="sr-only">신청한 면담</caption>
              <thead>
                <tr>
                  <th className={listTh}>예약번호</th>
                  <th className={listTh}>일시</th>
                  <th className={listTh}>학생</th>
                  <th className={listTh}>전문가</th>
                  <th className={listTh}>방식</th>
                  <th className={listTh}>결제</th>
                  <th className={listTh}>상태</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const c = counselorOf(b.counselorId);
                  const paid = b.orderId ? orders.find((o) => o.id === b.orderId) : null;
                  return (
                    <tr key={b.id}>
                      <td className={`${listTd} tabular-nums`}>{b.id}</td>
                      <td className={`${listTd} tabular-nums`}>
                        {b.date.replace(/-/g, ".")}({weekdayKo(b.date)}) {b.start} ·{" "}
                        {spanLabel(b.span)}
                      </td>
                      <td className={`${listTd} text-soft-ink`}>{b.studentName}</td>
                      <td className={listTd}>{c?.person.name ?? "—"}</td>
                      <td className={listTd}>{counselModes[b.mode]}</td>
                      <td className={`${listTd} tabular-nums`}>
                        {/* 한 결제로 여러 자리를 잡으면 줄마다 한 자리 몫만 적는다 —
                            합계를 줄마다 되풀이하면 두 배로 낸 것처럼 읽힌다 */}
                        {paid ? orderWon(paid.unit) : "—"}
                      </td>
                      <td className={listTd}>
                        {b.state === "canceled" ? (
                          <span className="text-slate-400">취소됨</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCanceling(b)}
                            className="font-semibold text-soft-primary hover:underline"
                          >
                            예약 취소
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {live.length > 0 && (
          <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
            잡아 둔 면담 {live.length}건. 확정 안내는 신청하신 연락처로 보내 드리며, 전문가
            사정으로 시간이 바뀌면 먼저 연락드립니다. 결제 내역은{" "}
            <Link href="/my/payments" className="font-semibold text-soft-primary hover:underline">
              결제
            </Link>{" "}
            화면에서도 보실 수 있습니다.
          </p>
        )}
      </section>

      {detail && <CounselorDetail c={detail} onClose={() => setDetail(null)} />}

      {canceling && (
        <ConfirmDialog
          title="이 면담을 취소할까요?"
          body={
            <>
              {canceling.date.replace(/-/g, ".")}({weekdayKo(canceling.date)}) {canceling.start} ·{" "}
              {counselorOf(canceling.counselorId)?.person.name ?? "담당 전문가"} 면담이 취소되고,
              그 시간은 다시 열립니다. 환불은 결제하신 수단으로 3~5영업일 안에 처리됩니다.
            </>
          }
          confirmLabel="취소하기"
          cancelLabel="그대로 두기"
          tone="danger"
          onConfirm={() => {
            cancelBooking(canceling.id);
            setCanceling(null);
            setToast("면담 예약을 취소했습니다.");
          }}
          onCancel={() => setCanceling(null)}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** 고르개 한 줄 — 왼쪽 이름표, 오른쪽 알약들 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[2.5rem] shrink-0 text-[12.5px] font-semibold text-soft-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-soft-muted">{k}</dt>
      <dd className="text-right font-semibold text-soft-ink">{v}</dd>
    </div>
  );
}
