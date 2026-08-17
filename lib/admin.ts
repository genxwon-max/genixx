/**
 * 관리자 존(ADM) 정의.
 *
 * 공개 존(PUB) · 계정 존(ACC) · 응시 존(ASM) 뒤에서 운영진이 쓰는 내부 콘솔이다.
 * 사이트맵의 화면 ID 체계(PUB-xx / ACC-xx / ASM-xx)를 그대로 이어 ADM-xx 를 쓴다.
 *
 * 설계 기준 세 가지 —
 *  1) 이 콘솔의 중심은 CRUD가 아니라 **판정 큐**다. AI 1차 제안값을 사람이 확정하는
 *     HITL 구조(PUB-02-2)가 제품의 약속이므로, 채점·판정을 첫 화면 다음에 둔다.
 *  2) 학생 개인정보 열람에는 **사유 입력이 강제**되고 전건이 감사 로그로 남는다.
 *     FAQ에 공개한 약속이라 관리자 화면에서도 우회 경로를 만들지 않는다.
 *  3) 운영자 권한은 역할별로 쪼갠다. 출제위원이 학부모 연락처를 보지 못하고,
 *     CS가 판정을 확정하지 못한다.
 *
 * ⚠ 아래 목록/건수는 화면 설계를 위한 예시 데이터입니다.
 */

/* ───────────────────────── 운영자 권한 ───────────────────────── */

export type PermissionId =
  | "member.read" // 회원 목록 열람
  | "member.approve" // 교사·기관 가입 승인
  | "student.pii" // 학생 개인정보(생년월일·연락처) 열람
  | "student.code" // 접속코드 발급·회수
  | "round.manage" // 회차 개설·마감
  | "item.write" // 문항 작성
  | "item.review" // 문항 교차 검수·승인
  | "grade.review" // AI 제안값 검토 의견 등록
  | "grade.confirm" // 판정 확정·리포트 발행
  | "org.manage" // 기관 계약·응시권 배정
  | "billing.read" // 결제·정산 열람
  | "content.publish" // 콘텐츠 발행
  | "inquiry.reply" // 문의 답변
  | "audit.read" // 감사 로그 열람
  | "staff.manage" // 운영자 계정·권한 관리
  | "report.publish" // 리포트 발행 승인 (EXP-08-3)
  | "psychometrics.read" // 심리측정 분석 콘솔 (ADM-07)
  | "system.manage"; // 시스템 설정 (ADM-13)

/** 정의서 9장의 HITL 4역할. 출제자와 검수자는 이해충돌을 막기 위해 권한을 맞물려 가른다. */
export type StaffRoleId = "super" | "author" | "reviewer" | "master";

export type StaffRole = {
  id: StaffRoleId;
  label: string;
  /** 좁은 자리에 쓰는 짧은 이름 */
  short: string;
  desc: string;
  tone: string;
  permissions: PermissionId[];
};

export const staffRoles: StaffRole[] = [
  {
    id: "super",
    label: "관리자 (슈퍼 관리자)",
    short: "관리자",
    desc: "시스템 전반 및 통합 관리. 운영자 계정과 권한을 직접 다룹니다.",
    tone: "text-brand-700",
    permissions: [
      "member.read",
      "member.approve",
      "student.pii",
      "student.code",
      "round.manage",
      "item.write",
      "item.review",
      "grade.review",
      "grade.confirm",
      "org.manage",
      "billing.read",
      "content.publish",
      "inquiry.reply",
      "audit.read",
      "staff.manage",
      "report.publish",
      "psychometrics.read",
      "system.manage",
    ],
  },
  {
    id: "author",
    label: "출제자",
    short: "출제자",
    desc: "문제 출제 및 편집. 반려된 문제를 확인하고 고칩니다.",
    tone: "text-emerald-700",
    // 검수 권한(item.review)이 없다. 자기가 낸 문제를 자기가 승인하지 못하게
    // 구조적으로 갈라 두는 것이 이 콘솔의 전제다(정의서 9장).
    permissions: ["item.write", "round.manage"],
  },
  {
    id: "reviewer",
    label: "검수자",
    short: "검수자",
    desc: "출제 문제 검수 및 승인 여부 결정. 코멘트로 검수 내용을 적고 반려합니다.",
    tone: "text-amber-700",
    // 작성 권한(item.write)이 없다 — 출제자와 맞물린 반대쪽 칸이다.
    permissions: ["item.review", "round.manage"],
  },
  {
    id: "master",
    label: "마스터",
    short: "마스터",
    desc: "결과 해석, 진단 및 결과 승인. 발행 전 마지막 관문입니다.",
    tone: "text-accent-600",
    permissions: [
      "member.read",
      "student.pii",
      "round.manage",
      "grade.review",
      "grade.confirm",
      "report.publish",
      "psychometrics.read",
      "audit.read",
    ],
  },
];

/**
 * 사람이 도는 순환 — 정의서 9장의 HITL 구조를 화면에 그대로 옮긴 것.
 * 출제자가 내고, 검수자가 보고, 반려되면 출제자에게 되돌아온다. 승인된 뒤에야
 * 문항 은행에 올라간다.
 */
export const hitlFlow = [
  {
    id: "write",
    role: "author" as StaffRoleId,
    title: "문제 출제",
    desc: "발주 사양에 맞춰 지문·발문·선택지·해설을 쓰고 이중태그를 붙입니다.",
    href: "/admin/authoring",
    count: 5,
  },
  {
    id: "review",
    role: "reviewer" as StaffRoleId,
    title: "검수 · 코멘트",
    desc: "교과 정확성·정답 유일성·학년 이독성·편향을 봅니다. 문제가 있으면 사유 코드와 코멘트를 달아 반려합니다.",
    href: "/admin/review",
    count: 8,
  },
  {
    id: "revise",
    role: "author" as StaffRoleId,
    title: "반려분 수정",
    desc: "반려 사유를 확인하고 고쳐 다시 제출합니다. 다시 검수로 넘어갑니다.",
    href: "/admin/authoring",
    count: 3,
  },
  {
    id: "approve",
    role: "reviewer" as StaffRoleId,
    title: "승인 · 문항 은행 등재",
    desc: "통과한 문항만 은행에 올라가 검사지 조립 대상이 됩니다.",
    href: "/admin/items",
    count: 0,
  },
];

export function roleOf(id: StaffRoleId): StaffRole {
  return staffRoles.find((r) => r.id === id) ?? staffRoles[staffRoles.length - 1];
}

export function can(role: StaffRoleId, permission: PermissionId) {
  return roleOf(role).permissions.includes(permission);
}

/** 문항 은행처럼 출제자·검수자가 함께 보는 화면을 위해 — 하나만 있어도 통과 */
export function canAny(role: StaffRoleId, needs: PermissionId | PermissionId[]) {
  return Array.isArray(needs) ? needs.some((n) => can(role, n)) : can(role, needs);
}

/* ───────────────────────── 메뉴 (ADM 사이트맵) ───────────────────────── */

export type AdminSubItem = {
  /** 사이트맵 화면 ID */
  id: string;
  label: string;
  /** 아직 화면이 없으면 상위 화면 안에 목록으로만 적는다 */
  href?: string;
  desc: string;
};

export type AdminMenuItem = {
  /** 사이트맵 화면 ID */
  id: string;
  label: string;
  href: string;
  desc: string;
  /** 이 화면을 열기 위해 필요한 권한. 배열이면 하나만 있어도 된다. */
  needs: PermissionId | PermissionId[];
  /** 사이드바에 표시할 대기 건수 키 */
  badge?: keyof typeof pending;
  /** 정의서상의 하위 화면. 메뉴에 들여쓰기로 붙는다. */
  children?: AdminSubItem[];
};

export type AdminMenuGroup = {
  label: string;
  items: AdminMenuItem[];
};

/** 사이드바 배지로 쓰는 미처리 건수 */
export const pending = {
  approvals: 7,
  grading: 12,
  cases: 3,
  inquiries: 9,
  items: 5,
  /** 출제자에게 돌아온 반려분 */
  authoring: 3,
  /** 검수자 앞에 쌓인 제출분 */
  review: 8,
  /** 마스터 앞에 쌓인 발행 대기 리포트 */
  reports: 4,
} as const;

export const adminMenu: AdminMenuGroup[] = [
  {
    label: "운영 현황",
    items: [
      {
        id: "ADM-01 · EXP-01",
        label: "대시보드",
        href: "/admin",
        desc: "내 역할의 큐와 회차 진행률",
        needs: ["member.read", "item.write", "item.review", "grade.review"],
      },
    ],
  },
  {
    label: "문항 · 설문 (출제 · 검수)",
    items: [
      {
        id: "EXP-02",
        label: "출제 워크벤치",
        href: "/admin/authoring",
        desc: "발주 사양 확인 → 초안 작성 → 이중태그 → 제출",
        needs: "item.write",
        badge: "authoring",
      },
      {
        id: "EXP-03",
        label: "검수 워크벤치",
        href: "/admin/review",
        desc: "내용·태깅·윤리 3단 검수와 사유 코드 반려",
        needs: "item.review",
        badge: "review",
      },
      {
        id: "ADM-04",
        label: "문항 은행",
        href: "/admin/items",
        desc: "승인된 문항의 좌표·태그·버전과 검사지 조립",
        needs: ["item.write", "item.review"],
        badge: "items",
        children: [
          {
            id: "ADM-04-1",
            label: "문항 CRUD·버전",
            desc: "좌표·태그·난이도·상태(초안/검수중/승인/폐기) 필터",
          },
          {
            id: "ADM-04-2",
            label: "앵커 문항",
            desc: "미공개·장기 재사용 앵커군. 회차 간 등화(equating)의 기준",
          },
          {
            id: "ADM-04-3",
            label: "검사지 조립",
            desc: "AI 추천 조합 + 사람 승인. forms·form_items 스키마",
          },
          {
            id: "ADM-04-4",
            label: "문항 회전·보안",
            desc: "응시자별 동적 할당(57중 55), 캡처·드래그 차단, 노출 이력",
          },
        ],
      },
      {
        /* 정의서에는 설문 원본을 다루는 화면이 없어서 번호를 새로 딴다. 설문 자체의
           코드(ASM-05 학부모 · ASM-06 지도교사)는 화면 안에 그대로 적어 둔다. */
        id: "ADM-14",
        label: "설문 원본",
        href: "/admin/surveys",
        desc: "학부모·교사 설문 문항을 고치고 판을 발행합니다. 발행 이력이 남습니다.",
        needs: ["item.write", "item.review"],
        children: [
          {
            id: "ADM-14-1",
            label: "문항 편집·파일 올리기",
            desc: "초안에서만 고친다. CSV·TXT 한 줄에 한 문항으로 올릴 수 있다",
          },
          {
            id: "ADM-14-2",
            label: "판 발행",
            desc: "발행해야 응답자 화면이 바뀐다. 사유를 받아 감사 로그에 남긴다",
          },
          {
            id: "ADM-14-3",
            label: "변경 기록·되돌리기",
            desc: "판별 내용을 그대로 보관해 옛 판으로 되돌릴 수 있다",
          },
        ],
      },
    ],
  },
  {
    label: "판정 · 리포트",
    items: [
      {
        id: "EXP-04 · EXP-07",
        label: "채점·판정 큐",
        href: "/admin/grading",
        desc: "AI 1차 제안값 검토 → 케이스 회의 → 확정",
        needs: "grade.review",
        badge: "grading",
      },
      {
        id: "EXP-08",
        label: "리포트 승인",
        href: "/admin/report-approval",
        desc: "조립된 리포트 확인·문구 수정 후 발행",
        needs: "report.publish",
        badge: "reports",
      },
      {
        id: "ADM-07",
        label: "심리측정 분석",
        href: "/admin/psychometrics",
        desc: "IRT 문항분석·타당도·DIF·판정 컷",
        needs: "psychometrics.read",
        children: [
          {
            id: "ADM-07-1",
            label: "IRT 문항분석",
            desc: "변별도 a·난이도 b·추측도 c, Infit/Outfit",
          },
          { id: "ADM-07-2", label: "타당도 검증", desc: "CFA(CFI·RMSEA), 수렴·판별, 직교성 r" },
          { id: "ADM-07-3", label: "국소독립성·DIF", desc: "Yen's Q3, 성·지역·SES 차별기능" },
          {
            id: "ADM-07-4",
            label: "판정 컷 관리",
            desc: "잠정 컷 → 분포 확인 → 확정. 영향 시뮬레이션",
          },
        ],
      },
      {
        id: "ADM-08",
        label: "리포트 자산",
        href: "/admin/report-assets",
        desc: "해석 템플릿·활동 모듈·조립 규칙",
        needs: "report.publish",
        children: [
          { id: "ADM-08-1", label: "해석 템플릿", desc: "재능 × 밴드(L1/L2/L3) 템플릿 CRUD·버전" },
          {
            id: "ADM-08-2",
            label: "활동 모듈 DB",
            desc: "처방 활동. 조립 규칙(assembly_rule) 매핑",
          },
          {
            id: "ADM-08-3",
            label: "추천 자원 DB",
            desc: "도서·체험·프로그램. 재능 × 학년군 × 난이도",
          },
          { id: "ADM-08-4", label: "리포트 조립 규칙", desc: "학력 부진 × 재능 강세 교차 셀 편집" },
        ],
      },
    ],
  },
  {
    label: "회차 · 회원 · 기관",
    items: [
      {
        id: "ADM-05",
        label: "회차·응시 현황",
        href: "/admin/rounds",
        desc: "26A~26D 회차 개설·응시기간·대상 학년·세션 구성",
        needs: "round.manage",
      },
      {
        id: "ADM-06",
        label: "분기 규칙 엔진",
        href: "/admin/rules",
        desc: "크로스셀 조건으로 회차별 개인 맞춤 모듈을 자동 배정",
        needs: "round.manage",
      },
      {
        id: "ADM-02-2",
        label: "가입 승인 대기",
        href: "/admin/approvals",
        desc: "교사·기관 소속 확인 후 계정 활성화",
        needs: "member.approve",
        badge: "approvals",
      },
      {
        id: "ADM-02",
        label: "회원",
        href: "/admin/members",
        desc: "학부모·교사·기관·학생 본인 계정",
        needs: "member.read",
      },
      {
        id: "ADM-02-1",
        label: "학생·접속코드",
        href: "/admin/students",
        desc: "명부 통합 조회와 코드 재발급·회수",
        needs: "student.code",
      },
      {
        id: "ORG-02",
        label: "기관",
        href: "/admin/orgs",
        desc: "계약 상태와 응시권 배정",
        needs: "org.manage",
      },
    ],
  },
  {
    label: "고객 · 콘텐츠",
    items: [
      {
        id: "ADM-10",
        label: "문의",
        href: "/admin/inquiries",
        desc: "1:1 문의와 기관 도입 문의",
        needs: "inquiry.reply",
        badge: "inquiries",
      },
      {
        id: "ADM-09",
        label: "콘텐츠",
        href: "/admin/content",
        desc: "칼럼·양육 가이드·연구노트·공지",
        needs: "content.publish",
      },
      {
        id: "ADM-12",
        label: "결제·정산",
        href: "/admin/billing",
        desc: "응시권 결제 내역과 기관 정산",
        needs: "billing.read",
      },
    ],
  },
  {
    label: "보안 · 설정",
    items: [
      {
        id: "ADM-10",
        label: "동의·개인정보",
        href: "/admin/audit",
        desc: "동의 이력·파기 스케줄러·접근 감사",
        needs: "audit.read",
        children: [
          {
            id: "ADM-10-1",
            label: "동의 이력 조회",
            desc: "granted/withdrawn 전건 조회·증빙 출력",
          },
          {
            id: "ADM-10-2",
            label: "파기 스케줄러",
            desc: "보관기간 도래 자동 파기, 철회 즉시 파기 큐",
          },
          { id: "ADM-10-3", label: "개인정보 접근 감사", desc: "누가·언제·무엇을 열람했는지 전건" },
        ],
      },
      {
        id: "ADM-11",
        label: "이벤트 로그",
        href: "/admin/events",
        desc: "응시·판정·발행 전 과정 추적 (events 스키마)",
        needs: "audit.read",
      },
      {
        id: "ADM-03",
        label: "운영자·권한",
        href: "/admin/staff",
        desc: "운영자 계정과 역할별 권한(RBAC)",
        needs: "staff.manage",
      },
      {
        id: "ADM-13",
        label: "시스템 설정",
        href: "/admin/settings",
        desc: "외부 CBT 연동 키·PG·알림 채널·AI 엔드포인트",
        needs: "system.manage",
      },
    ],
  },
];

/** href → 메뉴 항목 (레이아웃에서 제목·권한 조회용) */
export function findAdminMenu(href: string): AdminMenuItem | null {
  for (const g of adminMenu) {
    const hit = g.items.find((i) => i.href === href);
    if (hit) return hit;
  }
  return null;
}

/* ───────────────────────── 회차 ───────────────────────── */

export type Round = {
  id: string;
  label: string;
  period: string;
  state: "open" | "grading" | "closed";
  /** 응시 대상 인원 */
  target: number;
  submitted: number;
  graded: number;
  published: number;
};

export const rounds: Round[] = [
  {
    id: "2026-3",
    label: "2026 파일럿 3회차",
    period: "2026.08.01 – 08.31",
    state: "open",
    target: 1284,
    submitted: 806,
    graded: 512,
    published: 448,
  },
  {
    id: "2026-2",
    label: "2026 파일럿 2회차",
    period: "2026.05.01 – 05.31",
    state: "grading",
    target: 1120,
    submitted: 1094,
    graded: 1052,
    published: 1010,
  },
  {
    id: "2026-1",
    label: "2026 파일럿 1회차",
    period: "2026.02.01 – 02.28",
    state: "closed",
    target: 862,
    submitted: 851,
    graded: 851,
    published: 851,
  },
];

/* ───────────────────────── 채점·판정 큐 (ADM-06) ───────────────────────── */

export type CaseState =
  | "ai" // AI 1차 분석 완료, 검토 대기
  | "review" // 전문가 검토 중
  | "conference" // 케이스 회의 대기 (경계 사례)
  | "confirmed" // 판정 확정
  | "published"; // 리포트 발행

export const caseStates: Record<CaseState, { label: string; className: string }> = {
  ai: { label: "AI 분석 완료", className: "text-brand-700" },
  review: { label: "전문가 검토중", className: "text-amber-700" },
  conference: { label: "케이스 회의", className: "text-rose-600" },
  confirmed: { label: "판정 확정", className: "text-emerald-700" },
  published: { label: "발행 완료", className: "text-exam-muted" },
};

export type GradingCase = {
  id: string;
  /** 학생 실명 대신 회차 내 응시번호로 표기 — 목록에서는 개인정보를 노출하지 않는다 */
  seat: string;
  grade: string;
  org: string;
  state: CaseState;
  /** AI가 제안한 대표 재능 축 */
  suggested: string;
  /** 제안값 신뢰도 0~100 */
  confidence: number;
  /** 사람이 봐야 하는 이유 */
  flag: string | null;
  surveys: { mother: boolean; father: boolean; teacher: boolean };
  reviewer: string | null;
  updatedAt: string;
};

export const gradingQueue: GradingCase[] = [
  {
    id: "C-2603-0412",
    seat: "0412",
    grade: "초5",
    org: "서울 강서 위드학원",
    state: "ai",
    suggested: "수리·논리",
    confidence: 91,
    flag: null,
    surveys: { mother: true, father: false, teacher: true },
    reviewer: null,
    updatedAt: "08-09 09:14",
  },
  {
    id: "C-2603-0418",
    seat: "0418",
    grade: "초6",
    org: "경기 성남 한빛교육원",
    state: "ai",
    suggested: "언어",
    confidence: 63,
    flag: "판정 컷 경계 (±3점 이내)",
    surveys: { mother: true, father: true, teacher: false },
    reviewer: null,
    updatedAt: "08-09 09:02",
  },
  {
    id: "C-2603-0421",
    seat: "0421",
    grade: "중1",
    org: "개인 신청",
    state: "review",
    suggested: "자연·탐구",
    confidence: 88,
    flag: null,
    surveys: { mother: false, father: false, teacher: false },
    reviewer: "이서연",
    updatedAt: "08-09 08:47",
  },
  {
    id: "C-2603-0423",
    seat: "0423",
    grade: "초4",
    org: "서울 강서 위드학원",
    state: "conference",
    suggested: "언어",
    confidence: 52,
    flag: "지필·설문 결과 불일치",
    surveys: { mother: true, father: false, teacher: true },
    reviewer: "정태호",
    updatedAt: "08-08 18:20",
  },
  {
    id: "C-2603-0426",
    seat: "0426",
    grade: "초5",
    org: "인천 미추홀 영재교육원",
    state: "conference",
    suggested: "수리·논리",
    confidence: 57,
    flag: "서술형 응답 분량 부족",
    surveys: { mother: true, father: true, teacher: true },
    reviewer: "정태호",
    updatedAt: "08-08 17:55",
  },
  {
    id: "C-2603-0430",
    seat: "0430",
    grade: "중2",
    org: "개인 신청",
    state: "confirmed",
    suggested: "자연·탐구",
    confidence: 94,
    flag: null,
    surveys: { mother: true, father: false, teacher: false },
    reviewer: "한나래",
    updatedAt: "08-08 16:31",
  },
  {
    id: "C-2603-0433",
    seat: "0433",
    grade: "초6",
    org: "경기 성남 한빛교육원",
    state: "published",
    suggested: "언어",
    confidence: 90,
    flag: null,
    surveys: { mother: true, father: true, teacher: true },
    reviewer: "한나래",
    updatedAt: "08-08 15:02",
  },
];

/* ───────────────────────── 가입 승인 대기 (ADM-02-2) ───────────────────────── */

export type Approval = {
  id: string;
  kind: "teacher" | "org";
  name: string;
  org: string;
  detail: string;
  /** 제출 증빙 */
  proof: string;
  requestedAt: string;
  /** 자동 점검에서 걸린 항목 */
  warning: string | null;
};

export const approvals: Approval[] = [
  {
    id: "AP-2608-031",
    kind: "teacher",
    name: "김하늘",
    org: "서울 목동초등학교",
    detail: "5학년 3반 담임 · 재직 확인 요청",
    proof: "재직증명서 (PDF)",
    requestedAt: "08-09 08:12",
    warning: null,
  },
  {
    id: "AP-2608-030",
    kind: "org",
    name: "박정민",
    org: "부산 해운대 아이비교육원",
    detail: "사업자등록 확인 후 기관 계정 개설",
    proof: "사업자등록증 · 학원설립운영등록증",
    requestedAt: "08-09 07:40",
    warning: null,
  },
  {
    id: "AP-2608-029",
    kind: "teacher",
    name: "오세진",
    org: "대전 둔산중학교",
    detail: "과학 교과 · 재직 확인 요청",
    proof: "재직증명서 (JPG)",
    requestedAt: "08-08 19:22",
    warning: "학교 대표 메일 도메인이 아닌 개인 메일로 신청",
  },
  {
    id: "AP-2608-028",
    kind: "org",
    name: "장미르",
    org: "광주 서구 늘품학원",
    detail: "사업자등록 확인 후 기관 계정 개설",
    proof: "사업자등록증",
    requestedAt: "08-08 16:05",
    warning: "학원설립운영등록증 미제출",
  },
  {
    id: "AP-2608-027",
    kind: "teacher",
    name: "윤가온",
    org: "제주 한라초등학교",
    detail: "3학년 1반 담임 · 재직 확인 요청",
    proof: "재직증명서 (PDF)",
    requestedAt: "08-08 14:48",
    warning: null,
  },
];

/* ───────────────────────── 회원 (ADM-02-1) ───────────────────────── */

export type MemberRow = {
  id: string;
  name: string;
  type: "parent" | "teacher" | "org" | "student";
  contact: string;
  belong: string;
  children: number;
  state: "active" | "pending" | "dormant" | "withdrawn";
  joinedAt: string;
};

export const memberTypeLabel: Record<MemberRow["type"], string> = {
  parent: "학부모",
  teacher: "교사",
  org: "기관",
  student: "학생 본인",
};

export const memberStateLabel: Record<MemberRow["state"], { label: string; className: string }> = {
  active: { label: "활성", className: "text-emerald-700" },
  pending: { label: "승인 대기", className: "text-amber-700" },
  dormant: { label: "휴면", className: "text-exam-muted" },
  withdrawn: { label: "탈퇴", className: "text-rose-600" },
};

export const members: MemberRow[] = [
  {
    id: "M-100412",
    name: "김도윤",
    type: "parent",
    contact: "do****@gmail.com",
    belong: "개인",
    children: 2,
    state: "active",
    joinedAt: "2026-02-14",
  },
  {
    id: "M-100418",
    name: "서울 강서 위드학원",
    type: "org",
    contact: "02-26**-****",
    belong: "학원",
    children: 128,
    state: "active",
    joinedAt: "2026-01-08",
  },
  {
    id: "M-100425",
    name: "이서진",
    type: "teacher",
    contact: "se****@sen.go.kr",
    belong: "서울 목동초등학교",
    children: 24,
    state: "pending",
    joinedAt: "2026-08-09",
  },
  {
    id: "M-100431",
    name: "최유나",
    type: "parent",
    contact: "yu****@naver.com",
    belong: "개인",
    children: 1,
    state: "active",
    joinedAt: "2026-03-02",
  },
  {
    id: "M-100440",
    name: "정하람",
    type: "student",
    contact: "ha****@gmail.com",
    belong: "개인 (만 15세)",
    children: 0,
    state: "active",
    joinedAt: "2026-05-19",
  },
  {
    id: "M-100447",
    name: "인천 미추홀 영재교육원",
    type: "org",
    contact: "032-45**-****",
    belong: "교육원",
    children: 96,
    state: "active",
    joinedAt: "2026-02-01",
  },
  {
    id: "M-100455",
    name: "문지호",
    type: "parent",
    contact: "ji****@daum.net",
    belong: "개인",
    children: 1,
    state: "dormant",
    joinedAt: "2025-11-23",
  },
  {
    id: "M-100461",
    name: "배소윤",
    type: "parent",
    contact: "so****@gmail.com",
    belong: "개인",
    children: 3,
    state: "withdrawn",
    joinedAt: "2025-09-30",
  },
];

/* ───────────────────────── 기관 (ADM-07) ───────────────────────── */

export type OrgRow = {
  id: string;
  name: string;
  kind: "학원" | "학교" | "교육원" | "교육청";
  region: string;
  manager: string;
  students: number;
  /** 배정된 응시권 / 사용 */
  seats: [used: number, total: number];
  contract: "active" | "trial" | "expired";
  until: string;
};

export const orgs: OrgRow[] = [
  {
    id: "O-2041",
    name: "서울 강서 위드학원",
    kind: "학원",
    region: "서울 강서",
    manager: "박현우",
    students: 128,
    seats: [96, 150],
    contract: "active",
    until: "2027-01-07",
  },
  {
    id: "O-2058",
    name: "경기 성남 한빛교육원",
    kind: "교육원",
    region: "경기 성남",
    manager: "이수민",
    students: 214,
    seats: [180, 250],
    contract: "active",
    until: "2026-12-31",
  },
  {
    id: "O-2073",
    name: "인천 미추홀 영재교육원",
    kind: "교육원",
    region: "인천 미추홀",
    manager: "강태리",
    students: 96,
    seats: [96, 96],
    contract: "active",
    until: "2026-11-30",
  },
  {
    id: "O-2090",
    name: "대전 둔산중학교",
    kind: "학교",
    region: "대전 서구",
    manager: "오세진",
    students: 42,
    seats: [12, 60],
    contract: "trial",
    until: "2026-09-30",
  },
  {
    id: "O-2101",
    name: "광주 서부교육지원청",
    kind: "교육청",
    region: "광주 서구",
    manager: "정다움",
    students: 0,
    seats: [0, 400],
    contract: "trial",
    until: "2026-10-15",
  },
  {
    id: "O-1988",
    name: "부산 동래 새움학원",
    kind: "학원",
    region: "부산 동래",
    manager: "신유진",
    students: 58,
    seats: [58, 58],
    contract: "expired",
    until: "2026-06-30",
  },
];

export const contractLabel: Record<OrgRow["contract"], { label: string; className: string }> = {
  active: { label: "계약중", className: "text-emerald-700" },
  trial: { label: "시범 운영", className: "text-amber-700" },
  expired: { label: "만료", className: "text-rose-600" },
};

/* ───────────────────────── 문항 (ADM-05) ───────────────────────── */

export type ItemRow = {
  id: string;
  subject: "국어" | "수학" | "과학";
  grade: string;
  type: "선다형" | "서술형";
  axis: string;
  stem: string;
  state: "draft" | "review" | "revise" | "approved" | "retired";
  author: string;
  reviewer: string | null;
  /** 지난 회차 정답률 (%). 미출제면 null */
  correctRate: number | null;
};

export const itemStates: Record<ItemRow["state"], { label: string; className: string }> = {
  draft: { label: "작성중", className: "text-exam-muted" },
  review: { label: "검수 대기", className: "text-amber-700" },
  revise: { label: "수정 요청", className: "text-rose-600" },
  approved: { label: "승인", className: "text-emerald-700" },
  retired: { label: "사용 중지", className: "text-exam-muted" },
};

export const items: ItemRow[] = [
  {
    id: "Q-K-0231",
    subject: "국어",
    grade: "초5",
    type: "서술형",
    axis: "언어",
    stem: "두 글쓴이의 관점 차이를 근거를 들어 설명하시오",
    state: "review",
    author: "한나래",
    reviewer: "송준영",
    correctRate: null,
  },
  {
    id: "Q-M-0188",
    subject: "수학",
    grade: "초6",
    type: "선다형",
    axis: "수리·논리",
    stem: "규칙을 찾아 열 번째 항의 값을 구하면?",
    state: "review",
    author: "송준영",
    reviewer: "한나래",
    correctRate: null,
  },
  {
    id: "Q-S-0140",
    subject: "과학",
    grade: "중1",
    type: "서술형",
    axis: "자연·탐구",
    stem: "실험 결과가 예상과 다른 이유를 두 가지 쓰시오",
    state: "revise",
    author: "최은비",
    reviewer: "정태호",
    correctRate: null,
  },
  {
    id: "Q-K-0198",
    subject: "국어",
    grade: "초4",
    type: "선다형",
    axis: "언어",
    stem: "빈칸에 들어갈 이어 주는 말로 알맞은 것은?",
    state: "approved",
    author: "한나래",
    reviewer: "최은비",
    correctRate: 78,
  },
  {
    id: "Q-M-0155",
    subject: "수학",
    grade: "초5",
    type: "선다형",
    axis: "수리·논리",
    stem: "그림의 도형을 겹쳤을 때 넓이가 가장 큰 것은?",
    state: "approved",
    author: "송준영",
    reviewer: "윤대현",
    correctRate: 41,
  },
  {
    id: "Q-S-0102",
    subject: "과학",
    grade: "초6",
    type: "선다형",
    axis: "자연·탐구",
    stem: "물의 상태 변화 실험에서 온도가 일정한 구간은?",
    state: "retired",
    author: "최은비",
    reviewer: "정태호",
    correctRate: 93,
  },
  {
    id: "Q-K-0244",
    subject: "국어",
    grade: "중2",
    type: "서술형",
    axis: "언어",
    stem: "글쓴이의 주장에 반대하는 입장에서 반론을 쓰시오",
    state: "draft",
    author: "한나래",
    reviewer: null,
    correctRate: null,
  },
];

/* ───────────────────────── 문의 (ADM-10) ───────────────────────── */

export type InquiryRow = {
  id: string;
  channel: "1:1 문의" | "기관 도입";
  category: string;
  title: string;
  writer: string;
  state: "new" | "working" | "answered";
  /** 접수 후 경과 시간 */
  waited: string;
  /** 응답 목표(24시간) 초과 여부 */
  overdue: boolean;
};

export const inquiryStates: Record<InquiryRow["state"], { label: string; className: string }> = {
  new: { label: "미배정", className: "text-rose-600" },
  working: { label: "처리중", className: "text-amber-700" },
  answered: { label: "답변 완료", className: "text-emerald-700" },
};

export const inquiries: InquiryRow[] = [
  {
    id: "IQ-26080912",
    channel: "1:1 문의",
    category: "결과 해석",
    title: "미측정 축이 5개인데 리포트를 이대로 봐도 되나요",
    writer: "김****",
    state: "new",
    waited: "2시간",
    overdue: false,
  },
  {
    id: "IQ-26080911",
    channel: "기관 도입",
    category: "도입 상담",
    title: "교육지원청 단위 400명 시범 운영 문의",
    writer: "광주 서부교육지원청",
    state: "new",
    waited: "5시간",
    overdue: false,
  },
  {
    id: "IQ-26080908",
    channel: "1:1 문의",
    category: "접속코드",
    title: "아이 접속코드를 분실했습니다",
    writer: "최****",
    state: "working",
    waited: "9시간",
    overdue: false,
  },
  {
    id: "IQ-26080902",
    channel: "1:1 문의",
    category: "개인정보",
    title: "동의를 철회하고 자료를 파기하고 싶습니다",
    writer: "배****",
    state: "working",
    waited: "31시간",
    overdue: true,
  },
  {
    id: "IQ-26080816",
    channel: "1:1 문의",
    category: "응시",
    title: "과학 시험 중 창이 닫혔는데 재응시가 되나요",
    writer: "문****",
    state: "answered",
    waited: "완료",
    overdue: false,
  },
];

/* ───────────────────────── 감사 로그 (ADM-11) ───────────────────────── */

export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  role: StaffRoleId;
  action: string;
  target: string;
  /** 개인정보 열람 시 입력이 강제된 사유 */
  reason: string | null;
  ip: string;
};

export const auditLog: AuditRow[] = [
  {
    id: "L-88214",
    at: "2026-08-09 09:14:02",
    actor: "이서연",
    role: "master",
    action: "학생 개인정보 열람",
    target: "C-2603-0421 (응시번호 0421)",
    reason: "서술형 응답 해석을 위해 학년·생년월일 확인",
    ip: "10.14.2.31",
  },
  {
    id: "L-88213",
    at: "2026-08-09 09:02:47",
    actor: "정태호",
    role: "master",
    action: "판정 확정",
    target: "C-2603-0430",
    reason: null,
    ip: "10.14.2.18",
  },
  {
    id: "L-88212",
    at: "2026-08-09 08:51:10",
    actor: "강수아",
    role: "super",
    action: "접속코드 재발급",
    target: "S-30118 (서울 강서 위드학원)",
    reason: "보호자 분실 신고 접수 (IQ-26080908)",
    ip: "10.14.5.72",
  },
  {
    id: "L-88211",
    at: "2026-08-09 08:33:55",
    actor: "이서연",
    role: "master",
    action: "학생 개인정보 열람",
    target: "C-2603-0418 (응시번호 0418)",
    reason: "판정 컷 경계 사례 — 교사 설문 부재 확인",
    ip: "10.14.2.31",
  },
  {
    id: "L-88210",
    at: "2026-08-09 08:20:41",
    actor: "노아름",
    role: "super",
    action: "문의 답변 발송",
    target: "IQ-26080816",
    reason: null,
    ip: "10.14.7.9",
  },
  {
    id: "L-88209",
    at: "2026-08-08 18:44:12",
    actor: "박서준",
    role: "super",
    action: "운영자 권한 변경",
    target: "노아름 · 고객지원 → 고객지원(콘텐츠 발행 추가)",
    reason: null,
    ip: "10.14.1.4",
  },
  {
    id: "L-88208",
    at: "2026-08-08 17:12:36",
    actor: "정태호",
    role: "master",
    action: "개인정보 파기 실행",
    target: "M-100461 (동의 철회 요청)",
    reason: "정보주체 파기 요청 — 처리 결과 통지 완료",
    ip: "10.14.2.18",
  },
];

/** 개인정보 열람 사유 — 자유 입력 전에 고르는 표준 사유 */
export const accessReasons = [
  "판정 컷 경계 사례 확인",
  "서술형 응답 해석",
  "보호자 문의 응대",
  "접속코드 분실 신고 처리",
  "개인정보 정정·파기 요청 처리",
];

/* ───────── 계정 정지·삭제 사유 ─────────
   사유를 강제하지 않는다. 강제하면 사람은 아무 칸이나 눌러 넘기고, 남은 기록은
   있으나 마나 한 글자가 된다. 대신 흔한 사유를 미리 골라 두고 첫 항목을 눌러 둔다 —
   그대로 눌러도 되고, 다르면 고르거나 직접 적으면 된다. 어느 쪽이든 기록은 남는다. */

export type UserActionKind = "suspend" | "restore" | "delete";

export const userActions: Record<
  UserActionKind,
  {
    /** 확인 창 제목에 쓰는 말 */
    verb: string;
    /** 무슨 일이 일어나는지 */
    effects: string[];
    /** 첫 항목이 기본값으로 눌려 있다 */
    reasons: string[];
    danger: boolean;
  }
> = {
  suspend: {
    verb: "정지",
    effects: [
      "로그인할 수 없게 됩니다. 자료는 그대로 남습니다.",
      "언제든 정지를 풀 수 있습니다.",
      "정지한 사람과 시각, 사유가 기록에 남습니다.",
    ],
    reasons: [
      "장기 미접속",
      "본인 요청",
      "소속 변경·퇴직",
      "보안 확인 중",
      "이용약관 위반 확인 중",
    ],
    danger: false,
  },
  restore: {
    verb: "정지 해제",
    effects: ["다시 로그인할 수 있게 됩니다.", "해제한 사람과 시각, 사유가 기록에 남습니다."],
    reasons: ["정지 사유가 해소됨", "본인 요청", "착오로 정지했음"],
    danger: false,
  },
  delete: {
    verb: "삭제",
    effects: [
      "계정과 연결된 자료가 파기 절차로 넘어갑니다.",
      "되돌릴 수 없습니다. 잠시 막아 두려는 것이라면 정지를 쓰세요.",
      "삭제한 사람과 시각, 사유가 기록에 남습니다.",
    ],
    reasons: ["본인의 파기 요청", "보관 기간 만료", "중복 계정 정리", "잘못 만든 계정"],
    danger: true,
  },
};

/* ───────────────────────── 운영자 (ADM-12) ───────────────────────── */

export type StaffRow = {
  id: string;
  name: string;
  role: StaffRoleId;
  team: string;
  lastSeen: string;
  mfa: boolean;
};

export const staff: StaffRow[] = [
  { id: "U-01", name: "박서준", role: "super", team: "운영총괄", lastSeen: "방금", mfa: true },
  { id: "U-04", name: "정태호", role: "master", team: "평가팀", lastSeen: "12분 전", mfa: true },
  { id: "U-05", name: "이서연", role: "master", team: "평가팀", lastSeen: "3분 전", mfa: true },
  { id: "U-07", name: "한나래", role: "author", team: "출제팀", lastSeen: "1시간 전", mfa: true },
  { id: "U-08", name: "송준영", role: "author", team: "출제팀", lastSeen: "어제", mfa: false },
  { id: "U-11", name: "강수아", role: "super", team: "기관사업팀", lastSeen: "24분 전", mfa: true },
  { id: "U-14", name: "노아름", role: "super", team: "고객지원팀", lastSeen: "6분 전", mfa: true },
];

/** 콘텐츠·정산처럼 아직 목록 화면만 정의된 자리 */
export const stubSections: Record<
  string,
  { id: string; title: string; lead: string; todo: string[] }
> = {
  content: {
    id: "ADM-09",
    title: "콘텐츠",
    lead: "공개 존(PUB-05)에 나가는 칼럼·양육 가이드·연구노트·공지를 작성하고 발행합니다.",
    todo: [
      "발행 상태(초안·검토·예약·발행)와 예약 발행 시각",
      "재능 축·학년 태그 — 리포트에서 관련 글을 추천할 때 쓰는 연결 고리",
      "연구노트는 타당화 통계 표를 함께 첨부(백서 PDF 버전 관리)",
      "발행 이력은 되돌릴 수 있어야 하므로 버전별 보관",
    ],
  },
  billing: {
    /* 사이드바(위 menu)는 이 화면을 ADM-12로 부른다. 여기만 ADM-08로 적혀 있어서
       리포트 자산과 번호가 겹쳤다 — 화면 ID는 정의서에서 그대로 인용하는 값이라
       두 화면이 같은 번호를 달면 안 된다. */
    id: "ADM-12",
    title: "결제·정산",
    lead: "개인 응시권 결제(PAY-03)와 기관 단위 정산을 함께 봅니다.",
    todo: [
      "결제 건별 상태(승인·취소·부분환불)와 환불 규정(PUB-08-5) 연동",
      "기관 정산: 배정 응시권 × 단가 − 사용분, 월 마감 후 세금계산서 발행",
      "파일럿 회차는 전액 무료이므로 금액 0원 처리 건을 따로 구분",
      "환불 요청은 문의(ADM-10)에서 넘어오므로 문의 번호를 함께 표기",
    ],
  },
  staff: {
    id: "ADM-03",
    title: "운영자·권한",
    lead: "운영자 계정과 역할별 권한을 관리합니다. 권한 변경은 전건 감사 로그에 남습니다.",
    todo: [],
  },
  "report-approval": {
    id: "EXP-08",
    title: "리포트 승인",
    lead: "조립된 리포트를 확인하고 발행을 승인합니다. 승인 전에는 학부모 화면에 결과가 보이지 않습니다.",
    todo: [
      "EXP-08-1 생성 리포트 검토 — 전문을 보되, 어떤 규칙으로 어떤 블록이 뽑혔는지 근거를 함께 표시",
      "EXP-08-2 문구 수정·오버라이드 — 템플릿 문구를 개별로 고치고 수정 이력을 따로 보존",
      "EXP-08-3 발행 승인 — HITL 게이트의 물리적 구현. 승인 전 결과 미노출",
      "라벨링 방지 점검 — 등급 표현이 아니라 발현 단계 서술인지 확인",
    ],
  },
  psychometrics: {
    id: "ADM-07",
    title: "심리측정 분석",
    lead: "문항과 척도가 실제로 재고 있는지 통계로 확인합니다.",
    todo: [
      "ADM-07-1 IRT 문항분석 — 변별도 a·난이도 b·추측도 c, Infit/Outfit MNSQ 적합도",
      "ADM-07-2 타당도 — CFA(CFI·RMSEA), 수렴·판별타당도, 학력×재능 직교성 r 모니터",
      "ADM-07-3 국소독립성·DIF — 잔차 상관(Yen's Q3), 성·지역·SES 차별기능 검출",
      "ADM-07-4 판정 컷 — 1차 잠정 컷 → 분포 확인 후 확정. 변경 이력과 영향 시뮬레이션",
    ],
  },
  "report-assets": {
    id: "ADM-08",
    title: "리포트 자산",
    lead: "리포트에 조립되는 문구와 활동을 관리합니다. LLM이 전면 생성하지 않고, 검수된 DB를 규칙으로 조립합니다.",
    todo: [
      "ADM-08-1 해석 템플릿 — 재능 × 밴드(L1/L2/L3) 문구. 버전과 사용 이력 보존",
      "ADM-08-2 활동 모듈 DB — 처방 활동과 조립 규칙(assembly_rule) 매핑",
      "ADM-08-3 추천 자원 DB — 도서·체험·프로그램을 재능 × 학년군 × 난이도로 색인",
      "ADM-08-4 조립 규칙 — 「학력 부진 × 재능 강세」 같은 교차 셀에 어떤 블록이 붙는지 편집",
      "문구를 고치면 이미 발행된 리포트는 그대로 두고 다음 발행부터 적용",
    ],
  },
  rules: {
    id: "ADM-06",
    title: "분기 규칙 엔진",
    lead: "크로스 판정 결과에 따라 다음 회차에 어떤 모듈을 배정할지 규칙으로 정합니다.",
    todo: [
      "module_id와 trigger_rule(크로스셀 조건) 정의",
      "설문판 form assembly를 그대로 재사용 — 문항 조립과 같은 얼개",
      "규칙이 겹칠 때의 우선순위와, 어떤 규칙도 걸리지 않았을 때의 기본 모듈",
      "규칙을 바꾸기 전에 「지금 응시자에게 어떻게 적용되는지」 시뮬레이션",
    ],
  },
  events: {
    id: "ADM-11",
    title: "이벤트 로그",
    lead: "응시·판정·발행 전 과정을 한 줄기로 추적합니다. events 스키마 통합 조회입니다.",
    todo: [
      "학생 한 명의 흐름을 시간순으로 — 응시 시작·제출·AI 채점·판정 확정·리포트 발행",
      "consent.granted / consent.withdrawn / interview.coded 같은 도메인 이벤트",
      "이상 징후 — 같은 계정의 짧은 시간 다중 접속, 비정상 제출 간격",
      "감사 로그(ADM-10-3)와 다른 자리다. 저쪽은 사람의 열람, 여기는 시스템의 사건",
    ],
  },
  settings: {
    id: "ADM-13",
    title: "시스템 설정",
    lead: "외부 연동 키와 운영 스위치를 모아 둡니다. 값은 마스킹하고 변경은 감사 로그에 남깁니다.",
    todo: [
      "외부 CBT 벤더 연동 키와 SSO 규격 (정의서 미결 A-09)",
      "PG·간편결제 키, 알림 채널(SMS·카카오·이메일) 발신 설정",
      "AI 모델 엔드포인트와 저신뢰 자동 라우팅 임계값(confidence < 0.75)",
      "기능 플래그 — 회차별로 켜고 끄는 심화진단·성장추적",
    ],
  },
};
