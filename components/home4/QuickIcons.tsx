/**
 * 바로가기 줄의 선 아이콘 여섯. 공공 누리집의 둥근 바탕 + 선 아이콘 관행.
 * 전부 currentColor, 24px 격자, 1.75 굵기.
 */
type P = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
};

/** 접수 신청 — 연필이 놓인 서류 */
export function ApplyIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

/** 샘플 리포트 — 좌표가 찍힌 종이 */
export function ReportIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 16l3-4 2 2 3-5" />
      <path d="M8 8h8" />
    </svg>
  );
}

/** 문항 미리보기 — 물음표 말풍선 */
export function QuestionIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M10 9.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2" />
      <circle cx="12" cy="14.5" r=".4" fill="currentColor" />
    </svg>
  );
}

/** 진단 원리 — 사람과 회로가 만나는 점 */
export function PrincipleIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M16 4h4v4M20 4l-4 4" />
      <path d="M15 13h5v5h-5z" />
      <path d="M13 15.5h2M13 18h2" />
    </svg>
  );
}

/** 자주 묻는 질문 — 겹친 말풍선 */
export function FaqIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M3 5h12v8H7l-4 3z" />
      <path d="M15 9h6v8h-2l-3 3v-3h-1" />
    </svg>
  );
}

/** 기관 도입 — 건물 */
export function OrgIcon({ className }: P) {
  return (
    <svg {...base} className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 11h2M13 11h2M9 14h2M13 14h2" />
    </svg>
  );
}
