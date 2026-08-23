import { axes } from "@/lib/result";

/**
 * 여덟 갈래를 고리 위에 놓은 그림.
 *
 * /home2의 팔각 레이더(TalentMap)와 같은 좌표계(lib/result.axes)를 다른 꼴로
 * 그린다. 레이더는 「면적」으로 읽혀 크기를 비교하게 만드는데, 이 시안은 줄
 * 세우지 않는다는 약속을 그림에서도 지키고 싶었다. 고리 위의 점은 자리만
 * 말하고 넓이를 말하지 않는다.
 *
 * 점수는 샘플이다(언어 88 · 수리 74 · 탐구 81 — TalentMap과 같은 값). 아직 안
 * 잰 다섯 갈래는 점선 원으로 비워 둔다 — 0점이 아니라 「아직」이다.
 */
const sample: Record<string, number> = { language: 88, logic: 74, nature: 81 };

/* 좌우 여백 없이 이름표가 딱 들어가는 크기. 폰에서는 335px로 줄어드니 글자를
   크게 잡아야 한다 — 13px 이름표는 거기서 8px가 된다. */
const SIZE = 560;
const C = SIZE / 2;
const R = 140;
const LABEL_R = R + 34;

export default function TalentWheel({ className = "" }: { className?: string }) {
  const nodes = axes.map((axis, i) => {
    const rad = ((-90 + i * 45) * Math.PI) / 180;
    const score = sample[axis.id] ?? null;
    return {
      axis,
      score,
      x: C + R * Math.cos(rad),
      y: C + R * Math.sin(rad),
      lx: C + LABEL_R * Math.cos(rad),
      ly: C + LABEL_R * Math.sin(rad),
      cos: Math.cos(rad),
      sin: Math.sin(rad),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={`샘플 재능 지도. ${nodes
        .filter((n) => n.score !== null)
        .map((n) => `${n.axis.label} ${n.score}`)
        .join(", ")}. 나머지 다섯 갈래는 2027년에 잽니다.`}
    >
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R - 28} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray="2 5" />

      {/* 가운데 — 무엇의 그림인지 */}
      <text
        x={C}
        y={C - 10}
        textAnchor="middle"
        className="ed-serif"
        fontSize={24}
        fontWeight={700}
        fill="var(--ink)"
      >
        재능 지도
      </text>
      <text x={C} y={C + 20} textAnchor="middle" fontSize={15} fill="var(--ink-2)">
        2026년 셋 측정 · 샘플
      </text>

      {nodes.map((n) => {
        const measured = n.score !== null;
        const anchor = n.cos > 0.3 ? "start" : n.cos < -0.3 ? "end" : "middle";
        return (
          <g key={n.axis.id}>
            {measured ? (
              <>
                <circle cx={n.x} cy={n.y} r={22} fill="var(--accent)" />
                <text
                  x={n.x}
                  y={n.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="ed-serif"
                  fontSize={18}
                  fontWeight={900}
                  fill="var(--paper)"
                >
                  {n.score}
                </text>
              </>
            ) : (
              <circle
                cx={n.x}
                cy={n.y}
                r={12}
                fill="var(--paper)"
                stroke="var(--ink-2)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
            <text
              x={n.lx}
              y={n.ly + (Math.abs(n.sin) > 0.9 ? (n.sin < 0 ? -4 : 8) : 0)}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={measured ? "ed-serif" : undefined}
              fontSize={measured ? 21 : 18}
              fontWeight={measured ? 700 : 500}
              fill={measured ? "var(--ink)" : "var(--ink-2)"}
            >
              {n.axis.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
