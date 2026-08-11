type Point = { label: string; value: number };

type Props = {
  data: Point[];
  size?: number;
  showLabels?: boolean;
  labelSize?: number;
  className?: string;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

/**
 * 7축 레이더 차트. 값은 0~100 기준이며 SVG만 사용해 서버에서도 렌더된다.
 */
export default function RadarChart({
  data,
  size = 260,
  showLabels = true,
  labelSize = 11,
  className,
}: Props) {
  const pad = showLabels ? 46 : 8;
  const box = size;
  const cx = box / 2;
  const cy = box / 2;
  const radius = box / 2 - pad;
  const n = data.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  const rings = [0.25, 0.5, 0.75, 1];

  const ringPath = (ratio: number) =>
    data
      .map((_, i) => {
        const [x, y] = polar(cx, cy, radius * ratio, start + step * i);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const valuePath =
    data
      .map((d, i) => {
        const ratio = Math.max(0, Math.min(100, d.value)) / 100;
        const [x, y] = polar(cx, cy, radius * ratio, start + step * i);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width="100%"
      className={className}
      role="img"
      aria-label={`역량 레이더 차트: ${data
        .map((d) => `${d.label} ${d.value}점`)
        .join(", ")}`}
    >
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#7c65e8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5164cf" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {rings.map((r) => (
        <path
          key={r}
          d={ringPath(r)}
          fill="none"
          stroke="#dfe4f5"
          strokeWidth={1}
        />
      ))}

      {data.map((d, i) => {
        const [x, y] = polar(cx, cy, radius, start + step * i);
        return (
          <line
            key={`axis-${d.label}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#e5e9f7"
            strokeWidth={1}
          />
        );
      })}

      <path d={valuePath} fill="url(#radar-fill)" stroke="#6a4fd8" strokeWidth={1.8} strokeLinejoin="round" />

      {data.map((d, i) => {
        const ratio = Math.max(0, Math.min(100, d.value)) / 100;
        const [x, y] = polar(cx, cy, radius * ratio, start + step * i);
        return <circle key={`dot-${d.label}`} cx={x} cy={y} r={2.6} fill="#6a4fd8" />;
      })}

      {showLabels &&
        data.map((d, i) => {
          const angle = start + step * i;
          const [x, y] = polar(cx, cy, radius + 18, angle);
          const cos = Math.cos(angle);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          return (
            <text
              key={`label-${d.label}`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={labelSize}
              fill="#4a5378"
              fontWeight={500}
            >
              {d.label}
            </text>
          );
        })}
    </svg>
  );
}
