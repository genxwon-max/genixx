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
  | "staff.manage"; // 운영자 계정·권한 관리

export type StaffRoleId = "super" | "assess" | "item" | "org" | "cs";

export type StaffRole = {
  id: StaffRoleId;
  label: string;
  desc: string;
  tone: string;
  permissions: PermissionId[];
};

export const staffRoles: StaffRole[] = [
  {
    id: "super",
    label: "총괄 관리자",
    desc: "전 권한. 운영자 계정과 권한을 직접 관리합니다.",
    tone: "border-brand-300 bg-brand-50 text-brand-700",
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
    ],
  },
  {
    id: "assess",
    label: "평가·판정",
    desc: "AI 제안값을 검토하고 케이스 회의에서 판정을 확정합니다.",
    tone: "border-amber-300 bg-amber-50 text-amber-700",
    permissions: [
      "member.read",
      "student.pii",
      "round.manage",
      "grade.review",
      "grade.confirm",
      "audit.read",
    ],
  },
  {
    id: "item",
    label: "출제·검수",
    desc: "문항을 만들고 교차 검수합니다. 학생 개인정보에는 접근할 수 없습니다.",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-700",
    permissions: ["item.write", "item.review", "round.manage"],
  },
  {
    id: "org",
    label: "기관·정산",
    desc: "기관 계약과 응시권 배정, 결제 정산을 담당합니다.",
    tone: "border-accent-300 bg-accent-100 text-accent-600",
    permissions: ["member.read", "member.approve", "student.code", "org.manage", "billing.read"],
  },
  {
    id: "cs",
    label: "고객지원",
    desc: "문의에 답변하고 콘텐츠를 발행합니다. 판정에는 관여하지 않습니다.",
    tone: "border-exam-line bg-exam-raised text-exam-muted",
    permissions: ["member.read", "content.publish", "inquiry.reply"],
  },
];

export function roleOf(id: StaffRoleId): StaffRole {
  return staffRoles.find((r) => r.id === id) ?? staffRoles[staffRoles.length - 1];
}

export function can(role: StaffRoleId, permission: PermissionId) {
  return roleOf(role).permissions.includes(permission);
}

/* ───────────────────────── 메뉴 (ADM 사이트맵) ───────────────────────── */

export type AdminMenuItem = {
  /** 사이트맵 화면 ID */
  id: string;
  label: string;
  href: string;
  desc: string;
  /** 이 화면을 열기 위해 필요한 권한 */
  needs: PermissionId;
  /** 사이드바에 표시할 대기 건수 키 */
  badge?: keyof typeof pending;
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
} as const;

export const adminMenu: AdminMenuGroup[] = [
  {
    label: "운영 현황",
    items: [
      {
        id: "ADM-01",
        label: "대시보드",
        href: "/admin",
        desc: "회차 진행률과 오늘 처리해야 할 큐",
        needs: "member.read",
      },
    ],
  },
  {
    label: "진단 운영",
    items: [
      {
        id: "ADM-06",
        label: "채점·판정 큐",
        href: "/admin/grading",
        desc: "AI 1차 제안값 검토 → 전문가 확정",
        needs: "grade.review",
        badge: "grading",
      },
      {
        id: "ADM-04",
        label: "회차·응시 현황",
        href: "/admin/rounds",
        desc: "과목별 진행·포기·제출과 설문 수집률",
        needs: "round.manage",
      },
      {
        id: "ADM-05",
        label: "문항 은행",
        href: "/admin/items",
        desc: "작성 → 교차 검수 → 승인 워크플로",
        needs: "item.review",
        badge: "items",
      },
    ],
  },
  {
    label: "회원·기관",
    items: [
      {
        id: "ADM-02-2",
        label: "가입 승인 대기",
        href: "/admin/approvals",
        desc: "교사·기관 소속 확인 후 계정 활성화",
        needs: "member.approve",
        badge: "approvals",
      },
      {
        id: "ADM-02-1",
        label: "회원",
        href: "/admin/members",
        desc: "학부모·교사·기관·학생 본인 계정",
        needs: "member.read",
      },
      {
        id: "ADM-03",
        label: "학생·접속코드",
        href: "/admin/students",
        desc: "명부 통합 조회와 코드 재발급·회수",
        needs: "student.code",
      },
      {
        id: "ADM-07",
        label: "기관",
        href: "/admin/orgs",
        desc: "계약 상태와 응시권 배정",
        needs: "org.manage",
      },
    ],
  },
  {
    label: "고객·콘텐츠",
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
        id: "ADM-08",
        label: "결제·정산",
        href: "/admin/billing",
        desc: "응시권 결제 내역과 기관 정산",
        needs: "billing.read",
      },
    ],
  },
  {
    label: "보안·설정",
    items: [
      {
        id: "ADM-11",
        label: "개인정보·감사 로그",
        href: "/admin/audit",
        desc: "열람 사유 전건 기록과 파기 요청",
        needs: "audit.read",
      },
      {
        id: "ADM-12",
        label: "운영자·권한",
        href: "/admin/staff",
        desc: "운영자 계정과 역할별 권한",
        needs: "staff.manage",
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
  ai: { label: "AI 분석 완료", className: "border-brand-300 bg-brand-50 text-brand-700" },
  review: { label: "전문가 검토중", className: "border-amber-300 bg-amber-50 text-amber-700" },
  conference: { label: "케이스 회의", className: "border-rose-300 bg-rose-50 text-rose-600" },
  confirmed: { label: "판정 확정", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  published: { label: "발행 완료", className: "border-exam-line bg-exam-raised text-exam-muted" },
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
  active: { label: "활성", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  pending: { label: "승인 대기", className: "border-amber-300 bg-amber-50 text-amber-700" },
  dormant: { label: "휴면", className: "border-exam-line bg-exam-raised text-exam-muted" },
  withdrawn: { label: "탈퇴", className: "border-rose-300 bg-rose-50 text-rose-600" },
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
  active: { label: "계약중", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  trial: { label: "시범 운영", className: "border-amber-300 bg-amber-50 text-amber-700" },
  expired: { label: "만료", className: "border-rose-300 bg-rose-50 text-rose-600" },
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
  draft: { label: "작성중", className: "border-exam-line bg-exam-raised text-exam-muted" },
  review: { label: "검수 대기", className: "border-amber-300 bg-amber-50 text-amber-700" },
  revise: { label: "수정 요청", className: "border-rose-300 bg-rose-50 text-rose-600" },
  approved: { label: "승인", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  retired: { label: "사용 중지", className: "border-exam-line bg-exam-raised text-exam-muted" },
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
  new: { label: "미배정", className: "border-rose-300 bg-rose-50 text-rose-600" },
  working: { label: "처리중", className: "border-amber-300 bg-amber-50 text-amber-700" },
  answered: { label: "답변 완료", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
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
    role: "assess",
    action: "학생 개인정보 열람",
    target: "C-2603-0421 (응시번호 0421)",
    reason: "서술형 응답 해석을 위해 학년·생년월일 확인",
    ip: "10.14.2.31",
  },
  {
    id: "L-88213",
    at: "2026-08-09 09:02:47",
    actor: "정태호",
    role: "assess",
    action: "판정 확정",
    target: "C-2603-0430",
    reason: null,
    ip: "10.14.2.18",
  },
  {
    id: "L-88212",
    at: "2026-08-09 08:51:10",
    actor: "강수아",
    role: "org",
    action: "접속코드 재발급",
    target: "S-30118 (서울 강서 위드학원)",
    reason: "보호자 분실 신고 접수 (IQ-26080908)",
    ip: "10.14.5.72",
  },
  {
    id: "L-88211",
    at: "2026-08-09 08:33:55",
    actor: "이서연",
    role: "assess",
    action: "학생 개인정보 열람",
    target: "C-2603-0418 (응시번호 0418)",
    reason: "판정 컷 경계 사례 — 교사 설문 부재 확인",
    ip: "10.14.2.31",
  },
  {
    id: "L-88210",
    at: "2026-08-09 08:20:41",
    actor: "노아름",
    role: "cs",
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
    role: "assess",
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
  { id: "U-04", name: "정태호", role: "assess", team: "평가팀", lastSeen: "12분 전", mfa: true },
  { id: "U-05", name: "이서연", role: "assess", team: "평가팀", lastSeen: "3분 전", mfa: true },
  { id: "U-07", name: "한나래", role: "item", team: "출제팀", lastSeen: "1시간 전", mfa: true },
  { id: "U-08", name: "송준영", role: "item", team: "출제팀", lastSeen: "어제", mfa: false },
  { id: "U-11", name: "강수아", role: "org", team: "기관사업팀", lastSeen: "24분 전", mfa: true },
  { id: "U-14", name: "노아름", role: "cs", team: "고객지원팀", lastSeen: "6분 전", mfa: true },
];

/** 콘텐츠·정산처럼 아직 목록 화면만 정의된 자리 */
export const stubSections: Record<string, { id: string; title: string; lead: string; todo: string[] }> = {
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
    id: "ADM-08",
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
    id: "ADM-12",
    title: "운영자·권한",
    lead: "운영자 계정과 역할별 권한을 관리합니다. 권한 변경은 전건 감사 로그에 남습니다.",
    todo: [],
  },
};
