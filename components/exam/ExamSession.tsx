"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  QUESTIONS_PER_SUBJECT,
  questionsOf,
  subjectOf,
  type Question,
  type SubjectId,
} from "@/lib/exam";
import {
  finishReflection,
  forfeitSubject,
  restartSubject,
  setAnswer,
  setReflection,
  startSubject,
  submitSubject,
  useExamRecord,
  useHydrated,
} from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { enterFullscreen, leaveFullscreen } from "@/lib/fullscreen";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { btnDanger, btnDisabled, btnGhost, btnPrimary, eyebrow, panel } from "./ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 응답으로 인정되는지 — 객관식은 선택, 서술형은 최소 글자 수 */
export function isAnswered(q: Question, value: number | string | undefined) {
  if (value === undefined) return false;
  if (q.type === "choice") return typeof value === "number";
  return typeof value === "string" && value.trim().length >= (q.minLength ?? 1);
}

export default function ExamSession({ subject }: { subject: SubjectId }) {
  const hydrated = useHydrated();
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const [index, setIndex] = useState(0);
  const [askForfeit, setAskForfeit] = useState(false);
  const [askSubmit, setAskSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** 안내 화면을 지나 실제 응시를 시작했는지 */
  const [entered, setEntered] = useState(false);

  const meta = subjectOf(subject)!;
  const list = questionsOf(subject);
  const rec = record.subjects[subject];
  const running = rec.status === "ready" || rec.status === "in-progress";

  useEffect(() => {
    if (!running || !entered) return;
    const tick = () => {
      const started = rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now();
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, entered, rec.startedAt]);

  if (!hydrated) {
    return (
      <div className="container-x py-20 text-center text-[13px] text-exam-muted">
        응시 정보를 불러오는 중입니다…
      </div>
    );
  }

  // 제출 후 → 문항별 해석 작성 → 완료
  if (rec.status === "submitted") {
    return rec.reflectionAt ? (
      <Submitted subject={subject} />
    ) : (
      <ReflectionStep subject={subject} studentId={studentId} />
    );
  }
  if (rec.status === "forfeited")
    return <Forfeited subject={subject} studentId={studentId} attemptsLeft={rec.attemptsLeft} />;

  // 응시 전 안내 화면 (전체화면 진입 지점)
  if (!entered) {
    return (
      <StartGate
        subject={subject}
        onStart={async () => {
          await enterFullscreen();
          startSubject(studentId, subject);
          setEntered(true);
        }}
      />
    );
  }

  const question = list[index];
  const value = rec.answers[question.id];
  const doneCount = list.filter((q) => isAnswered(q, rec.answers[q.id])).length;
  const remain = Math.max(0, meta.limitMin * 60 - elapsed);
  const isLast = index === list.length - 1;
  const unanswered = list.length - doneCount;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* 문항 스텝 */}
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="container-x flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
            <p className="text-[14px] font-black text-exam-text">{meta.name}</p>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              총 {QUESTIONS_PER_SUBJECT}문항 · 제한 {meta.limitMin}분
            </span>
          </div>

          <ol className="flex items-center gap-1.5">
            {list.map((q, i) => {
              const ok = isAnswered(q, rec.answers[q.id]);
              const current = i === index;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={current ? "step" : undefined}
                    title={`${q.no}번 ${ok ? "응답함" : "미응답"}`}
                    className={`flex h-8 w-8 items-center justify-center rounded border text-[12px] font-bold tabular-nums transition-colors ${
                      current
                        ? "border-brand-700 bg-brand-900 text-white"
                        : ok
                          ? "border-brand-300 bg-brand-50 text-brand-800"
                          : "border-exam-line bg-exam-panel text-exam-muted"
                    }`}
                  >
                    {q.no}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* 본문 — 좌: 기본 설명 / 우: 문제 */}
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
        <section className="border-b border-exam-line bg-exam-raised px-6 py-7 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
          <p className={eyebrow}>{question.brief.label}</p>
          <h2 className="mt-3 text-[20px] font-black tracking-tight text-exam-text md:text-[22px]">
            {question.brief.title}
          </h2>

          <div className="mt-5 space-y-4">
            {question.brief.paragraphs.map((p) => (
              <p key={p} className="text-[15px] leading-[1.95] text-exam-text/90">
                {p}
              </p>
            ))}
          </div>

          {question.brief.list && (
            <ul className={`mt-5 space-y-2.5 p-5 ${panel}`}>
              {question.brief.list.map((l) => (
                <li key={l} className="text-[15px] leading-relaxed text-exam-text">
                  {l}
                </li>
              ))}
            </ul>
          )}

          {question.brief.table && (
            <div className={`mt-5 overflow-x-auto ${panel}`}>
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-exam-line">
                    {question.brief.table.head.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 font-black tabular-nums text-exam-text"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.brief.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={`whitespace-nowrap px-4 py-3 tabular-nums ${
                            c === 0 ? "font-bold text-exam-text" : "text-exam-muted"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {question.brief.note && (
            <p className="mt-5 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
              {question.brief.note}
            </p>
          )}
        </section>

        <section className="px-6 py-7 lg:overflow-y-auto lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-3">
            <p className={eyebrow}>
              {question.no}번 · {question.type === "essay" ? "서술형" : "객관식"}
            </p>
            <p className="text-[12px] font-bold tabular-nums text-exam-muted">
              {index + 1} / {list.length}
            </p>
          </div>

          <h1 className="mt-4 whitespace-pre-line text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]">
            {question.stem}
          </h1>

          {question.type === "choice" ? (
            <fieldset className="mt-7">
              <legend className="sr-only">보기 선택</legend>
              <ul className="grid gap-2">
                {question.choices?.map((c, i) => {
                  const on = value === i;
                  return (
                    <li key={c}>
                      <label
                        className={`flex cursor-pointer items-start gap-4 rounded-md border p-4 transition-colors ${
                          on
                            ? "border-brand-700 bg-brand-50"
                            : "border-exam-line bg-exam-panel hover:border-brand-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={i}
                          checked={on}
                          onChange={() => setAnswer(studentId, subject, question.id, i)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border text-[13px] font-bold tabular-nums ${
                            on
                              ? "border-brand-700 bg-brand-900 text-white"
                              : "border-exam-line text-exam-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[15px] leading-[1.7] text-exam-text">{c}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : (
            <div className="mt-7">
              {question.guide && (
                <ol className={`mb-4 space-y-2 p-5 ${panel}`}>
                  <li className={eyebrow}>이렇게 써 보세요</li>
                  {question.guide.map((g, i) => (
                    <li key={g} className="flex gap-2.5 text-[14px] leading-relaxed text-exam-text">
                      <span className="font-bold tabular-nums text-exam-muted">{i + 1}.</span>
                      {g}
                    </li>
                  ))}
                </ol>
              )}
              <textarea
                rows={9}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setAnswer(studentId, subject, question.id, e.target.value)}
                placeholder={question.placeholder}
                aria-label="서술형 답안"
                className="w-full rounded-md border border-exam-line bg-exam-panel px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-brand-500"
              />
              <p className="mt-2 text-right text-[12px] tabular-nums text-exam-muted">
                {(typeof value === "string" ? value : "").trim().length}자
              </p>
            </div>
          )}

          <p className="mt-6 border-t border-exam-line pt-4 text-[12px] leading-relaxed text-exam-muted">
            답을 고르지 않아도 다음 문항으로 넘어갈 수 있습니다. 제출한 뒤에는 문항마다 왜 그렇게
            답했는지(또는 왜 풀지 못했는지) 적는 단계가 이어집니다.
          </p>
        </section>
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="container-x flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAskForfeit(true)} className={btnDanger}>
              포기하기
            </button>
            <p className="hidden text-[12px] leading-tight text-exam-muted sm:block">
              포기하면 <b className="text-rose-600">이 과목의 응시 기회가 사라집니다.</b>
              <br />
              지금까지 쓴 답안도 저장되지 않습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>

            {isLast ? (
              <button type="button" onClick={() => setAskSubmit(true)} className={btnPrimary}>
                제출하기
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {askForfeit && (
        <ForfeitDialog
          subjectName={meta.name}
          remain={`${pad(Math.floor(remain / 60))}:${pad(remain % 60)}`}
          onCancel={() => setAskForfeit(false)}
          onConfirm={() => forfeitSubject(studentId, subject)}
        />
      )}

      {askSubmit && (
        <SubmitDialog
          subjectName={meta.name}
          unanswered={unanswered}
          onCancel={() => setAskSubmit(false)}
          onConfirm={() => {
            submitSubject(studentId, subject);
            setAskSubmit(false);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── 응시 전 안내 ───────────────────────── */

function StartGate({ subject, onStart }: { subject: SubjectId; onStart: () => void }) {
  const meta = subjectOf(subject)!;
  return (
    <div className="container-x flex min-h-[calc(100dvh-4rem)] items-center py-10">
      <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
        <p className={eyebrow}>응시 안내</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
          {meta.name} 평가를 시작합니다
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          시작 버튼을 누르면 <b className="text-exam-text">전체화면</b>으로 전환되고 제한 시간이
          흐르기 시작합니다.
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-exam-line pt-6 text-[13px] leading-relaxed text-exam-muted">
          <li>
            · 문항 <b className="text-exam-text">{QUESTIONS_PER_SUBJECT}개</b> · 제한 시간{" "}
            <b className="text-exam-text">{meta.limitMin}분</b> (남은 시간은 오른쪽 위에 표시됩니다)
          </li>
          <li>· 답을 고르지 않아도 다음 문항으로 넘어갈 수 있습니다.</li>
          <li>· 제출 후에는 문항마다 왜 그렇게 답했는지 적는 단계가 이어집니다.</li>
          <li>· 중간에 포기하면 이 과목의 응시 기회가 사라집니다.</li>
          <li>· 보호자는 문제 풀이에 개입할 수 없습니다.</li>
        </ul>

        <button type="button" onClick={onStart} className={`mt-8 w-full py-4 text-[16px] ${btnPrimary}`}>
          전체화면으로 평가 시작
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-2.5 text-center text-[11px] text-exam-muted">
          브라우저가 전체화면을 막는 경우에는 일반 창으로 진행됩니다.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── 제출 후 해석 작성 ───────────────────────── */

function ReflectionStep({ subject, studentId }: { subject: SubjectId; studentId: string }) {
  const record = useExamRecord(studentId);
  const rec = record.subjects[subject];
  const meta = subjectOf(subject)!;
  const list = questionsOf(subject);
  const [warn, setWarn] = useState(false);

  const written = list.filter((q) => (rec.reflections[q.id] ?? "").trim().length >= 5).length;
  const complete = written === list.length;

  const answerText = (q: Question) => {
    const v = rec.answers[q.id];
    if (q.type === "choice") {
      if (typeof v !== "number") return { label: "미응답", body: "답을 고르지 않았습니다." };
      return { label: `${v + 1}번 선택`, body: q.choices?.[v] ?? "" };
    }
    const t = typeof v === "string" ? v.trim() : "";
    return t ? { label: "작성함", body: t } : { label: "미응답", body: "답을 작성하지 않았습니다." };
  };

  return (
    <div className="container-x py-8 md:py-10">
      <div className="border-b-2 border-exam-text/80 pb-5">
        <p className={eyebrow}>제출 완료 · 해석 작성</p>
        <h1 className="mt-2.5 text-[24px] font-black tracking-tight text-exam-text md:text-[28px]">
          {meta.name} — 문항별 해석을 적어 주세요
        </h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-exam-muted">
          답안은 이미 제출되어 <b className="text-exam-text">수정할 수 없습니다.</b> 대신 각 문항에
          대해 <b className="text-exam-text">왜 그 답을 골랐는지</b>, 또는{" "}
          <b className="text-exam-text">왜 풀지 못했는지</b>를 적어 주세요. 이 내용은 채점 점수에
          반영되지 않고, 전문가가 사고 과정을 읽는 자료로만 쓰입니다.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-exam-line bg-exam-panel px-5 py-3.5">
        <p className="text-[13px] font-bold tabular-nums text-exam-text">
          작성 {written} / {list.length}
        </p>
        <span className="h-1 w-40 overflow-hidden bg-exam-raised">
          <span
            className="block h-full bg-brand-600 transition-[width]"
            style={{ width: `${(written / list.length) * 100}%` }}
          />
        </span>
      </div>

      <ol className="mt-4 space-y-3">
        {list.map((q) => {
          const a = answerText(q);
          const text = rec.reflections[q.id] ?? "";
          return (
            <li key={q.id} className={`p-6 ${panel}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded border border-brand-700 bg-brand-900 text-[12px] font-bold text-white">
                  {q.no}
                </span>
                <p className={eyebrow}>{q.type === "essay" ? "서술형" : "객관식"}</p>
              </div>

              <p className="mt-3 whitespace-pre-line text-[15px] font-bold leading-relaxed text-exam-text">
                {q.stem}
              </p>

              {/* 제출된 답 — 읽기 전용 */}
              <div className="mt-4 rounded-md border border-exam-line bg-exam-raised px-4 py-3.5">
                <p className="flex items-center gap-2 text-[12px] font-bold text-exam-muted">
                  내가 제출한 답
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] ${
                      a.label === "미응답"
                        ? "border-rose-300 bg-rose-50 text-rose-600"
                        : "border-exam-line bg-exam-panel text-exam-text"
                    }`}
                  >
                    {a.label}
                  </span>
                  <span className="text-[11px] font-medium text-exam-muted">수정 불가</span>
                </p>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-exam-text">
                  {a.body}
                </p>
              </div>

              <label
                htmlFor={`ref-${q.id}`}
                className="mt-4 block text-[14px] font-bold text-exam-text"
              >
                {a.label === "미응답"
                  ? "왜 풀지 못했는지 적어 주세요"
                  : "왜 그 답을 골랐는지 적어 주세요"}
              </label>
              <p className="mt-1 text-[12px] text-exam-muted">
                {a.label === "미응답"
                  ? "어느 부분에서 막혔는지, 무엇을 몰랐는지 쓰면 됩니다."
                  : "근거로 삼은 부분, 지운 보기와 그 이유를 쓰면 좋습니다."}
              </p>
              <textarea
                id={`ref-${q.id}`}
                rows={4}
                value={text}
                onChange={(e) => {
                  setWarn(false);
                  setReflection(studentId, subject, q.id, e.target.value);
                }}
                placeholder={
                  a.label === "미응답"
                    ? "예) 표에서 무엇을 빼야 하는지 몰라서 못 풀었습니다."
                    : "예) 지문에 '씨앗이 자랐는지 보려고'라는 말이 있어서 2번을 골랐습니다."
                }
                className="mt-2.5 w-full rounded-md border border-exam-line bg-exam-panel px-4 py-3 text-[14px] leading-relaxed text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-brand-500"
              />
              <p className="mt-1.5 text-right text-[11px] tabular-nums text-exam-muted">
                {text.trim().length}자 · 5자 이상
              </p>
            </li>
          );
        })}
      </ol>

      {warn && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800"
        >
          아직 해석을 적지 않은 문항이 있습니다. 모든 문항에 5자 이상 적어 주세요.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-exam-line pt-6">
        <p className="text-[12px] leading-relaxed text-exam-muted">
          작성한 내용은 자동 저장됩니다. 완료하면 이 과목의 응시가 끝납니다.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!complete) {
              setWarn(true);
              return;
            }
            await leaveFullscreen();
            finishReflection(studentId, subject);
          }}
          aria-disabled={!complete}
          className={complete ? btnPrimary : btnDisabled}
        >
          해석 작성 완료
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── 다이얼로그 ───────────────────────── */

function SubmitDialog({
  subjectName,
  unanswered,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-exam-line bg-exam-panel p-7">
        <p className={eyebrow}>제출 확인</p>
        <h2 id="submit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 답안을 제출할까요?
        </h2>

        {unanswered > 0 ? (
          <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3.5 text-[13px] leading-relaxed text-amber-800">
            아직 <b className="text-rose-600">{unanswered}문항</b>에 답하지 않았습니다. 그대로
            제출해도 되며, 제출 후 <b>왜 풀지 못했는지</b>를 적는 단계가 이어집니다.
          </p>
        ) : (
          <p className="mt-4 rounded border border-exam-line bg-exam-raised px-4 py-3.5 text-[13px] leading-relaxed text-exam-muted">
            모든 문항에 답했습니다. 제출 후에는 답안을 수정할 수 없습니다.
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            더 풀기
          </button>
          <button type="button" onClick={onConfirm} className={btnPrimary}>
            제출하기
          </button>
        </div>
      </div>
    </div>
  );
}

function ForfeitDialog({
  subjectName,
  remain,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  remain: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forfeit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-rose-300 bg-exam-panel p-7">
        <p className={eyebrow}>경고 · 되돌릴 수 없음</p>
        <h2 id="forfeit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 응시를 포기할까요?
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
          아직 <b className="tabular-nums text-exam-text">{remain}</b> 남았습니다. 지금 나가지 않고
          계속 풀 수 있습니다.
        </p>
        <ul className="mt-5 space-y-2 border-t border-exam-line pt-5 text-[13px] leading-relaxed text-exam-muted">
          <li>
            · 이 과목의 응시 기회가 <b className="text-rose-600">사라집니다.</b>
          </li>
          <li>· 지금까지 선택하거나 작성한 답안은 저장되지 않습니다.</li>
          <li>· 세 과목을 모두 제출해야 결과 리포트가 발행됩니다.</li>
        </ul>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnPrimary}>
            계속 응시하기
          </button>
          <button type="button" onClick={onConfirm} className={btnDanger}>
            포기하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 결과 화면 ───────────────────────── */

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x py-16 md:py-24">
      <div className={`mx-auto max-w-xl p-8 text-center md:p-12 ${panel}`}>{children}</div>
    </div>
  );
}

function Submitted({ subject }: { subject: SubjectId }) {
  const meta = subjectOf(subject)!;
  return (
    <Result>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-600">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-6 text-[24px] font-black text-exam-text">
        {meta.name} 응시가 끝났습니다
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        답안과 해석이 모두 저장되었습니다. 이 창을 닫으면 진단 현황 화면에서 제출 상태가
        갱신됩니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={async () => {
            await leaveFullscreen();
            window.close();
          }}
          className={btnPrimary}
        >
          창 닫기
        </button>
        <Link href="/exam" className={btnGhost}>
          진단 현황으로
        </Link>
      </div>
    </Result>
  );
}

function Forfeited({
  subject,
  studentId,
  attemptsLeft,
}: {
  subject: SubjectId;
  studentId: string;
  attemptsLeft: number;
}) {
  const meta = subjectOf(subject)!;
  return (
    <Result>
      <p className={eyebrow}>응시 중단</p>
      <h1 className="mt-3 text-[24px] font-black text-exam-text">{meta.name} 응시를 포기했습니다</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        이 과목의 응시 기회가 소모되었습니다. 남은 기회는{" "}
        <b className="tabular-nums text-rose-600">{attemptsLeft}회</b>입니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {attemptsLeft > 0 && (
          <button type="button" onClick={() => restartSubject(studentId, subject)} className={btnPrimary}>
            남은 기회로 다시 응시
          </button>
        )}
        <Link href="/exam" className={btnGhost}>
          진단 현황으로
        </Link>
      </div>
    </Result>
  );
}
