import StudentFigure from "@/components/art/StudentFigure";
import { axes } from "@/lib/result";

/**
 * 새 홍보 히어로의 「재능 지도」.
 *
 * 가운데에 아이를 두고 여덟 갈래 재능 노드를 팔각형으로 둘러 세운다. 노드의
 * 배열 순서는 `lib/result.ts`의 axes 그대로라, 결과지의 팔각형 좌표와 여기
 * 그림이 같은 자리를 가리킨다.
 *
 * 색으로만 상태를 나누지 않는다 — 2026년에 재는 세 축은 채운 원 + 실선, 아직
 * 재지 않는 다섯 축은 빈 원 + 점선이라 흑백으로 인쇄해도 구분된다. 낮은 점수와
 * 미측정을 헷갈리지 않게 하는 것이 이 서비스의 대전제여서, 광고 그림에서부터
 * 그 규칙을 지킨다.
 *
 * 떠 있는 카드는 네 모서리에만 둔다. 원 바깥으로 밀어내지 않으면 카드가 노드를
 * 덮어 여덟 갈래 가운데 하나가 사라진다 — 뷰박스를 세로보다 가로로 넉넉히 잡은
 * 것도 그 자리를 만들기 위해서다.
 */

const W = 620;
const H = 470;
const CX = 310;
const CY = 225;
const R = 132;

const nodes = axes.map((axis, i) => {
  const rad = ((-90 + i * 45) * Math.PI) / 180;
  return {
    axis,
    measured: Boolean(axis.subject),
    x: CX + R * Math.cos(rad),
    y: CY + R * Math.sin(rad),
  };
});

/** 이미 측정하는 축을 이은 면 — 지도에서 「지금까지 그려진 만큼」이다 */
const drawnArea = [
  `M ${CX} ${CY}`,
  ...nodes.filter((n) => n.measured).map((n) => `L ${n.x.toFixed(1)} ${n.y.toFixed(1)}`),
  "Z",
].join(" ");

/** 모서리 카드 공통 — 폭은 원 바깥(약 27%)을 넘지 않는다 */
const card =
  "absolute w-[27%] rounded-[clamp(10px,2.4cqw,16px)] p-[clamp(8px,2.1cqw,14px)] shadow-float";
const cardLabel = "text-[clamp(8px,1.6cqw,11px)] font-bold";

export default function TalentMap() {
  return (
    <div className="@container relative mx-auto aspect-[620/470] w-full max-w-[620px]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="아이를 가운데 두고 언어·수리·탐구·공간·청각·신체·관계·자기이해 여덟 갈래 재능이 팔각형으로 둘러싼 재능 지도. 언어·수리·탐구 세 갈래는 2026년에 측정하는 축이라 채워져 있고, 나머지 다섯 갈래는 2027년 심화진단에서 측정할 축이라 점선으로 비어 있습니다."
      >
        <defs>
          <radialGradient id="tm-core" cx="0.5" cy="0.42" r="0.62">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#eaf1fd" />
            <stop offset="100%" stopColor="#dbe5f9" />
          </radialGradient>
          <linearGradient id="tm-area" x1="0.2" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#7488e0" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#7c65e8" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {/* 바깥 궤도 — 여덟 갈래가 같은 원 위에 있다는 것만 말한다 */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#c7d2f6" strokeWidth={1.5} />
        <circle
          cx={CX}
          cy={CY}
          r={R - 42}
          fill="none"
          stroke="#e2e8fb"
          strokeWidth={1.5}
          strokeDasharray="3 7"
        />

        {/* 이미 그려진 면 */}
        <path d={drawnArea} fill="url(#tm-area)" stroke="#5164cf" strokeWidth={2} />

        {/* 중심에서 뻗는 살 */}
        {nodes.map((n) => (
          <line
            key={`spoke-${n.axis.id}`}
            x1={CX}
            y1={CY}
            x2={n.x}
            y2={n.y}
            stroke={n.measured ? "#5164cf" : "#c7d2f6"}
            strokeWidth={n.measured ? 2 : 1.5}
            strokeDasharray={n.measured ? undefined : "4 6"}
          />
        ))}

        {/* 가운데 자리 — 아이가 앉을 흰 원 */}
        <circle cx={CX} cy={CY} r={58} fill="url(#tm-core)" />
        <circle cx={CX} cy={CY} r={58} fill="none" stroke="#ffffff" strokeWidth={5} />

        {/* 재능 노드 */}
        {nodes.map((n, i) => (
          <g key={n.axis.id}>
            {n.measured && (
              <circle
                cx={n.x}
                cy={n.y}
                r={33}
                fill="#7488e0"
                className="animate-node-glow"
                style={{ animationDelay: `${i * 0.55}s` }}
              />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={26}
              fill={n.measured ? "#1b2a6b" : "#ffffff"}
              stroke={n.measured ? "#1b2a6b" : "#a1b2ee"}
              strokeWidth={n.measured ? 0 : 1.5}
              strokeDasharray={n.measured ? undefined : "4 5"}
            />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={15}
              fontWeight={700}
              fill={n.measured ? "#ffffff" : "#5164cf"}
            >
              {n.axis.short}
            </text>
          </g>
        ))}
      </svg>

      {/* 가운데 아이 — SVG와 같은 가로세로비를 쓰므로 50%가 그대로 원의 중심이다 */}
      <StudentFigure className="absolute left-1/2 top-[48%] h-auto w-[15%] -translate-x-1/2 -translate-y-1/2" />

      {/* 왼쪽 위 — 아이가 말한 답 */}
      <figure className={`${card} left-0 top-[3%] bg-white/95 backdrop-blur`}>
        <figcaption className={`${cardLabel} text-slate-500`}>말로 설명한 답</figcaption>
        <div aria-hidden className="mt-[8%] flex h-[clamp(16px,4cqw,28px)] items-center gap-[3.5%]">
          {[0.45, 0.8, 0.55, 1, 0.7, 0.35, 0.9, 0.5, 0.75, 0.4].map((h, i) => (
            <span
              key={i}
              className="animate-wave-bar w-full rounded-full bg-brand-400"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.11}s` }}
            />
          ))}
        </div>
      </figure>

      {/* 오른쪽 위 — 아이가 쓴 문장 */}
      <figure className={`${card} right-0 top-[3%] bg-white/95 backdrop-blur`}>
        <figcaption className={`${cardLabel} text-slate-500`}>쓴 문장 · 근거</figcaption>
        <div aria-hidden className="mt-[10%] space-y-[7%]">
          {["100%", "78%", "92%", "54%"].map((w, i) => (
            <span
              key={i}
              className="block h-[clamp(3px,0.9cqw,6px)] rounded-full bg-brand-100"
              style={{ width: w }}
            />
          ))}
        </div>
      </figure>

      {/* 오른쪽 아래 — 나온 유형 */}
      <div className={`${card} right-0 bottom-[6%] bg-brand-950`}>
        <p className={`${cardLabel} text-brand-300`}>이번 회차 재능 유형</p>
        <p className="mt-[6%] text-[clamp(10px,2.4cqw,16px)] font-black text-white">
          이야기 탐험가형
        </p>
        <p className="mt-[4%] text-[clamp(8px,1.6cqw,11px)] leading-snug text-brand-100">
          읽은 것을 자기 말로 다시 짜는 아이
        </p>
      </div>

      {/* 왼쪽 아래 — 범례. 색이 아니라 모양으로 갈린다는 걸 여기서 한 번 더 말해 둔다 */}
      <ul className="absolute bottom-[7%] left-0 space-y-[3%] text-[clamp(8px,1.6cqw,11px)] text-slate-500">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-900" />
          2026년 측정
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-brand-300 bg-white"
          />
          2027년 확대
        </li>
      </ul>
    </div>
  );
}
