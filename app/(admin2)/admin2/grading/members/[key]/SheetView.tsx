"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { rounds } from "@/lib/admin";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { levelOf as examLevelOf } from "@/lib/exam";
import { AI_POINT_OF, QUESTION_POINT, sheetAnswersOf, type SheetAnswer } from "@/lib/examSheet";
import { saveSheetMarks, useSheetMarks } from "@/lib/sheetMarkStore";
import { sheetsOf, useExpert, type ScoreTask, type Sheet } from "@/lib/expertStore";
import { LeaveDialog, PageSaveBar, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * EXP-04-1 답안지 — 이 아이가 본 시험지를 그대로 편다.
 *
 * 왼쪽에 아이가 본 것과 낸 것, 오른쪽에 전문가가 손대는 것. 한 문항이 한 판이고, 그 판이
 * 좌우로 갈린다.
 *
 *   왼쪽   문항 · 아이가 낸 답 · **자아성찰**
 *   오른쪽  AI 채점 해설 · 배점 · 해설
 *
 * ── 자아성찰을 함께 세우는 까닭 ──
 * 답만 보면 「틀렸다」까지만 읽힌다. 제출 뒤에 아이가 적은 것 — 왜 그 보기를 골랐는지,
 * 왜 못 풀었는지 — 이 옆에 있어야 「몰라서 못 푼 것」과 「시간이 없어 못 푼 것」이 갈린다.
 * 그 둘은 다음에 할 일이 정반대다. 응시 화면이 걷는 값을 그대로 읽는다
 * (components/exam/ExamSession.tsx의 ReflectionStep).
 *
 * ── 점수는 숫자 하나다 ──
 * 완전정답·부분정답·오답 같은 판정 이름을 이 화면에 세우지 않는다. 전문가가 여기서 정하는
 * 것은 「이 문항을 몇 점으로 볼 것인가」 하나이고, 0점이면 0점 4점이면 4점이라고 적는 편이
 * 판정 이름을 거쳐 점수로 옮기는 것보다 한 걸음 짧다. 문항마다 만점은 5점으로 같다.
 *
 * AI가 매긴 값이 시작값으로 깔린다 — 객관식은 정오, 서술형은 판정을 5점 만점으로 옮긴 값.
 * 전문가는 그 위에 숫자를 친다. 정답을 골랐어도 자아성찰이 「잘 모르겠어서 하나를 골랐어요」면
 * 그 5점은 다른 5점이다.
 *
 * ⚠ 여기서 친 점수는 평가 채점(EXP-04)의 루브릭 점수를 고치지 않는다. 저쪽은 세 칸(완전 2 ·
 *   부분 1 · 오답 0)으로 재고 그 값이 리포트로 나가므로, 5점 값을 저쪽에 쓰면 저 목록이
 *   「9 / 4」를 말하게 된다. 이 화면의 점수는 제 저장소에 담는다(lib/sheetMarkStore.ts).
 *
 * ⚠ 저장은 답안지 한 장에 한 번이다. 문항마다 저장을 두면 서른 문항에서 서른 번을 누르고,
 *   그러다 두어 개를 안 누른 채 나간다.
 */

const roundLabel = (id: string) => rounds.find((r) => r.id === id)?.label ?? id;
const pt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/** 고치는 중인 값 — 배점은 손대지 않았으면 null(AI·루브릭 값을 그대로 쓴다) */
type Edit = { points: number | null; comment: string };

/**
 * 배점 칸 — 숫자를 직접 친다.
 *
 * 고르개(라디오)로 두었을 때는 눈금이 다섯이라 0.5 단위까지만 줄 수 있었고, 만점이 다른
 * 문항마다 눈금 수가 달라져 한 화면에 세 가지 생김새가 섰다. 숫자를 치게 두면 눈금이
 * 필요 없고, 옆의 「/ N점」이 만점을 대신 적는다.
 *
 * ── 비우면 AI 값으로 되돌아간다 ──
 * 빈 칸은 「0점」이 아니라 **손대지 않음**이다. 0으로 읽으면 지우다 만 칸이 그대로 0점이
 * 되어 저장되고, 그 사실은 총점에서야 드러난다.
 *
 * ⚠ 치는 동안에는 친 글자를 그대로 둔다(raw). 자를 값을 매 글자마다 되돌려 그리면
 *   「1.」을 치는 순간 1로 되돌아가 소수점을 찍을 수가 없다. 칸을 떠날 때 한 번 맞춘다.
 */
function PointInput({
  value,
  base,
  max,
  disabled,
  onChange,
}: {
  value: number;
  /** AI·루브릭이 매긴 값 — 이 값과 같아지면 손댄 것으로 치지 않는다 */
  base: number;
  max: number;
  disabled?: boolean;
  onChange: (points: number | null) => void;
}) {
  const [raw, setRaw] = useState<string | null>(null);

  return (
    /* items-center로 맞춘다. baseline으로 두면 32px 입력칸의 글자 밑선에 「/ 5점」이 맞춰져
       그 줄만 10px 내려앉고, 칸이 두 줄로 접힌 것처럼 보인다 */
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        inputMode="decimal"
        className="a2-input a2-num"
        style={{ width: "4.5rem" }}
        min={0}
        max={max}
        step={0.5}
        disabled={disabled}
        value={raw ?? pt(value)}
        aria-label={`배점 (만점 ${max}점)`}
        onChange={(e) => {
          const t = e.target.value;
          setRaw(t);
          if (t.trim() === "") return onChange(null);
          const num = Number(t);
          if (!Number.isFinite(num)) return;
          const fixed = Math.min(max, Math.max(0, Math.round(num * 2) / 2));
          onChange(fixed === base ? null : fixed);
        }}
        onBlur={() => setRaw(null)}
      />
      <span className="a2-t-sm text-(--a2-ink-3)">/ {max}점</span>
    </span>
  );
}

export default function SheetView({ sheetId }: { sheetId: string }) {
  const { scores } = useExpert();
  const hydrated = useHydrated();
  const sheet = useMemo(() => sheetsOf(scores).find((s) => s.key === sheetId) ?? null, [scores, sheetId]);

  const back = (
    <Link href="/admin2/grading/members" className="a2-btn">
      ← 회원 채점
    </Link>
  );

  if (!sheet) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 답안지">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{sheetId}</span> 답안지가 목록에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* 손본 값은 브라우저에만 있다. 하이드레이션 전에 초안을 잡으면 빈 값이 붙들려,
     저장분이 들어와도 고친 것이 있다고 잘못 켜진다 */
  if (!hydrated) return <PageHead title={`${sheet.seat} 답안지`} back={back} />;

  return <Editor key={sheet.key} sheet={sheet} back={back} />;
}

type TabId = "all" | "wrong" | "blank" | "essay";

function Editor({ sheet, back }: { sheet: Sheet; back: React.ReactNode }) {
  const by = useAdminPrefs().staffName || "운영자";
  const marks = useSheetMarks(sheet.key);
  const [tab, setTab] = useState<TabId>("all");

  /* 이 아이가 본 과목 — 채점 자료에 걸린 과목만 시험지를 편다. 안 본 과목의 시험지를
     세워 두면 전부 빈칸으로 서서 「안 냈다」로 읽힌다 */
  const subjectNames = useMemo(
    () => [...new Set(sheet.tasks.map((t) => t.subject))],
    [sheet],
  );
  const paper = useMemo(
    () => sheetAnswersOf(sheet.seat, subjectNames),
    [sheet.seat, subjectNames],
  );

  /* 저장분 — 시험지 문항(marks)과 서술형 응답(ScoreTask) 두 갈래를 한 초안으로 든다.
     화면에서는 한 줄로 보이므로 저장 단추도 하나다 */
  const saved = useMemo(() => {
    const out: Record<string, Edit> = {};
    for (const a of paper) {
      const m = marks[a.q.id];
      out[a.q.id] = { points: m?.points ?? null, comment: m?.comment ?? "" };
    }
    for (const t of sheet.tasks) {
      const m = marks[t.id];
      out[t.id] = { points: m?.points ?? null, comment: m?.comment ?? "" };
    }
    return out;
  }, [paper, marks, sheet]);

  const [draft, setDraft] = useState<Record<string, Edit>>(saved);
  const cur = (id: string) => draft[id] ?? saved[id] ?? { points: null, comment: "" };

  const dirty = Object.keys(saved).some((id) => {
    const a = cur(id);
    const b = saved[id];
    return a.points !== b.points || a.comment.trim() !== (b.comment ?? "").trim();
  });

  const set = (id: string, patch: Partial<Edit>) =>
    setDraft((v) => ({ ...v, [id]: { ...cur(id), ...patch } }));

  const reset = () => setDraft(saved);

  const save = () => {
    /* 시험지 문항과 서술형 응답을 한 저장소에 담는다. 서술형을 평가 채점 쪽(markSheet)에
       쓰면 루브릭 만점 2점 자리에 5점 값이 들어가, 저쪽 목록이 「9 / 4」를 말하게 된다 */
    saveSheetMarks(
      sheet.key,
      [
        ...paper.map((a) => ({ id: a.q.id, points: cur(a.q.id).points, comment: cur(a.q.id).comment })),
        ...sheet.tasks.map((t) => ({ id: t.id, points: cur(t.id).points, comment: cur(t.id).comment })),
      ],
      by,
    );
    return true;
  };

  const guard = useUnsavedGuard(dirty, save, reset);

  /* 시험지 점수 — 고치는 중인 값으로 다시 센다. 저장 전에도 총점이 따라 움직여야
     반 칸을 얹었을 때 그것이 총점에서 얼마인지가 그 자리에서 보인다 */
  const paperGot = paper.reduce((sum, a) => {
    const e = cur(a.q.id);
    return sum + (e.points ?? a.aiPoints ?? 0);
  }, 0);
  const taskGot = sheet.tasks.reduce(
    (sum, t) => sum + (cur(t.id).points ?? AI_POINT_OF[t.human?.level ?? t.aiLevel]),
    0,
  );
  const paperMax = paper.reduce((sum, a) => sum + a.max, 0) + sheet.tasks.length * QUESTION_POINT;
  const blanks = paper.filter((a) => !a.answered).length;
  const wrongs = paper.filter((a) => a.correct === false && a.answered).length;

  const tabs = [
    { id: "all" as TabId, label: "전체", rows: paper },
    { id: "wrong" as TabId, label: "틀림", rows: paper.filter((a) => a.answered && a.correct === false) },
    { id: "blank" as TabId, label: "못 냄", rows: paper.filter((a) => !a.answered) },
    { id: "essay" as TabId, label: "서술형", rows: paper.filter((a) => a.q.type === "essay") },
  ];
  const shown = (tabs.find((t) => t.id === tab) ?? tabs[0]).rows;

  return (
    <>
      <PageHead
        title={`${sheet.seat} 답안지`}
        back={back}
        tabsLabel="문항 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={t.rows.length}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />

      <Body className="grid gap-3">
        <Panel title="응시" meta={roundLabel(sheet.round)} flush>
          <div className="a2-form">
            <FormRow label="응시번호">
              {/* 이름을 적지 않는다 — 채점하는 사람이 누구 답인지 알면 안 된다 */}
              <span className="a2-mono a2-t-sm font-semibold text-(--a2-ink)">{sheet.seat}</span>
              <span className="a2-t-xs text-(--a2-ink-4)">{sheet.grade}</span>
              {subjectNames.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </FormRow>
            <FormRow label="시험지 점수">
              <span className="a2-num a2-t-md font-bold text-(--a2-ink)">
                {pt(paperGot + taskGot)} / {paperMax}
              </span>
              <span className="a2-t-sm text-(--a2-ink-3)">
                {paper.length + sheet.tasks.length}문항 · 틀림 {wrongs} · 못 냄 {blanks}
              </span>
            </FormRow>
          </div>
        </Panel>

        {shown.map((a, i) => (
          <PaperQuestion
            key={a.q.id}
            row={a}
            no={i + 1}
            edit={cur(a.q.id)}
            onChange={(patch) => set(a.q.id, patch)}
          />
        ))}

        {/* 서술형 응답 — 판정은 평가 채점의 일이고 여기서는 배점과 해설만 손본다 */}
        {tab === "all" && sheet.tasks.length > 0 && (
          <>
            {sheet.tasks.map((t) => (
              <TaskQuestion
                key={t.id}
                task={t}
                edit={cur(t.id)}
                onChange={(patch) => set(t.id, patch)}
              />
            ))}
          </>
        )}

        <PageSaveBar dirty={dirty} onSave={save} onCancel={reset} />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}

/* ── 시험지 한 문항 ──
   왼쪽은 아이가 본 것과 낸 것, 오른쪽은 전문가가 손대는 것. 좁은 화면에서는 위아래로
   포개진다 — 자아성찰을 읽고 점수를 손보는 차례가 그대로 유지된다 */
function PaperQuestion({
  row,
  no,
  edit,
  onChange,
}: {
  row: SheetAnswer;
  no: number;
  edit: Edit;
  onChange: (patch: Partial<Edit>) => void;
}) {
  const { q } = row;
  const base = row.aiPoints ?? 0;
  const now = edit.points ?? base;

  return (
    <Panel
      title={`${no}. ${q.stem.length > 46 ? `${q.stem.slice(0, 46)}…` : q.stem}`}
      meta={`${q.level} ${examLevelOf(q.level).name} · ${q.type === "essay" ? "서술형" : "객관식"}`}
      actions={
        !row.answered ? (
          <Status tone="warn">못 냄</Status>
        ) : row.correct === true ? (
          <Status tone="ok">정답</Status>
        ) : row.correct === false ? (
          <Status tone="danger">오답</Status>
        ) : (
          <Status tone="muted">서술형</Status>
        )
      }
      flush
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── 왼쪽 — 아이가 본 것과 낸 것 ── */}
        <div className="a2-form border-b border-(--a2-line) lg:border-b-0 lg:border-r">
          <FormRow label="자료">
            <span className="a2-t-xs text-(--a2-ink-3)">
              {q.brief.label} · {q.brief.title}
            </span>
          </FormRow>

          <FormRow label="문제">
            <span className="a2-t-sm whitespace-pre-line leading-[1.7] text-(--a2-ink)">{q.stem}</span>
          </FormRow>

          <FormRow label="낸 답">
            {q.type === "choice" ? (
              <span className="grid w-full gap-1">
                {(q.choices ?? []).map((c, i) => {
                  const on = row.picked === i;
                  const right = q.answer === i;
                  return (
                    <span
                      key={c}
                      className="flex items-baseline gap-2 a2-t-sm"
                      style={{
                        color: on ? "var(--a2-ink)" : "var(--a2-ink-4)",
                        fontWeight: on ? 700 : 400,
                      }}
                    >
                      <span className="a2-num shrink-0">{i + 1}</span>
                      <span className="min-w-0">{c}</span>
                      {on && <span className="shrink-0 a2-t-xs">← 고름</span>}
                      {right && (
                        <span className="shrink-0 a2-t-xs" style={{ color: "var(--a2-ok)" }}>
                          정답
                        </span>
                      )}
                    </span>
                  );
                })}
                {!row.answered && <span className="a2-t-sm text-(--a2-ink-4)">고르지 않았습니다.</span>}
              </span>
            ) : row.answered ? (
              /* 아이가 쓴 그대로 — 맞춤법을 고쳐 보여 주면 채점하는 눈이 달라진다 */
              <span className="a2-t-sm whitespace-pre-wrap leading-[1.7] text-(--a2-ink)">
                {row.written}
              </span>
            ) : (
              <span className="a2-t-sm text-(--a2-ink-4)">쓰지 않았습니다.</span>
            )}
          </FormRow>

          {/* 제출 뒤에 아이가 적은 것. 답 바로 아래에 둔다 — 답을 읽은 눈이 그대로
              「왜 그렇게 했나」로 내려가야 둘이 한 덩이로 읽힌다 */}
          <FormRow label="자아성찰">
            <span className="grid w-full gap-1">
              <span className="a2-t-sm text-(--a2-ink)">{row.reflectPickText}</span>
              {row.reflectText ? (
                <span className="a2-t-sm whitespace-pre-wrap leading-[1.7] text-(--a2-ink-2)">
                  {row.reflectText}
                </span>
              ) : (
                <span className="a2-t-xs text-(--a2-ink-4)">덧붙여 쓴 글은 없습니다.</span>
              )}
            </span>
          </FormRow>
        </div>

        {/* ── 오른쪽 — 전문가가 손대는 것 ── */}
        <div className="a2-form bg-(--a2-raised)">
          <FormRow label="AI 채점 해설">
            <span className="a2-t-sm leading-[1.7] text-(--a2-ink-2)">{row.aiWhy}</span>
          </FormRow>

          <FormRow label="배점">
            <PointInput
              value={now}
              base={base}
              max={row.max}
              onChange={(points) => onChange({ points })}
            />
            {now !== base && (
              <span className="a2-t-xs font-semibold" style={{ color: "var(--a2-accent)" }}>
                손봄 {pt(base)} → {pt(now)}
              </span>
            )}
          </FormRow>

          <FormRow label="해설">
            <textarea
              className="a2-textarea"
              rows={3}
              value={edit.comment}
              onChange={(e) => onChange({ comment: e.target.value })}
              placeholder="다음에 무엇을 하면 되는지 적습니다."
            />
          </FormRow>
        </div>
      </div>
    </Panel>
  );
}

/* ── 서술형 응답 한 건 ──
   평가 채점(EXP-04)이 판정한 것을 그대로 받아 배점과 해설만 손본다. 시험지 문항과 같은
   좌우 꼴로 그린다 — 한 화면에서 두 가지 생김새로 채점하게 두지 않는다 */
function TaskQuestion({
  task,
  edit,
  onChange,
}: {
  task: ScoreTask;
  edit: Edit;
  onChange: (patch: Partial<Edit>) => void;
}) {
  /* AI가 매긴 판정을 시험지 만점으로 옮겨 시작값으로 깐다. 판정 이름(완전·부분·오답)은
     화면에 세우지 않는다 — 전문가가 여기서 하는 일은 점수를 정하는 것 하나다 */
  const base = AI_POINT_OF[task.human?.level ?? task.aiLevel];
  const now = edit.points ?? base;
  /* 전문가가 손댔는가 — 손대기 전에는 AI 값이 그대로 서 있으므로 「채점 대기」로 적는다 */
  const marked = edit.points !== null || edit.comment.trim() !== "";

  return (
    <Panel
      title={task.stem.length > 46 ? `${task.stem.slice(0, 46)}…` : task.stem}
      meta={`${task.subject} · ${task.axis} · 채점 대상`}
      actions={marked ? undefined : <Status tone="warn">채점 대기</Status>}
      flush
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="a2-form border-b border-(--a2-line) lg:border-b-0 lg:border-r">
          <FormRow label="문제">
            <span className="a2-t-sm text-(--a2-ink)">{task.stem}</span>
          </FormRow>
          <FormRow label="낸 답">
            <span className="a2-t-sm whitespace-pre-wrap leading-[1.7] text-(--a2-ink)">
              {task.answer}
            </span>
          </FormRow>
        </div>

        <div className="a2-form bg-(--a2-raised)">
          <FormRow label="AI 채점 해설">
            <span className="a2-t-sm leading-[1.7] text-(--a2-ink-2)">{task.aiWhy}</span>
            <span className="a2-t-xs text-(--a2-ink-4)">
              확신도 <span className="a2-num">{task.confidence.toFixed(2)}</span>
            </span>
          </FormRow>

          <FormRow label="배점">
            <PointInput
              value={now}
              base={base}
              max={QUESTION_POINT}
              onChange={(points) => onChange({ points })}
            />
            {now !== base && (
              <span className="a2-t-xs font-semibold" style={{ color: "var(--a2-accent)" }}>
                손봄 {pt(base)} → {pt(now)}
              </span>
            )}
          </FormRow>

          <FormRow label="해설">
            <textarea
              className="a2-textarea"
              rows={3}
              value={edit.comment}
              onChange={(e) => onChange({ comment: e.target.value })}
              placeholder="다음에 무엇을 하면 되는지 적습니다."
            />
            {task.markedAt && (
              <span className="a2-t-xs text-(--a2-ink-4)">
                마지막 손봄 <span className="a2-mono">{task.markedAt}</span> · {task.markedBy}
              </span>
            )}
          </FormRow>
        </div>
      </div>
    </Panel>
  );
}
