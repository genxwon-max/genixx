import { approvals, gradingQueue, inquiries, items, type CaseState, type RoundState } from "./admin";

/**
 * /admin2 — 슈퍼 관리자 콘솔의 뼈대 정의.
 *
 * 기존 /admin의 adminMenu(6그룹 · 20여 화면 · 하위 4단)를 그대로 쓰지 않는다. 저쪽은
 * 네 역할이 함께 쓰는 메뉴라 「출제자에게는 검수가 안 보인다」 같은 가림 규칙이 얹혀
 * 있고, 하위 항목이 접혀 들어가 기둥이 길다. 이 콘솔은 **슈퍼 관리자 한 사람**만
 * 쓰므로 가릴 것이 없고, 대신 한 화면에서 다음 화면으로 넘어가는 속도가 전부다.
 * 그래서 12개를 4그룹으로 펴 두고 접지 않는다.
 *
 * 화면 ID(ADM-xx · EXP-xx)는 사이트맵과 대조할 수 있게 그대로 달아 둔다.
 */
export type Admin2NavItem = {
  /** 사이트맵 화면 ID */
  code: string;
  label: string;
  href: string;
  /** 오른쪽 끝에 세우는 대기 건수. 0이면 그리지 않는다 */
  count?: number;
  /** 하위 경로까지 현재 위치로 칠할지 — /admin2는 정확히 일치할 때만 */
  exact?: boolean;
};

export type Admin2NavGroup = {
  label: string;
  items: Admin2NavItem[];
};

/** 지금 손이 가야 하는 건수 — 기둥의 숫자와 대시보드의 「내 앞에 쌓인 것」이 같은 값을 쓴다 */
export const queueCounts = {
  /** 판정 큐에서 아직 사람이 확정하지 않은 것 */
  cases: gradingQueue.filter((c) => c.state === "ai" || c.state === "review" || c.state === "conference").length,
  approvals: approvals.length,
  inquiries: inquiries.filter((i) => i.state !== "answered").length,
  items: items.filter((i) => i.state === "review").length,
  /* 확정됐지만 아직 발행 전인 것. lib/admin.ts의 pending.reports(4)는 손으로 박은 값이라
     눌러서 가는 화면의 어떤 숫자와도 맞지 않았다 — 목록에서 직접 센다. */
  reports: gradingQueue.filter((c) => c.state === "confirmed").length,
};

export const admin2Nav: Admin2NavGroup[] = [
  {
    label: "운영",
    items: [
      { code: "ADM-01", label: "대시보드", href: "/admin2", exact: true },
      { code: "ADM-05", label: "회차·응시", href: "/admin2/rounds" },
      { code: "EXP-07", label: "판정 큐", href: "/admin2/queue", count: queueCounts.cases },
    ],
  },
  {
    label: "회원",
    items: [
      { code: "ADM-02", label: "회원", href: "/admin2/members" },
      { code: "ADM-02-1", label: "학생·접속코드", href: "/admin2/students" },
      /* ADM-07은 사이트맵에서 「심리측정 분석」이다(lib/admin.ts). 기관은 ORG-02 */
      { code: "ORG-02", label: "기관", href: "/admin2/orgs" },
      { code: "ADM-02-2", label: "가입 승인", href: "/admin2/approvals", count: queueCounts.approvals },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { code: "ADM-04", label: "문항 은행", href: "/admin2/items", count: queueCounts.items },
      { code: "ADM-10", label: "문의", href: "/admin2/inquiries", count: queueCounts.inquiries },
    ],
  },
  {
    label: "시스템",
    items: [
      { code: "ADM-03", label: "운영자·권한", href: "/admin2/staff" },
      { code: "ADM-11", label: "감사 로그", href: "/admin2/audit" },
      { code: "ADM-13", label: "시스템 설정", href: "/admin2/settings" },
    ],
  },
];

/** 주소로 지금 화면을 찾는다 — 빵부스러기와 문서 제목이 쓴다 */
export function findAdmin2(pathname: string): { group: string; item: Admin2NavItem } | null {
  let best: { group: string; item: Admin2NavItem } | null = null;
  for (const g of admin2Nav) {
    for (const item of g.items) {
      const hit = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (!hit) continue;
      // 더 긴 주소가 이긴다 — /admin2 와 /admin2/rounds 가 함께 걸리는 것을 막는다
      if (!best || item.href.length > best.item.href.length) best = { group: g.label, item };
    }
  }
  return best;
}

/* ───────────────────────── 상태 색 ─────────────────────────
   상태는 점 + 글자로 적는다. 색은 넷뿐이고, 넷 밖의 값은 회색으로 떨어뜨린다 —
   상태마다 색을 새로 만들면 표 한 장에 무지개가 선다. */

export type Tone = "ok" | "warn" | "danger" | "info" | "muted";

export const toneColor: Record<Tone, string> = {
  ok: "var(--a2-ok)",
  warn: "var(--a2-warn)",
  danger: "var(--a2-danger)",
  info: "var(--a2-info)",
  muted: "var(--a2-ink-4)",
};

/**
 * 상태 → 색조 짝.
 *
 * 화면마다 각자 적어 두었더니 회차 화면에서 서버가 그린 값이 undefined가 되어 같은 상태가
 * 세 가지 색으로 나온 적이 있다("use client" 파일의 export를 서버 컴포넌트가 부르면 값이
 * 넘어오지 않는다). 짝은 지시자 없는 이 파일에 한 벌만 둔다.
 */
export const roundTone: Record<RoundState, Tone> = {
  open: "ok",
  grading: "warn",
  draft: "muted",
  closed: "muted",
};

export const caseTone: Record<CaseState, Tone> = {
  ai: "info",
  review: "warn",
  conference: "danger",
  confirmed: "ok",
  published: "muted",
};

/** 숫자를 세 자리마다 끊는다 */
export const n = (v: number) => v.toLocaleString("ko-KR");

/** 비율(%) — 분모가 0이면 0으로. NaN을 화면에 내보내지 않는다 */
export const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
