/**
 * 잼피(Jempy) — 잼 파인더의 상징 캐릭터. 전부 SVG로 그린다.
 *
 * 의뢰인이 보여 준 시안의 캐릭터(남색 보석 몸, 별 무늬, 큰 눈, 망토, 확대경·지도)를
 * 그림 파일 없이 벡터로 다시 그렸다. 몸은 남색 보석, 머리에 노란 별 하나, 볼은 산호색,
 * 망토는 오른쪽 어깨 뒤로 흐르고 어깨 위에 매듭 리본.
 *
 * 포즈 넷 — hi(양팔 벌림) · glass(확대경) · map(재능 지도) · wave(손 흔들기). 실루엣만으로
 * 갈리게 팔 모양을 전부 다르게 잡았다. `compact`는 40~48px 자리용 — 얼굴만 크게, 망토·
 * 다리·몸의 별은 생략한다(작아지면 눈이 4px가 되어 얼굴이 사라진다).
 *
 * 눈은 CSS(.jm-eye)로 6초에 한 번 깜빡이고, 몸의 별은 .jm-twinkle로 반짝인다.
 * prefers-reduced-motion이면 home5.css가 전부 끈다.
 */
export type JempyPose = "hi" | "glass" | "map" | "wave";

const BODY = "#2f2c8c";
const BODY_DARK = "#1a1846";
const LIMB = "#2a277a";
const CAPE = "#fb7185";

/* 자리 옮김은 바깥 g의 transform 속성으로, 반짝임은 안쪽 path의 CSS transform으로 —
   한 요소에 둘을 같이 두면 CSS가 속성을 덮어써서 별이 (0,0)으로 달아난다 */
function Sparkle({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="jm-twinkle"
        style={{ animationDelay: `${delay}s` }}
        d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
        fill="#fff"
        opacity={0.9}
      />
    </g>
  );
}

function Star5({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(x + Math.cos(rad) * rr).toFixed(1)},${(y + Math.sin(rad) * rr).toFixed(1)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth={2} />;
}

export default function Jempy({
  pose = "hi",
  compact = false,
  className = "",
  label = "잼 파인더의 캐릭터 잼피",
}: {
  pose?: JempyPose;
  /** 40~48px 자리 — 얼굴만 크게 */
  compact?: boolean;
  className?: string;
  /** 빈 문자열이면 장식(aria-hidden) — 글 옆에 붙는 작은 잼피 */
  label?: string;
}) {
  const uid = `jempy-${pose}${compact ? "-c" : ""}`;
  const eye = compact ? { rx: 19, ry: 21, p: 10.5, h: 4.5 } : { rx: 17, ry: 19, p: 9, h: 3.5 };

  return (
    <svg
      viewBox={compact ? "20 8 200 258" : "-30 0 300 290"}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#4b47b8" />
          <stop offset="0.55" stopColor={BODY} />
          <stop offset="1" stopColor={BODY_DARK} />
        </linearGradient>
        <radialGradient id={`${uid}-glass`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#bae6fd" stopOpacity="0.9" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      {/* 망토 — 오른쪽 어깨 뒤로 한쪽만 흐른다 */}
      {!compact && (
        <>
          <path d="M128 96 C178 112 214 154 220 240 C196 226 162 224 136 240 Z" fill={CAPE} />
          <path d="M150 120 C190 150 208 190 214 232 C196 222 176 220 158 226 Z" fill="#f43f5e" opacity={0.3} />
        </>
      )}

      {/* 다리 */}
      {!compact && (
        <>
          <rect x="90" y="246" width="24" height="28" rx="12" fill={LIMB} />
          <rect x="126" y="246" width="24" height="28" rx="12" fill={LIMB} />
        </>
      )}

      {/* 왼팔 (보는 쪽 왼쪽) — 포즈별 */}
      {!compact && pose === "map" && (
        <path d="M56 150 C38 178 54 200 80 204" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
      )}
      {!compact && pose === "hi" && (
        <path d="M54 150 C30 140 14 122 10 100" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
      )}
      {!compact && (pose === "glass" || pose === "wave") && (
        <path d="M54 150 C36 160 26 176 24 190" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
      )}

      {/* 몸 — 보석 */}
      <path
        d="M120 34 C152 34 206 84 209 120 C212 158 154 246 120 262 C86 246 28 158 31 120 C34 84 88 34 120 34 Z"
        fill={`url(#${uid}-body)`}
      />
      {/* 윗면 깎임 */}
      <path d="M120 40 L176 80 L120 102 L64 80 Z" fill="#fff" opacity={0.16} />
      <path d="M64 80 L36 124 M176 80 L204 124" stroke="#fff" strokeWidth="2" opacity={0.18} strokeLinecap="round" />
      {/* 몸의 별 */}
      {!compact && (
        <>
          <Sparkle x={78} y={170} s={0.9} delay={0.2} />
          <Sparkle x={166} y={184} s={0.7} delay={1.4} />
          <Sparkle x={112} y={228} s={0.6} delay={2.3} />
          <circle cx="150" cy="216" r="2" fill="#fff" opacity={0.7} />
          <circle cx="90" cy="206" r="1.6" fill="#fff" opacity={0.6} />
        </>
      )}

      {/* 망토 매듭 — 어깨 위 리본 */}
      {!compact && (
        <>
          <circle cx="170" cy="92" r="7" fill={CAPE} />
          <circle cx="182" cy="98" r="7" fill={CAPE} />
          <circle cx="176" cy="96" r="3.5" fill="#fff" opacity={0.8} />
        </>
      )}

      {/* 머리 별 */}
      <Star5 x={120} y={24} r={15} fill="#fbbf24" />

      {/* 얼굴 */}
      <g className="jm-eye">
        <ellipse cx="96" cy="130" rx={eye.rx} ry={eye.ry} fill="#fff" />
        <circle cx="99" cy="133" r={eye.p} fill={BODY_DARK} />
        <circle cx="103" cy="127" r={eye.h} fill="#fff" />
        <circle cx="95" cy="138" r={eye.h * 0.45} fill="#fff" opacity={0.8} />
      </g>
      <g className="jm-eye" style={{ animationDelay: "0.1s" }}>
        <ellipse cx="144" cy="130" rx={eye.rx} ry={eye.ry} fill="#fff" />
        <circle cx="147" cy="133" r={eye.p} fill={BODY_DARK} />
        <circle cx="151" cy="127" r={eye.h} fill="#fff" />
        <circle cx="143" cy="138" r={eye.h * 0.45} fill="#fff" opacity={0.8} />
      </g>
      <circle cx="72" cy="156" r="9" fill={CAPE} opacity={0.55} />
      <circle cx="168" cy="156" r="9" fill={CAPE} opacity={0.55} />
      {/* 입 — 포즈와 상관없이 한 종류, 작아져도 남게 채움 */}
      <path d="M102 154 Q120 176 138 154 Z" fill="#fff" />
      <path d="M110 162 Q120 170 130 162 Z" fill={CAPE} opacity={0.8} />

      {/* 오른팔 — 포즈별 */}
      {!compact && pose === "hi" && (
        <path d="M186 150 C210 140 226 122 230 100" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
      )}
      {!compact && pose === "wave" && (
        <g className="jm-wave">
          <path d="M186 146 C200 130 214 112 222 92" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
          <circle cx="224" cy="86" r="13" fill={LIMB} />
        </g>
      )}
      {!compact && pose === "glass" && (
        <g>
          <path d="M186 148 C202 140 216 130 226 122" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
          <line x1="228" y1="120" x2="242" y2="104" stroke="#d97706" strokeWidth="10" strokeLinecap="round" />
          <circle cx="250" cy="94" r="22" fill={`url(#${uid}-glass)`} stroke="#fbbf24" strokeWidth="7" />
          <path d="M240 86 Q245 78 255 79" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.8} />
          <Sparkle x={268} y={70} s={0.8} delay={0.6} />
        </g>
      )}
      {!compact && pose === "map" && (
        <g>
          <path d="M184 150 C202 178 186 200 160 204" stroke={LIMB} strokeWidth="20" strokeLinecap="round" fill="none" />
          <g transform="rotate(-6 120 218)">
            <rect x="54" y="174" width="132" height="88" rx="12" fill="#fff" stroke="#c4b5fd" strokeWidth="2" />
            <rect x="64" y="184" width="112" height="68" rx="8" fill="#1a1846" />
            <polyline
              points="84,236 112,206 150,222"
              stroke="#fbbf24"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="84" cy="236" r="5.5" fill="#fbbf24" />
            <circle cx="112" cy="206" r="5.5" fill="#fbbf24" />
            <circle cx="150" cy="222" r="5.5" fill="#fbbf24" />
            <circle cx="96" cy="198" r="3" fill="#c4b5fd" />
            <circle cx="160" cy="242" r="3" fill="#c4b5fd" />
          </g>
          <circle cx="62" cy="252" r="12" fill={LIMB} />
          <circle cx="178" cy="252" r="12" fill={LIMB} />
        </g>
      )}
    </svg>
  );
}
