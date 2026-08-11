/**
 * 회원가입 입력 정의.
 * 출처: GENIXX 회원 가입·계정 구조 정의서 3장(학부모 수집 정보) / 6장(동의 체계),
 *       사이트맵 ACC-01 ~ ACC-01-3.
 */

import type { MemberTypeId } from "./nav";

export type FieldType = "text" | "tel" | "email" | "password" | "select" | "date";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required: boolean;
  options?: string[];
  /** 간편 로그인으로 이미 받아오는 값 — 소셜 가입 시 읽기 전용 */
  fromSocial?: boolean;
  half?: boolean;
};

const common: Field[] = [
  {
    name: "name",
    label: "이름",
    type: "text",
    placeholder: "홍길동",
    required: true,
    fromSocial: true,
    half: true,
  },
  {
    name: "phone",
    label: "휴대폰 번호",
    type: "tel",
    placeholder: "010-1234-5678",
    required: true,
    half: true,
    hint: "본인확인에 사용한 번호가 자동으로 입력됩니다.",
  },
  {
    name: "email",
    label: "이메일",
    type: "email",
    placeholder: "parent@example.com",
    required: true,
    fromSocial: true,
  },
  {
    name: "password",
    label: "비밀번호",
    type: "password",
    placeholder: "영문·숫자·기호 조합 8자 이상",
    required: true,
    half: true,
  },
  {
    name: "passwordConfirm",
    label: "비밀번호 확인",
    type: "password",
    placeholder: "한 번 더 입력",
    required: true,
    half: true,
  },
];

export const fieldsByType: Record<MemberTypeId, Field[]> = {
  parent: [
    ...common,
    {
      name: "relation",
      label: "자녀와의 관계",
      type: "select",
      required: true,
      half: true,
      options: ["부", "모", "기타 법정대리인"],
      hint: "만 14세 미만 자녀 등록 시 법정대리인 확인에 사용됩니다.",
    },
    {
      name: "children",
      label: "등록할 자녀 수",
      type: "select",
      required: true,
      half: true,
      options: ["1명", "2명", "3명 이상"],
      hint: "가입 후 자녀 프로필에서 언제든 추가할 수 있습니다.",
    },
    {
      name: "region",
      label: "거주 지역",
      type: "select",
      required: false,
      half: true,
      options: [
        "서울",
        "경기·인천",
        "강원",
        "충청·대전·세종",
        "전라·광주",
        "경상·대구·부산·울산",
        "제주",
      ],
      hint: "시·도 수준까지만 수집합니다. 상세 주소는 받지 않습니다.",
    },
    {
      name: "interest",
      label: "관심 교육 분야",
      type: "select",
      required: false,
      half: true,
      options: ["언어·독서", "수리·논리", "과학·탐구", "예술·창작", "진로·적성", "아직 모르겠음"],
    },
  ],
  teacher: [
    ...common,
    {
      name: "school",
      label: "소속 학교·기관명",
      type: "text",
      placeholder: "○○초등학교",
      required: true,
      hint: "기관 관리자의 승인 후 계정이 활성화됩니다.",
    },
    {
      name: "grade",
      label: "담당 학년",
      type: "select",
      required: true,
      half: true,
      options: ["1~2학년", "3~4학년", "5~6학년", "중등", "고등", "기타"],
    },
    {
      name: "subject",
      label: "담당 과목·역할",
      type: "text",
      placeholder: "담임 / 국어 / 진로상담 등",
      required: true,
      half: true,
    },
    {
      name: "teacherNo",
      label: "교원번호",
      type: "text",
      placeholder: "선택 입력",
      required: false,
    },
  ],
  student: [
    ...common,
    {
      name: "birth",
      label: "생년월일",
      type: "text",
      placeholder: "20120315",
      required: true,
      half: true,
      hint: "만 14세 미만은 보호자 계정으로 등록해야 합니다.",
    },
    {
      name: "grade",
      label: "학년",
      type: "select",
      required: true,
      half: true,
      options: ["초등 3학년", "초등 4학년", "초등 5학년", "초등 6학년", "중등", "고등"],
    },
    {
      name: "school",
      label: "학교명",
      type: "text",
      placeholder: "선택 입력",
      required: false,
    },
  ],
  org: [
    ...common,
    {
      name: "orgName",
      label: "기관명",
      type: "text",
      placeholder: "○○교육청 / ○○학원",
      required: true,
      half: true,
    },
    {
      name: "orgType",
      label: "기관 유형",
      type: "select",
      required: true,
      half: true,
      options: ["교육청", "학교", "학원", "영재교육원", "기타"],
    },
    {
      name: "bizNo",
      label: "사업자등록번호",
      type: "text",
      placeholder: "123-45-67890",
      required: true,
      half: true,
      hint: "응시권 정산과 세금계산서 발행에 사용됩니다.",
    },
    {
      name: "position",
      label: "부서·직함",
      type: "text",
      placeholder: "선택 입력",
      required: false,
      half: true,
    },
  ],
};

export type Consent = {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  /** 학부모 유형에만 노출 */
  parentOnly?: boolean;
};

export const consents: Consent[] = [
  {
    id: "terms",
    label: "이용약관 동의",
    detail: "서비스 이용 조건과 회원의 권리·의무를 확인했습니다.",
    required: true,
  },
  {
    id: "privacy",
    label: "개인정보 수집·이용 동의",
    detail:
      "수집 항목·이용 목적·보관 기간(5년)·제3자 미제공·철회권을 확인했습니다. 최소 수집 원칙에 따라 진단에 필요한 시점에 단계적으로 수집합니다.",
    required: true,
  },
  {
    id: "guardian",
    label: "만 14세 미만 자녀 법정대리인 동의",
    detail:
      "개인정보보호법 제22조의2에 따라 자녀 등록 시 휴대폰 본인인증과 함께 법정대리인 동의를 수취합니다.",
    required: true,
    parentOnly: true,
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신 동의",
    detail: "회차 모집·이벤트 안내를 SMS·카카오·이메일로 받습니다. 언제든 해지할 수 있습니다.",
    required: false,
  },
  {
    id: "research",
    label: "연구·통계 및 AI 모델 개선 목적 데이터 활용 동의",
    detail:
      "식별 정보를 제거한 뒤 진단 도구 타당화 연구에 사용합니다. 기본 서비스 이용과 분리된 별도 선택 동의입니다.",
    required: false,
  },
];

export const socialProviders = [
  {
    id: "kakao",
    label: "카카오로 시작하기",
    className: "bg-[#FEE500] text-[#191600] hover:brightness-95",
    mark: "K",
    markClass: "bg-[#191600] text-[#FEE500]",
    primary: true,
  },
  {
    id: "naver",
    label: "네이버로 시작하기",
    className: "bg-[#03C75A] text-white hover:brightness-95",
    mark: "N",
    markClass: "bg-white/20 text-white",
    primary: true,
  },
  {
    id: "google",
    label: "구글로 시작하기",
    className: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    mark: "G",
    markClass: "bg-slate-100 text-slate-700",
    primary: false,
  },
] as const;

export type ProviderId = (typeof socialProviders)[number]["id"];

export function providerName(id: ProviderId) {
  return { kakao: "카카오", naver: "네이버", google: "구글" }[id];
}
