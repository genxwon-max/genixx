import { axes } from "@/lib/result";

/**
 * 재능 지도 — 여덟 갈래를 밤하늘의 별자리처럼.
 *
 * 시안의 「은하수 모티프와 재능 지도」를 그대로 가져온 도판이다. 남색 원 안에 여덟
 * 별을 고리로 놓고, 2026년에 재는 세 갈래(lib/result에서 subject가 있는 것)만 크고
 * 밝게 — 그 셋을 선으로 이어 별자리로 만든다. 나머지 다섯은 작고 희미한 별로 남긴다.
 * 「아직 안 잰 것」을 빈 자리로 보여 주는 결과 화면의 원칙과 같다.
 */
/* 이름표가 원 안에 들어가는 치수 — 「수리·논리」 다섯 글자가 오른쪽 끝에서 잘리지 않게 */
const SIZE = 480;
const C = SIZE / 2;
const R = 130;
const LABEL_R = R + 28;

export default function GemMap({ className = "" }: { className?: string }) {
  const nodes = axes.map((a, i) => {
    const rad = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return { a, x: C + Math.cos(rad) * R, y: C + Math.sin(rad) * R, lx: C + Math.cos(rad) * LABEL_R, ly: C + Math.sin(rad) * LABEL_R };
  });
  const measured = nodes.filter((n) => n.a.subject);
  const bg = [
    [70, 100, 1.2],
    [140, 55, 0.9],
    [390, 80, 1.4],
    [425, 170, 0.8],
    [55, 290, 1],
    [100, 390, 1.3],
    [340, 415, 0.9],
    [415, 345, 1.1],
    [230, 35, 0.8],
    [45, 195, 0.7],
    [440, 260, 0.7],
    [285, 450, 1],
    [180, 440, 0.8],
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`재능 지도 — ${axes.map((a) => a.label).join(", ")} 여덟 갈래. 2026년에는 ${measured
        .map((n) => n.a.label)
        .join(", ")} 세 갈래를 먼저 잽니다.`}
      className={className}
    >
      <defs>
        <radialGradient id="gemmap-night" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#2a277a" />
          <stop offset="1" stopColor="#1a1846" />
        </radialGradient>
        <radialGradient id="gemmap-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={C - 4} fill="url(#gemmap-night)" />
      {bg.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="#fff"
          className="jm-twinkle"
          style={{ animationDelay: `${(i * 0.4) % 3}s` }}
        />
      ))}

      {/* 고리 — 희미한 길 */}
      <circle cx={C} cy={C} r={R} fill="none" stroke="#fff" strokeOpacity={0.12} strokeDasharray="3 7" />

      {/* 별자리 — 잰 셋을 잇는다 */}
      <polygon
        points={measured.map((n) => `${n.x},${n.y}`).join(" ")}
        fill="#fbbf24"
        fillOpacity={0.08}
        stroke="#fbbf24"
        strokeWidth={1.5}
        strokeOpacity={0.8}
        strokeLinejoin="round"
      />
      {measured.map((n) => (
        <line key={n.a.id} x1={C} y1={C} x2={n.x} y2={n.y} stroke="#fbbf24" strokeWidth={1} strokeOpacity={0.35} />
      ))}

      {/* 별들 */}
      {nodes.map((n, i) => {
        const on = Boolean(n.a.subject);
        const anchor = Math.abs(n.lx - C) < 8 ? "middle" : n.lx > C ? "start" : "end";
        return (
          <g key={n.a.id}>
            {on && <circle cx={n.x} cy={n.y} r={30} fill="url(#gemmap-glow)" />}
            <circle
              cx={n.x}
              cy={n.y}
              r={on ? 9 : 4.5}
              fill={on ? "#fbbf24" : "#c4b5fd"}
              className={on ? undefined : "jm-twinkle"}
              style={on ? undefined : { animationDelay: `${i * 0.35}s` }}
            />
            {on && <circle cx={n.x} cy={n.y} r={14} fill="none" stroke="#fbbf24" strokeOpacity={0.5} strokeWidth={1.5} />}
            <text
              x={n.lx}
              y={n.ly + 5}
              textAnchor={anchor}
              fontSize={on ? 16 : 14}
              fontWeight={on ? 700 : 500}
              fill={on ? "#fff" : "#c4b5fd"}
            >
              {n.a.label}
            </text>
          </g>
        );
      })}

      {/* 가운데 */}
      <circle cx={C} cy={C} r={40} fill="#1a1846" stroke="#fbbf24" strokeOpacity={0.35} />
      <text x={C} y={C - 4} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">
        재능 지도
      </text>
      <text x={C} y={C + 18} textAnchor="middle" fontSize={13} fill="#c4b5fd">
        2026 · 3갈래 먼저
      </text>
    </svg>
  );
}
