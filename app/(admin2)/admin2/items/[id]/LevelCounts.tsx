"use client";

import { LEVELS, levelSpecs, type Level } from "@/lib/blueprint";

/**
 * 세트의 단계별 문항 수 — 문항 구성에서 세트를 고르면 그 아래에 선다.
 *
 * 문항 상세(ItemDetail)와 AI 문항 출제 판(authoring/Generator)이 같은 줄을 쓴다. 문항 상세에서는
 * 지금 세트에 든 문항을 단계별로 센 값이 서고 누르면 문항이 늘거나 준다(lib/itemStore.ts
 * setLevelCount). 생성 판에서는 뽑을 수다.
 *
 * ── 숫자 칸이 아니라 − / + 단추다 ──
 * 숫자를 치게 하면 「2」를 「3」으로 고치는 도중에 칸이 비는 순간이 생긴다. 문항 상세에서는 그
 * 순간이 「그 단계 문항을 모두 뺀다」라, 적어 둔 문항을 빼도 되느냐고 치는 중에 묻게 된다.
 * 한 번 누르면 하나씩만 움직이게 둔다.
 */
export default function LevelCounts({
  counts,
  total,
  min,
  max,
  allowed,
  disabled,
  onChange,
}: {
  counts: Record<Level, number>;
  total: number;
  /** 모두 더해 이보다 적게 줄이지 못한다 — 문항 상세는 문항이 하나도 없는 세트를 만들지 않는다 */
  min: number;
  max: number;
  /** 이 단계를 늘릴 수 있는가 — 재능 축마다 다룰 수 있는 단계가 다르다 */
  allowed: (level: Level) => boolean;
  disabled: boolean;
  onChange: (level: Level, count: number) => void;
}) {
  return (
    <div className="a2-level-counts">
      {LEVELS.map((l) => (
        <div key={l} className="a2-level-count">
          <span className="a2-level-count-name">
            <b className="a2-mono">{l}</b>
            <span className="truncate" title={levelSpecs[l].name}>
              {levelSpecs[l].name}
            </span>
          </span>
          <span className="a2-level-count-step">
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={disabled || counts[l] === 0 || total <= min}
              aria-label={`${l} 한 문항 빼기`}
              onClick={() => onChange(l, counts[l] - 1)}
            >
              −
            </button>
            <span className="a2-mono a2-t-md font-bold text-(--a2-ink)" aria-live="polite">
              {counts[l]}
            </span>
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={disabled || !allowed(l) || total >= max}
              aria-label={`${l} 한 문항 더하기`}
              onClick={() => onChange(l, counts[l] + 1)}
            >
              +
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
