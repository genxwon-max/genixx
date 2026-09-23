"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, monthCells, monthOf, monthText, today, weekdayKo, WEEK_KO } from "@/lib/calendar";
import {
  book,
  cancelBooking,
  dayStarts,
  freeAt,
  hasRoom,
  inWindow,
  useBookings,
  WINDOW_DAYS,
  type Booking,
} from "@/lib/counselStore";
import {
  counselModes,
  counselorOf,
  spanLabel,
  SPANS,
  type CounselMode,
  type Counselor,
  type Span,
} from "@/lib/counselors";
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
 * 면담 예약 (/my/interviews) — 결과 해석 면담을 보호자가 직접 잡는다.
 *
 * 차례를 **날짜 → 시각 → 상담사**로 둔다. 사람을 먼저 고르면 그 사람이 이번 주에 비지
 * 않을 때 처음으로 돌아가야 하는데, 보호자가 실제로 쥐고 있는 조건은 대개 「아이 학원
 * 없는 목요일 저녁」이지 특정 전문가가 아니다. 시각을 먼저 좁히면 그 자리에 설 수 있는
 * 사람만 서므로, 고를 수 없는 사람을 읽는 일이 없다.
 *
 * 한 걸음을 고치면 그 아래는 지운다 — 날짜를 바꿨는데 시각이 남아 있으면 그 시각이 새
 * 날짜에도 비어 있는 것처럼 보인다.
 *
 * 각 자리가 정말 비어 있는지는 lib/counselStore.ts 한 곳에서만 센다(startsOf). 달력 칸과
 * 시각 목록이 저마다 세면 어느 날 둘이 갈려, 켜져 있는 날짜를 눌렀는데 시각이 하나도
 * 없는 일이 생긴다.
 *
 * ⚠ 여기서 잡는 것은 **보호자가 신청하는 해석 면담**이다. 판정이 경계선에 선 사례를
 *   전문가가 불러 확인하는 면담(EXP-06)은 우리가 대상을 고르는 일이라 이 화면에 없다.
 */

const modeNote: Record<CounselMode, string> = {
  video: "신청 확정 뒤 화상 링크를 문자로 보내 드립니다.",
  phone: "예약한 시각에 등록하신 번호로 전화를 드립니다.",
  onsite: "장소는 확정 안내에 함께 적어 보내 드립니다.",
};

export default function InterviewBooking({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const bookings = useBookings();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () => roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg],
  );

  const [studentId, setStudentId] = useState("");
  const [span, setSpan] = useState<Span>(30);
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [counselorId, setCounselorId] = useState("");
  const [mode, setMode] = useState<CounselMode | "">("");
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState<Counselor | null>(null);
  const [done, setDone] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<Booking | null>(null);

  /* 오늘은 하이드레이션이 끝난 뒤에만 읽는다 — 서버가 그린 달력과 갈리면 칸이 흔들린다 */
  const now = hydrated ? today() : "";
  const ym = month || (now ? monthOf(now) : "");

  const student = mine.find((s) => s.id === studentId) ?? (mine.length === 1 ? mine[0] : null);
  const counselor = counselorId ? counselorOf(counselorId) : null;

  const starts = date ? dayStarts(bookings, date, span) : [];
  const free = date && start ? freeAt(bookings, date, start, span) : [];

  /* 걸음을 되돌릴 때 아래를 지운다 */
  const pickSpan = (v: Span) => {
    setSpan(v);
    setStart("");
    setCounselorId("");
    setMode("");
  };
  const pickDate = (v: string) => {
    setDate(v);
    setStart("");
    setCounselorId("");
    setMode("");
  };
  const pickStart = (v: string) => {
    setStart(v);
    setCounselorId("");
    setMode("");
  };
  const pickCounselor = (c: Counselor) => {
    setCounselorId(c.id);
    setMode(c.modes[0]);
  };

  const ready = !!student && !!date && !!start && !!counselor && !!mode;

  function submit() {
    if (!student || !counselor || !mode) return;
    const made = book({
      studentId: student.id,
      studentName: student.name,
      counselorId: counselor.id,
      date,
      start,
      span,
      mode,
      note: note.trim(),
    });
    if (!made) {
      /* 다른 탭에서 같은 자리를 먼저 잡았다 — 시각부터 다시 고르게 한다 */
      setToast("방금 그 시간이 마감되었습니다. 다른 시간을 골라 주세요.");
      setStart("");
      setCounselorId("");
      return;
    }
    setDone(made);
  }

  function reset() {
    setDone(null);
    setDate("");
    setStart("");
    setCounselorId("");
    setMode("");
    setNote("");
  }

  const live = bookings.filter((b) => b.state === "booked");

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>결과 해석 면담</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          면담
        </h1>
        <p className={`mt-2 text-[13px] leading-[1.7] ${t.muted}`}>
          결과지를 함께 읽는 자리입니다. 날짜와 시간을 고르시면 그 시간에 자리가 있는 전문가가
          나옵니다. 신청하신 가정만 진행하며, 오늘부터 {WINDOW_DAYS}일 안에서 잡으실 수 있습니다.
        </p>
      </header>

      {done ? (
        <section className={`${card} p-7 text-center sm:p-9`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[20px] font-bold text-soft-ink">면담이 신청되었습니다</h2>
          <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
            {done.date.replace(/-/g, ".")}({weekdayKo(done.date)}) {done.start} ·{" "}
            {spanLabel(done.span)} · {counselorOf(done.counselorId)?.person.name ?? "담당 전문가"}
            <br />
            {done.studentName} 학생 · {counselModes[done.mode]} 면담 · 예약번호{" "}
            <b className="tabular-nums text-soft-ink">{done.id}</b>
          </p>
          <p className="mt-3 text-[12.5px] text-soft-muted">{modeNote[done.mode]}</p>
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

          {/* ② 날짜 */}
          <section>
            <SectionTitle
              note="회색 날짜는 그 길이로 낼 수 있는 자리가 없는 날입니다."
              right={
                <div className="flex items-center gap-1.5">
                  {SPANS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => pickSpan(v)}
                      aria-pressed={span === v}
                      className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        span === v
                          ? "border-soft-primary bg-soft-primary text-white"
                          : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                      }`}
                    >
                      {spanLabel(v)}
                    </button>
                  ))}
                </div>
              }
            >
              날짜
            </SectionTitle>

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
                      const open = !other && inWindow(d, now) && hasRoom(bookings, d, span);
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

          {/* ③ 시간 */}
          {date && (
            <section className="mt-8">
              <SectionTitle note={`${spanLabel(span)} 면담으로 낼 수 있는 시간입니다.`}>
                {date.slice(5).replace("-", "월 ")}일({weekdayKo(date)}) 시간
              </SectionTitle>

              {starts.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  이 날은 {spanLabel(span)} 면담 자리가 없습니다. 다른 날이나 30분 면담을 보아
                  주세요.
                </p>
              ) : (
                <div className={`${card} space-y-4 p-4 sm:p-5`}>
                  {(
                    [
                      ["오전", starts.filter((s) => s < "12:00")],
                      ["오후", starts.filter((s) => s >= "12:00")],
                    ] as const
                  ).map(([label, list]) =>
                    list.length === 0 ? null : (
                      <div key={label}>
                        <p className="mb-2 text-[12.5px] font-semibold text-soft-muted">{label}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                          {list.map((s) => {
                            const on = s === start;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => pickStart(s)}
                                aria-pressed={on}
                                className={`rounded-[10px] border py-2.5 text-[13.5px] font-semibold tabular-nums transition-colors ${
                                  on
                                    ? "border-soft-primary bg-soft-primary text-white"
                                    : "border-soft-line bg-white text-soft-ink hover:border-soft-primary"
                                }`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          )}

          {/* ④ 상담사 */}
          {date && start && (
            <section className="mt-8">
              <SectionTitle note="이 시간에 자리가 있는 전문가만 세웁니다.">
                상담 전문가
              </SectionTitle>

              {free.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  이 시간에 자리가 있는 전문가가 없습니다. 다른 시간을 골라 주세요.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {free.map((c) => (
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
              )}
            </section>
          )}

          {/* ⑤ 방식 · 미리 적어 두는 말 · 신청 */}
          {counselor && mode && (
            <section className="mt-8">
              <SectionTitle>면담 방식과 신청</SectionTitle>

              <div className={`${card} p-5 sm:p-6`}>
                <div className="flex flex-wrap gap-2">
                  {counselor.modes.map((m) => {
                    const on = mode === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        aria-pressed={on}
                        className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                          on
                            ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                            : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                        }`}
                      >
                        {counselModes[m]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-[12.5px] text-soft-muted">{modeNote[mode]}</p>

                <label htmlFor="counsel-note" className="mt-5 block text-[13.5px] font-semibold text-soft-ink">
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

                <dl className="mt-5 grid gap-2 rounded-[12px] bg-slate-50 px-4 py-3.5 text-[13.5px] sm:grid-cols-2">
                  <Row k="학생" v={student?.name ?? "—"} />
                  <Row
                    k="일시"
                    v={`${date.replace(/-/g, ".")}(${weekdayKo(date)}) ${start} · ${spanLabel(span)}`}
                  />
                  <Row k="전문가" v={`${counselor.person.name} ${counselor.person.role}`} />
                  <Row k="방식" v={counselModes[mode]} />
                </dl>

                <button
                  type="button"
                  onClick={submit}
                  disabled={!ready}
                  className={`${t.btnPrimary} mt-5`}
                >
                  {student ? "이 시간으로 신청하기" : "면담할 학생을 골라 주세요"}
                </button>
                <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
                  면담 내용은 결과 해석에만 쓰이며, 녹음·녹화는 따로 동의를 받은 뒤에만 합니다.
                  예약은 하루 전까지 이 화면에서 취소하실 수 있습니다.
                </p>
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
            <table className="w-full min-w-[40rem] border-collapse">
              <caption className="sr-only">신청한 면담</caption>
              <thead>
                <tr>
                  <th className={listTh}>예약번호</th>
                  <th className={listTh}>일시</th>
                  <th className={listTh}>학생</th>
                  <th className={listTh}>전문가</th>
                  <th className={listTh}>방식</th>
                  <th className={listTh}>상태</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const c = counselorOf(b.counselorId);
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
            사정으로 시간이 바뀌면 먼저 연락드립니다.
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
              그 시간은 다시 열립니다.
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-soft-muted">{k}</dt>
      <dd className="font-semibold text-soft-ink">{v}</dd>
    </div>
  );
}
