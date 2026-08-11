/**
 * 계정·동의 존(ACC) 도메인 규칙.
 *
 * 출처: GeniXX 플랫폼 사이트맵·메뉴 정의서 5장 (계정·동의 존).
 *
 * 이 파일이 정하는 것은 두 가지다 —
 *  1) 회원 구조: 학부모 계정(주) + 학생 프로필 + 교사/기관 계정.
 *     **학생은 독립 가입 경로가 없다.** 사이트맵 1장 회원 구조·2장 액터 정의(S) 근거.
 *  2) 만 14세 분기: 개인정보보호법 제22조의2에 따라 만 14세 미만 아동의 개인정보는
 *     법정대리인 동의가 있어야 처리할 수 있다. 그래서 자녀 등록 흐름의 **최선행(B00)** 에
 *     법정대리인 동의를 두고, 만 14세 이상이면 학생 본인 동의로 갈음한다.
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
 * 둘 다 학부모 계정 하위 프로필이라는 점은 같고, **동의의 주체만** 갈린다.
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
      "아이의 개인정보는 법정대리인이 동의해야 처리할 수 있습니다. 그래서 자녀 등록의 가장 첫 단계에서 보호자 동의를 받습니다.",
    extra: [
      "보호자 본인확인(휴대폰·간편인증)이 법정대리인 신원 확인의 근거가 됩니다.",
      "아이가 읽을 수 있는 눈높이 고지문을 함께 보여 드립니다.",
      "동의는 언제든 철회할 수 있고, 철회하면 파기 절차가 자동으로 시작됩니다.",
    ],
  },
  self: {
    label: "만 14세 이상",
    who: "학생 본인",
    basis: "개인정보보호법 제22조의2 단서",
    summary:
      "만 14세 이상이면 학생 본인이 동의할 수 있습니다. 다만 계정은 여전히 보호자 계정 하위의 프로필로 관리됩니다.",
    extra: [
      "법정대리인 동의는 받지 않습니다. 보호자는 결제와 리포트 열람 주체로만 남습니다.",
      "학생 본인 동의 화면은 응시 로그인 뒤 학생이 직접 확인합니다.",
      "학생이 독립 계정을 만들 수 있다는 뜻은 아닙니다. 가입 경로는 보호자 계정 하나입니다.",
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
    items: "이름, 생년월일, 학년, 지역, 학교유형, 설문 응답, 면담 녹취",
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
   사이트맵 5장: "학부모 / 교사 / 기관담당자 3분기. 학생은 독립 가입 경로 없음". */

export type SignupTypeId = "parent" | "teacher" | "org";

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
    id: "parent",
    label: "학부모",
    tagline: "자녀의 진단을 신청하고 결과를 열람합니다",
    detail:
      "서비스의 주 계정입니다. 한 계정에 자녀를 여러 명 등록할 수 있고, 보호자는 2명까지 주·보로 나눠 연결할 수 있습니다.",
    next: "/my/children/consent",
    needsApproval: false,
    tone: "border-brand-300 bg-brand-50 text-brand-800",
    badge: "가장 많이 선택",
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
    label: "기관담당자",
    tagline: "학교·학원·교육청 단위로 운영합니다",
    detail:
      "학생 명부와 접속코드, 응시권·정산을 관리합니다. 사업자 정보 확인 후 계정이 개설됩니다.",
    next: "/my/pending",
    needsApproval: true,
    tone: "border-amber-300 bg-amber-50 text-amber-800",
    badge: "승인 필요",
  },
];

export function signupTypeOf(id: SignupTypeId) {
  return signupTypes.find((t) => t.id === id) ?? signupTypes[0];
}

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
        p: "회원은 학부모 회원, 교사 회원, 기관 회원으로 구분합니다. 학생은 독립한 계정을 개설하지 않으며, 학부모 회원 계정 하위의 프로필로 등록되어 회사가 발급한 접속코드로만 응시 화면을 이용합니다.",
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
        p: "[필수] 보호자 이름, 휴대폰 번호, 이메일, 본인인증 결과값 / 자녀 이름, 생년월일, 학년, 거주 지역(시·도), 학교 유형, 지필 응답 [선택] 가정 내 주사용 언어",
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
