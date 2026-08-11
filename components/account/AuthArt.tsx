/**
 * 회원 유형 카드에 들어가는 플랫 일러스트.
 *
 * 외부 이미지를 받지 않고 SVG로 그린다. 카드가 좌우로 놓이므로 두 그림의
 * 무게중심과 여백을 맞췄고, 색은 두 시안 모두에서 튀지 않는 팔레트로 골랐다.
 * accent 색만 프롭으로 받아 시안별 주색을 따라간다.
 */

type Props = { className?: string; accent?: string };

/** 개인 — 보호자와 아이 */
export function PersonalArt({ className = "", accent = "#365eef" }: Props) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="보호자와 아이">
      {/* 바닥 그림자 */}
      <ellipse cx="100" cy="126" rx="66" ry="7" fill={accent} opacity="0.1" />

      {/* 보호자 */}
      <path d="M56 124V96a20 20 0 0 1 40 0v28Z" fill={accent} />
      <circle cx="76" cy="66" r="15" fill="#fbd7bf" />
      <path d="M61 64a15 15 0 0 1 30 0c0-11-6-16-15-16S61 53 61 64Z" fill="#3f3d56" />
      <rect x="68" y="80" width="16" height="9" rx="4" fill="#fbd7bf" />

      {/* 아이 */}
      <path d="M112 124v-20a15 15 0 0 1 30 0v20Z" fill="#f7b23b" />
      <circle cx="127" cy="82" r="12" fill="#fbd7bf" />
      <path d="M115 81a12 12 0 0 1 24 0c0-9-5-13-12-13s-12 4-12 13Z" fill="#5b4636" />

      {/* 손 잡은 선 */}
      <path
        d="M94 108c6-4 12-4 18 0"
        stroke="#fbd7bf"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* 말풍선 — 재능 신호 */}
      <rect x="128" y="26" width="52" height="34" rx="9" fill="#fff" stroke={accent} strokeWidth="2.5" />
      <path d="M142 60l-3 9 11-9Z" fill="#fff" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="143" cy="43" r="3.5" fill={accent} />
      <circle cx="154" cy="43" r="3.5" fill="#f7b23b" />
      <circle cx="165" cy="43" r="3.5" fill="#4fc08d" />

      {/* 별 */}
      <path
        d="M32 44l3.2 7.4L43 54l-7.8 2.6L32 64l-3.2-7.4L21 54l7.8-2.6Z"
        fill="#f7b23b"
      />
    </svg>
  );
}

/** 기관 — 학교 건물과 학급 */
export function OrgArt({ className = "", accent = "#365eef" }: Props) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label="학교와 학급">
      <ellipse cx="100" cy="126" rx="70" ry="7" fill={accent} opacity="0.1" />

      {/* 건물 본체 */}
      <rect x="48" y="52" width="104" height="72" rx="6" fill="#fff" stroke={accent} strokeWidth="3" />
      {/* 지붕 */}
      <path d="M40 54l60-30 60 30Z" fill={accent} />
      {/* 깃대 */}
      <path d="M100 24V10" stroke="#3f3d56" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M101 11h13l-4 5 4 5h-13Z" fill="#f7b23b" />

      {/* 창문 3개 */}
      <rect x="62" y="68" width="22" height="20" rx="3" fill="#eaf3ff" stroke={accent} strokeWidth="2" />
      <rect x="89" y="68" width="22" height="20" rx="3" fill="#eaf3ff" stroke={accent} strokeWidth="2" />
      <rect x="116" y="68" width="22" height="20" rx="3" fill="#eaf3ff" stroke={accent} strokeWidth="2" />

      {/* 문 */}
      <path d="M88 124v-22a12 12 0 0 1 24 0v22Z" fill="#f7b23b" />
      <circle cx="106" cy="113" r="2.5" fill="#fff" />

      {/* 학생 둘 */}
      <circle cx="34" cy="96" r="9" fill="#fbd7bf" />
      <path d="M23 124v-13a11 11 0 0 1 22 0v13Z" fill="#4fc08d" />
      <circle cx="166" cy="96" r="9" fill="#fbd7bf" />
      <path d="M155 124v-13a11 11 0 0 1 22 0v13Z" fill="#e879a6" />
    </svg>
  );
}

/** 카드 제목 옆 원형 화살표 */
export function ArrowBadge({ color = "#365eef", size = 26 }: { color?: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, backgroundColor: color }}
      className="inline-flex shrink-0 items-center justify-center rounded-full text-white"
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none">
        <path
          d="M9 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
