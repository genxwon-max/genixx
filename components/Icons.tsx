import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h14" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function BotIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="8" width="15" height="11" rx="3" />
      <path d="M12 4.5V8" />
      <circle cx="12" cy="3.6" r="1.1" />
      <path d="M9.3 12.5v1.6M14.7 12.5v1.6" />
      <path d="M2.8 12.5v3M21.2 12.5v3" />
    </svg>
  );
}

export function ChartUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19.5h16" />
      <rect x="6" y="12" width="3" height="6" rx="1" />
      <rect x="11" y="8.5" width="3" height="9.5" rx="1" />
      <rect x="16" y="5" width="3" height="13" rx="1" />
    </svg>
  );
}

/* ── 회원 유형 아이콘 ──
   실제 캐릭터 일러스트가 준비되면 이 자리를 이미지로 바꾸면 된다. */

/** 학부모 — 어른과 아이가 손을 잡은 형태 */
export function ParentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="5.6" r="2.6" />
      <path d="M4 20v-3.2a4.5 4.5 0 0 1 4.5-4.5 4.5 4.5 0 0 1 4.5 4.5V20" />
      <circle cx="17" cy="10.4" r="1.9" />
      <path d="M13.8 20v-2.4a3.2 3.2 0 0 1 3.2-3.2 3.2 3.2 0 0 1 3.2 3.2V20" />
    </svg>
  );
}

/** 학생 — 학사모를 쓴 얼굴 */
export function StudentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 21 7.6l-9 4.1-9-4.1 9-4.1Z" />
      <path d="M6.6 9.8v4.1c0 1.7 2.4 3.1 5.4 3.1s5.4-1.4 5.4-3.1V9.8" />
      <path d="M20.4 8.2v5" />
    </svg>
  );
}

/** 교사 — 칠판 앞의 사람 */
export function TeacherIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3.6" width="18" height="11.5" rx="2" />
      <path d="M7 7.6h6M7 11h4" />
      <circle cx="16.6" cy="17.4" r="1.9" />
      <path d="M13 22v-.9a3.6 3.6 0 0 1 7.2 0v.9" />
    </svg>
  );
}

/** 기관 — 학교 건물 */
export function InstitutionIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 20h18" />
      <path d="M5 20V9.5l7-4.5 7 4.5V20" />
      <path d="M10 20v-4.4h4V20" />
      <path d="M9.6 11.4h1.2M13.2 11.4h1.2" />
    </svg>
  );
}
