"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useCatalogRounds } from "@/lib/catalogRounds";
import {
  availabilityLabel,
  dotDate,
  evalName,
  trackFromGrade,
  trackLabel,
  tracks,
  type Availability,
  type TrackId,
} from "@/lib/examCatalog";
import { useHydrated } from "@/lib/examStore";
import { orderMethods, orderWon, placeOrder, useOrders, type OrderMethod } from "@/lib/orderStore";
import { paidPrice, useProducts } from "@/lib/productStore";
import { useRoster, type Student } from "@/lib/roster";
import {
  grantTickets,
  spendTicket,
  usedInRound,
  useTickets,
  walletOf,
} from "@/lib/ticketStore";
import { useSession } from "@/lib/authStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import { PickBox } from "./SendCodes";
import { card, listTd, listTh } from "./ui";

/**
 * 결제 › 진단평가 — 열려 있는 평가를 골라, 그 평가를 볼 학생을 고르고 결제한다.
 *
 * 결제가 끝나면 **그 자리에서 접수까지 끝난다.** 응시권을 한 매 발급하고 곧바로 이 평가에
 * 쓴다(grantTickets → spendTicket). 결제만 되고 접수가 따로 남으면, 보호자는 돈을 낸 뒤에도
 * 아이가 왜 시험을 못 보는지 모른 채 학생 화면을 뒤지게 된다.
 *
 * ── 목록은 평가 하나가 한 줄 ──
 * 평가는 해마다 네 시기, 시기마다 학년 칸 셋으로 열린다(「2026 3-1 평가」 · 「3-2」…).
 * 해가 쌓이면 줄이 수십이 되므로 조회 조건(상태 · 학년 칸 · 검색어)을 먼저 세웠다.
 * 기본은 **접수 중**이다 — 이 화면을 여는 까닭이 거의 늘 「지금 접수할 것」이라서.
 *
 * ── 고를 수 없는 아이를 막는 자리 ──
 * 학년이 그 평가의 학년 칸과 다르거나, 같은 시기에 이미 다른 학년으로 접수한 아이는
 * 고를 수 없다(lib/ticketStore.ts의 한 회차 한 학년 규칙). 까닭을 줄에 적어 둔다 —
 * 회색으로만 두면 왜 못 고르는지 물어야 한다.
 *
 * ⚠ 시연 화면이다. 실제 결제창은 열리지 않고 카드번호 같은 결제 정보도 받지 않는다.
 */

type StatusFilter = "open" | "soon" | "ended" | "all";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "접수 중" },
  { value: "soon", label: "접수 예정" },
  { value: "ended", label: "접수 마감" },
  { value: "all", label: "전체" },
];

const stateRank: Record<Availability, number> = { open: 0, soon: 1, ended: 2 };

const methodOrder: OrderMethod[] = ["card", "kakao", "naver", "transfer"];

/** 한 쪽에 싣는 평가 수 */
const PER_PAGE = 8;

/** 왜 이 아이를 고를 수 없는가 — 고를 수 있으면 null */
function blockedReason(
  student: Student,
  roundId: string,
  track: TrackId,
  used: ReturnType<typeof usedInRound>,
): string | null {
  const mine = trackFromGrade(student.grade);
  if (used?.track === track) return "이미 접수한 평가입니다";
  if (used) return `이 시기에 ${trackLabel(used.track)}로 접수했습니다`;
  if (!mine) return student.grade ? `${student.grade}은 대상 학년이 아닙니다` : "학년이 비어 있습니다";
  if (mine !== track) return `${student.grade} 학생은 ${trackLabel(mine)} 평가를 봅니다`;
  return null;
}

export default function ExamPayPanel({
  initial = [],
  variant = 2,
}: {
  initial?: string[];
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const rounds = useCatalogRounds();
  const products = useProducts();
  const tickets = useTickets();
  const orders = useOrders();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () => roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg],
  );

  const [q, setQ] = useState("");
  const [track, setTrack] = useState<TrackId | "">("");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [page, setPage] = useState(1);
  const [pickedExam, setPickedExam] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const [method, setMethod] = useState<OrderMethod>("card");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  /** 응시권 값 — 관리자 차림표의 응시권 상품을 그대로 읽는다 */
  const ticketProduct = products.find((p) => p.state === "selling" && p.kind === "assessment");
  const unit = ticketProduct ? paidPrice(ticketProduct) : 0;

  const all = useMemo(
    () =>
      rounds
        .flatMap((round) =>
          tracks.map((tr) => ({
            key: `${round.id}:${tr.id}`,
            round,
            track: tr,
            name: evalName(round.id, tr.id, round.label),
          })),
        )
        .sort(
          (a, b) =>
            stateRank[a.round.availability] - stateRank[b.round.availability] ||
            b.round.opensOn.localeCompare(a.round.opensOn) ||
            tracks.indexOf(a.track) - tracks.indexOf(b.track),
        ),
    [rounds],
  );

  const found = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((it) => {
      if (status !== "all" && it.round.availability !== status) return false;
      if (track && it.track.id !== track) return false;
      if (!needle) return true;
      return `${it.name} ${trackLabel(it.track.id)} ${it.round.label}`.toLowerCase().includes(needle);
    });
  }, [all, q, track, status]);

  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = found.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const exam = all.find((it) => it.key === pickedExam) ?? null;

  /**
   * 평가를 고른다.
   *
   * 체크해 둔 아이를 통째로 지우지 않는다 — 학생 목록에서 체크해 넘어온 아이(?students=)가
   * 평가를 고르는 순간 사라지면, 데리고 온 뜻이 없다. 대신 **이 평가에 고를 수 없게 된
   * 아이만** 뺀다(학년이 다르거나 이미 접수한 아이).
   */
  const pickExam = (key: string) => {
    setPickedExam(key);
    setAgree(false);
    const next = all.find((it) => it.key === key);
    if (!next) return;
    setPicked((prev) => {
      const keep = new Set<string>();
      for (const id of prev) {
        const s = mine.find((x) => x.id === id);
        if (!s) continue;
        const used = usedInRound(walletOf(tickets, s.id), next.round.id);
        if (!blockedReason(s, next.round.id, next.track.id, used)) keep.add(id);
      }
      return keep;
    });
  };

  const rows = exam
    ? mine.map((s) => ({
        student: s,
        reason: blockedReason(
          s,
          exam.round.id,
          exam.track.id,
          usedInRound(walletOf(tickets, s.id), exam.round.id),
        ),
      }))
    : [];

  const chosen = rows.filter((r) => !r.reason && picked.has(r.student.id));
  const total = unit * chosen.length;
  const canPay = !!exam && exam.round.availability === "open" && chosen.length > 0 && agree;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function pay() {
    if (!exam || chosen.length === 0) return;
    const order = placeOrder({
      productId: `EX-${exam.round.id}-${exam.track.id}`,
      productName: `${exam.name} 응시권`,
      grantsTicket: true,
      students: chosen.map((r) => ({ id: r.student.id, name: r.student.name })),
      unit,
      method,
    });
    /* 발급하고 그 자리에서 이 평가에 쓴다 — 결제만 되고 접수가 남으면 아이는 시험을 못 본다 */
    for (const r of chosen) {
      grantTickets(r.student.id, 1);
      spendTicket(r.student.id, exam.round.id, exam.track.id);
    }
    setDone(order.id);
  }

  const paidOrder = done ? (orders.find((o) => o.id === done) ?? null) : null;

  if (paidOrder) {
    return (
      <section className={`${card} p-7 text-center sm:p-9`}>
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-[20px] font-bold text-soft-ink">
          결제가 끝나고 접수까지 되었습니다
        </h2>
        <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
          주문번호 <b className="tabular-nums text-soft-ink">{paidOrder.id}</b> ·{" "}
          {paidOrder.productName} · {orderWon(paidOrder.amount)}
          <br />
          {paidOrder.students.map((s) => s.name).join(" · ")} · 총 {paidOrder.students.length}명
        </p>
        <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
          이제 학생이 접속코드로 로그인해 「응시하기」에서 과목별로 응시합니다. 코드를 아직
          넘기지 않으셨다면 학생 목록에서 문자로 보내실 수 있습니다.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/my/children" className={t.btnAction}>
            학생 목록으로
          </Link>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setPicked(new Set());
              setAgree(false);
            }}
            className={t.btnOutline}
          >
            다른 평가 결제하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        {/* ① 평가 고르기 */}
        <section>
          <SectionTitle note="열려 있는 평가가 한 줄에 하나씩 섭니다.">평가 고르기</SectionTitle>

          <div className={`${card} p-4 sm:p-5`}>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="평가 이름 · 학년으로 찾기"
                aria-label="평가 찾기"
                className="h-[3rem] w-full rounded-[12px] border border-soft-line bg-white pl-10 pr-4 text-[14px] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <Field label="접수 상태" id="pay-status">
                <select
                  id="pay-status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-10 rounded-[10px] border border-soft-line bg-white px-3 text-[13.5px] text-soft-ink outline-none focus:border-soft-primary"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="학년" id="pay-track">
                <select
                  id="pay-track"
                  value={track}
                  onChange={(e) => {
                    setTrack(e.target.value as TrackId | "");
                    setPage(1);
                  }}
                  className="h-10 rounded-[10px] border border-soft-line bg-white px-3 text-[13.5px] text-soft-ink outline-none focus:border-soft-primary"
                >
                  <option value="">전체</option>
                  {tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {trackLabel(tr.id)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <p className="mb-2.5 mt-3 text-[13px] text-soft-muted">
            조건에 맞는 평가 <b className="text-soft-ink">{found.length}개</b>
            {pages > 1 && ` · ${current}/${pages}쪽`}
          </p>

          {found.length === 0 ? (
            <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
              조건에 맞는 평가가 없습니다. 접수 상태를 「전체」로 바꿔 보세요.
            </p>
          ) : (
            <ul className={`${card} divide-y divide-slate-100`}>
              {shown.map((it) => {
                const on = pickedExam === it.key;
                const open = it.round.availability === "open";
                return (
                  <li key={it.key}>
                    <label
                      className={`flex cursor-pointer items-start gap-3.5 p-4 transition-colors sm:p-5 ${
                        on ? "bg-soft-primary-soft" : "hover:bg-slate-50"
                      } ${open ? "" : "cursor-not-allowed"}`}
                    >
                      <input
                        type="radio"
                        name="exam"
                        checked={on}
                        disabled={!open}
                        onChange={() => pickExam(it.key)}
                        className="mt-1 h-4 w-4 accent-[#365eef]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={`text-[15px] font-bold ${open ? "text-soft-ink" : "text-slate-400"}`}
                          >
                            {it.name}
                          </span>
                          <span className="rounded-full border border-soft-line bg-white px-2 py-0.5 text-[11.5px] font-semibold text-soft-muted">
                            {trackLabel(it.track.id)}
                          </span>
                          <span
                            className={`text-[12px] font-semibold ${
                              open
                                ? "text-soft-primary"
                                : it.round.availability === "soon"
                                  ? "text-amber-700"
                                  : "text-slate-400"
                            }`}
                          >
                            {availabilityLabel[it.round.availability]}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[12.5px] leading-[1.7] text-soft-muted">
                          접수 {dotDate(it.round.opensOn)} – {dotDate(it.round.closesOn)}
                          {it.round.subjects.length > 0 && (
                            <>
                              {" · "}
                              {it.round.subjects.map((s) => s.name).join(" · ")} (
                              {it.round.subjects.reduce((m, s) => m + s.minutes, 0)}분)
                            </>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums text-soft-ink">
                        {open ? orderWon(unit) : "—"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {pages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                className={`${t.btnQuiet} disabled:opacity-40`}
              >
                이전
              </button>
              <span className="text-[13px] tabular-nums text-soft-muted">
                {current} / {pages}
              </span>
              <button
                type="button"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
                className={`${t.btnQuiet} disabled:opacity-40`}
              >
                다음
              </button>
            </div>
          )}
        </section>

        {/* ② 학생 고르기 */}
        <section className="mt-8">
          <SectionTitle note="고른 학생이 이 평가를 응시합니다.">평가를 볼 학생</SectionTitle>

          {!exam ? (
            <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
              먼저 평가를 골라 주세요. 학년에 맞는 학생만 고를 수 있습니다.
            </p>
          ) : (
            <div className={`${card} overflow-x-auto`}>
              <table className="w-full min-w-[28rem] border-collapse">
                <caption className="sr-only">이 평가를 응시할 학생 고르기</caption>
                <colgroup>
                  <col className="w-[3rem]" />
                  <col className="w-[26%]" />
                  <col />
                  <col className="w-[30%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className={listTh}>
                      <span className="sr-only">선택</span>
                    </th>
                    <th className={listTh}>이름</th>
                    <th className={listTh}>학교 · 학년</th>
                    <th className={listTh}>접수</th>
                  </tr>
                </thead>
                <tbody>
                  {!hydrated ? (
                    <tr>
                      <td colSpan={4} className={`${listTd} py-12`}>
                        확인 중입니다…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`${listTd} py-12`}>
                        <p className="text-[15px] font-bold text-soft-ink">
                          아직 등록된 학생이 없습니다
                        </p>
                        <Link href="/my/children/new" className={`${t.btnAction} mt-4`}>
                          등록하러 가기
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ student: s, reason }) => {
                      const on = !reason && picked.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={on ? "bg-soft-primary-soft/60" : undefined}
                          onClick={() => !reason && toggle(s.id)}
                        >
                          <td className={listTd} onClick={(e) => e.stopPropagation()}>
                            <PickBox
                              checked={on}
                              disabled={!!reason}
                              onChange={() => toggle(s.id)}
                              label={`${s.name} 선택`}
                            />
                          </td>
                          <td
                            className={`${listTd} text-left text-[14px] font-bold ${
                              reason ? "text-slate-400" : "text-soft-ink"
                            }`}
                          >
                            {s.name}
                          </td>
                          <td className={`${listTd} text-left`}>
                            {s.school ?? "—"}
                            {s.grade && <span className="ml-1.5">{s.grade}</span>}
                          </td>
                          <td className={`${listTd} text-left`}>
                            {reason ? (
                              <span className="text-[12.5px] text-slate-400">{reason}</span>
                            ) : (
                              <span className="text-[12.5px] font-semibold text-soft-primary">
                                결제하면 바로 접수됩니다
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ③ 결제 수단 */}
        <section className="mt-8">
          <SectionTitle>결제 수단</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-4">
            {methodOrder.map((m) => {
              const on = method === m;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center justify-center rounded-[12px] border px-3 py-3.5 text-[13.5px] font-semibold transition-colors ${
                    on
                      ? "border-soft-primary bg-soft-primary-soft text-soft-ink"
                      : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
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
            시연용 화면이라 실제 결제창은 열리지 않으며, 카드번호 등 결제 정보는 이 화면이 받지
            않습니다.
          </p>
        </section>
      </div>

      {/* 결제 요약 */}
      <aside className="lg:sticky lg:top-[5rem] lg:self-start">
        <div className={card}>
          <p className="border-b border-soft-line px-5 py-4 text-[14px] font-bold text-soft-ink">
            결제 금액
          </p>
          <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
            <Line k="평가" v={exam?.name ?? "—"} />
            <Line k="학년" v={exam ? trackLabel(exam.track.id) : "—"} />
            <Line k="한 사람 몫" v={orderWon(unit)} />
            <Line k="인원" v={`${chosen.length}명`} />
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <dt className="font-semibold text-soft-ink">최종 결제금액</dt>
              <dd className="text-[17px] font-bold tabular-nums text-soft-ink">
                {orderWon(total)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-slate-100 px-5 py-4">
            {chosen.length > 0 && (
              <p className="mb-3 text-[12.5px] leading-[1.7] text-soft-muted">
                {chosen.map((r) => r.student.name).join(" · ")} 앞으로 접수됩니다.
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#365eef]"
              />
              <span className="text-[12.5px] leading-[1.7] text-soft-muted">
                <b className="text-soft-ink">(필수)</b> 결제 내용과{" "}
                <Link href="/legal/refund" className="underline">
                  환불·청약철회 규정
                </Link>
                을 확인했습니다.
              </span>
            </label>

            <button type="button" onClick={pay} disabled={!canPay} className={`${t.btnPrimary} mt-4`}>
              {!exam
                ? "평가를 골라 주세요"
                : chosen.length === 0
                  ? "학생을 골라 주세요"
                  : total === 0
                    ? `${chosen.length}명 무료로 접수하기`
                    : `${orderWon(total)} 결제하기`}
            </button>
            <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
              응시를 시작하기 전에는 전액 환불됩니다. 응시를 시작한 뒤에는 환불이 제한됩니다.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** 고르개 한 칸 — 이름표 + 고르개 */
function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-[12.5px] font-semibold text-soft-muted">
        {label}
      </label>
      {children}
    </span>
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
