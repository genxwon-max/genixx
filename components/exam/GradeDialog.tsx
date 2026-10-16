"use client";

import { useState } from "react";
import { ArrowRight } from "@/components/Icons";
import { lineScreens } from "@/lib/answerKey";
import { blankTitle } from "@/lib/answerSlots";
import {
  answerKind,
  autoGraded,
  keyText,
  markLabel,
  pointText,
  type SubjectId,
} from "@/lib/exam";
import {
  gradeOf,
  gradeStat,
  gradeStateLabel,
  type GradeEdit,
  type GradeLine,
  type GradeMarks,
  type GradeState,
  type GradeSubject,
} from "@/lib/gradeSheet";
import { BriefPanel, QuestionBody, ScreenColumn, setRange } from "./ExamSession";
import { watermarkOf } from "./ExamWatermark";
import PaperDialog from "./PaperDialog";
import { btnGhost, btnPrimary } from "./ui";

/**
 * 채점하기 — 운영 콘솔의 「회원 채점」 상세(정오표)에서 여는 창.
 *
 * 채점자는 **아이가 본 시험지 그대로**를 1번부터 끝까지 넘기며 채점한다. 틀은 응시 화면과
 * 같다(./PaperDialog.tsx) — 왼쪽에 자료, 가운데에 문항과 아이가 낸 답, 오른쪽에 문항 이동판.
 * 문항을 그리는 조각도 응시 화면의 것이라(./ExamSession.tsx), 사진으로 낸 답과 그림 칸에 그린
 * 답도 아이가 본 자리에 그대로 보인다.
 *
 * 응시 화면과 다른 것은 셋이다.
 *   오른쪽 아래  **점수 칸** — AI가 먼저 매긴 점수가 깔려 있고, 채점자가 고친다
 *   문항 아래    채점에 읽을 것 — 정답 · 예시 답 · 채점 기준 · AI 채점 해설 · 자아성찰 · 해설 칸
 *   이동판       답했는지가 아니라 채점 상태(확인 전 · 확인 · 수정)로 칠한다
 *
 * ── 모든 문항을 고칠 수 있다 ──
 * 객관식처럼 기계가 채점한 문항도 점수 칸이 열려 있다. 2점 만점에 2점을 받은 문항을 1점으로
 * 낮출 수 있고, 0점을 받은 문항에 부분 점수를 줄 수도 있다 — 정답을 골랐어도 자아성찰이
 * 「잘 모르겠어서 하나를 골랐어요」면 그 점수는 다른 점수다.
 *
 * ── 저장은 따로 누르지 않는다 ──
 * 점수를 고치면 그 자리에서 저장된다. 고칠 것이 없는 문항은 「확인하고 다음」을 누르면 AI의
 * 점수 그대로 확인한 것으로 남는다. 번호판으로 건너뛴 문항은 「확인 전」으로 남아, 어느 문항을
 * 아직 안 봤는지가 번호판에 보인다.
 *
 * ── 사진으로 낸 답은 AI가 채점하지 않는다 ──
 * 그 문항에는 깔려 있는 점수가 없다. 채점자가 사진을 보고 점수를 눌러야 점수가 생기고, 누르지
 * 않고 넘기면 「확인 전」 · 「채점 중」으로 남는다.
 */

/** 창이 처음 펼 문항 — 과목과 그 과목 안의 번호 */
export type GradeAt = { subject: SubjectId; no: number };

export default function GradeDialog({
  name,
  seat,
  subjects,
  marks,
  at,
  onMark,
  onClose,
}: {
  /** 진단 이름 — 「2026 파일럿 3회차」 */
  name: string;
  /** 응시번호 — 채점자에게는 이름을 보이지 않는다 */
  seat: string;
  subjects: GradeSubject[];
  marks: GradeMarks;
  at: GradeAt;
  /** 점수나 해설을 고쳤을 때, 「확인하고 다음」을 눌렀을 때 — 받은 쪽이 바로 저장한다 */
  onMark: (edits: GradeEdit[]) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState<SubjectId>(at.subject);
  const [index, setIndex] = useState(() => {
    const first = subjects.find((s) => s.id === at.subject);
    if (!first) return 0;
    return Math.max(
      0,
      lineScreens(first.lines).findIndex((sc) => sc.some((l) => l.no === at.no)),
    );
  });

  const at0 = Math.max(
    0,
    subjects.findIndex((s) => s.id === subject),
  );
  const current = subjects[at0];
  if (!current) return null;

  const lines = current.lines;
  const screens = lineScreens(lines);
  if (screens.length === 0) return null;

  const screen = screens[Math.min(index, screens.length - 1)];
  const order = lines.map((l) => l.q);
  const lineOf = new Map(lines.map((l) => [l.q.id, l]));
  const stat = gradeStat(subjects, marks);
  const isFirst = at0 === 0 && index === 0;
  const isLast = at0 === subjects.length - 1 && index >= screens.length - 1;
  const watermark = watermarkOf(name);

  /** 한 문항의 점수나 해설을 고친다 — 고치지 않은 쪽은 지금 값을 그대로 둔다 */
  const put = (line: GradeLine, patch: { points?: number; comment?: string }) => {
    const m = marks[line.q.id];
    onMark([
      {
        id: line.q.id,
        points: patch.points ?? m?.points ?? null,
        comment: patch.comment ?? m?.comment ?? "",
      },
    ]);
  };

  /**
   * 지금 화면의 문항들을 지금 점수로 확인한다.
   * 아직 점수가 없는 문항(AI가 채점하지 않는 사진 답안)은 건너뛴다 — 점수를 매기지 않고 넘긴
   * 것을 0점으로 적으면 안 된다. 그 문항은 「확인 전」으로 남는다.
   */
  const confirm = () =>
    onMark(
      screen.flatMap((l) => {
        const g = gradeOf(l, marks);
        return g.scored ? [{ id: l.q.id, points: g.points, comment: g.comment }] : [];
      }),
    );

  const next = () => {
    confirm();
    if (index < screens.length - 1) return setIndex(index + 1);
    if (isLast) return onClose();
    /* 과목의 마지막 문항 다음은 다음 과목의 1번이다 — 1번부터 끝까지 한 줄로 이어진다 */
    setSubject(subjects[at0 + 1].id);
    setIndex(0);
  };

  const prev = () => {
    if (index > 0) return setIndex(index - 1);
    if (at0 === 0) return;
    const before = subjects[at0 - 1];
    setSubject(before.id);
    setIndex(lineScreens(before.lines).length - 1);
  };

  return (
    <PaperDialog
      label={`${name} ${seat} ${current.short} 채점`}
      name={name}
      note={`응시번호 ${seat} · ${current.short} 채점`}
      subjects={subjects}
      subject={current.id}
      onSubject={(id) => {
        setSubject(id);
        setIndex(0);
      }}
      onClose={onClose}
      resetKey={`${current.id}-${index}`}
      footer={
        <>
          <p className="hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
            확인 {stat.done} / {stat.total}문항 · 점수 {pointText(stat.got)} / {stat.max}점
            {stat.edited > 0 && ` · 수정 ${stat.edited}문항`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={isFirst}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>
            <button type="button" onClick={next} className={btnPrimary}>
              {isLast ? "확인하고 마치기" : "확인하고 다음"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </button>
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
          const g = gradeOf(line, marks);
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
                  graded={g.mark}
                />
              </fieldset>
              <GradeNotes
                key={q.id}
                line={line}
                comment={g.comment}
                onComment={(comment) => put(line, { comment })}
              />
            </div>
          );
        }}
      />

      {/* 오른쪽 — 위에 문항 이동판, **아래에 점수 칸**. 좁은 화면에서는 둘이 문항 위에 쌓인다 */}
      <div className="order-1 flex min-h-0 flex-col border-b border-exam-line bg-exam-panel lg:order-3 lg:border-b-0 lg:border-l">
        <GradePad
          lines={lines}
          marks={marks}
          isHere={(l) => screen.includes(l)}
          isCurrent={(l) => l === screen[0]}
          onPick={(l) => setIndex(screens.findIndex((sc) => sc.includes(l)))}
        />
        <section
          aria-label="점수"
          className="shrink-0 space-y-5 border-t border-exam-line px-6 py-5 lg:max-h-[60%] lg:overflow-y-auto lg:px-5"
        >
          {screen.map((l) => (
            <ScoreBox
              key={l.q.id}
              line={l}
              grade={gradeOf(l, marks)}
              onPoints={(points) => put(l, { points })}
            />
          ))}
        </section>
      </div>
    </PaperDialog>
  );
}

/* ───────────────────────── 점수 칸 ───────────────────────── */

const stateTone: Record<GradeState, string> = {
  ai: "text-exam-muted",
  checked: "text-emerald-700",
  edited: "text-amber-700",
};

/**
 * 오른쪽 아래의 점수 칸 — 문항 하나의 점수를 고친다.
 *
 * 점수 단추(0 · 1 · 2)를 누르거나 숫자를 직접 친다. 단추는 정수 점수만 있고, 0.5점 같은 사이
 * 값은 숫자 칸에 친다. AI가 매긴 점수와 같은 값을 눌러도 「확인」으로 남는다 — 맞는 점수라고
 * 채점자가 본 것이다.
 *
 * ⚠ 치는 동안에는 친 글자를 그대로 둔다(raw). 맞춘 값을 매 글자마다 되돌려 그리면 「1.」을
 *   치는 순간 1로 되돌아가 소수점을 찍을 수가 없다. 칸을 떠날 때 한 번 맞춘다.
 */
function ScoreBox({
  line,
  grade,
  onPoints,
}: {
  line: GradeLine;
  grade: ReturnType<typeof gradeOf>;
  onPoints: (points: number) => void;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const chips = Array.from({ length: Math.floor(line.max) + 1 }, (_, i) => i);

  return (
    <div className="font-sans">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold text-exam-text">
          문항 <span className="tabular-nums">{line.no}</span> 점수
        </p>
        <p className="text-[12px] tabular-nums text-exam-muted">만점 {line.max}점</p>
      </div>
      <p className="mt-1 text-[12px] text-exam-muted">
        {line.ai === null ? (
          "AI 채점 없음 · 직접 매겨 주세요"
        ) : (
          <>
            AI 채점 <b className="tabular-nums text-exam-text">{pointText(line.ai)}점</b>
          </>
        )}
      </p>

      <div role="group" aria-label={`문항 ${line.no} 점수 고르기`} className="mt-2.5 flex gap-1.5">
        {chips.map((v) => {
          const on = grade.state !== "ai" && grade.points === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setRaw(null);
                onPoints(v);
              }}
              className={`flex h-9 min-w-9 flex-1 items-center justify-center rounded-[2px] border text-[14px] tabular-nums transition-colors ${
                on
                  ? "border-exam-text bg-exam-text font-bold text-white"
                  : grade.scored && grade.points === v
                    ? /* AI가 매긴 점수 — 아직 확인하지 않았다. 굵은 테두리로만 짚는다 */
                      "border-exam-text font-bold text-exam-text hover:bg-exam-raised"
                    : "border-exam-line text-exam-muted hover:bg-exam-raised"
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      <label className="mt-2.5 flex items-center gap-2 text-[12px] text-exam-muted">
        직접 입력
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={line.max}
          step={0.5}
          value={raw ?? (grade.scored ? pointText(grade.points) : "")}
          placeholder="–"
          aria-label={`문항 ${line.no} 점수 (만점 ${line.max}점)`}
          onChange={(e) => {
            const t = e.target.value;
            setRaw(t);
            if (t.trim() === "") return;
            const num = Number(t);
            if (!Number.isFinite(num)) return;
            onPoints(Math.min(line.max, Math.max(0, Math.round(num * 2) / 2)));
          }}
          onBlur={() => setRaw(null)}
          className="h-9 w-16 rounded-[2px] border border-exam-line bg-white px-2 text-right text-[14px] font-bold tabular-nums text-exam-text outline-none transition-colors focus:border-exam-text"
        />
        <span className="tabular-nums">/ {line.max}점</span>
      </label>

      <p className={`mt-2 text-[12px] font-bold ${stateTone[grade.state]}`}>
        {grade.state === "edited"
          ? `수정 ${pointText(line.ai ?? 0)}점 → ${pointText(grade.points)}점 · ${markLabel[grade.mark]}`
          : grade.state === "checked"
            ? `확인 · ${markLabel[grade.mark]}`
            : grade.scored
              ? "아직 확인하지 않았습니다"
              : "아직 점수가 없습니다"}
      </p>
    </div>
  );
}

/* ───────────────────────── 문항 아래 — 채점에 읽을 것 ───────────────────────── */

function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-[12px] font-bold leading-[1.7] text-exam-muted">{label}</dt>
      <dd className="text-[13px] leading-[1.7] text-exam-text">{children}</dd>
    </div>
  );
}

/**
 * 문항 바로 아래에 붙는 채점 자료 — 답을 읽은 눈이 그대로 내려와 읽는 차례다.
 *
 *   정답 · 예시 답  기계로 채점하는 문항은 정답, 전문가가 채점하는 문항은 예시 답
 *   채점 기준       문항에 적힌 기준(「각각 1점. 총 2점 만점」) — 학생에게는 보이지 않는 글이다
 *   AI 채점         AI가 매긴 점수와 그 이유
 *   자아성찰        제출한 뒤 아이가 적은 것. 답만 보면 「오답」까지만 읽힌다 — 왜 그 보기를
 *                   골랐는지가 옆에 있어야 몰라서 못 푼 것과 시간이 없어 못 푼 것이 갈린다
 *   해설            채점자가 적는 글. 아이와 보호자가 「답안 풀이 보기」에서 읽는다
 *
 * 해설은 칸을 떠날 때 저장한다. 글자마다 저장하면 저장하면서 앞뒤 빈칸을 걷는 바람에
 * 단어 사이를 띄울 수가 없다.
 */
function GradeNotes({
  line,
  comment,
  onComment,
}: {
  line: GradeLine;
  comment: string;
  onComment: (comment: string) => void;
}) {
  const { q } = line;
  const [draft, setDraft] = useState(comment);
  const key = autoGraded(q) ? keyText(q) : "";

  return (
    <section className="relative border-t border-exam-line bg-exam-raised px-6 py-5 font-sans lg:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[13px] font-bold text-exam-text">채점 자료</p>
        <p className="text-[12px] text-exam-muted">
          {answerKind(q)} · 만점 {line.max}점
        </p>
      </div>

      <dl className="mt-3 space-y-2.5">
        {key && <Note label="정답">{key}</Note>}
        {!key && q.sampleAnswer && (
          <Note label="예시 답">
            <ul className="space-y-1">
              {q.sampleAnswer.map((a, k) => (
                <li key={k}>
                  {/* 표지로 세운 칸은 「정답 1」 · 「서술형 1」 — 출제 화면에서 부르던 이름이다 */}
                  {q.blanks?.[k] && blankTitle(q.blanks[k]) ? `${blankTitle(q.blanks[k])} : ` : ""}
                  {a}
                  {q.blanks?.[k]?.suffix ?? ""}
                </li>
              ))}
            </ul>
          </Note>
        )}
        {q.scoring && (
          <Note label="채점 기준">
            <ul className="space-y-1">
              {q.scoring.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Note>
        )}
        <Note label="AI 채점">
          {line.ai !== null && (
            <b className="mr-2 tabular-nums">
              {pointText(line.ai)} / {line.max}점
            </b>
          )}
          <span className="text-exam-muted">{line.aiWhy}</span>
        </Note>
        {line.reflect && (
          <Note label="자아성찰">
            {line.reflect.pick}
            {line.reflect.text && (
              <span className="mt-0.5 block text-exam-muted">{line.reflect.text}</span>
            )}
          </Note>
        )}
      </dl>

      <label className="mt-4 block">
        <span className="text-[12px] font-bold text-exam-muted">
          해설{" "}
          <span className="font-normal">· 학생과 보호자가 「답안 풀이 보기」에서 읽습니다</span>
        </span>
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== comment.trim() && onComment(draft)}
          placeholder="다음에 무엇을 하면 되는지 적습니다."
          className="mt-1.5 w-full rounded-[2px] border border-exam-line bg-white px-3 py-2 text-[13px] leading-relaxed text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-exam-text"
        />
      </label>
    </section>
  );
}

/* ───────────────────────── 문항 이동판 ───────────────────────── */

/** 이동판 번호의 색 — 채점 상태마다 */
const padTone: Record<GradeState, string> = {
  ai: "border-exam-line bg-white font-medium text-exam-muted hover:bg-exam-raised",
  /* 확인한 문항 — 응시 화면의 「답한 문항」처럼 밝은 회색으로 가라앉힌다. 남은 칸이 도드라진다 */
  checked: "border-exam-line bg-exam-raised font-medium text-exam-muted hover:bg-slate-200",
  edited: "border-amber-300 bg-amber-50 font-medium text-amber-800 hover:bg-amber-100",
};

const padOrder: GradeState[] = ["ai", "checked", "edited"];

/**
 * 문항 이동판 — 응시 화면의 이동판과 같은 번호 칸. 채점 상태로 칠한다.
 * 아직 확인하지 않은 문항이 흰 바탕으로 남아, 어디를 더 봐야 하는지가 먼저 읽힌다.
 */
function GradePad({
  lines,
  marks,
  isHere,
  isCurrent,
  onPick,
}: {
  lines: GradeLine[];
  marks: GradeMarks;
  isHere: (line: GradeLine) => boolean;
  isCurrent: (line: GradeLine) => boolean;
  onPick: (line: GradeLine) => void;
}) {
  const states = lines.map((l) => gradeOf(l, marks));
  const count = (s: GradeState) => states.filter((g) => g.state === s).length;

  return (
    <aside
      aria-label="문항 이동"
      className="px-6 py-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-5 lg:py-7"
    >
      <p className="text-[12px] font-semibold tracking-[0.06em] text-exam-muted">문항 이동</p>

      <ol className="mt-4 flex flex-wrap gap-1.5">
        {lines.map((l, i) => {
          const g = states[i];
          const current = isCurrent(l);
          return (
            <li key={l.q.id}>
              <button
                type="button"
                onClick={() => onPick(l)}
                aria-current={current ? "step" : undefined}
                aria-label={`문항 ${l.no} ${gradeStateLabel[g.state]}${g.scored ? ` ${pointText(g.points)}점` : ""}`}
                title={`문항 ${l.no} · ${answerKind(l.q)} · ${gradeStateLabel[g.state]} · ${g.scored ? pointText(g.points) : "–"} / ${l.max}점`}
                className={`flex h-9 w-9 items-center justify-center rounded-[2px] border text-[13px] tabular-nums transition-colors ${
                  current
                    ? "border-exam-text bg-exam-text font-bold text-white"
                    : `${padTone[g.state]} ${isHere(l) ? "ring-1 ring-exam-text" : ""}`
                }`}
              >
                {l.no}
              </button>
            </li>
          );
        })}
      </ol>

      <dl className="mt-6 space-y-1.5 border-t border-exam-line pt-4 text-[12px]">
        {padOrder.map((s) => (
          <div key={s} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-exam-muted">
              <span
                aria-hidden
                className={`h-3.5 w-3.5 rounded-[2px] border ${padTone[s].split(" hover:")[0]}`}
              />
              {gradeStateLabel[s]}
            </dt>
            <dd className="font-semibold tabular-nums text-exam-text">{count(s)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
