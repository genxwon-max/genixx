/**
 * 계정·동의 존(ACC) 도메인 규칙.
 *
 * 출처: GeniXX 플랫폼 사이트맵·메뉴 정의서 5장 (계정·동의 존).
 *
 * 이 파일이 정하는 것은 네 가지다 —
 *
 *  1) 회원 구조: **학생 · 학부모(법정대리인) · 기관 담당자** 세 갈래로 가입한다.
 *     학생도 가입한다. 예전에는 학생에게 가입 경로를 아예 두지 않았지만, 만 14세
 *     이상이면 개인정보 수집·이용에 본인이 동의할 수 있으므로 본인 계정을 만드는
 *     것이 맞다.
 *
 *  2) 만 14세 분기(개인정보): 개인정보보호법 제22조의2는 **만 14세 미만 아동에
 *     대해서만** 법정대리인의 동의와 그 확인을 요구한다. 그래서 만 14세 미만은
 *     "가입 불가"가 아니라 **"학생 단독가입 불가"** 다. 학생 혼자서는 가입을 끝낼 수
 *     없고, 법정대리인 동의가 확인되면 그때 계정이 열린다.
 *     연령은 한국식 나이가 아니라 **가입일 현재 만 나이**로 센다.
 *
 *  3) 만 19세 분기(계약·결제): 만 14세 이상이어도 만 19세 미만이면 민법상
 *     미성년자다. 개인정보 동의는 본인이 할 수 있지만, 유료 결제·자동결제·정기구독처럼
 *     재산상 의무가 붙는 계약은 법정대리인 동의 없이 하면 취소될 수 있다(민법 제5조).
 *     **동의의 기준선(14세)과 계약의 기준선(19세)은 서로 다른 선이다.**
 *
 *  4) 기관의 자리: 기관은 학생을 등록하고 평가를 배정하고 동의 요청을 보낼 수 있지만,
 *     **법정대리인 동의를 대신할 수 없다.** 운영진의 기관 승인은 "실재하는 기관인가 ·
 *     이 담당자가 평가를 열 권한이 있는가"를 뜻할 뿐, 그 담당자에게 친권자·미성년후견인의
 *     지위를 주지 않는다. 학교 교사·학원 원장·조부모가 언제나 법정대리인인 것은 아니다.
 */

/* ───────────────────────── 만 나이 ───────────────────────── */

/** YYYYMMDD 문자열에서 만 나이를 구한다. 기준일을 넘겨 테스트할 수 있다. */
export function ageFromBirth(birth: string, at: Date = new Date()): number | null {
  const digits = birth.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;

  let age = at.getFullYear() - y;
  // 생일이 아직 지나지 않았으면 한 살 뺀다 (만 나이)
  const beforeBirthday =
    at.getMonth() + 1 < m || (at.getMonth() + 1 === m && at.getDate() < d);
  if (beforeBirthday) age -= 1;

  return age < 0 || age > 120 ? null : age;
}

export const CONSENT_AGE = 14;

/**
 * 민법상 성년 나이.
 *
 * 개인정보 동의의 기준선(만 14세)과 헷갈리기 쉬워 상수를 따로 둔다. 만 14세 이상이면
 * 개인정보 수집·이용에는 본인이 동의할 수 있지만, 만 19세 미만은 여전히 미성년자다.
 * 재산상 의무가 붙는 계약은 법정대리인 동의가 없으면 취소될 수 있다(민법 제5조).
 */
export const MAJORITY_AGE = 19;

/**
 * 학생이 혼자 가입을 끝낼 수 있는가.
 * 만 14세 미만이면 false — 가입을 막는 것이 아니라 법정대리인 동의 경로로 넘긴다.
 */
export function canSelfSignup(age: number | null): boolean {
  return age !== null && age >= CONSENT_AGE;
}

/** 만 14세 이상이지만 아직 미성년자인가 — 결제·구독 화면에서 갈래를 가른다. */
export function isMinorForContract(age: number | null): boolean {
  return age !== null && age < MAJORITY_AGE;
}

/**
 * 만 14세 이상 미성년 학생이 혼자 할 수 있는 일과, 법정대리인이 필요한 일.
 * 「동의 기준은 만 14세, 계약 기준은 만 19세」를 화면에서 그대로 읽을 수 있게 둔다.
 */
export const minorFeatureMatrix: {
  feature: string;
  self: boolean;
  note: string;
}[] = [
  { feature: "무료 회원가입", self: true, note: "학생 본인이 진행합니다." },
  { feature: "무료 모의고사 응시", self: true, note: "학생 본인이 진행합니다." },
  { feature: "기관코드·평가코드 입력", self: true, note: "학생 본인이 진행합니다." },
  {
    feature: "학부모 결과 공유",
    self: true,
    note: "학생이 공유 범위를 직접 정합니다. 기관 평가처럼 별도 근거가 있는 경우는 그 범위를 따릅니다.",
  },
  {
    feature: "유료 상품 결제",
    self: false,
    note: "학부모 계정에서 결제하거나 법정대리인 동의를 따로 받습니다.",
  },
  {
    feature: "자동결제·정기구독",
    self: false,
    note: "법정대리인 동의를 받거나 학부모가 직접 계약하시기를 권합니다.",
  },
];

/**
 * 본인확인기관(PASS 등)이 확인해 돌려주는 값.
 *
 * 주민등록번호는 우리 화면에서 받지 않는다. PASS 앱이 받아 본인확인기관에 넘기고,
 * 우리는 확인이 끝난 결과만 돌려받는다. 법령에 근거가 있을 때만 처리할 수 있는
 * 정보라서(개인정보보호법 제24조의2) 애초에 우리 쪽을 지나가지 않게 두는 것이 맞다.
 *
 * 실제 연동에서 이 자리에 들어오는 것은 PASS 인증 결과의 CI/DI와 확인된 신원 정보다.
 */
export type IdentityResult = {
  name: string;
  /** 확인된 생년월일 (YYYYMMDD) */
  birth: string;
  phone: string;
  /** 인증에 사용한 수단 */
  via: string;
};

export type ConsentRoute = "guardian" | "self";

/**
 * 만 14세 미만이면 법정대리인(보호자) 동의, 14세 이상이면 본인 동의.
 * 동의의 주체가 갈리고, 그에 따라 **계정을 여는 방법**도 갈린다 —
 * 만 14세 이상은 학생 본인 계정, 만 14세 미만은 법정대리인 동의 뒤 열리는 하위 프로필.
 */
export function consentRouteFor(age: number | null): ConsentRoute | null {
  if (age === null) return null;
  return age < CONSENT_AGE ? "guardian" : "self";
}

export const consentRouteInfo: Record<
  ConsentRoute,
  { label: string; who: string; basis: string; summary: string; extra: string[] }
> = {
  guardian: {
    label: "만 14세 미만",
    who: "법정대리인(보호자)",
    basis: "개인정보보호법 제22조의2",
    summary:
      "아이의 개인정보는 법정대리인이 동의해야 처리할 수 있습니다. 학생 혼자서는 가입을 끝낼 수 없고, 보호자 동의가 확인되면 그때 계정이 열립니다.",
    extra: [
      "보호자 본인확인(휴대폰·간편인증·서면·이메일·전화)이 법정대리인 신원 확인의 근거가 됩니다.",
      "동의를 받기 전에는 법정대리인의 성명과 연락처만 받습니다. 아이 이름·학교·상세 생년월일은 동의가 끝난 뒤에 받습니다.",
      "아이가 읽을 수 있는 눈높이 고지문을 함께 보여 드립니다.",
      "동의는 언제든 철회할 수 있고, 철회하면 파기 절차가 자동으로 시작됩니다.",
    ],
  },
  self: {
    label: "만 14세 이상",
    who: "학생 본인",
    basis: "개인정보보호법 제22조의2 단서",
    summary:
      "만 14세 이상이면 학생 본인이 개인정보 수집·이용에 동의하고, 본인 이름으로 계정을 만들 수 있습니다.",
    extra: [
      "법정대리인 동의는 받지 않습니다. 보호자는 결제와 결과 열람 주체로만 남습니다.",
      "보호자가 등록해 두신 경우에는 학생에게 가입 초대를 보내고, 학생이 본인 동의로 계정을 연 뒤 두 계정을 잇습니다.",
      "만 19세 미만이면 여전히 미성년자입니다. 유료 결제·정기구독은 학부모 계정에서 진행하거나 법정대리인 동의를 따로 받습니다(민법 제5조).",
    ],
  },
};

/* ───────────────────────── 단계별 동의 (ACC-03-3) ───────────────────────── */

export type ConsentStageId = "base" | "interview" | "advanced" | "research" | "marketing";

export type ConsentStage = {
  id: ConsentStageId;
  label: string;
  /** 이 동의를 받는 시점 */
  when: string;
  purpose: string;
  items: string;
  keep: string;
  required: boolean;
  /** 1차 동의에 포함되는가 (아니면 해당 시점에 별도로 받는다) */
  upfront: boolean;
};

export const consentStages: ConsentStage[] = [
  {
    id: "base",
    label: "기본정보 · 설문 · 면담(녹취)",
    when: "자녀 등록 시 (1차 동의)",
    purpose: "학력·재능 진단과 결과 리포트 작성",
    items:
      "[필수] 이름, 생년월일, 학교급, 학년, 아이 휴대전화(있는 경우) [선택] 성별, 거주 지역, 관심 분야, 보호자 관찰 특성, 학교명, 학습 경험, 설문 응답, 면담 녹취",
    keep: "수집일로부터 5년 (철회 시 즉시 파기)",
    required: true,
    upfront: true,
  },
  {
    id: "interview",
    label: "화상 면담 녹화",
    when: "면담 예약 확정 시",
    purpose: "면담 내용의 정확한 해석과 판정 근거 보존",
    items: "화상 면담 영상·음성",
    keep: "판정 확정 후 1년",
    required: false,
    upfront: false,
  },
  {
    id: "advanced",
    label: "심화 수행과제 (음성 · 영상 · 행동로그)",
    when: "2단계 심화진단 신청 시",
    purpose: "음향·리듬, 신체·운동, 사회·관계 재능 측정",
    items: "녹음 음성, 포즈 추정 영상, 터치·행동 시계열 로그",
    keep: "원본은 온디바이스 우선 처리 후 최소 보관",
    required: false,
    upfront: false,
  },
  {
    id: "research",
    label: "연구·통계 및 AI 모델 개선",
    when: "언제든 (선택)",
    purpose: "진단 도구 타당화 연구",
    items: "식별 정보를 제거한 응답 데이터",
    keep: "연구 종료 시까지",
    required: false,
    upfront: true,
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신",
    when: "언제든 (선택)",
    purpose: "회차 모집·이벤트 안내",
    items: "이름, 연락처",
    keep: "동의 철회 시까지",
    required: false,
    upfront: true,
  },
];

/* ───────────────────────── 회원 유형 (ACC-01-1) ─────────────────────────
   가입 화면은 **개인 / 기관** 두 갈래로 먼저 접고, 개인 안에서 다시 둘로 나눈다 —

     개인 ─┬─ 만 14세 이상 학생
           └─ 학부모·법정대리인
     기관 ─── 기관 담당자

   예전에는 세 갈래를 첫 화면에 나란히 세웠다. 사람은 자기 역할을 들고 들어오지
   "개인"이라는 분류를 들고 들어오지 않는다는 이유였는데, 기관 담당자와 개인 회원은
   받는 화면도 권한도 정산도 통째로 다르다. 큰 갈림길을 먼저 묻고 나면 각 갈래에
   필요한 설명을 제대로 실을 수 있고, 개인 쪽에는 학생과 학부모의 차이만 남는다.

   **두 개인 갈래는 그 뒤로 같은 길을 간다.** 학생에게만 있던 연령 확인 단계는 두지
   않는다. 「만 14세 이상 학생」이라고 적힌 갈래를 고르는 것이 본인의 신고이고, 실제
   판정은 뒤따르는 휴대폰 본인인증이 돌려주는 생년월일로 한다. 스스로 적어 넣은
   숫자보다 본인확인기관이 확인해 준 값이 낫고, 물어보는 화면도 하나 줄어든다.

   「학부모」라고만 적지 않고 **「학부모·법정대리인」** 이라고 적는다. 동의권자는 아이를
   돌보는 사람이 아니라 친권자·미성년후견인처럼 법적으로 대리권이 있는 사람이어야
   하고, 반대로 학원 선생님·기관 담당자·조부모는 학생을 관리해도 법정대리인이 아니다.

   교사는 가입 입구에 두지 않는다. 교사 계정은 기관 담당자가 소속을 만든 뒤 초대하는
   쪽이 맞아서, 유형 자체는 남기되 여기서는 묻지 않는다. */

export type SignupTypeId = "student" | "parent" | "teacher" | "org";

export type SignupType = {
  id: SignupTypeId;
  label: string;
  tagline: string;
  detail: string;
  /** 가입 직후 도착하는 화면 */
  next: string;
  needsApproval: boolean;
  tone: string;
  badge: string;
};

export const signupTypes: SignupType[] = [
  {
    id: "student",
    label: "학생",
    tagline: "본인 휴대폰 인증만으로 가입하고 배정된 평가에 응시합니다",
    detail:
      "만 14세 이상이면 본인이 동의하고 계정을 만듭니다. 법정대리인 동의를 따로 받지 않고, 기관에 합류할 때도 학부모 계정을 거치지 않습니다. 만 14세 미만은 혼자 가입을 끝낼 수 없고, 법정대리인 동의가 확인되면 계정이 열립니다.",
    next: "/signup/link",
    needsApproval: false,
    tone: "border-sky-300 bg-sky-50 text-sky-800",
    badge: "만 14세 이상 본인 가입",
  },
  {
    id: "parent",
    label: "학부모·법정대리인",
    tagline: "자녀를 등록하고 동의하고 결과를 열람합니다",
    detail:
      "친권자·미성년후견인 등 법정대리인 계정입니다. 가입할 때 한 번 거친 휴대폰 본인인증이 법정대리인 확인을 겸하므로, 자녀를 몇 명 등록하든 그때마다 다시 인증하지 않습니다. 만 14세 미만 자녀의 개인정보 동의는 이 계정에서만 할 수 있습니다.",
    next: "/signup/done",
    needsApproval: false,
    tone: "border-brand-300 bg-brand-50 text-brand-800",
    badge: "동의권자",
  },
  {
    id: "teacher",
    label: "교사",
    tagline: "학급 학생의 관찰 설문을 입력합니다",
    detail:
      "소속 기관 관리자의 승인 후 활성화됩니다. 승인 전에는 학생 데이터에 전혀 접근할 수 없습니다.",
    next: "/my/pending",
    needsApproval: true,
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
    badge: "승인 필요",
  },
  {
    id: "org",
    label: "기관 담당자",
    tagline: "학교·학원·교육청 단위로 운영합니다",
    detail:
      "학생 명부와 접속코드, 응시권·정산을 관리합니다. 사업자·학교 정보 확인 후 계정이 개설됩니다. 학생 등록과 평가 배정은 하지만, 법정대리인 동의를 대신하지는 않습니다.",
    next: "/my/pending",
    needsApproval: true,
    tone: "border-amber-300 bg-amber-50 text-amber-800",
    badge: "승인 필요",
  },
];

/** 가입 첫 화면의 두 갈래. 기관을 고르면 곧바로 「기관 담당자」로 이어진다. */
export type SignupBucketId = "personal" | "org";

/** 개인 갈래 안에서 다시 갈리는 두 역할. 교사는 기관이 초대하므로 여기 없다. */
export type PersonalRoleId = Extract<SignupTypeId, "student" | "parent">;

export const personalRoleIds: PersonalRoleId[] = ["student", "parent"];

export function isPersonalRole(id: SignupTypeId): id is PersonalRoleId {
  return id === "student" || id === "parent";
}

/** 역할만 알고 있을 때 그것이 어느 갈래에서 나왔는지 되짚는다 (뒤로 가기·딥링크용) */
export function bucketOf(id: SignupTypeId | null | undefined): SignupBucketId | null {
  if (!id) return null;
  return isPersonalRole(id) ? "personal" : "org";
}

export function signupTypeOf(id: SignupTypeId | null | undefined) {
  // 유형이 정해지지 않은 상태로 흘러들어온 화면은 학부모 기준으로 그린다.
  // (학생을 기본값으로 두면 연령 확인을 건너뛴 화면이 학생 문안을 뒤집어쓴다)
  return signupTypes.find((t) => t.id === id) ?? signupTypes.find((t) => t.id === "parent")!;
}

/* ───────────────── 기관의 자리 (ORG) ─────────────────
   기관 승인이 무엇을 뜻하고 무엇을 뜻하지 않는지를 한 곳에 적어 둔다.
   화면 문구가 여기서 갈라져 나가므로, 문구를 고칠 일이 생기면 여기만 고친다. */

export const orgPowers = {
  can: [
    "평가 생성",
    "학생 임시등록",
    "학생 초대·응시코드 발급",
    "법정대리인에게 동의 링크 발송",
    "보호자 동의 상태 확인",
    "동의가 끝난 학생에게 평가 배정",
    "허용된 범위의 결과 조회",
  ],
  cannot: [
    "법정대리인을 대신해 동의",
    "학부모인 것처럼 본인확인",
    "보호자 동의 버튼 대리 클릭",
    "기관 승인만으로 아동 계정 활성화",
    "보호자의 인증정보·연락처 상세 열람",
    "다른 기관 학생정보 열람",
    "동의 범위를 벗어난 결과 이용",
  ],
} as const;

/** 운영진의 기관 승인이 확인하는 것 / 확인하지 않는 것 */
export const orgApprovalMeans = {
  yes: [
    "실제 학교·학원·교육기관인가",
    "이 담당자가 그 기관 소속인가",
    "평가를 개설하고 학생에게 배정할 권한이 있는가",
  ],
  no: [
    "이 담당자가 학생의 법정대리인이 된다",
    "이 담당자가 보호자 대신 개인정보 동의를 할 수 있다",
    "기관 승인만으로 만 14세 미만 학생의 가입이 끝난다",
  ],
} as const;

/** 기관 담당자에게 보여 주는 학생 항목 — 이 밖의 값은 기관 화면에 싣지 않는다 */
export const orgVisibleStudentFields = [
  "학생 표시명",
  "학년·반",
  "연령 구분(만 14세 기준)",
  "보호자 동의 상태",
  "평가 배정 상태",
  "응시 여부",
  "허용된 평가결과",
] as const;

/** 기관 화면에 싣지 않는 값 */
export const orgHiddenStudentFields = [
  "보호자 휴대전화번호 전체",
  "본인확인 결과값·인증 상세",
  "다른 자녀 정보",
  "동의 인증의 증빙 원본",
] as const;

/* ───────────────── 보호자 동의 상태 (ACC-03 · ORG-02) ─────────────────
   기관 담당자는 학생 명단을 관리하지만 동의 버튼을 대신 누를 수 없다. 그래서
   「동의했다/안 했다」 대신 **상태**를 두고, 상태마다 기관이 할 수 있는 일을 못 박는다. */

export type GuardianConsentStatus =
  | "temp"
  | "waiting"
  | "granted"
  | "self"
  | "declined"
  | "revoked"
  | "expired";

export type GuardianConsentInfo = {
  label: string;
  meaning: string;
  /** 이 상태에서 기관 담당자가 할 수 있는 일 */
  orgCan: string[];
  /** 응시할 수 있는 상태인가 */
  canSit: boolean;
  /** 목록에서 쓰는 색 (Tailwind 클래스) */
  tone: string;
};

export const guardianConsentInfo: Record<GuardianConsentStatus, GuardianConsentInfo> = {
  temp: {
    label: "임시등록",
    meaning: "응시코드만 만들어 둔 상태입니다. 학생 정보는 최소한만 들고 있습니다.",
    orgCan: ["동의 요청 발송", "임시등록 취소"],
    canSit: false,
    tone: "text-slate-500",
  },
  waiting: {
    label: "보호자 동의 대기",
    meaning: "법정대리인에게 동의 링크를 보냈고, 아직 답을 받지 못했습니다.",
    orgCan: ["동의 요청 재발송", "보호자 연락처 수정 요청", "임시등록 취소"],
    canSit: false,
    tone: "text-amber-600",
  },
  granted: {
    label: "보호자 동의 완료",
    meaning: "법정대리인 본인확인과 자녀별 동의가 확인되었습니다.",
    orgCan: ["평가 배정", "응시 허용", "허용된 범위의 결과 조회"],
    canSit: true,
    tone: "text-emerald-600",
  },
  self: {
    label: "학생 본인 가입 완료",
    meaning: "만 14세 이상 학생이 직접 동의하고 계정을 만들었습니다.",
    orgCan: ["평가 배정", "응시 허용", "허용된 범위의 결과 조회"],
    canSit: true,
    tone: "text-emerald-600",
  },
  declined: {
    label: "동의 거절",
    meaning: "법정대리인이 동의하지 않았습니다.",
    orgCan: ["학생 정보 삭제", "비활성 처리"],
    canSit: false,
    tone: "text-rose-600",
  },
  revoked: {
    label: "동의 철회",
    meaning: "받아 두었던 동의가 철회되었습니다. 응시와 결과 접근을 멈춥니다.",
    orgCan: ["학생 정보 삭제", "비활성 처리"],
    canSit: false,
    tone: "text-rose-600",
  },
  expired: {
    label: "요청 만료",
    meaning: "동의 요청이 기한 안에 처리되지 않았습니다.",
    orgCan: ["동의 요청 재발송", "임시등록 취소"],
    canSit: false,
    tone: "text-slate-500",
  },
};

/** 이 상태에서 평가를 배정하고 응시하게 해도 되는가 */
export function canSit(status: GuardianConsentStatus) {
  return guardianConsentInfo[status].canSit;
}

/**
 * 법정대리인 동의를 받기 위해 아동에게서 먼저 받을 수 있는 **최소정보**.
 * 개인정보보호법 시행령이 법정대리인의 성명과 연락처로 한정하고 있으므로,
 * 이 단계에서는 아이 이름·학교·상세 생년월일을 함께 받지 않는다.
 */
export const guardianMinimumFields = ["법정대리인 성명", "법정대리인 연락처"] as const;

/** 법정대리인 동의를 확인하는 방법 — 휴대전화 본인인증만 있는 것이 아니다 */
export const guardianVerifyMethods = [
  { id: "pass", label: "휴대전화 본인인증", desc: "가장 빠릅니다. 동의 일시와 인증 결과값이 증빙으로 남습니다." },
  { id: "sms", label: "문자 확인", desc: "발송한 링크를 열어 동의 여부를 회신합니다." },
  { id: "email", label: "이메일 확인", desc: "동의 내용을 메일로 받고 회신으로 확인합니다." },
  { id: "paper", label: "서면 동의서", desc: "기관이 종이 동의서를 받아 보관하는 방식입니다." },
  { id: "call", label: "전화 확인", desc: "상담원이 통화로 확인하고 기록을 남깁니다." },
] as const;

/**
 * 동의를 모으는 세 가지 방식.
 *
 * 셋은 법률관계가 서로 다르다. **한 시스템 안에서 섞지 않는 것**이 중요하다 —
 * 개인회원 방식으로 받은 정보와 기관 위탁 방식으로 받은 정보를 같은 통에 담으면,
 * 위탁받은 업무 범위를 넘어 데이터를 쓰게 되기 쉽다.
 */
export const consentCollectionModes = [
  {
    id: "platform",
    label: "플랫폼이 법정대리인에게 직접 받는다",
    who: "우리가 개인정보처리자",
    detail:
      "법정대리인에게 일회용 링크를 보내 본인확인과 동의를 직접 받습니다. 동의 일시·동의문 버전·본인확인 결과값이 한자리에 남아 증빙과 분쟁 대응이 가장 단순합니다. 기본값으로 씁니다.",
    default: true,
  },
  {
    id: "delegated",
    label: "기관이 서면 동의를 대행해 받는다",
    who: "우리가 개인정보처리자 · 기관은 동의 수집 업무를 수행",
    detail:
      "학교·학원이 이미 종이·전자 동의서를 받고 있는 경우입니다. 법정대리인 동의는 휴대전화 본인인증만 허용되는 것이 아니어서 서면 방식도 가능하지만, 아래 조건을 모두 갖춰야 합니다. 기관은 동의 수집 업무를 할 뿐 법정대리인이 되지는 않습니다.",
    default: false,
  },
  {
    id: "processor",
    label: "기관이 개인정보처리자, 우리는 수탁자",
    who: "기관이 개인정보처리자 · 우리가 수탁자",
    detail:
      "학교·학원이 학생정보의 처리 주체가 되고 우리는 평가 시스템만 제공합니다. 개인정보보호법 제26조에 따라 위탁 목적·목적 외 처리 금지·보호조치·재위탁 제한·감독을 문서로 정하고 위탁 사실을 공개해야 합니다. 이 경로로 받은 학생정보는 우리 회원관리·광고·별도 분석에 쓸 수 없습니다.",
    default: false,
  },
] as const;

/**
 * 기관이 동의 수집을 대행할 때 반드시 갖춰야 하는 조건.
 * 담당자가 「보호자 동의 받음」에 체크하는 방식은 이 목록의 어느 것도 만족하지 못한다.
 */
export const delegatedConsentConditions = [
  "우리 서비스의 정확한 개인정보 수집·이용 항목이 동의서에 포함되어 있을 것",
  "학생별로 동의가 구분되어 있을 것",
  "동의한 법정대리인의 신원과 동의 방법을 입증할 수 있을 것",
  "동의 일시와 동의문 버전을 보관할 것",
  "동의 수집과 증빙 책임을 기관과 계약으로 정해 둘 것",
] as const;

/* ───────────────────────── 목적별 분리 동의 (ACC-01-3) ─────────────────────────
   "목적별 체크박스 분리: 학력진단 / 재능진단 / 심화진단 연계 / 마케팅.
    필수·선택 명확 구분, 미동의 시에도 최소 응시 경로 제공(동의 강제 금지)" */

export type PurposeConsent = {
  id: string;
  label: string;
  purpose: string;
  detail: string;
  required: boolean;
  /** 동의하지 않으면 무엇을 못 하게 되는지 */
  ifDeclined: string;
  /**
   * 스크롤 상자에 그대로 펼쳐 보여 줄 조문.
   * 국내 검사·진단 포털은 요약만 두지 않고 전문을 상자 안에 넣어 두는 것이 관례다.
   * ⚠ 아래 문안은 화면 설계용이며, 법무 검토를 거친 확정본으로 교체해야 한다.
   */
  body: { h: string; p: string }[];
};

export const purposeConsents: PurposeConsent[] = [
  {
    id: "terms",
    label: "이용약관",
    purpose: "서비스 이용",
    detail: "서비스 이용 조건과 회원의 권리·의무입니다.",
    required: true,
    ifDeclined: "가입이 진행되지 않습니다.",
    body: [
      {
        h: "제1조 (목적)",
        p: "이 약관은 주식회사 제닉스(이하 '회사')가 제공하는 재능·학력 진단 서비스(이하 '서비스')의 이용 조건과 절차, 회사와 회원의 권리·의무 및 책임 사항을 정함을 목적으로 합니다.",
      },
      {
        h: "제2조 (회원의 구성)",
        p: "회원은 학생 회원, 학부모·법정대리인 회원, 교사 회원, 기관 회원으로 구분합니다. 만 14세 이상의 학생은 본인의 동의로 학생 회원에 가입할 수 있습니다. 만 14세 미만의 학생은 단독으로 가입을 완료할 수 없으며, 법정대리인의 동의가 확인된 때에 학생 프로필이 활성화됩니다.",
      },
      {
        h: "제2조의2 (미성년 회원의 계약)",
        p: "만 14세 이상 만 19세 미만의 회원은 무료 서비스의 이용과 개인정보 수집·이용에 본인이 동의할 수 있습니다. 다만 유료 상품의 결제, 자동결제 및 정기구독 등 재산상 의무가 발생하는 계약은 법정대리인의 동의를 받아야 하며, 동의 없이 체결된 계약은 민법 제5조에 따라 취소될 수 있습니다.",
      },
      {
        h: "제2조의3 (기관 회원의 지위)",
        p: "기관 회원은 평가를 개설하고 소속 학생을 등록·배정할 수 있습니다. 그러나 기관 회원의 승인은 기관의 실재와 담당자의 권한을 확인하는 것에 그치며, 기관 회원에게 학생의 법정대리인 지위를 부여하지 않습니다. 기관 회원은 법정대리인의 동의를 대신할 수 없습니다.",
      },
      {
        h: "제3조 (계정의 관리)",
        p: "회원은 계정 정보를 제3자에게 양도하거나 대여할 수 없습니다. 접속코드가 유출된 것으로 의심되는 경우 회원은 즉시 재발급을 신청하여야 하며, 회사는 통지를 받은 즉시 기존 코드를 무효화합니다.",
      },
      {
        h: "제4조 (진단 결과물)",
        p: "리포트를 포함한 결과물의 저작권은 회사에 있습니다. 회원은 자녀의 교육 목적으로 이를 열람·저장할 수 있으나, 회사의 사전 동의 없이 공개하거나 재배포할 수 없습니다.",
      },
      {
        h: "제5조 (판정의 성격)",
        p: "회사가 제공하는 진단 결과는 아동의 현재 관찰 결과에 대한 교육적 해석이며, 지능·학업 성취에 대한 서열이나 등급을 부여하지 않습니다. 결과는 의학적 진단이나 법적 판단의 근거로 사용될 수 없습니다.",
      },
      {
        h: "제6조 (계약의 해지)",
        p: "회원은 언제든지 탈퇴를 신청할 수 있습니다. 탈퇴 시 자녀 프로필과 응답 데이터의 처리 방침은 개인정보처리방침이 정한 바에 따르며, 회사는 처리 결과를 회원에게 통지합니다.",
      },
    ],
  },
  {
    id: "academic",
    label: "학력진단 개인정보 수집·이용",
    purpose: "학력진단",
    detail: "국어·수학·과학 진단과 결과 제공을 위해 이름·생년월일·학년을 수집합니다.",
    required: true,
    ifDeclined: "무료 학력진단을 볼 수 없습니다.",
    body: [
      {
        h: "수집·이용 목적",
        p: "국어(언어)·수학·과학 학력진단의 실시, 채점, 결과 리포트 작성 및 제공",
      },
      {
        h: "수집 항목",
        p: "[필수] 가입자 이름, 휴대폰 번호, 이메일, 본인인증 결과값 / 학생 이름, 생년월일, 지필 응답 [선택] 학교, 학년, 거주 지역(시·도), 학교 유형, 가정 내 주사용 언어 (만 14세 미만 학생의 경우 법정대리인 동의를 받기 전에는 법정대리인의 성명과 연락처만 수집합니다)",
      },
      {
        h: "보유·이용 기간",
        p: "수집일로부터 5년. 동의를 철회하시면 지체 없이 파기하며 처리 결과를 통지합니다.",
      },
      {
        h: "동의를 거부할 권리",
        p: "동의를 거부하실 수 있으나, 이 항목은 진단 실시에 반드시 필요하여 거부 시 서비스를 제공할 수 없습니다.",
      },
    ],
  },
  {
    id: "talent",
    label: "재능진단 개인정보 수집·이용",
    purpose: "재능진단",
    detail: "지필·SJT·설문·면담 응답을 재능 해석에 사용합니다.",
    required: false,
    ifDeclined: "학력진단만 응시하는 최소 경로로 진행됩니다.",
    body: [
      {
        h: "수집·이용 목적",
        p: "8개 재능 축 해석, 상황판단(SJT)·관찰 설문·면담 응답의 교차 검증, 전문가 협진 판정",
      },
      {
        h: "수집 항목",
        p: "[필수] 상황판단 응답, 학생 설문 응답, 보호자 관찰 설문 응답 [선택] 면담 녹취, 교사 관찰 설문 응답",
      },
      { h: "보유·이용 기간", p: "수집일로부터 5년. 면담 녹취는 판정 확정 후 1년." },
      {
        h: "동의를 거부할 권리",
        p: "거부하셔도 무료 학력진단은 그대로 응시하실 수 있습니다. 재능 축 해석과 관련 리포트 항목만 제공되지 않습니다.",
      },
    ],
  },
  {
    id: "advanced",
    label: "심화진단 연계",
    purpose: "심화진단 연계",
    detail: "2단계 심화진단으로 이어질 때 앞 회차 결과를 함께 해석합니다.",
    required: false,
    ifDeclined: "심화진단 신청 시점에 다시 여쭤봅니다.",
    body: [
      {
        h: "수집·이용 목적",
        p: "2단계 심화진단 신청 시 이전 회차 결과를 함께 참조하여 성장 추이를 해석",
      },
      { h: "수집 항목", p: "[필수] 이전 회차의 축별 점수와 판정 이력" },
      { h: "보유·이용 기간", p: "심화진단 종료 후 5년" },
      {
        h: "유의 사항",
        p: "음성·영상·행동로그가 포함되는 심화 수행과제는 이 동의에 포함되지 않으며, 신청 시점에 별도로 동의를 받습니다.",
      },
    ],
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신",
    purpose: "마케팅",
    detail: "회차 모집·이벤트 안내를 SMS·카카오·이메일로 받습니다.",
    required: false,
    ifDeclined: "안내를 받지 않습니다. 응시에는 영향이 없습니다.",
    body: [
      { h: "수집·이용 목적", p: "회차 모집 안내, 설명회·이벤트 안내, 신규 서비스 소식 발송" },
      { h: "수집 항목", p: "[필수] 이름, 휴대폰 번호, 이메일" },
      { h: "보유·이용 기간", p: "동의를 철회하실 때까지" },
      {
        h: "수신 거부",
        p: "내 정보 설정 > 알림 설정에서 언제든 해지하실 수 있으며, 각 메시지 하단의 수신거부 링크로도 해지됩니다.",
      },
    ],
  },
];

/** 필수 동의만 골랐을 때 갈 수 있는 최소 경로 안내 (동의 강제 금지 원칙) */
export const minimumPathNotice =
  "선택 항목에 동의하지 않으셔도 무료 학력진단은 그대로 응시할 수 있습니다. 동의하지 않은 항목은 나중에 내 정보 설정에서 언제든 다시 켤 수 있습니다.";

/* ───────────────────────── 알림 설정 (ACC-04-1) ───────────────────────── */

export const notificationChannels = ["SMS", "카카오 알림톡", "이메일"] as const;

export const notificationKinds = [
  { id: "exam", label: "응시 안내", desc: "회차 시작·마감, 남은 절차 알림", required: true },
  { id: "report", label: "리포트 발행", desc: "전문가 확정 후 결과가 나왔을 때", required: true },
  { id: "retest", label: "재진단 리마인드", desc: "다음 회차 응시 시점 안내", required: false },
  { id: "marketing", label: "이벤트·소식", desc: "마케팅 수신 동의가 있어야 발송됩니다", required: false },
];
