import { approvals, gradingQueue, inquiries, type CaseState, type OrgRow, type RoundState } from "./admin";
import type { ExamState, UserState } from "./adminUsers";
import type { FormState } from "./formStore";
import type { ItemState } from "./itemStore";

/**
 * /admin2 — 슈퍼 관리자 콘솔의 뼈대 정의.
 *
 * 기존 /admin의 adminMenu(6그룹 · 20여 화면 · 하위 4단)를 그대로 쓰지 않는다. 저쪽은
 * 네 역할이 함께 쓰는 메뉴라 「출제자에게는 검수가 안 보인다」 같은 가림 규칙이 얹혀
 * 있고, 하위 4단까지 내려간다. 이 콘솔은 **슈퍼 관리자 한 사람**만 쓰므로 가릴 것이
 * 없고, 대신 한 화면에서 다음 화면으로 넘어가는 속도가 전부다. 그래서 12개를 4그룹
 * **한 단**으로만 편다.
 *
 * 처음에는 넷을 전부 펴 두고 접지 않았다. 열둘이 한 줄로 꿰여 내려가니 그룹이 갈리는
 * 자리가 자간 하나에만 걸려 있어서 기둥을 훑기가 어려웠다. 지금은 그룹 머리를 눌러
 * 접는다(components/admin2/Shell.tsx) — 접히는 것은 이 한 단뿐이고, 그 아래로 더
 * 들어가는 단은 여전히 만들지 않는다.
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
  /**
   * 브라우저 저장소에서만 셀 수 있는 배지.
   *
   * 문항은 lib/itemStore.ts가 localStorage에 들고 있어 서버에서 세지 못한다. 여기
   * count에 서버에서 센 값을 박아 두면 기둥의 숫자와 그 화면의 줄 수가 갈린다 —
   * 표시만 하고 값은 껍데기(Shell)가 살아 있는 목록에서 채운다.
   *
   *   drafts  작성 중 + 반려됨 — 출제 화면에 서 있는 줄 수
   *   review  검수 대기 — 검수 화면에 서 있는 줄 수
   */
  live?: "drafts" | "review";
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
  /* 확정됐지만 아직 발행 전인 것. lib/admin.ts의 pending.reports(4)는 손으로 박은 값이라
     눌러서 가는 화면의 어떤 숫자와도 맞지 않았다 — 목록에서 직접 센다. */
  reports: gradingQueue.filter((c) => c.state === "confirmed").length,
};

export const admin2Nav: Admin2NavGroup[] = [
  {
    label: "운영",
    items: [
      { code: "ADM-01", label: "대시보드", href: "/admin2", exact: true },
      { code: "EXP-07", label: "판정 큐", href: "/admin2/queue", count: queueCounts.cases },
      /* 콘텐츠 그룹이 「문항관리」가 되면서 갈 데가 없어진 항목이다. 문의는 문항이 아니라
         사람이 보내온 것이고, 하는 일은 판정 큐와 같다 — 매일 열어 밀린 것을 처리한다.
         회원 그룹도 후보였지만 저쪽은 명부(누가 있나)이고 이쪽은 큐(무엇이 밀렸나)다. */
      { code: "ADM-10", label: "문의", href: "/admin2/inquiries", count: queueCounts.inquiries },
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
    /*
     * 문항을 셋으로 편다 — 쓰는 자리 · 보는 자리 · 쌓인 자리.
     *
     * 한동안 문항 상세 한 장에 출제와 검수를 다 넣고 기둥에는 문항 은행만 세웠다. 화면
     * 수로는 그쪽이 적지만, 기둥에서 「지금 검수할 게 몇 개인가」를 볼 자리가 없어서 은행에
     * 들어가 상태 거르개를 걸어야 알 수 있었다. 매일 여는 두 가지 일(쓰기·검수)이 목록으로
     * 서 있지 않으면 그 일이 없는 것처럼 보인다.
     *
     * 고치는 자리는 여전히 문항 상세 하나다. 출제·검수 화면은 「무엇부터 여나」만 답하고,
     * 실제로 채우고 짚는 일은 상세에서 한다 — 워크벤치를 둘로 갈라 같은 문항을 두 화면에서
     * 다르게 그리는 일은 만들지 않는다.
     */
    label: "문항관리",
    items: [
      { code: "EXP-02", label: "문항 출제", href: "/admin2/authoring", live: "drafts" },
      { code: "EXP-03", label: "문항 검수", href: "/admin2/review", live: "review" },
      { code: "ADM-04", label: "문항 은행", href: "/admin2/items" },
    ],
  },
  {
    /*
     * 한 번의 평가가 나가기까지 손대는 것 셋.
     *
     *   평가 회차        언제 여는가 · 어떤 학년군과 과목을 보는가
     *   평가별 문항관리   회차 × 과목 × 학년군 검사지가 지금 어디까지 짜였는가
     *
     * 「평가 과목」 화면은 뺐다. 과목은 회차마다 정하는 값이 되어(회차 생성·편성 화면의
     * PlanPicker) 따로 볼 목록이 없어졌다 — 과목별 문항 재고는 그 고르는 자리에서 바로
     * 옆에 서고, 어느 회차에 나가는지는 평가별 문항관리가 이미 답한다.
     *
     * 문항관리 **바로 아래**에 둔다. 일이 그 차례로 흐르기 때문이다 — 쓰고(출제) 보고(검수)
     * 쌓은(은행) 문항을 골라 회차에 담는다. 두 그룹을 떼어 놓으면 그 흐름이 기둥에서 끊긴다.
     *
     * 「회차·응시」가 운영 그룹에 있던 것을 여기로 옮겼다. 회차를 여닫는 일은 운영이지만
     * 그 회차에 무엇을 내보낼지 짜는 일과 같은 화면에서 이어지므로, 두 그룹에 갈라 두면
     * 편성하다가 기둥을 위아래로 오간다. 옮기면서 이름도 「평가 회차」로 맞췄다 —
     * 아래 둘이 「평가 …」이고 저것만 「회차」면 셋이 한 갈래로 안 읽힌다.
     *
     * ⚠ 두 곳에 같은 화면을 두지 않는다. 운영 그룹에 남겨 두고 여기에도 세우면 같은 회차를
     *   두 자리에서 열게 되고, 어느 쪽이 진짜인지 묻는 사람이 생긴다.
     */
    label: "평가 관리",
    items: [
      { code: "ADM-05", label: "평가 회차", href: "/admin2/rounds" },
      { code: "ADM-04-3", label: "평가별 문항관리", href: "/admin2/forms" },
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

/**
 * 문항 상태 → 색조.
 *
 * 오늘 손이 가야 하는 둘에만 색을 남긴다 — 검수 대기는 기다리는 것(warn), 반려는
 * 되돌아온 것(danger). 작성 중과 사용 중지는 아직/이미 은행 밖이라 회색으로
 * 떨어뜨린다. 다섯 상태에 다섯 색을 주면 표 한 장이 무지개가 되어 정작 값이 안 읽힌다.
 */
export const itemTone: Record<ItemState, Tone> = {
  draft: "muted",
  submitted: "warn",
  rejected: "danger",
  approved: "ok",
  retired: "muted",
};

/** 검사지 — 초안은 아직 사람이 확정하지 않은 것이라 기다리는 색으로 둔다 */
export const formTone: Record<FormState, Tone> = {
  draft: "warn",
  confirmed: "ok",
};

/**
 * 계정 상태 → 색조.
 *
 * 회원 목록·회원 상세·운영자 목록이 이 한 벌을 쓴다. 세 화면에 각자 적어 두었더니
 * 같은 「탈퇴」가 화면마다 다른 색으로 섰다.
 *
 * ⚠ 학생 목록(StudentsTable)만 제 것을 따로 들고 있다. 저기서는 정지·탈퇴가 곧 시험을
 *   막는 값이라 탈퇴도 danger로 세운다 — 일부러 다른 것이니 여기로 합치지 않는다.
 */
export const accountTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "muted",
};

/**
 * 학생 명부에서 쓰는 계정 상태 색조.
 *
 * accountTone과 딱 한 칸(탈퇴)이 다르다. 회원 명부에서 탈퇴는 「더 볼 것 없는 줄」이라
 * 회색이지만, 학생 명부에서 정지·탈퇴는 「시험을 못 보는 아이」라 빨강이다. 일부러 다른
 * 것이므로 두 짝을 합치지 않되, 학생 목록과 학생 상세가 갈리지 않게 한 벌로 둔다.
 */
export const studentAccountTone: Record<UserState, Tone> = {
  active: "ok",
  pending: "warn",
  dormant: "muted",
  suspended: "danger",
  withdrawn: "danger",
};

/**
 * 기관 계약 상태 → 색조.
 *
 * lib/admin.ts contractLabel의 className(text-emerald-700 …)은 쓰지 않는다 — 저쪽은
 * 기존 /admin의 팔레트 색이다. 가져오는 것은 label 글자뿐이고 색은 이 콘솔의 넷에서 고른다.
 */
export const contractTone: Record<OrgRow["contract"], Tone> = {
  active: "ok",
  trial: "warn",
  expired: "danger",
};

/** 응시 상태 → 색조. 학생 목록과 회원 상세의 자녀 표가 같은 짝을 쓴다 */
export const examTone: Record<ExamState, Tone> = {
  reported: "ok",
  submitted: "warn",
  "in-progress": "info",
  "not-started": "muted",
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
