"use client";

import { useState } from "react";
import { ArrowRight } from "@/components/Icons";
import { answerSubjects, lineScreens, linesOf, tally, type Line } from "@/lib/answerKey";
import {
  answerKind,
  autoGraded,
  markLabel,
  pointText,
  type Grades,
  type Mark,
  type SubjectId,
} from "@/lib/exam";
import { evalName, seasonOf } from "@/lib/examCatalog";
import type { ExamRecord } from "@/lib/examStore";
import { BriefPanel, QuestionBody, ScreenColumn, setRange } from "./ExamSession";
import { watermarkOf } from "./ExamWatermark";
import PaperDialog from "./PaperDialog";
import type { Registration } from "./Registrations";
import { btnGhost, btnPrimary } from "./ui";

/**
 * 답안 풀이 보기 — 정답과 해설의 정오표에서 여는 창.
 *
 * 정오표는 문항마다 정답 · 내 답 · 정오를 한 줄로만 적는다. 문제가 무엇이었고 내가 어느 보기를
 * 골랐는지는 이 창이 보여 준다. **응시 화면과 같은 틀**이다 — 왼쪽에 자료, 가운데에 문항,
 * 오른쪽에 문항 이동판, 아래에 이전 · 다음(./PaperDialog.tsx). 아이가 문제를 풀던 그 종이
 * 위에 채점한 표시만 얹혀 있어야 「아까 그 문제」로 읽힌다. 문항을 그리는 조각도 응시 화면의
 * 것 그대로다(./ExamSession.tsx의 BriefPanel · ScreenColumn · QuestionBody).
 *
 * 응시 화면과 다른 것은 셋이다.
 *   문항 머리   정오 딱지(정답 · 부분 정답 · 오답 · 미응답 · 채점 중). 객관식은 정답 보기와 내 답을 짚는다
 *   문항 아래   채점 결과 — 단답형의 정답, 서술형 · 논술형 · 사진의 예시 답, 전문가가 매긴 점수와 해설
 *   이동판      답했는지가 아니라 정오로 칠한다
 *
 * 머리의 과목 단추로 과목을 바꾼다. 유료 진단은 과목마다 따로 응시했지만 답을 되짚을 때는
 * 창을 닫지 않고 옆 과목으로 넘어갈 수 있어야 한다.
 *
 * ⚠ 문항 자료(lib/examQuestions.ts)에는 해설 문장이 없다. 해설은 채점자가 문항마다 적은 것
 *   (grades의 comment)이 있을 때만 보인다 — 없는 해설을 지어 넣지 않는다.
 */

/** 창이 처음 펼 문항 — 과목과 그 과목 안의 번호 */
export type ReviewAt = { subject: SubjectId; no: number };

export default function AnswerReview({
  row,
  record,
  grades,
  at,
  onClose,
}: {
  row: Registration;
  record: ExamRecord;
  /** 전문가가 매긴 점수 — 정오표와 같은 것을 넘긴다 */
  grades?: Grades;
  at: ReviewAt;
  onClose: () => void;
}) {
  const available = answerSubjects(row);
  const [subject, setSubject] = useState<SubjectId>(at.subject);
  /** 지금 보는 화면의 차례(0부터) — 응시 때처럼 문항 하나이거나, 묶인 문항 둘셋이다 */
  const [index, setIndex] = useState(() => {
    const first = lineScreens(at.subject, linesOf(at.subject, record, grades));
    return Math.max(
      0,
      first.findIndex((screen) => screen.some((l) => l.no === at.no)),
    );
  });

  const lines = linesOf(subject, record, grades);
  const screens = lineScreens(subject, lines);
  if (screens.length === 0) return null;

  const screen = screens[Math.min(index, screens.length - 1)];
  const order = lines.map((l) => l.q);
  const lineOf = new Map(lines.map((l) => [l.q.id, l]));
  const count = tally(lines);
  const isLast = index >= screens.length - 1;
  const name = evalName(row.round, row.track, row.info?.label);
  const subjectName = available.find((s) => s.id === subject)?.short ?? "";
  /* 응시 때 문항 위에 깔려 있던 무늬 — 같은 해를 읽는다 */
  const watermark = watermarkOf(
    seasonOf({ id: row.round, opensOn: row.info?.opensOn ?? "" }).year,
  );
  const goTo = (line: Line) => setIndex(screens.findIndex((sc) => sc.includes(line)));

  return (
    <PaperDialog
      label={`${name} ${subjectName} 답안 풀이`}
      name={name}
      note={`${subjectName} 답안 풀이`}
      subjects={available}
      subject={subject}
      onSubject={(id) => {
        setSubject(id);
        setIndex(0);
      }}
      onClose={onClose}
      resetKey={`${subject}-${index}`}
      footer={
        <>
          <p className="hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
            {subjectName} {lines.length}문항 · 정답 {count.right}
            {count.partial > 0 && ` · 부분 정답 ${count.partial}`} · 오답 {count.wrong} · 미응답{" "}
            {count.empty}
            {count.pending > 0 && ` · 채점 중 ${count.pending}`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>
            {isLast ? (
              <button type="button" onClick={onClose} className={btnPrimary}>
                닫기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(screens.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      }
    >
      <BriefPanel
        brief={screen[0].q.brief}
        range={setRange(order, screen[0].q)}
        watermark={watermark}
      />

      <ScreenColumn
        order={order}
        screen={screen.map((l) => l.q)}
        watermark={watermark}
        renderQuestion={(q) => {
          const line = lineOf.get(q.id)!;
          return (
            <div key={q.id}>
              {/* 문항과 낸 답 — 응시 때와 같은 모양, 다만 잠겨 있다(fieldset disabled) */}
              <fieldset disabled className="block [&_label]:cursor-default">
                <QuestionBody
                  q={q}
                  num={line.no}
                  value={line.value}
                  onAnswer={() => {}}
                  watermark={watermark}
                  graded={line.mark}
                />
              </fieldset>
              <Verdict line={line} />
            </div>
          );
        }}
      />

      <ReviewPad
        lines={lines}
        count={count}
        isHere={(l) => screen.includes(l)}
        isCurrent={(l) => l === screen[0]}
        onPick={goTo}
      />
    </PaperDialog>
  );
}

/* ───────────────────────── 문항 아래의 채점 결과 ───────────────────────── */

const verdictTone: Record<Mark, string> = {
  right: "text-emerald-700",
  partial: "text-amber-600",
  wrong: "text-rose-600",
  empty: "text-rose-600",
  pending: "text-exam-text",
};

const verdictHead: Record<Mark, string> = {
  right: "정답입니다",
  partial: "부분 정답입니다",
  wrong: "오답입니다",
  empty: "답하지 않았습니다",
  pending: "채점 중입니다",
};

/**
 * 문항 바로 아래에 붙는 채점 결과.
 *
 * 문항과 한 덩이로 붙인다 — 응시 화면의 해석 칸이 서는 그 자리다. 고딕으로 적는다: 문항과
 * 보기는 시험지의 글이지만 여기는 화면이 하는 말이다.
 *
 * 기계로 채점하는 문항(객관식 · 단답형)은 정답을 바로 알려 준다. 서술형 · 논술형 · 사진은
 * 전문가가 채점하기 전까지 정오를 말하지 않고, 채점이 끝나면 받은 점수와 채점자가 적은 해설을
 * 보인다. 문항에 예시 답이 있으면 그것도 함께 보인다.
 */
function Verdict({ line }: { line: Line }) {
  const { q, value, mark, points, max, expert, comment } = line;
  const auto = autoGraded(q);
  const picked = typeof value === "number" ? value : null;

  return (
    <section className="relative border-t border-exam-line bg-exam-raised px-6 py-5 font-sans lg:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className={`text-[14px] font-bold ${verdictTone[mark]}`}>
          {verdictHead[mark]}
          {/* 전문가가 점수를 매긴 문항과 부분 정답은 몇 점인지 적는다 */}
          {points !== null && (expert || mark === "partial") && (
            <span className="ml-2 text-[13px] tabular-nums">
              {pointText(points)} / {max}점
            </span>
          )}
        </p>
        <p className="text-[12px] text-exam-muted">{answerKind(q)}</p>
      </div>

      {q.type === "choice" ? (
        mark !== "right" && (
          <p className="mt-1.5 text-[13px] text-exam-text">
            {picked !== null && <>내 답 {picked + 1}번 · </>}정답 {q.answer! + 1}번
          </p>
        )
      ) : auto ? (
        /* 단답형 — 칸마다 정답을 적는다 */
        <dl className="mt-2.5 space-y-1 text-[13px] text-exam-text">
          {q.blanks!.map((b, i) =>
            b.optional ? null : (
              <div key={i} className="flex flex-wrap gap-x-2">
                <dt className="font-bold">{b.label ? `${b.label} 정답` : "정답"}</dt>
                <dd className="tabular-nums">
                  {b.accept![0]}
                  {b.suffix ?? ""}
                </dd>
              </div>
            ),
          )}
        </dl>
      ) : (
        <>
          {mark === "pending" && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-exam-muted">
              전문가가 채점하고 있습니다. 채점이 끝나면 이 자리에 점수가 표시됩니다.
            </p>
          )}
          {q.sampleAnswer && (
            <div className="mt-3">
              <p className="text-[12px] font-bold text-exam-muted">예시 답</p>
              <ul className="mt-1 space-y-1">
                {q.sampleAnswer.map((a, k) => (
                  <li key={k} className="text-[13px] leading-relaxed text-exam-text">
                    {q.blanks?.[k]?.label ? `${q.blanks[k].label} : ` : ""}
                    {a}
                    {q.blanks?.[k]?.suffix ?? ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* 채점자가 적은 해설 — 문항 자료에는 해설이 없어, 있을 때만 선다 */}
      {comment && (
        <div className="mt-3">
          <p className="text-[12px] font-bold text-exam-muted">해설</p>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-exam-text">
            {comment}
          </p>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── 문항 이동판 ───────────────────────── */

/** 이동판 번호의 색 — 정오마다 */
const padTone: Record<Mark, string> = {
  right: "border-emerald-300 bg-emerald-50 font-medium text-emerald-800 hover:bg-emerald-100",
  partial: "border-amber-300 bg-amber-50 font-medium text-amber-800 hover:bg-amber-100",
  wrong: "border-rose-300 bg-rose-50 font-medium text-rose-700 hover:bg-rose-100",
  empty: "border-dashed border-rose-300 bg-white font-medium text-rose-700 hover:bg-rose-50",
  pending: "border-exam-line bg-exam-raised font-medium text-exam-muted hover:bg-slate-200",
};

const padOrder: Mark[] = ["right", "partial", "wrong", "empty", "pending"];

/**
 * 오른쪽에 붙는 문항 이동판 — 응시 화면의 이동판(QuestionPad)과 같은 자리 · 같은 번호 칸.
 *
 * 응시 때는 「답했는가」로 칸을 칠했다. 여기서는 **정오**로 칠한다 — 어느 문항을 다시 볼지를
 * 번호만 보고 고른다. 색만으로 가르지 않는다: 미응답은 점선 테두리이고, 번호마다 붙인
 * 이름(「문항 3 오답」)과 아래의 셈이 같은 것을 글로 말한다.
 */
function ReviewPad({
  lines,
  count,
  isHere,
  isCurrent,
  onPick,
}: {
  lines: Line[];
  count: ReturnType<typeof tally>;
  /** 지금 화면에 함께 서 있는 문항인가 */
  isHere: (line: Line) => boolean;
  /** 그중에서도 지금 짚고 있는 하나 */
  isCurrent: (line: Line) => boolean;
  onPick: (line: Line) => void;
}) {
  return (
    <aside
      aria-label="문항 이동"
      className="order-1 border-b border-exam-line bg-exam-panel px-6 py-5 lg:order-3 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:px-5 lg:py-7"
    >
      <p className="text-[12px] font-semibold tracking-[0.06em] text-exam-muted">문항 이동</p>

      <ol className="mt-4 flex flex-wrap gap-1.5">
        {lines.map((l) => {
          const current = isCurrent(l);
          const here = isHere(l);
          return (
            <li key={l.q.id}>
              <button
                type="button"
                onClick={() => onPick(l)}
                aria-current={current ? "step" : undefined}
                aria-label={`문항 ${l.no} ${markLabel[l.mark]}`}
                title={`문항 ${l.no} · ${answerKind(l.q)} · ${markLabel[l.mark]}`}
                className={`flex h-9 w-9 items-center justify-center rounded-[2px] border text-[13px] tabular-nums transition-colors ${
                  current
                    ? "border-exam-text bg-exam-text font-bold text-white"
                    : `${padTone[l.mark]} ${
                        /* 같은 화면에 함께 서 있는 문항 — 지금 보이지만 짚은 것은 아니다 */
                        here ? "ring-1 ring-exam-text" : ""
                      }`
                }`}
              >
                {l.no}
              </button>
            </li>
          );
        })}
      </ol>

      <dl className="mt-6 space-y-1.5 border-t border-exam-line pt-4 text-[12px]">
        {padOrder
          /* 부분 정답은 채점자가 점수를 매긴 뒤에만 나온다 — 없으면 줄을 세우지 않는다 */
          .filter((m) => m !== "partial" || count.partial > 0)
          .map((m) => (
            <div key={m} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-exam-muted">
                <span
                  aria-hidden
                  className={`h-3.5 w-3.5 rounded-[2px] border ${padTone[m].split(" hover:")[0]}`}
                />
                {markLabel[m]}
              </dt>
              <dd className="font-semibold tabular-nums text-exam-text">{count[m]}</dd>
            </div>
          ))}
      </dl>
    </aside>
  );
}
