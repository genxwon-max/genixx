"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  monthCells,
  monthOf,
  monthText,
  today,
  weekdayKo,
  WEEK_KO,
} from "@/lib/calendar";
import {
  book,
  cancelBooking,
  counselorsOn,
  hasRoom,
  inWindow,
  LEAD_DAYS,
  slotsOf,
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
 * 차례는 **날짜 → 상담사 → 시각**이다. 날짜로 그 날 자리가 남은 전문가만 추리고, 전문가를
 * 고르면 그 사람의 하루 시간표가 열린다. 사람을 고른 다음에 시각을 보는 까닭은, 보호자가
 * 「누구와 이야기하는가」를 먼저 정하고 싶어 하기 때문이다 — 시각부터 좁히면 같은 시간에
 * 선 사람들 가운데 누구인지 모르는 채로 골라야 한다.
 *
 * 시간표는 **빈 칸만 추리지 않고 근무 시간을 통째로 편다.** 이미 찬 자리는 눌리지 않게
 * 잠가 두되 자리 자체는 보인다 — 없는 칸으로 지워 버리면 「그 시간에 원래 일을 안 하는
 * 것」인지 「누가 먼저 잡은 것」인지 구별되지 않는다.
 *
 * 한 걸음을 고치면 그 아래는 지운다 — 날짜를 바꿨는데 시각이 남아 있으면 그 시각이 새
 * 날짜에도 비어 있는 것처럼 보인다.
 *
 * 각 자리가 정말 비어 있는지는 lib/counselStore.ts 한 곳에서만 센다(startsOf). 달력 칸과
 * 시간표가 저마다 세면 어느 날 둘이 갈려, 켜져 있는 날짜를 눌렀는데 시각이 하나도 없는
 * 일이 생긴다.
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
  /* 처음 펴는 달은 이번 달이 아니라 **가장 이른 날이 든 달**이다. 달 말에 이번 달을 펴면
     고를 수 있는 칸이 하나도 없는 달력이 먼저 보인다 */
  const ym = month || (now ? monthOf(addDays(now, LEAD_DAYS)) : "");

  const student = mine.find((s) => s.id === studentId) ?? (mine.length === 1 ? mine[0] : null);
  const counselor = counselorId ? counselorOf(counselorId) : null;

  /* 그 날 자리가 남은 전문가 → 고른 전문가의 하루 시간표. 차례가 곧 화면 차례다 */
  const open = date ? counselorsOn(bookings, date, span) : [];
  const slots = date && counselor ? slotsOf(bookings, counselor, date, span) : [];

  /* 걸음을 되돌릴 때 아래를 지운다 */
  const pickSpan = (v: Span) => {
    setSpan(v);
    setStart("");
    /* 30분으로 잡히던 사람이 60분으로는 자리가 없을 수 있다. 고른 사람은 그대로 두고
       시간표에서 잠긴 칸으로 보이게 한다 — 골라 둔 사람이 말없이 사라지면 다시 찾는다 */
  };
  const pickDate = (v: string) => {
    setDate(v);
    setCounselorId("");
    setMode("");
    setStart("");
  };
  const pickCounselor = (c: Counselor) => {
    setCounselorId(c.id);
    setMode(c.modes[0]);
    setStart("");
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
          결과지를 함께 읽는 자리입니다. 날짜를 고르시면 그 날 자리가 있는 전문가가 나오고,
          전문가를 고르시면 그분의 시간표가 열립니다. 신청하신 가정만 진행하며, 전문가가
          결과지를 미리 읽고 들어오므로 신청일로부터 {LEAD_DAYS}일 뒤부터 {WINDOW_DAYS}일
          안에서 잡으실 수 있습니다.
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

          {/* ③ 상담사 — 그 날 자리가 남은 사람만 */}
          {date && (
            <section className="mt-8">
              <SectionTitle note="이 날 자리가 남은 전문가만 세웁니다.">상담 전문가</SectionTitle>

              {open.length === 0 ? (
                <p className={`${card} px-5 py-10 text-center text-[13px] text-soft-muted`}>
                  이 날은 {spanLabel(span)} 면담 자리가 없습니다. 다른 날이나 30분 면담을 보아
                  주세요.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {open.map((c) => (
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

          {/* ④ 시간 — 고른 전문가의 하루. 찬 자리는 잠근 채로 보인다 */}
          {date && counselor && (
            <section className="mt-8">
              <SectionTitle
                note={`${counselor.person.name} 전문가의 ${spanLabel(span)} 면담 시간표입니다. 흐린 시간은 이미 예약된 자리입니다.`}
              >
                {date.slice(5).replace("-", "월 ")}일({weekdayKo(date)}) 시간
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
                            const on = v.start === start;
                            return (
                              <button
                                key={v.start}
                                type="button"
                                disabled={!v.open}
                                onClick={() => setStart(v.start)}
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
                      찼습니다. 다른 전문가나 다른 날을 골라 주세요.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ⑤ 방식 · 미리 적어 두는 말 · 신청 — 시각까지 고른 뒤에 편다 */}
          {counselor && mode && start && (
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
