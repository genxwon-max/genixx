import { students as directoryStudents, parents as directoryParents } from "./adminUsers";
import type { CounselMode, Span } from "./counselors";
import { personById } from "./people";

/**
 * 전문가 회원 (EXP) — 가입 신청 · 권한 · 프로필.
 *
 * 가입 입구의 두 번째 갈래가 「기관」에서 「전문가」로 바뀌었다. 전문가는 스스로 가입을
 * 신청하고, 운영진이 가입 승인(ADM-02-2)에서 **무슨 일을 맡길지**를 정해 계정을 연다.
 * 승인 전에는 프로필만 채울 수 있고 학생 자료는 하나도 보이지 않는다.
 *
 * ── 가입할 때 받는 것은 이름 · 가입 수단 · 신청 시각뿐이다 ──
 * 전문가 가입도 다른 회원과 같은 화면을 쓴다(계정 · 이름 · 휴대폰 본인인증 · 약관). 소속 ·
 * 전문 분야 · 희망 직무는 가입에서 묻지 않는다 — 가입 승인 화면이 읽을 수 있는 것도 그
 * 셋뿐이고, 무슨 일을 맡길지는 운영진이 정한다. 소속과 연혁은 본인이 「내 정보」에서 채운다.
 *
 * ── 권한은 「직무」다 ──
 * 한 사람이 여럿을 겸할 수 있다(출제와 상담을 함께 맡는 전문가가 실제로 있다). 그래서
 * 역할 하나를 고르게 하지 않고 직무를 여럿 켠다. 다만 출제와 검토를 한 사람에게 함께
 * 주면 자기가 낸 문항을 자기가 통과시키는 길이 열린다 — 막지는 않고, 승인 화면이 그
 * 자리에서 한 줄로 짚는다(정의서 9장의 이해충돌 규칙).
 *
 * 이 파일은 서버에서도 읽을 수 있게 "use client"를 달지 않는다. 고치는 일은
 * lib/expertAccountStore.ts가 맡는다.
 *
 * ⚠ 씨앗의 사람은 참여진(lib/people.ts)에서 가져온다 — 거기가 이미 예시 데이터임을 밝혀
 *   둔 자리라, 전문가라고 따로 사람을 더 지어내지 않는다.
 */

export type ExpertDuty = "author" | "reviewer" | "grader" | "counselor";

export const expertDuties: { id: ExpertDuty; label: string; desc: string }[] = [
  { id: "author", label: "출제자", desc: "문항을 출제하고, 반려된 문항을 고쳐 다시 올립니다." },
  { id: "reviewer", label: "검토자", desc: "출제된 문항을 검토해 승인하거나 의견을 달아 반려합니다." },
  { id: "grader", label: "진단 위원", desc: "서술형 답안을 읽어 진단하고 결과 해석을 확정합니다." },
  {
    id: "counselor",
    label: "상담사",
    desc: "결과 해석 면담을 맡습니다. 나에게 면담을 신청한 학생의 정보와 보고서를 볼 수 있습니다.",
  },
];

export const dutyLabel = (id: ExpertDuty) => expertDuties.find((d) => d.id === id)?.label ?? id;

/** 차례를 언제나 expertDuties 그대로 둔다 — 누른 차례로 적히면 같은 권한이 사람마다 달리 읽힌다 */
export const sortDuties = (list: ExpertDuty[]) =>
  expertDuties.map((d) => d.id).filter((id) => list.includes(id));

/** 출제와 검토를 함께 들었는가 — 승인 화면이 한 줄로 짚는다 */
export const dutyConflict = (list: ExpertDuty[]) =>
  list.includes("author") && list.includes("reviewer");

/** 전문가가 「내 정보」에서 직접 고치는 칸 */
export type ExpertProfile = {
  name: string;
  /** 사진 — 브라우저에서 줄여 만든 data URL. 없으면 이름 모노그램 */
  photo: string;
  /** 직함 */
  role: string;
  /** 소속 */
  org: string;
  /** 이름 아래 한 줄 소개 */
  headline: string;
  /** 소개 글 */
  bio: string;
  /** 연혁 — 한 줄에 하나 */
  career: string[];
  /** 전문 분야 */
  tags: string[];
};

export type ExpertState = "pending" | "approved" | "rejected";

export type ExpertDecision = {
  verdict: "approved" | "rejected";
  reason: string;
  at: string;
  by: string;
};

export type ExpertAccount = {
  /** 신청 번호이자 계정 번호 — EX-2610-004 */
  id: string;
  /** 아이디 가입이면 로그인 아이디, 간편 가입이면 빈 값 */
  loginId: string;
  provider: string | null;
  email: string;
  phone: string;
  /** 자동 점검에서 걸린 항목 */
  warning: string | null;
  /** 신청 시각 — 「10-08 09:12」 */
  appliedAt: string;
  profile: ExpertProfile;
  state: ExpertState;
  decision?: ExpertDecision;
  /** 운영진이 준 직무. 승인 전에는 비어 있다 */
  duties: ExpertDuty[];
  /** 상담사 직무를 받으면 상담사 명단(lib/counselorStore.ts)의 어느 줄인가 */
  counselorId?: string;
};

export const blankExpertProfile = (): ExpertProfile => ({
  name: "",
  photo: "",
  role: "",
  org: "",
  headline: "",
  bio: "",
  career: [],
  tags: [],
});

/** 갓 가입한 사람의 프로필 — 이름만 있다 */
const nameOnly = (personId: string): ExpertProfile => ({
  ...blankExpertProfile(),
  name: personById(personId)?.name ?? "",
});

/** 참여진 한 사람을 프로필 칸으로 옮긴다 — 씨앗 전용 */
function profileOf(personId: string): ExpertProfile {
  const p = personById(personId);
  return p
    ? {
        name: p.name,
        photo: "",
        role: p.role,
        org: p.org,
        headline: p.headline,
        bio: p.bio,
        career: [...p.career],
        tags: [...p.tags],
      }
    : blankExpertProfile();
}

/** 시연용 전문가 계정 — 아이디가 expert로 시작하면 이 계정으로 들어온다(LoginPanel) */
export const DEMO_EXPERT_ID = "EX-2609-001";

/** 권한 하나만 받은 시연 계정 — 권한마다 화면이 어떻게 다른지 주소로 갈라 본다(/expert/as/…) */
const dutyDemo = (
  no: string,
  personId: string,
  loginId: string,
  duty: ExpertDuty,
  appliedAt: string,
): ExpertAccount => ({
  id: `EX-2609-${no}`,
  loginId,
  provider: null,
  email: `${loginId}@example.com`,
  phone: "",
  warning: null,
  appliedAt,
  profile: profileOf(personId),
  state: "approved",
  decision: { verdict: "approved", reason: "제출 증빙 확인 완료", at: "2026-09-19 09:30", by: "박서준" },
  duties: [duty],
});

export const expertSeed: ExpertAccount[] = [
  {
    id: "EX-2610-003",
    loginId: "",
    provider: "카카오",
    email: "narae.han@example.com",
    phone: "01040127788",
    warning: null,
    appliedAt: "10-07 18:42",
    profile: nameOnly("han-narae"),
    state: "pending",
    duties: [],
  },
  {
    id: "EX-2610-002",
    loginId: "song_jy",
    provider: null,
    email: "jy.song@example.com",
    phone: "01055320914",
    warning: null,
    appliedAt: "10-07 11:05",
    profile: nameOnly("song-junyoung"),
    state: "pending",
    duties: [],
  },
  dutyDemo("004", "seo-minjeong", "expert_grader", "grader", "09-18 15:40"),
  dutyDemo("003", "yoon-daehyun", "expert_reviewer", "reviewer", "09-18 14:05"),
  dutyDemo("002", "choi-eunbi", "expert_author", "author", "09-18 11:30"),
  {
    id: DEMO_EXPERT_ID,
    loginId: "expert_kim",
    provider: null,
    email: "jiwon.kim@example.com",
    phone: "01023456789",
    warning: null,
    appliedAt: "09-18 10:20",
    profile: profileOf("kim-jiwon"),
    state: "approved",
    decision: {
      verdict: "approved",
      reason: "제출 증빙 확인 완료",
      at: "2026-09-19 09:30",
      by: "박서준",
    },
    duties: ["counselor"],
    /* 상담사 명단의 씨앗 줄과 같은 번호 — 보호자 화면의 그 카드가 이 계정이다 */
    counselorId: "kim-jiwon",
  },
];

/* ───────────────────────── 시연용 면담 신청 ─────────────────────────
   상담사 화면은 **이 브라우저에서 잡힌 예약**(lib/counselStore.ts)을 읽는다. 처음 연
   브라우저에는 예약이 한 건도 없어서, 시연 계정에만 예시 신청 몇 줄을 함께 세운다.
   학생·보호자는 관리자 명부의 예시(lib/adminUsers.ts)에서 가져온다. */

export type DemoClient = {
  /** 예약 번호 꼴 — 실제 예약과 겹치지 않게 DEMO를 박는다 */
  id: string;
  studentId: string;
  studentName: string;
  school: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  /** 오늘에서 며칠 뒤(앞)인가 — 날짜를 박아 두면 한 달 뒤에는 전부 지난 면담이 된다 */
  dayOffset: number;
  start: string;
  span: Span;
  mode: CounselMode;
  note: string;
  /** 신청한 사람 — 보호자인가 학생 본인인가 */
  booker: "parent" | "student";
};

const demoPlan: Omit<
  DemoClient,
  "studentId" | "studentName" | "school" | "grade" | "guardianName" | "guardianPhone"
>[] = [
  {
    id: "CS-DEMO-0001",
    dayOffset: 2,
    start: "10:00",
    span: 60,
    mode: "video",
    note: "결과지의 「탐구」 축이 높게 나왔는데 학교에서는 과학을 어려워합니다. 어떻게 읽어야 할지 궁금합니다.",
    booker: "parent",
  },
  {
    id: "CS-DEMO-0002",
    dayOffset: 5,
    start: "14:00",
    span: 30,
    mode: "onsite",
    note: "심화 과정을 지금 시작해도 되는지 여쭙고 싶습니다.",
    booker: "parent",
  },
  {
    id: "CS-DEMO-0003",
    dayOffset: 9,
    start: "11:00",
    span: 30,
    mode: "video",
    note: "",
    booker: "student",
  },
  {
    id: "CS-DEMO-0004",
    dayOffset: -6,
    start: "15:00",
    span: 60,
    mode: "video",
    note: "지난 분기와 유형이 달라진 이유를 듣고 싶습니다.",
    booker: "parent",
  },
];

/** 보고서가 나온 학생 가운데 앞의 셋 — 마지막 줄은 첫 학생의 지난 면담이다 */
const demoStudents = directoryStudents.filter((s) => s.exam === "reported").slice(0, 3);

export const demoClients: DemoClient[] = demoPlan.flatMap((plan, i) => {
  const s = demoStudents[i % demoStudents.length];
  if (!s) return [];
  const guardian = directoryParents.find((p) => p.id === s.guardianId);
  return [
    {
      ...plan,
      studentId: s.id,
      studentName: s.name,
      school: s.school,
      grade: s.grade,
      guardianName: s.guardian,
      guardianPhone: guardian?.phone ?? "",
    },
  ];
});

/* ───────────────────────── 권한별로 보기 ─────────────────────────
   디자인을 볼 때 권한마다 로그인 · 승인을 되풀이하지 않도록, 주소 하나가 그 권한의 시연
   계정으로 들여보낸다(/expert/as/author …). 「승인 전」도 한 자리로 둔다. */

export type ExpertPreview = "pending" | ExpertDuty;

export const expertPreviews: { id: ExpertPreview; label: string; accountId: string; note: string }[] = [
  { id: "pending", label: "승인 전", accountId: "EX-2610-002", note: "가입 승인을 기다리는 화면 · 내 정보" },
  { id: "author", label: "출제자", accountId: "EX-2609-002", note: "홈 · 문항 출제 · 내 정보" },
  { id: "reviewer", label: "검토자", accountId: "EX-2609-003", note: "홈 · 문항 검토 · 내 정보" },
  { id: "grader", label: "진단 위원", accountId: "EX-2609-004", note: "홈 · 진단 채점 · 내 정보" },
  {
    id: "counselor",
    label: "상담사",
    accountId: DEMO_EXPERT_ID,
    note: "홈 · 상담 일정 · 상담 관리 · 내 정보 (예시 신청 4건)",
  },
];
