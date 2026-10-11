/**
 * 디자인 보기 (/design/…) — 화면 한 장, 상태 하나마다 주소를 따로 둔다.
 *
 * 여기 모은 것은 WBS에는 있는데 화면이 없던 것들이다. 실제 화면과 달리 **저장소를 읽지 않는다.**
 * 로그인했는지, 무엇을 눌렀는지에 따라 모양이 바뀌면 같은 주소가 사람마다 다른 화면이 되어
 * 디자인을 주소로 넘길 수 없다. 그래서 비회원 · 회원, 팝업이 열린 화면 · 닫힌 화면을 주소로
 * 가르고, 화면에 보이는 값은 전부 그 화면 파일에 적어 둔다.
 *
 * 단추는 대부분 눌러도 아무 일도 일어나지 않는다. 팝업을 여닫는 단추와 다음 상태로 가는
 * 단추만 그 상태의 주소로 이어 두었다.
 *
 * 주소는 `/design` + 실제 서비스 주소 + 상태다. 번호가 들어가는 주소는 예시 한 건으로 굳혔다.
 */

export type DesignZone = "account" | "admin2" | "my" | "student" | "site" | "mail";

export const zoneLabel: Record<DesignZone, string> = {
  account: "가입 · 로그인",
  admin2: "운영 콘솔",
  my: "보호자",
  student: "학생",
  site: "공개 사이트",
  mail: "이메일",
};

export type DesignState = {
  /** 화면 주소 뒤에 붙는 꼬리. 빈 값이면 화면 주소 그대로다 */
  slug: string;
  name: string;
  /** 누구의 화면인가 — 비회원 · 회원처럼 사람에 따라 갈리는 화면에만 적는다 */
  who?: string;
  /** 팝업이 열린 상태 */
  popup?: boolean;
  note?: string;
};

export type DesignScreen = {
  /** 화면 컴포넌트를 찾는 열쇠 (app/(design)/design/[...path]/page.tsx) */
  id: string;
  zone: DesignZone;
  name: string;
  /** WBS v4.3 번호 */
  wbs: string;
  /** 실제 서비스에서 이 화면이 놓일 주소 */
  real: string;
  /** 디자인 주소 — 앞에 /design이 붙는다 */
  base: string;
  states: DesignState[];
};

export const designScreens: DesignScreen[] = [
  {
    id: "expert-signup",
    zone: "account",
    name: "전문가 회원가입",
    wbs: "R.1.1",
    real: "/signup/type → /signup/join",
    base: "/signup/expert",
    states: [
      { slug: "", name: "회원 유형 선택", who: "비회원", note: "개인 / 전문가" },
      { slug: "method", name: "가입 수단 선택", who: "비회원" },
      { slug: "join", name: "정보 입력 · 빈 양식", who: "비회원", note: "아이디 가입" },
      { slug: "join/pass", name: "정보 입력 · 휴대폰 본인인증 진행 중", who: "비회원" },
      { slug: "join/terms", name: "정보 입력 · 약관 전문 펼침", who: "비회원" },
      { slug: "join/filled", name: "정보 입력 · 입력 완료", who: "비회원" },
      { slug: "join/error", name: "정보 입력 · 입력 오류", who: "비회원" },
      { slug: "join/minor", name: "정보 입력 · 성년이 아님", who: "비회원", note: "본인인증 결과 미성년" },
      { slug: "join/social", name: "정보 입력 · 간편 가입", who: "비회원", note: "카카오 · 네이버 · 구글" },
    ],
  },
  {
    id: "expert-waiting",
    zone: "admin2",
    name: "가입 승인 대기",
    wbs: "R.1.1 · R.1.2",
    real: "/admin2 (승인 전 전문가)",
    base: "/admin2/waiting",
    states: [
      { slug: "", name: "승인을 기다리는 중", who: "전문가 회원", note: "가입 직후 도착하는 화면" },
      { slug: "rejected", name: "가입 신청 반려", who: "전문가 회원" },
      { slug: "no-duty", name: "받은 권한 없음", who: "전문가 회원", note: "승인 뒤 권한을 모두 거둔 계정" },
    ],
  },
  {
    id: "approvals",
    zone: "admin2",
    name: "가입 승인 · 권한 부여",
    wbs: "R.1.2 · R.1.3",
    real: "/admin2/approvals · /admin2/approvals/[id]",
    base: "/admin2/approvals",
    states: [
      { slug: "", name: "목록 · 대기", who: "최상위 관리자" },
      { slug: "empty", name: "목록 · 대기 중인 신청 없음", who: "최상위 관리자" },
      { slug: "approved", name: "목록 · 승인됨", who: "최상위 관리자", note: "준 권한이 함께 보인다" },
      { slug: "EX-2610-004", name: "상세 · 권한을 고르기 전", who: "최상위 관리자", note: "승인 단추가 눌리지 않는다" },
      { slug: "EX-2610-004/picked", name: "상세 · 권한을 고름", who: "최상위 관리자" },
      { slug: "EX-2610-004/conflict", name: "상세 · 출제자와 검토자를 함께 고름", who: "최상위 관리자", note: "경고" },
      { slug: "EX-2610-004/approve", name: "승인 확인 창", who: "최상위 관리자", popup: true },
      { slug: "EX-2610-004/approved", name: "상세 · 승인됨", who: "최상위 관리자" },
      { slug: "EX-2610-004/edit", name: "상세 · 승인 뒤 권한 수정", who: "최상위 관리자" },
      { slug: "EX-2610-004/reject", name: "반려 확인 창", who: "최상위 관리자", popup: true },
      { slug: "EX-2610-004/rejected", name: "상세 · 반려됨", who: "최상위 관리자" },
    ],
  },
  {
    id: "console-login",
    zone: "admin2",
    name: "관리자 로그인",
    wbs: "v4/ch/6.2.1 · Q3 6.2.3",
    real: "/admin2 (로그인 전)",
    base: "/admin2/login",
    states: [
      { slug: "", name: "로그인", who: "로그인 전" },
      { slug: "error", name: "아이디 · 비밀번호 틀림", who: "로그인 전" },
      { slug: "locked", name: "로그인 잠김", who: "로그인 전", note: "5번 틀린 뒤" },
      { slug: "mfa", name: "2단계 인증", who: "로그인 전" },
    ],
  },
  {
    id: "console-me",
    zone: "admin2",
    name: "내 정보",
    wbs: "Q3 6.4.2 · Q3 3.3.3",
    real: "/admin2/me",
    base: "/admin2/me",
    states: [
      { slug: "", name: "내 정보", who: "최상위 관리자" },
      { slug: "first", name: "처음 받은 비밀번호 사용 중", who: "최상위 관리자", note: "비밀번호를 바꾸라는 안내" },
      { slug: "edit", name: "연락처 수정 중", who: "최상위 관리자" },
      { slug: "password", name: "비밀번호 변경 창", who: "최상위 관리자", popup: true },
      { slug: "password/error", name: "비밀번호 변경 창 · 입력 오류", who: "최상위 관리자", popup: true },
      { slug: "password/done", name: "비밀번호 변경 완료", who: "최상위 관리자" },
      { slug: "mfa", name: "2단계 인증 다시 설정 창", who: "최상위 관리자", popup: true },
      { slug: "expert", name: "내 정보", who: "전문가 회원", note: "출제자 · 상담사 권한" },
    ],
  },
  {
    id: "student-new",
    zone: "admin2",
    name: "학생 등록",
    wbs: "v4/new/students-new",
    real: "/admin2/students/new",
    base: "/admin2/students/new",
    states: [
      { slug: "", name: "빈 양식" },
      { slug: "filled", name: "입력 완료" },
      { slug: "error", name: "입력 오류", note: "이미 등록된 학생 · 필수 항목 누락" },
      { slug: "guardian", name: "보호자 찾기 창", popup: true },
      { slug: "confirm", name: "등록 확인 창", popup: true },
      { slug: "done", name: "등록 완료 · 접속코드 창", popup: true },
    ],
  },
  {
    id: "consult-products",
    zone: "admin2",
    name: "면담 상품",
    wbs: "L.2.11",
    real: "/admin2/consult-products",
    base: "/admin2/consult-products",
    states: [
      { slug: "", name: "목록" },
      { slug: "empty", name: "목록 · 등록된 상품 없음" },
      { slug: "new", name: "상품 등록 · 빈 양식" },
      { slug: "CP-02", name: "상품 수정" },
      { slug: "CP-02/error", name: "상품 수정 · 입력 오류" },
      { slug: "CP-02/delete", name: "삭제 확인 창", popup: true },
    ],
  },
  {
    id: "metrics",
    zone: "admin2",
    name: "운영 지표",
    wbs: "L.2.13 · Q3 6.2.4",
    real: "/admin2/metrics",
    base: "/admin2/metrics",
    states: [
      { slug: "", name: "이번 달" },
      { slug: "empty", name: "집계된 값 없음" },
      { slug: "formula", name: "면담 신청률 계산 방식 창", popup: true },
    ],
  },
  {
    id: "interview-record",
    zone: "admin2",
    name: "면담 결과 기록 · 종료 승인",
    wbs: "L.2.12",
    real: "/admin2/interviews/[id]/record",
    base: "/admin2/interviews/record",
    states: [
      { slug: "", name: "승인 대기", note: "상담사가 기록을 제출한 상태" },
      { slug: "waiting", name: "기록 대기", note: "면담은 끝났고 기록 기한 안" },
      { slug: "overdue", name: "기록 기한 초과" },
      { slug: "write", name: "운영자가 대신 기록" },
      { slug: "return", name: "보완 요청 창", popup: true },
      { slug: "returned", name: "보완 요청 후", note: "상담사가 다시 제출하기를 기다리는 상태" },
      { slug: "approve", name: "승인 · 종료 확인 창", popup: true },
      { slug: "closed", name: "종료됨" },
    ],
  },
  {
    id: "my-interview",
    zone: "my",
    name: "면담 일정 상세",
    wbs: "M.2.9",
    real: "/my/interviews/[code]",
    base: "/my/interviews/detail",
    states: [
      { slug: "", name: "예약 확정 · 화상", who: "보호자", note: "아직 입장할 수 없는 때" },
      { slug: "video-open", name: "예약 확정 · 화상 · 입장 가능", who: "보호자" },
      { slug: "onsite", name: "예약 확정 · 대면", who: "보호자", note: "장소 안내" },
      { slug: "phone", name: "예약 확정 · 전화", who: "보호자" },
      { slug: "pay-wait", name: "결제 대기", who: "보호자" },
      { slug: "assigning", name: "전문가 배정 중", who: "보호자" },
      { slug: "done", name: "면담 완료", who: "보호자" },
      { slug: "canceled", name: "취소됨", who: "보호자" },
      { slug: "cancel", name: "예약 취소 확인 창", who: "보호자", popup: true },
      { slug: "receipt", name: "영수증 창", who: "보호자", popup: true },
    ],
  },
  {
    id: "student-interview",
    zone: "student",
    name: "면담 일정 상세",
    wbs: "M.2.9 · M.2.7",
    real: "/student/interviews/[code]",
    base: "/student/interviews/detail",
    states: [
      { slug: "", name: "예약 확정 · 화상", who: "학생 (만 14세 이상)" },
      { slug: "cancel", name: "예약 취소 확인 창", who: "학생 (만 14세 이상)", popup: true },
    ],
  },
  {
    id: "my-bell",
    zone: "my",
    name: "알림 (머리글의 종)",
    wbs: "v4/ns/7.1.1",
    real: "/my",
    base: "/my",
    states: [
      { slug: "", name: "새 알림 있음", who: "보호자" },
      { slug: "alerts", name: "알림 목록 열림", who: "보호자", popup: true },
      { slug: "alerts-empty", name: "알림 목록 열림 · 알림 없음", who: "보호자", popup: true },
      { slug: "read", name: "새 알림 없음", who: "보호자" },
    ],
  },
  {
    id: "my-notifications",
    zone: "my",
    name: "알림 전체 보기",
    wbs: "v4/ns/7.1.1",
    real: "/my/notifications",
    base: "/my/notifications",
    states: [
      { slug: "", name: "목록", who: "보호자" },
      { slug: "empty", name: "알림 없음", who: "보호자" },
    ],
  },
  {
    id: "student-bell",
    zone: "student",
    name: "알림 (머리글의 종)",
    wbs: "M.2.14",
    real: "/student",
    base: "/student",
    states: [
      { slug: "", name: "새 알림 있음", who: "학생 (만 14세 미만)" },
      { slug: "alerts", name: "알림 목록 열림", who: "학생 (만 14세 미만)", popup: true },
      { slug: "alerts-empty", name: "알림 목록 열림 · 알림 없음", who: "학생 (만 14세 미만)", popup: true },
      { slug: "teen", name: "새 알림 있음", who: "학생 (만 14세 이상)" },
      { slug: "teen/alerts", name: "알림 목록 열림", who: "학생 (만 14세 이상)", popup: true },
    ],
  },
  {
    id: "experts",
    zone: "site",
    name: "상담 전문가 소개",
    wbs: "R.1.8",
    real: "/experts · /experts/[id]",
    base: "/experts",
    states: [
      { slug: "", name: "목록", who: "비회원" },
      { slug: "member", name: "목록", who: "회원" },
      { slug: "empty", name: "목록 · 소개할 전문가 없음", who: "비회원" },
      { slug: "kim-jiwon", name: "상세", who: "비회원" },
      { slug: "member/kim-jiwon", name: "상세", who: "회원" },
      { slug: "kim-jiwon/login", name: "로그인 안내 창", who: "비회원", popup: true },
      { slug: "member/kim-jiwon/no-report", name: "진단 결과 필요 안내 창", who: "회원", popup: true },
    ],
  },
  {
    id: "mail",
    zone: "mail",
    name: "이메일 알림",
    wbs: "Q3 1.1 · v4/ns/7.1.2",
    real: "(메일 본문)",
    base: "/mail",
    states: [
      { slug: "verify", name: "이메일 인증" },
      { slug: "welcome", name: "가입 완료" },
      { slug: "reset-password", name: "비밀번호 재설정" },
      { slug: "student-registered", name: "학생 등록 완료" },
      { slug: "exam-applied", name: "진단 접수 완료" },
      { slug: "payment-done", name: "결제 완료" },
      { slug: "exam-open", name: "응시 시작 안내" },
      { slug: "exam-remind", name: "응시 미완료 안내" },
      { slug: "report-published", name: "진단 결과 발행" },
      { slug: "counsel-confirmed", name: "면담 예약 확정" },
      { slug: "counsel-changed", name: "면담 일정 변경" },
      { slug: "counsel-remind", name: "면담 하루 전 안내" },
      { slug: "inquiry-answered", name: "1:1 문의 답변" },
      { slug: "leave-requested", name: "회원 탈퇴 접수" },
      { slug: "expert-applied", name: "전문가 가입 신청 접수" },
      { slug: "expert-approved", name: "전문가 가입 승인" },
      { slug: "expert-rejected", name: "전문가 가입 반려" },
    ],
  },
];

/** 상태의 주소 — /design/admin2/approvals/EX-2610-004/approve */
export const designHref = (screen: DesignScreen, slug: string) =>
  `/design${screen.base}${slug ? `/${slug}` : ""}`;

export const designScreenOf = (id: string) => designScreens.find((s) => s.id === id)!;

/** 화면 파일 안에서 상태 주소를 짧게 쓰는 길 — const to = designLinks("approvals") */
export const designLinks = (id: string) => {
  const screen = designScreenOf(id);
  return (slug = "") => designHref(screen, slug);
};

export type DesignHit = { screen: DesignScreen; state: DesignState };

/** 주소(앞의 /design을 뗀 것)로 화면과 상태를 찾는다 */
export function findDesign(path: string): DesignHit | null {
  const full = `/design/${path}`;
  for (const screen of designScreens) {
    const state = screen.states.find((s) => designHref(screen, s.slug) === full);
    if (state) return { screen, state };
  }
  return null;
}

/** 열리는 주소 전부 — 앞의 /design/을 뗀 조각 배열 */
export const designPaths = designScreens.flatMap((screen) =>
  screen.states.map((s) => designHref(screen, s.slug).slice("/design/".length).split("/")),
);
