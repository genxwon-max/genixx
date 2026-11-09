"use client";

import { useState } from "react";
import { roundStates } from "@/lib/admin";
import { recordAction } from "@/lib/adminStore";
import type { ItemDraft } from "@/lib/itemStore";
import {
  MINUTES_RANGE,
  checkMinutes,
  minutesOf,
  planActions,
  setRoundMinutes,
  type RoundPlan,
} from "@/lib/roundPlanStore";
import { Panel } from "@/components/admin2/ui";

/** 자주 쓰는 시간 — 칸을 누르면 고르개로 뜨고, 목록에 없는 값은 그대로 적는다 */
const PRESETS = [10, 20, 30, 40, 45, 50, 60, 90, 120];

/**
 * 과목별 평가 시간 (ADM-04-3) — 이 회차의 과목마다 몇 분을 주는지 적는다(2026-11-09 사용자 요청).
 *
 * 과목 탭 위에 둔다. 탭은 과목 하나씩 검사지를 짜는 자리라, 시간을 탭 안에 두면 세 과목의 시간을
 * 견주려고 탭을 세 번 눌러야 한다. 시간은 과목끼리 견주며 정하는 값이다.
 *
 * 값은 회차가 든다(lib/roundPlanStore.ts minutes). 학생이 과목을 시작할 때 그 회차의 시간이 응시 기록에
 * 박히므로(lib/examStore.ts limitOf), 이미 시작한 학생의 시계는 여기서 고쳐도 줄지 않는다.
 */
export default function SubjectMinutes({
  roundId,
  roundLabel,
  plan,
  subjects,
  by,
}: {
  roundId: string;
  roundLabel: string;
  plan: RoundPlan;
  subjects: ItemDraft["subject"][];
  by: string;
}) {
  const saved = Object.fromEntries(subjects.map((s) => [s, String(minutesOf(plan, s))]));
  const [draft, setDraft] = useState<Record<string, string>>(saved);

  const next = Object.fromEntries(subjects.map((s) => [s, Number(draft[s])])) as Partial<
    Record<ItemDraft["subject"], number>
  >;
  const bad = checkMinutes(next);
  const dirty = subjects.some((s) => draft[s] !== saved[s]);
  const total = subjects.reduce((sum, s) => sum + minutesOf(plan, s), 0);

  const save = () => {
    if (!dirty || bad.length > 0) return;
    const text = subjects
      .filter((s) => draft[s] !== saved[s])
      .map((s) => `${s} ${saved[s]}분 → ${draft[s]}분`)
      .join(" · ");
    setRoundMinutes(roundId, next, by);
    recordAction(roundLabel, planActions.minutes, text, by);
  };

  return (
    <Panel
      title="과목별 평가 시간"
      meta={
        <span className="a2-num">
          {subjects.map((s) => `${s} ${minutesOf(plan, s)}분`).join(" · ")} · 합계 {total}분
        </span>
      }
      actions={
        <>
          {dirty && (
            <button type="button" className="a2-btn" onClick={() => setDraft(saved)}>
              되돌리기
            </button>
          )}
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!dirty || bad.length > 0}
            onClick={save}
          >
            {/* 「저장」만 적지 않는다 — 아래 검사지 편집기의 저장 띠에도 「저장」이 있다 */}
            시간 저장
          </button>
        </>
      }
    >
      {subjects.length === 0 ? (
        <p className="a2-t-sm text-(--a2-ink-3)">이 회차에 넣은 과목이 없습니다.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {subjects.map((s) => {
            const changed = draft[s] !== saved[s];
            return (
              <label key={s} className="flex flex-col gap-1">
                <span className="a2-t-sm font-bold text-(--a2-ink-2)">{s}</span>
                <span className="flex items-center gap-1.5">
                  <input
                    className="a2-input a2-num"
                    style={{
                      width: "6rem",
                      borderColor: changed ? "var(--a2-accent)" : undefined,
                    }}
                    type="number"
                    inputMode="numeric"
                    min={MINUTES_RANGE.min}
                    max={MINUTES_RANGE.max}
                    step={MINUTES_RANGE.step}
                    list="subject-minutes-presets"
                    placeholder="00"
                    aria-label={`${s} 평가 시간(분)`}
                    value={draft[s]}
                    onChange={(e) => setDraft((d) => ({ ...d, [s]: e.target.value }))}
                  />
                  <span className="a2-t-sm text-(--a2-ink-3)">분</span>
                </span>
              </label>
            );
          })}
          <datalist id="subject-minutes-presets">
            {PRESETS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </datalist>
        </div>
      )}

      {bad.length > 0 && (
        <p className="a2-note mt-3 w-full" style={{ borderLeftColor: "var(--a2-danger)" }}>
          <span>{bad.join(" · ")}</span>
        </p>
      )}
      {bad.length === 0 && dirty && plan.state !== "draft" && (
        <p className="a2-note mt-3 w-full" style={{ borderLeftColor: "var(--a2-warn)" }}>
          <span>
            이미 {roundStates[plan.state].label}인 회차입니다. 저장하면 이제부터 시작하는 과목에 새 시간이
            적용되고, 이미 시작한 학생의 시간은 그대로입니다.
          </span>
        </p>
      )}
    </Panel>
  );
}
