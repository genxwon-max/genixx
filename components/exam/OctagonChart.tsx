import type { AxisScore } from "@/lib/result";

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

/**
 * 8재능 팔각형 차트.
 * 측정된 축만 값을 그리고, 미측정 축은 점선과 '미측정' 표기로 구분한다.
 * (미측정을 0점으로 오독하지 않게 하기 위함)
 */
export default function OctagonChart({
  scores,
  size = 420,
  id = "genixx-octagon",
}: {
  scores: AxisScore[];
  size?: number;
  id?: string;
}) {
  const pad = 64;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - pad;
  const n = scores.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;
  const font = "'Noto Sans KR', system-ui, sans-serif";

  const ring = (ratio: number) =>
    scores
      .map((_, i) => {
        const [x, y] = polar(cx, cy, radius * ratio, start + step * i);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  /** 측정된 축은 점수, 미측정 축은 중심 근처(8%)로 접어 다각형을 닫는다 */
  const valuePath =
    scores
      .map((s, i) => {
        const ratio =
          s.measured && s.score !== null ? Math.max(0, Math.min(100, s.score)) / 100 : 0.08;
        const [x, y] = polar(cx, cy, radius * ratio, start + step * i);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      id={id}
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`8재능 팔각형 결과: ${scores
        .map((s) => `${s.axis.label} ${s.measured ? `${s.score}점` : "미측정"}`)
        .join(", ")}`}
    >
      <rect width={size} height={size} fill="#f7f9fc" />

      <defs>
        <radialGradient id={`${id}-fill`} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#5164cf" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1b2a6b" stopOpacity="0.28" />
        </radialGradient>
      </defs>

      {[0.25, 0.5, 0.75, 1].map((r) => (
        <path key={r} d={ring(r)} fill="none" stroke="#ccd5e4" strokeWidth={1} />
      ))}

      {scores.map((s, i) => {
        const [x, y] = polar(cx, cy, radius, start + step * i);
        return (
          <line
            key={`axis-${s.axis.id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={s.measured ? "#ccd5e4" : "#e2e8f2"}
            strokeWidth={1}
            strokeDasharray={s.measured ? undefined : "3 3"}
          />
        );
      })}

      <path
        d={valuePath}
        fill={`url(#${id}-fill)`}
        stroke="#1b2a6b"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {scores.map((s, i) => {
        if (!s.measured || s.score === null) return null;
        const [x, y] = polar(cx, cy, (radius * s.score) / 100, start + step * i);
        return <circle key={`dot-${s.axis.id}`} cx={x} cy={y} r={3.4} fill="#1b2a6b" />;
      })}

      {scores.map((s, i) => {
        const angle = start + step * i;
        const [x, y] = polar(cx, cy, radius + 26, angle);
        const cos = Math.cos(angle);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <g key={`label-${s.axis.id}`}>
            <text
              x={x}
              y={y - 6}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={13}
              fontFamily={font}
              fontWeight={700}
              fill={s.measured ? "#1a2242" : "#9aa4bd"}
            >
              {s.axis.label}
            </text>
            <text
              x={x}
              y={y + 10}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={12}
              fontFamily={font}
              fontWeight={700}
              fill={s.measured ? "#3c4ab8" : "#b6bed2"}
            >
              {s.measured ? `${s.score}` : "미측정"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
