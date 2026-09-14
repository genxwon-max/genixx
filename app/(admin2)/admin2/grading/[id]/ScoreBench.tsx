"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  ROUTE_CUT,
  confirmScore,
  isRouted,
  rubric,
  scoreDone,
  secondScore,
  useExpert,
  type RubricLevel,
  type ScoreTask,
} from "@/lib/expertStore";
import { LeaveDialog, PageSaveBar, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";

/**
 * EXP-04 채점대 — 응답 하나에 루브릭을 댄다.
 *
 * 화면이 셋으로 갈린다. 무엇을 가리는가가 그때마다 다르기 때문이다.
 *
 *   1차       AI 판정과 근거를 보여 준다. 사람이 하는 일은 「맞나」를 보는 것이라
 *             AI 값을 가리면 볼 것이 없다.
 *   2차(이중)  1차 값과 AI 값을 **가린다.** 앞사람 값을 보고 매기면 두 사람이 따로
 *             매긴 것이 아니게 되고, 그렇게 나온 일치도는 아무것도 재지 않는다.
 *   확정 뒤    셋을 다 펴 놓는다. 어디서 갈렸는지가 다음 회차의 근거다.
 *
 * 되돌리는 길을 막지 않는다 — 확정한 뒤에도 다시 매길 수 있고, 바꾼 것은 기록에 남는다.
 * 잘못 누른 것을 못 고치게 하면 사람은 누르기 전에 멈추는 대신 딴 데다 적어 둔다.
 */

const levels: RubricLevel[] = ["full", "partial", "none"];

const toneOf = (level: RubricLevel) =>
  level === "full" ? "var(--a2-ok)" : level === "partial" ? "var(--a2-warn)" : "var(--a2-danger)";

export default function ScoreBench({ id }: { id: string }) {
  const { scores } = useExpert();
  const task = scores.find((t) => t.id === id) ?? null;

  if (!task) {
    return (
      <>
        <PageHead
          title="찾지 못했습니다"
          back={
            <Link href="/admin2/grading" className="a2-btn">
              ← 채점 관리
            </Link>
          }
        />
        <Body>
          <Panel title="없는 응답">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 응답이 목록에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <Bench key={task.id} task={task} rest={scores} />;
}

function Bench({ task, rest }: { task: ScoreTask; rest: ScoreTask[] }) {
  const router = useRouter();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";

  /* 2차 채점 자리인가 — 표본으로 뽑혔고 1차는 끝났는데 두 번째 값이 없다 */
  const second = task.double && !!task.human && !task.second;
  const done = scoreDone(task);

  const [level, setLevel] = useState<RubricLevel | null>(null);
  const [note, setNote] = useState("");

  const dirty = level !== null || note.trim() !== "";
  const reset = () => {
    setLevel(null);
    setNote("");
  };

  const save = () => {
    if (!level) return false;
    if (second) secondScore(task.id, level, by);
    else confirmScore(task.id, level, by, note.trim());
    reset();
    return true;
  };

  const guard = useUnsavedGuard(dirty, save, reset);

  /* 다음에 볼 것 — 이 화면을 닫고 목록에서 다시 고르는 왕복을 없앤다 */
  const next = rest.find((t) => !scoreDone(t) && t.id !== task.id);

  return (
    <>
      <PageHead
        title={`${task.seat} · ${task.subject}`}
        back={
          <Link href="/admin2/grading" className="a2-btn">
            ← 채점 관리
          </Link>
        }
        actions={
          next && (
            <button
              type="button"
              className="a2-btn"
              onClick={() => guard.ask(() => router.push(`/admin2/grading/${next.id}`))}
            >
              다음 대기 건 →
            </button>
          )
        }
      />
      <Body>
        <div className="grid gap-3">
          <Panel title="문항" meta={`${task.grade} · ${task.axis}`} flush>
            <div className="a2-form">
              <FormRow label="발문">
                <span className="a2-t-sm text-(--a2-ink)">{task.stem}</span>
              </FormRow>
              <FormRow label="응답 ID">
                <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{task.id}</span>
                {task.double && (
                  <span className="a2-t-xs text-(--a2-ink-4)">이중 채점 표본</span>
                )}
              </FormRow>
            </div>
          </Panel>

          {/* 아이가 쓴 그대로 — 맞춤법을 고쳐 보여 주면 채점하는 눈이 달라진다 */}
          <Panel title="학생 답" flush>
            <div className="px-3 py-3">
              <p className="a2-t-md whitespace-pre-wrap text-(--a2-ink)">{task.answer}</p>
            </div>
          </Panel>

          {second ? (
            <Panel title="2차 채점" flush>
              <div className="a2-form">
                <FormRow label="가린 것">
                  <span className="a2-t-sm text-(--a2-ink-2)">
                    1차 채점자의 값과 AI 판정을 가려 두었습니다. 두 사람이 따로 매겨야 일치도가
                    무언가를 잽니다.
                  </span>
                </FormRow>
              </div>
            </Panel>
          ) : (
            <Panel title="AI 1차 채점" flush>
              <div className="a2-form">
                <FormRow label="판정">
                  <span className="a2-t-sm font-semibold" style={{ color: toneOf(task.aiLevel) }}>
                    {rubric[task.aiLevel].label}
                  </span>
                  <span
                    className="a2-mono a2-t-sm"
                    style={{ color: isRouted(task) ? "var(--a2-danger)" : "var(--a2-ink-3)" }}
                  >
                    확신도 {task.confidence.toFixed(2)}
                  </span>
                  {isRouted(task) && (
                    <span className="a2-t-xs" style={{ color: "var(--a2-danger)" }}>
                      {ROUTE_CUT} 미만이라 사람에게 넘어온 건입니다
                    </span>
                  )}
                </FormRow>
                <FormRow label="근거">
                  <span className="a2-t-sm text-(--a2-ink-2)">{task.aiWhy}</span>
                </FormRow>
              </div>
            </Panel>
          )}

          <Panel title={second ? "2차 판정" : "채점"} flush>
            <div className="a2-form a2-form-lg">
              <FormRow label="루브릭" req>
                <span className="grid w-full gap-1.5">
                  {levels.map((v) => (
                    <label key={v} className="a2-choice items-start">
                      <input
                        type="radio"
                        name="rubric-level"
                        checked={level === v}
                        onChange={() => setLevel(v)}
                      />
                      <span className="grid gap-0.5">
                        <span className="font-semibold" style={{ color: toneOf(v) }}>
                          {rubric[v].label} · {rubric[v].point}점
                        </span>
                        {/* 기준을 고르는 자리 옆에 둔다 — 판으로 따로 세우면 안 읽는다 */}
                        <span className="a2-t-xs text-(--a2-ink-3)">{rubric[v].guide}</span>
                      </span>
                    </label>
                  ))}
                </span>
              </FormRow>

              {!second && (
                <FormRow label="메모">
                  <textarea
                    className="a2-textarea"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="AI와 다르게 본 까닭을 적어 두면 다음 회차에 무엇을 고칠지가 남습니다."
                  />
                </FormRow>
              )}
            </div>
          </Panel>

          {/* 2차 자리에서는 이 판을 아예 세우지 않는다 — 위에서 「가렸다」고 적어 두고
              아래에 1차 값을 펴 두면 가린 것이 아니다 */}
          {done && !second && (
            <Panel title="채점 기록" flush>
              <div className="a2-form">
                {task.human && (
                  <FormRow label="1차">
                    <span className="a2-t-sm font-semibold" style={{ color: toneOf(task.human.level) }}>
                      {rubric[task.human.level].label}
                    </span>
                    <span className="a2-t-xs text-(--a2-ink-4)">
                      <span className="a2-mono">{task.human.at}</span> · {task.human.by}
                    </span>
                    <span className="a2-t-xs text-(--a2-ink-4)">
                      {task.human.level === task.aiLevel ? "AI와 같음" : "AI에서 바꿈"}
                    </span>
                    {task.human.note && (
                      <span className="a2-t-sm w-full text-(--a2-ink-2)">{task.human.note}</span>
                    )}
                  </FormRow>
                )}
                {task.second && (
                  <FormRow label="2차">
                    <span
                      className="a2-t-sm font-semibold"
                      style={{ color: toneOf(task.second.level) }}
                    >
                      {rubric[task.second.level].label}
                    </span>
                    <span className="a2-t-xs text-(--a2-ink-4)">
                      <span className="a2-mono">{task.second.at}</span> · {task.second.by}
                    </span>
                    <span
                      className="a2-t-xs font-semibold"
                      style={{
                        color:
                          task.second.level === task.human?.level
                            ? "var(--a2-ok)"
                            : "var(--a2-danger)",
                      }}
                    >
                      {task.second.level === task.human?.level ? "1차와 같음" : "1차와 갈림"}
                    </span>
                  </FormRow>
                )}
                {task.double && !task.second && (
                  <FormRow label="2차">
                    <span className="a2-t-sm text-(--a2-ink-4)">
                      이중 채점 표본입니다. 두 번째 사람이 아직 매기지 않았습니다.
                    </span>
                  </FormRow>
                )}
              </div>
            </Panel>
          )}
        </div>

        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={reset}
          disabled={!level}
          note={
            !level && dirty
              ? "루브릭에서 하나를 골라야 저장할 수 있습니다."
              : second
                ? "1차와 따로 매기는 자리입니다. 저장하면 두 값이 나란히 남습니다."
                : done && !dirty
                  ? "확정한 응답입니다. 다시 매기면 기록에 남습니다."
                  : undefined
          }
        />
      </Body>
      <LeaveDialog guard={guard} />
    </>
  );
}
