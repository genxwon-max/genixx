"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  levelOf,
  QUESTIONS_PER_SUBJECT,
  questionsByLevel,
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
      {/* 문항 머리 — 과목과 지금 문항의 위계를 적는다. 점(●)은 두지 않는다:
          과목은 이름으로 충분하고, 시험지에 색점이 박혀 있을 이유가 없다. */}
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{meta.name}</p>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              총 {QUESTIONS_PER_SUBJECT}문항 · 제한 {meta.limitMin}분
            </span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {question.level} {levelOf(question.level).name} · {index + 1} / {list.length}
          </p>
        </div>
      </div>

      {/* 본문 — 좌: 자료 / 가운데: 문제 / 우: 문항 이동판 */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_15.5rem] lg:overflow-hidden">
        <section className="order-2 border-b border-exam-line bg-exam-raised px-6 py-7 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
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

        <section className="order-3 px-6 py-7 lg:order-2 lg:overflow-y-auto lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
            <p className="text-[13px] font-semibold text-exam-text">
              <span className="tabular-nums">{question.no}</span>번
              <span className="ml-2 font-medium text-exam-muted">
                {question.type === "essay" ? "서술형" : "객관식"}
              </span>
            </p>
            <p className="text-[12px] font-medium tabular-nums text-exam-muted">
              {question.level} {levelOf(question.level).name}
            </p>
          </div>

          <h1 className="mt-5 whitespace-pre-line text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]">
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
                      {/* 고른 보기는 면을 물들이지 않고 테두리와 글자 굵기로 세운다.
                          답안지에 형광펜을 칠하지는 않는다. */}
                      <label
                        className={`flex cursor-pointer items-start gap-4 rounded-[6px] border p-4 transition-colors ${
                          on
                            ? "border-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
                            : "border-exam-line hover:border-exam-muted"
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
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                            on
                              ? "border-exam-text bg-exam-text text-white"
                              : "border-exam-line text-exam-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={`text-[15px] leading-[1.7] ${
                            on ? "font-semibold text-exam-text" : "text-exam-text"
                          }`}
                        >
                          {c}
                        </span>
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

        <QuestionPad
          subject={subject}
          index={index}
          isDone={(q) => isAnswered(q, rec.answers[q.id])}
          onPick={setIndex}
          doneLabel="답한 문항"
          doneVerb="응답함"
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
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

/* ───────────────────────── 문항 이동판 ───────────────────────── */

/**
 * 오른쪽에 붙는 문항 이동판.
 *
 * 문항이 열 개가 되면 「이전·다음」만으로는 6번에서 2번으로 돌아갈 수가 없다. 번호를
 * 늘어놓아 아무 데나 바로 갈 수 있게 하고, S위계 단위로 묶어 지금 어느 층을 풀고
 * 있는지 함께 보이게 했다.
 *
 * 응답 여부를 색으로만 알리지 않는다. 채운 문항은 번호가 진해지고 밑에 짧은 줄이
 * 그어진다. 색을 못 보는 아이도 같은 정보를 얻어야 한다.
 */
function QuestionPad({
  subject,
  index,
  isDone,
  onPick,
  doneLabel,
  doneVerb,
}: {
  subject: SubjectId;
  index: number;
  /** 이 문항을 채웠는가 — 응시 때는 「답했는가」, 해석 때는 「해석을 적었는가」 */
  isDone: (q: Question) => boolean;
  onPick: (i: number) => void;
  doneLabel: string;
  doneVerb: string;
}) {
  const groups = questionsByLevel(subject);
  const list = questionsOf(subject);
  const doneCount = list.filter(isDone).length;

  return (
    <aside
      aria-label="문항 이동"
      className="order-1 border-b border-exam-line bg-exam-panel px-6 py-5 lg:order-3 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:px-5 lg:py-7"
    >
      <p className="text-[12px] font-semibold tracking-[0.06em] text-exam-muted">문항 이동</p>

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <div key={g.level.id}>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-exam-text">
                {g.level.id} {g.level.name}
              </span>
              <span className="text-[11px] tabular-nums text-exam-muted">{g.items.length}문항</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-exam-muted">{g.level.desc}</p>

            <ol className="mt-2.5 flex flex-wrap gap-1.5">
              {g.items.map((q) => {
                const at = list.indexOf(q);
                const ok = isDone(q);
                const current = at === index;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => onPick(at)}
                      aria-current={current ? "step" : undefined}
                      aria-label={`${q.no}번 ${ok ? doneVerb : "아직 " + doneVerb.replace("함", "하지 않음")}`}
                      title={`${q.no}번 · ${q.type === "essay" ? "서술형" : "객관식"} · ${
                        ok ? doneVerb : "아직 " + doneVerb.replace("함", "하지 않음")
                      }`}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-[6px] border text-[13px] tabular-nums transition-colors ${
                        current
                          ? "border-exam-text bg-exam-text font-bold text-white"
                          : ok
                            ? "border-exam-muted font-bold text-exam-text hover:bg-exam-raised"
                            : "border-exam-line font-medium text-exam-muted hover:bg-exam-raised"
                      }`}
                    >
                      {q.no}
                      {/* 응답 표시 — 색이 아니라 형태로도 남긴다 */}
                      <span
                        aria-hidden
                        className={`mt-0.5 h-px w-3.5 ${
                          ok ? (current ? "bg-white" : "bg-exam-text") : "bg-transparent"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <dl className="mt-6 border-t border-exam-line pt-4 text-[12px]">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">{doneLabel}</dt>
          <dd className="font-semibold tabular-nums text-exam-text">
            {doneCount} / {list.length}
          </dd>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">남은 문항</dt>
          <dd className="font-semibold tabular-nums text-exam-text">{list.length - doneCount}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-exam-muted">
        번호 아래 줄이 있으면 {doneLabel}입니다. 순서대로 하지 않아도 되고, 언제든 돌아올 수
        있습니다.
      </p>
    </aside>
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

        <button
          type="button"
          onClick={onStart}
          className={`mt-8 w-full py-4 text-[16px] ${btnPrimary}`}
        >
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

/**
 * 제출 후 해석 작성.
 *
 * 응시 화면과 같은 틀을 쓴다 — 왼쪽에 자료, 가운데에 문항, 오른쪽에 이동판. 다른
 * 화면으로 옮겨 가면 아이는 시험이 한 번 더 시작되는 줄 알고, 방금 무엇을 보고 답했는지
 * 다시 찾아야 한다. 지문이 그대로 옆에 있어야 "그때 무엇을 보고 그렇게 생각했는지"를
 * 쓸 수 있다.
 *
 * 답안은 이미 제출되어 고칠 수 없다. 고른 보기는 그대로 보여 주되 입력은 잠그고,
 * 그 아래에 칸 하나가 새로 열린다 — 왜 그 답을 골랐는지.
 *
 * 정답은 알려 주지 않는다. 맞았는지 틀렸는지를 먼저 알려 주면 아이는 자기 생각을 적는
 * 대신 오답 노트를 쓴다. 여기서 받고 싶은 것은 채점 결과가 아니라 그때의 생각이다.
 */
function ReflectionStep({ subject, studentId }: { subject: SubjectId; studentId: string }) {
  const record = useExamRecord(studentId);
  const rec = record.subjects[subject];
  const meta = subjectOf(subject)!;
  const list = questionsOf(subject);
  const [index, setIndex] = useState(0);
  const [warn, setWarn] = useState(false);

  const question = list[index];
  const written = (q: Question) => (rec.reflections[q.id] ?? "").trim().length >= 5;
  const writtenCount = list.filter(written).length;
  const complete = writtenCount === list.length;
  const isLast = index === list.length - 1;

  const value = rec.answers[question.id];
  const picked = question.type === "choice" && typeof value === "number" ? value : null;
  const essayText = question.type === "essay" && typeof value === "string" ? value.trim() : "";
  const blank = question.type === "choice" ? picked === null : essayText.length === 0;
  const text = rec.reflections[question.id] ?? "";

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{meta.name}</p>
            <span className="text-[12px] text-exam-muted">제출 완료 · 해석 작성</span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {question.level} {levelOf(question.level).name} · {index + 1} / {list.length}
          </p>
        </div>
      </div>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_15.5rem] lg:overflow-hidden">
        {/* 왼쪽 — 응시 때 보던 자료를 그대로 둔다 */}
        <section className="order-2 border-b border-exam-line bg-exam-raised px-6 py-7 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
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
            <ul className="mt-5 space-y-2.5 border-t border-exam-line pt-5">
              {question.brief.list.map((l) => (
                <li key={l} className="text-[15px] leading-relaxed text-exam-text">
                  {l}
                </li>
              ))}
            </ul>
          )}

          {question.brief.table && (
            <div className="mt-5 overflow-x-auto border-t border-exam-line pt-5">
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
        </section>

        {/* 가운데 — 문항과 내가 낸 답, 그 아래 새로 열리는 칸 하나 */}
        <section className="order-3 px-6 py-7 lg:order-2 lg:overflow-y-auto lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
            <p className="text-[13px] font-semibold text-exam-text">
              <span className="tabular-nums">{question.no}</span>번
              <span className="ml-2 font-medium text-exam-muted">
                {question.type === "essay" ? "서술형" : "객관식"}
              </span>
            </p>
            <p className="text-[12px] font-medium text-exam-muted">제출완료 · 수정 불가</p>
          </div>

          <h1 className="mt-5 whitespace-pre-line text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]">
            {question.stem}
          </h1>

          {/* 낸 답 — 응시 때와 같은 모양으로 두되 잠근다 */}
          {question.type === "choice" ? (
            <ul className="mt-7 grid gap-2">
              {question.choices?.map((c, i) => {
                const on = picked === i;
                return (
                  <li
                    key={c}
                    className={`flex items-start gap-4 rounded-[6px] border p-4 ${
                      on ? "border-exam-text" : "border-exam-line opacity-60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                        on
                          ? "border-exam-text bg-exam-text text-white"
                          : "border-exam-line text-exam-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[15px] leading-[1.7] ${
                        on ? "font-semibold text-exam-text" : "text-exam-muted"
                      }`}
                    >
                      {c}
                    </span>
                    {on && (
                      <span className="ml-auto shrink-0 self-center text-[12px] font-semibold text-exam-text">
                        내가 고른 답
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-7">
              <p className="text-[12px] font-semibold text-exam-muted">내가 쓴 답</p>
              <p className="mt-2 min-h-[6rem] whitespace-pre-line rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text">
                {essayText || <span className="text-exam-muted">답을 작성하지 않았습니다.</span>}
              </p>
            </div>
          )}

          {blank && question.type === "choice" && (
            <p className="mt-3 text-[13px] font-semibold text-exam-text">
              이 문항은 답을 고르지 않으셨습니다.
            </p>
          )}

          {/* 새로 열리는 칸 하나 */}
          <div className="mt-8 border-t border-exam-line pt-6">
            <label
              htmlFor={`ref-${question.id}`}
              className="block text-[15px] font-bold text-exam-text"
            >
              {blank
                ? "왜 풀지 못했는지 적어 주세요"
                : picked !== null
                  ? `${picked + 1}번을 고른 까닭을 적어 주세요`
                  : "왜 그렇게 썼는지 적어 주세요"}
            </label>
            <p className="mt-1.5 text-[13px] leading-relaxed text-exam-muted">
              {blank
                ? "어느 부분에서 막혔는지, 무엇을 몰랐는지 쓰면 됩니다. 모르겠다고 써도 괜찮습니다."
                : "근거로 삼은 부분과, 지운 보기가 있다면 왜 지웠는지를 쓰면 좋습니다."}
            </p>
            <textarea
              id={`ref-${question.id}`}
              rows={6}
              value={text}
              onChange={(e) => {
                setWarn(false);
                setReflection(studentId, subject, question.id, e.target.value);
              }}
              placeholder={
                blank
                  ? "예) 표에서 무엇을 빼야 하는지 몰라서 못 풀었습니다."
                  : "예) 지문에 '씨앗이 자랐는지 보려고'라는 말이 있어서 2번을 골랐습니다."
              }
              className="mt-3 w-full rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-exam-text"
            />
            <p className="mt-2 flex items-center justify-between gap-3 text-[12px] tabular-nums text-exam-muted">
              <span>맞고 틀리고를 보는 칸이 아닙니다. 점수에 반영되지 않습니다.</span>
              <span>{text.trim().length}자 · 5자 이상</span>
            </p>
          </div>
        </section>

        <QuestionPad
          subject={subject}
          index={index}
          isDone={written}
          onPick={setIndex}
          doneLabel="해석을 적은 문항"
          doneVerb="작성함"
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <p className="hidden text-[12px] leading-tight text-exam-muted sm:block">
            {warn
              ? "아직 해석을 적지 않은 문항이 있습니다. 번호판에서 줄이 없는 번호를 확인하세요."
              : "쓰는 대로 저장됩니다. 모든 문항에 적으면 이 과목이 끝납니다."}
          </p>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              작성 {writtenCount}/{list.length}
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
                해석 제출하고 마치기
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

        {/* 색면을 깔지 않는다. 아이가 제출을 앞두고 보는 마지막 화면이라,
            노란 상자가 서면 「잘못했다」로 읽힌다. 답을 비운 것은 잘못이 아니다. */}
        {unanswered > 0 ? (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            아직 <b className="text-exam-text">{unanswered}문항</b>에 답하지 않았습니다. 그대로
            제출해도 되며, 제출 후 <b className="text-exam-text">왜 풀지 못했는지</b>를 적는 단계가
            이어집니다.
          </p>
        ) : (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
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
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-exam-line text-exam-text">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-6 text-[24px] font-black text-exam-text">{meta.name} 응시가 끝났습니다</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        답안과 해석이 모두 저장되었습니다. 이 창을 닫으면 진단 현황 화면에서 제출 상태가 갱신됩니다.
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
      <h1 className="mt-3 text-[24px] font-black text-exam-text">
        {meta.name} 응시를 포기했습니다
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        이 과목의 응시 기회가 소모되었습니다. 남은 기회는{" "}
        <b className="tabular-nums text-rose-600">{attemptsLeft}회</b>입니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {attemptsLeft > 0 && (
          <button
            type="button"
            onClick={() => restartSubject(studentId, subject)}
            className={btnPrimary}
          >
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
