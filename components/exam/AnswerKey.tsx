"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/authStore";
import {
  answerText,
  autoGraded,
  examOrderOf,
  keyText,
  markOf,
  shortAnswer,
  subjects,
  type Mark,
  type Question,
  type SubjectId,
} from "@/lib/exam";
import { useExamRecord, type ExamRecord } from "@/lib/examStore";
import { GoApply, PageTitle, RegTable, useRegistrations, type Registration } from "./Registrations";
import StudentOnly from "./StudentOnly";
import { btnGhost, btnPrimary, eyebrow } from "./ui";

/**
 * 정답과 해설 탭 (/exam/answers).
 *
 * 접수한 평가 표를 펴고, **최종 제출을 마친 평가만** 정답을 연다. 풀기 전에 정답이 보이면
 * 시험이 되지 않는다. 제출을 마쳤으면 첫 평가를 펼친 채로 연다 — 들어오자마자 정오표가
 * 보여야 「쉽게 본다」.
 *
 * 펼친 평가는 두 층이다.
 *   정오표      문항마다 정답 · 내 답 · ○✕를 한 줄씩. 종이로 뽑아 볼 수 있다
 *   문항별 풀이  문제와 보기, 내 답과 정답, 서술형의 예시 답과 작성 안내
 *
 * 서술형은 정답이 하나로 정해지지 않아 전문가가 채점하므로 정오표에 「채점 중」으로 둔다.
 *
 * ⚠ 문항 자료(lib/examQuestions.ts)에는 해설 문장이 아직 없다. 없는 해설을 지어 넣지
 *   않고, 해설 칸이 생기면 문항별 풀이에 붙인다.
 */
export default function AnswerKey() {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const rows = useRegistrations(studentId);
  /* undefined — 아직 아무것도 누르지 않음. 그때는 첫 평가를 펼쳐 둔다 */
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  const key = (r: Registration) => `${r.round}-${r.track}`;
  const open = chosen === undefined ? (record.finalized && rows[0] ? key(rows[0]) : null) : chosen;
  const picked = rows.find((r) => key(r) === open) ?? null;

  return (
    <div>
      <PageTitle>정답과 해설</PageTitle>
      <div className="mt-10">
        <RegTable
          caption="정답과 해설을 볼 수 있는 평가"
          rows={rows}
          lastHead="정답"
          renderLast={(row) =>
            record.finalized ? (
              <button
                type="button"
                aria-expanded={open === key(row)}
                onClick={() => setChosen(open === key(row) ? null : key(row))}
                className={`inline-flex items-center justify-center rounded-[4px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  open === key(row)
                    ? "border border-soft-line bg-white text-soft-ink hover:bg-slate-50"
                    : "bg-soft-primary text-white hover:bg-soft-primary-dark"
                }`}
              >
                {open === key(row) ? "닫기" : "보기"}
              </button>
            ) : (
              <span>응시 완료 후 공개</span>
            )
          }
        />
      </div>
      {rows.length === 0 && <GoApply />}

      {picked && record.finalized && (
        <Sheet key={key(picked)} row={picked} record={record} student={session?.name ?? ""} />
      )}
    </div>
  );
}

/* ───────────────────────── 정오 모양 ───────────────────────── */

const MARK: Record<Mark, { sign: string; label: string; tone: string }> = {
  right: { sign: "○", label: "맞음", tone: "text-emerald-700" },
  wrong: { sign: "✕", label: "틀림", tone: "text-rose-600" },
  empty: { sign: "✕", label: "답 안 함", tone: "text-rose-600" },
  pending: { sign: "", label: "채점 중", tone: "text-soft-muted" },
};

type Line = { q: Question; no: number; value: number | string | undefined; mark: Mark };

/** 한 과목의 정오표 줄 — 응시 때와 같은 차례 · 같은 번호 */
function linesOf(subject: SubjectId, record: ExamRecord): Line[] {
  const answers = record.subjects[subject].answers;
  return examOrderOf(subject).map((q, i) => ({
    q,
    no: i + 1,
    value: answers[q.id],
    mark: markOf(q, answers[q.id]),
  }));
}

function tally(lines: Line[]) {
  const n = (m: Mark) => lines.filter((l) => l.mark === m).length;
  return { right: n("right"), wrong: n("wrong"), empty: n("empty"), pending: n("pending") };
}

const anchor = (subject: SubjectId, no: number) => `answer-${subject}-${no}`;

/* ───────────────────────── 펼친 평가 ───────────────────────── */

function Sheet({
  row,
  record,
  student,
}: {
  row: Registration;
  record: ExamRecord;
  student: string;
}) {
  const available = subjects.filter(
    (s) => !row.info || row.info.subjects.some((x) => x.id === s.id),
  );
  const [subject, setSubject] = useState<SubjectId>(available[0]?.id ?? "korean");
  const [coach, setCoach] = useState(false);
  const lines = linesOf(subject, record);
  const count = tally(lines);
  const graded = lines.length - count.pending;
  const submitted = record.finalizedAt
    ? new Date(record.finalizedAt).toLocaleDateString("ko-KR")
    : "-";

  return (
    <section className="mt-12 pb-24" aria-labelledby="answer-sheet">
      {/* 머리는 결과 리포트(ResultView)와 같은 모양으로 둔다 — 두 탭에서 펼치는 것이 같은
          평가의 다른 면이라, 펼친 뒤의 화면이 서로 남처럼 보이면 안 된다 */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          <p className={eyebrow}>정답과 해설</p>
          <h2
            id="answer-sheet"
            className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]"
          >
            {row.title}
          </h2>
          <p className="mt-2 text-[12px] text-soft-muted">
            최종 제출 {submitted} · 과목 {available.length}개
          </p>
        </div>
        <PrintButton
          title={row.title}
          student={student}
          submitted={submitted}
          record={record}
          subjects={available.map((s) => s.id)}
        />
      </div>

      <div role="group" aria-label="과목" className="mt-7 flex flex-wrap gap-2">
        {available.map((s) => {
          const on = s.id === subject;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSubject(s.id)}
              className={`rounded-[4px] border px-5 py-2.5 text-[14px] transition-colors ${
                on
                  ? "border-soft-primary bg-soft-primary font-semibold text-white"
                  : "border-soft-line bg-white text-soft-ink hover:bg-slate-50"
              }`}
            >
              {s.short}
            </button>
          );
        })}
      </div>

      {/* ── 정오표 ── */}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-bold text-soft-ink">정오표</h3>
          <p className="text-[13px] text-soft-muted">번호를 누르면 아래 문항 풀이로 갑니다</p>
        </div>
        <Tally count={count} graded={graded} className="mt-3" />
        <MarkTable lines={lines} subject={subject} linked className="mt-3" />
      </div>

      {/* ── 문항별 풀이 ── */}
      <h3 className="mt-14 border-b border-soft-line pb-3 text-[17px] font-bold text-soft-ink">
        문항별 풀이
      </h3>
      <ol className="mt-5 space-y-4">
        {lines.map((l) => (
          <QuestionReview key={l.q.id} line={l} subject={subject} />
        ))}
      </ol>

      {/* ── 맞춤 학습 — 오른쪽 아래에 떠 있다 ── */}
      <button
        type="button"
        onClick={() => setCoach(true)}
        className="no-print fixed right-5 bottom-5 z-40 inline-flex items-center gap-2 rounded-full bg-soft-primary px-6 py-3.5 text-[15px] font-bold text-white shadow-float transition-colors hover:bg-soft-primary-dark md:right-8 md:bottom-8"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
          <path
            d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Zm2.5 1.8v4.2c0 1.2 2 2.5 4.5 2.5s4.5-1.3 4.5-2.5V8.3M17 6.5v5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        맞춤 학습
      </button>
      {coach && (
        <CoachDialog
          record={record}
          subjects={available.map((s) => s.id)}
          onGo={(s, no) => {
            setCoach(false);
            setSubject(s);
            /* 과목을 바꾼 뒤 그려진 문항으로 내려간다 */
            window.setTimeout(
              () =>
                document
                  .getElementById(anchor(s, no))
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              50,
            );
          }}
          onClose={() => setCoach(false)}
        />
      )}
    </section>
  );
}

/* ───────────────────────── 정오표 ───────────────────────── */

function Tally({
  count,
  graded,
  className = "",
}: {
  count: ReturnType<typeof tally>;
  graded: number;
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap gap-x-5 gap-y-1 border-y border-soft-line bg-white px-4 py-3 text-[14px] text-soft-ink ${className}`}
    >
      <span>
        채점한 {graded}문항 중 <b className="tabular-nums text-emerald-700">{count.right}문항</b>{" "}
        맞음
      </span>
      <span className="text-rose-600">
        틀림 <b className="tabular-nums">{count.wrong}</b>
      </span>
      <span className="text-rose-600">
        답 안 함 <b className="tabular-nums">{count.empty}</b>
      </span>
      {count.pending > 0 && (
        <span className="text-soft-muted">
          서술형 <b className="tabular-nums">{count.pending}</b>문항은 전문가가 채점합니다
        </span>
      )}
    </p>
  );
}

function MarkTable({
  lines,
  subject,
  linked = false,
  className = "",
}: {
  lines: Line[];
  subject: SubjectId;
  linked?: boolean;
  className?: string;
}) {
  const th =
    "border border-soft-line bg-slate-50 px-3 py-2.5 text-center font-semibold text-soft-ink";
  const td = "border border-soft-line px-3 py-2.5 text-center";
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[480px] border-collapse bg-white text-[14px]">
        <caption className="sr-only">정오표</caption>
        <colgroup>
          <col className="w-[14%]" />
          <col className="w-[34%]" />
          <col className="w-[34%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={th}>
              문항
            </th>
            <th scope="col" className={th}>
              정답
            </th>
            <th scope="col" className={th}>
              내 답
            </th>
            <th scope="col" className={th}>
              정오
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map(({ q, no, value, mark }) => {
            const m = MARK[mark];
            const key = keyText(q);
            const mine = shortAnswer(q, value);
            return (
              <tr key={q.id}>
                <th scope="row" className={`${td} font-bold tabular-nums text-soft-ink`}>
                  {linked ? (
                    <a
                      href={`#${anchor(subject, no)}`}
                      className="underline-offset-4 hover:text-soft-primary hover:underline"
                    >
                      {no}
                    </a>
                  ) : (
                    no
                  )}
                </th>
                <td className={`${td} tabular-nums text-soft-ink`}>
                  {key || (
                    <span className="text-[13px] text-soft-muted">서술형 · 예시 답 참고</span>
                  )}
                </td>
                <td className={`${td} tabular-nums text-soft-ink`}>
                  {mine || <span className="text-soft-muted">-</span>}
                </td>
                <td className={`${td} font-bold ${m.tone}`}>
                  {m.sign ? (
                    <>
                      <span aria-hidden className="text-[17px] leading-none">
                        {m.sign}
                      </span>
                      <span className="sr-only">{m.label}</span>
                      {mark === "empty" && (
                        <span className="ml-1 text-[12px] font-semibold">답 안 함</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] font-semibold">{m.label}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────────────────── 인쇄 ───────────────────────── */

const subscribeNothing = () => () => {};

/**
 * 정오표 인쇄.
 *
 * 화면의 정오표는 탭 · 표 · 풀이 사이에 끼어 있어 그대로 찍으면 종이가 지저분해진다.
 * 인쇄할 때만 body 바로 밑에 **종이 전용 정오표**를 세우고, 그것만 남기고 모두 감춘다
 * (globals.css의 `.answer-sheet-print`). 과목마다 한 장씩 넘긴다.
 */
function PrintButton({
  title,
  student,
  submitted,
  record,
  subjects: ids,
}: {
  title: string;
  student: string;
  submitted: string;
  record: ExamRecord;
  subjects: SubjectId[];
}) {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  useEffect(() => {
    const done = () => document.body.classList.remove("printing-answer-sheet");
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          document.body.classList.add("printing-answer-sheet");
          window.print();
        }}
        className={`no-print ${btnGhost}`}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none">
          <path
            d="M5.5 7V3h9v4M5.5 14h-2V8.5A1.5 1.5 0 0 1 5 7h10a1.5 1.5 0 0 1 1.5 1.5V14h-2M5.5 11.5h9V17h-9v-5.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        정오표 인쇄
      </button>
      {mounted &&
        createPortal(
          <div className="answer-sheet-print text-black">
            {ids.map((id, i) => {
              const lines = linesOf(id, record);
              const count = tally(lines);
              const name = subjects.find((s) => s.id === id)?.short ?? "";
              return (
                <div key={id} className={i > 0 ? "break-before-page" : ""}>
                  <p className="text-[11px] text-slate-500">{title}</p>
                  <h1 className="mt-1 text-[22px] font-bold">정오표 · {name}</h1>
                  <p className="mt-2 text-[12px]">
                    {student && <>이름 {student} · </>}최종 제출 {submitted} · 채점한{" "}
                    {lines.length - count.pending}문항 중 {count.right}문항 맞음
                    {count.pending > 0 && ` · 서술형 ${count.pending}문항 전문가 채점`}
                  </p>
                  <MarkTable lines={lines} subject={id} className="mt-4" />
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ───────────────────────── 문항별 풀이 ───────────────────────── */

function QuestionReview({ line, subject }: { line: Line; subject: SubjectId }) {
  const { q, no, value: mine, mark } = line;
  const m = MARK[mark];
  const auto = autoGraded(q);
  return (
    <li
      id={anchor(subject, no)}
      className="scroll-mt-36 rounded-[4px] border border-soft-line bg-white px-5 py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <p className="text-[14px] font-bold text-soft-ink">
          문항 <span className="tabular-nums">{no}</span>
          <span className={`ml-2 text-[13px] ${m.tone}`}>
            {m.sign && <span aria-hidden>{m.sign} </span>}
            {m.label}
          </span>
        </p>
        <p className="text-[12px] text-soft-muted">
          {q.type === "choice" ? "객관식" : auto ? "단답형" : "서술형"}
        </p>
      </div>

      <p className="mt-3 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-soft-ink">
        {q.stem}
      </p>

      {q.type === "choice" ? (
        <>
          <ul className="mt-3 space-y-1.5">
            {q.choices?.map((c, i) => {
              const isAnswer = i === q.answer;
              const isMine = mine === i;
              return (
                <li
                  key={c}
                  className={`flex items-start gap-3 rounded-[4px] border px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    isAnswer
                      ? "border-emerald-500 bg-emerald-50 text-soft-ink"
                      : isMine
                        ? "border-rose-300 bg-rose-50 text-soft-ink"
                        : "border-slate-100 text-soft-muted"
                  }`}
                >
                  <span className="w-4 shrink-0 font-bold tabular-nums">{i + 1}</span>
                  <span className="flex-1">{c}</span>
                  {isAnswer && (
                    <span className="shrink-0 text-[12px] font-bold text-emerald-700">정답</span>
                  )}
                  {isMine && (
                    <span
                      className={`shrink-0 text-[12px] font-bold ${
                        isAnswer ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      내 답
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[13px] font-semibold">
            {typeof mine !== "number" ? (
              <span className="text-soft-muted">
                답을 고르지 않았습니다 · 정답 {q.answer! + 1}번
              </span>
            ) : mine === q.answer ? (
              <span className="text-emerald-700">맞았습니다</span>
            ) : (
              <span className="text-rose-600">
                틀렸습니다 · 내 답 {mine + 1}번, 정답 {q.answer! + 1}번
              </span>
            )}
          </p>
        </>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="rounded-[4px] border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[12px] font-bold text-soft-muted">내 답</p>
            <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-soft-ink">
              {answerText(q, mine) || "쓰지 않았습니다."}
            </p>
          </div>
          {q.sampleAnswer && (
            <div className="px-1">
              <p className="text-[12px] font-bold text-soft-muted">{auto ? "정답" : "예시 답"}</p>
              <ul className="mt-1 space-y-1">
                {q.sampleAnswer.map((a, k) => (
                  <li key={a} className="text-[14px] leading-relaxed text-soft-ink">
                    {q.blanks?.[k] ? `${q.blanks[k].label} : ` : ""}
                    {a}
                    {q.blanks?.[k]?.suffix ?? ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q.guide && (
            <div className="px-1">
              <p className="text-[12px] font-bold text-soft-muted">작성 안내</p>
              <ol className="mt-1 space-y-1">
                {q.guide.map((g, i) => (
                  <li key={g} className="flex gap-2 text-[14px] leading-relaxed text-soft-ink">
                    <span className="font-bold tabular-nums text-soft-muted">{i + 1}.</span>
                    {g}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {!auto && (
            <p className="text-[13px] text-soft-muted">
              서술형은 전문가가 채점하며 결과보기에서 확인합니다.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/* ───────────────────────── 맞춤 학습 ───────────────────────── */

/**
 * 맞춤 학습 — 틀렸거나 답하지 않은 문항을 과목별로 모아 다시 보게 한다.
 *
 * 학습 콘텐츠는 아직 없다. 지금은 「무엇을 다시 볼까」를 정오표에서 뽑아 문항 풀이로
 * 바로 데려가는 데까지만 한다. 서술형은 채점이 끝나야 더해진다.
 */
function CoachDialog({
  record,
  subjects: ids,
  onGo,
  onClose,
}: {
  record: ExamRecord;
  subjects: SubjectId[];
  onGo: (subject: SubjectId, no: number) => void;
  onClose: () => void;
}) {
  const groups = ids.map((id) => ({
    id,
    name: subjects.find((s) => s.id === id)?.short ?? "",
    lines: linesOf(id, record),
  }));
  const misses = groups.map((g) => ({
    ...g,
    miss: g.lines.filter((l) => l.mark === "wrong" || l.mark === "empty"),
  }));
  const total = misses.reduce((n, g) => n + g.miss.length, 0);
  const pending = groups.reduce((n, g) => n + tally(g.lines).pending, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* body 바로 밑에 띄운다 — 페이지 패널 안에 두면 위 머리띠가 덮개 위로 올라온다 */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-[12px] bg-white p-7 shadow-float">
        <h2 id="coach-title" className="text-[19px] font-bold text-soft-ink">
          맞춤 학습
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          {total > 0
            ? `틀렸거나 답하지 않은 ${total}문항부터 다시 살펴봅니다. 번호를 누르면 그 문항 풀이로 갑니다.`
            : "채점한 문항은 모두 맞았습니다."}
        </p>

        {total > 0 && (
          <ul className="mt-5 space-y-3">
            {misses
              .filter((g) => g.miss.length > 0)
              .map((g) => (
                <li key={g.id} className="rounded-[8px] border border-soft-line px-4 py-3">
                  <p className="text-[13px] font-bold text-soft-ink">
                    {g.name}{" "}
                    <span className="font-semibold text-rose-600">{g.miss.length}문항</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.miss.map((l) => (
                      <button
                        key={l.q.id}
                        type="button"
                        onClick={() => onGo(g.id, l.no)}
                        className="min-w-9 rounded-[4px] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[13px] font-bold tabular-nums text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        {l.no}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        )}

        {pending > 0 && (
          <p className="mt-4 text-[12px] leading-relaxed text-soft-muted">
            서술형 {pending}문항은 전문가 채점이 끝나면 함께 더해집니다.
          </p>
        )}

        <div className="mt-7">
          <button type="button" onClick={onClose} className={`w-full ${btnPrimary}`}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
