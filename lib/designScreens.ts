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
 *
 * 둘째 묶음은 **화면은 있는데 WBS의 항목이 빠져 있던 것**이다(면담 배정 · 휴무일 · 면담 설정 ·
 * 마이크 점검 …). 지금 화면을 값만 적어 넣은 사본으로 세우고 빠진 항목을 얹었다. 같은 실제
 * 주소에 디자인이 둘이면(/my의 알림 종과 면담 상태) 상태 꼬리로 가른다.
 *
 * 셋째 묶음은 **접수 · 응시 · 정답과 해설 · 결과를 학생 대시보드 한 곳으로 모은 것**이다
 * (2026-10-12). 응시 존 헤더의 네 탭이 없어지고 그 화면들이 /student 아래로 옮겨 갔다 —
 * 진단 접수 · 내 진단 · 정답과 해설 · 진단 결과. 응시 존에 남은 첫 화면(진단 둘러보기)도 함께 둔다.
 * 네 화면은 같은 학생의 같은 진단을 말한다(components/design/screens/studentFlow.ts).
 */

export type DesignZone =
  | "account"
  | "exam"
  | "admin2"
  | "my"
  | "student"
  | "report"
  | "site"
  | "mail";

export const zoneLabel: Record<DesignZone, string> = {
  account: "가입 · 로그인",
  exam: "진단 응시",
  admin2: "운영 콘솔",
  my: "보호자",
  student: "학생",
  report: "진단 보고서",
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
  /* ── 진단 응시 — 응시 존의 첫 화면. 머리의 네 탭이 없어진 뒤의 모습이다 ── */
  {
    id: "exam-browse",
    zone: "exam",
    name: "진단 둘러보기 (응시 존의 첫 화면)",
    wbs: "v4/ns/5.1.2",
    real: "/exam",
    base: "/exam",
    states: [
      { slug: "", name: "진단 목록", who: "비회원", note: "줄마다 「무료로 풀어보기」 · 머리가 한 줄이다" },
      { slug: "card", name: "진단 목록 · 카드로 보기", who: "비회원" },
      { slug: "empty", name: "진단 목록 · 찾는 진단 없음", who: "비회원" },
      { slug: "student", name: "내 진단으로 넘어가는 중", who: "회원 · 학생", note: "학생은 자기 대시보드로 보낸다" },
      { slug: "parent", name: "응시는 학생 계정에서", who: "회원 · 보호자" },
    ],
  },
  /* ── 진단 응시 — 머리의 「나가기」 (비회원 · 회원 무료 · 회원 유료) ── */
  {
    id: "exam-trial",
    zone: "exam",
    name: "셋트 응시 · 나가기",
    wbs: "Q3 5.2.1 ~ 5.2.3",
    real: "/exam/session/trial/[회차]/[학년]",
    base: "/exam/session/trial",
    states: [
      { slug: "", name: "응시 중", who: "비회원", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "비회원", popup: true },
      { slug: "left", name: "나간 뒤 · 표지로 돌아옴", who: "비회원", note: "답은 창을 닫기 전까지 남는다" },
    ],
  },
  {
    id: "exam-free",
    zone: "exam",
    name: "무료 진단 응시 · 나가기",
    wbs: "Q3 5.2.1 ~ 5.2.3",
    real: "/exam/session/free",
    base: "/exam/session/free",
    states: [
      { slug: "", name: "응시 중", who: "회원 · 무료", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "회원 · 무료", popup: true },
      { slug: "left", name: "나간 뒤 · 남은 기회 있음", who: "회원 · 무료" },
      { slug: "left/none", name: "나간 뒤 · 남은 기회 없음", who: "회원 · 무료" },
    ],
  },
  {
    id: "exam-paid",
    zone: "exam",
    name: "유료 진단 응시 · 나가기",
    wbs: "Q3 5.2.1 ~ 5.2.3",
    real: "/exam/session/paid/[과목]",
    base: "/exam/session/paid",
    states: [
      { slug: "", name: "응시 중", who: "회원 · 유료", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "회원 · 유료", popup: true },
      { slug: "left", name: "나간 뒤 · 남은 기회 있음", who: "회원 · 유료" },
      { slug: "left/none", name: "나간 뒤 · 남은 기회 없음", who: "회원 · 유료" },
    ],
  },

  /* ── 접수 · 응시 · 정답과 해설 · 결과를 학생 대시보드로 모은 것 ── */
  {
    id: "student-apply",
    zone: "student",
    name: "진단 접수",
    wbs: "v4/new/22",
    real: "/student/apply",
    base: "/student/apply",
    states: [
      { slug: "", name: "진단 목록 · 접수 전", who: "학생", note: "예전 응시 존의 「접수하기」 탭" },
      { slug: "card", name: "진단 목록 · 카드로 보기", who: "학생" },
      { slug: "empty", name: "진단 목록 · 찾는 진단 없음", who: "학생" },
      { slug: "confirm", name: "접수 확인 창 · 유료 진단", who: "학생 · 응시권 있음", popup: true },
      { slug: "confirm/free", name: "접수 확인 창 · 무료 진단", who: "학생 · 응시권 없음", popup: true },
      { slug: "done", name: "접수 완료 창 · 유료 진단", who: "학생 · 응시권 있음", popup: true },
      { slug: "done/free", name: "접수 완료 창 · 무료 진단", who: "학생 · 응시권 없음", popup: true },
      { slug: "applied", name: "접수한 뒤 · 유료 진단", who: "학생 · 응시권 있음", note: "그 줄이 「내 진단에서 보기」로 바뀐다" },
      { slug: "applied/free", name: "접수한 뒤 · 무료 진단", who: "학생 · 응시권 없음" },
      { slug: "guardian", name: "보호자가 학생 접속코드로 들어옴", who: "보호자", note: "접수는 학생이 한다" },
    ],
  },
  {
    id: "student-exams",
    zone: "student",
    name: "내 진단 (응시)",
    wbs: "v4/new/32 · v4/new/20 · v4/ns/5.1.2",
    real: "/student/exams · /student/exams/[회차]/[학년]",
    base: "/student/exams",
    states: [
      { slug: "", name: "목록", who: "학생", note: "예전 응시 존의 「응시하기」 탭" },
      { slug: "empty", name: "목록 · 접수한 진단 없음", who: "학생" },
      { slug: "2026-4/e4", name: "진단 한 건 · 시작 전", who: "학생 · 유료" },
      { slug: "2026-4/e4/doing", name: "진단 한 건 · 한 과목 제출", who: "학생 · 유료" },
      { slug: "2026-4/e4/submitted", name: "진단 한 건 · 과목을 모두 제출", who: "학생 · 유료", note: "「제출 완료」가 눌린다" },
      { slug: "2026-4/e4/sms", name: "설문 링크 문자 보내기 창", who: "학생 · 유료", popup: true },
      { slug: "2026-4/e4/final", name: "최종 제출 확인 창", who: "학생 · 유료", popup: true },
      { slug: "2026-4/e4/final/missing", name: "최종 제출 확인 창 · 내지 않은 설문 있음", who: "학생 · 유료", popup: true },
      { slug: "2026-4/e4/reviewing", name: "진단 한 건 · 최종 제출 뒤", who: "학생 · 유료", note: "「정답과 해설 보기」" },
      { slug: "2026-4/e4/free", name: "진단 한 건 · 시작 전", who: "학생 · 무료", note: "20문항을 한 번에 응시" },
      { slug: "2026-4/e4/free/submitted", name: "진단 한 건 · 20문항 제출", who: "학생 · 무료" },
      { slug: "2026-4/e4/guardian", name: "진단 한 건 · 보호자가 학생 접속코드로 들어옴", who: "보호자", note: "학부모 설문만 한다" },
      { slug: "2026-3/e4", name: "진단 한 건 · 결과 발행", who: "학생 · 유료", note: "「정답과 해설」 「결과 보기」" },
      { slug: "2026-1/e4", name: "진단 한 건 · 기간 종료", who: "학생 · 무료", note: "최종 제출하지 못한 진단" },
    ],
  },
  {
    id: "student-answers",
    zone: "student",
    name: "정답과 해설",
    wbs: "없음",
    real: "/student/answers · /student/answers/[회차]/[학년]",
    base: "/student/answers",
    states: [
      { slug: "", name: "목록", who: "학생", note: "예전 응시 존의 「정답과 해설」 탭" },
      { slug: "empty", name: "목록 · 접수한 진단 없음", who: "학생" },
      { slug: "2026-3/e4", name: "진단 한 건 · 정오표 · 채점 중", who: "학생 · 유료", note: "내려받기 PDF · CSV · 인쇄" },
      { slug: "2026-3/e4/math", name: "정오표 · 사진 답안과 긴 글", who: "학생 · 유료", note: "수학 과목을 편 상태" },
      { slug: "2026-3/e4/review", name: "답안 풀이 보기 창 · 정답", who: "학생 · 유료", popup: true, note: "응시 화면과 같은 틀" },
      { slug: "2026-3/e4/review/wrong", name: "답안 풀이 보기 창 · 오답", who: "학생 · 유료", popup: true },
      { slug: "2026-3/e4/review/empty", name: "답안 풀이 보기 창 · 미응답", who: "학생 · 유료", popup: true },
      { slug: "2026-3/e4/review/essay", name: "답안 풀이 보기 창 · 논술형 채점 중", who: "학생 · 유료", popup: true, note: "긴 글" },
      { slug: "2026-3/e4/review/photo", name: "답안 풀이 보기 창 · 사진 답안 채점 중", who: "학생 · 유료", popup: true },
      { slug: "2026-3/e4/review/short", name: "답안 풀이 보기 창 · 단답형 오답", who: "학생 · 유료", popup: true, note: "묶인 두 문항" },
      { slug: "2026-3/e4/graded", name: "진단 한 건 · 정오표 · 채점이 끝난 뒤", who: "학생 · 유료", note: "부분 정답 △" },
      { slug: "2026-3/e4/graded/review", name: "답안 풀이 보기 창 · 부분 정답과 해설", who: "학생 · 유료", popup: true, note: "채점자가 적은 해설" },
      { slug: "2026-3/e4/coach", name: "맞춤 학습 창", who: "학생 · 유료", popup: true },
      { slug: "2026-2/e4", name: "진단 한 건 · 정오표", who: "학생 · 무료", note: "20문항" },
      { slug: "2026-4/e4", name: "진단 한 건 · 최종 제출 전", who: "학생", note: "정답이 아직 열리지 않았다" },
    ],
  },
  {
    id: "student-result-wait",
    zone: "student",
    name: "진단 결과 · 결과를 기다리는 화면",
    wbs: "v4/new/student-results",
    real: "/student/results/[회차]/[학년]",
    base: "/student/results",
    states: [
      { slug: "2026-4/e4", name: "전문가 확인 중", who: "학생", note: "「정답과 해설 보기」" },
    ],
  },

  /* ── 화면은 있는데 항목이 빠져 있던 것 ── */
  {
    id: "interview-detail",
    zone: "admin2",
    name: "면담 상세 · 상담사 배정과 알림 발송",
    wbs: "L.2.4 · L.2.5",
    real: "/admin2/interviews/[id]",
    base: "/admin2/interviews/CS-2610-0019",
    states: [
      { slug: "", name: "상담사 배정 대기 · 추천 목록", note: "신청자가 「관리자 배정 요청」을 고른 신청" },
      { slug: "assign", name: "배정 확인 창", popup: true },
      { slug: "assigned", name: "상담사 배정됨" },
      { slug: "auto", name: "자동 배정된 신청", note: "분야 일치 → 시간 가능 → 주간 배정이 가장 적은 사람" },
      { slug: "no-match", name: "추천할 상담사 없음", note: "그 시간에 가능한 상담사가 없을 때" },
      { slug: "notify", name: "알림 발송 창", popup: true },
      { slug: "notified", name: "알림 발송 뒤", note: "발송 내역에 한 줄이 늘어난다" },
    ],
  },
  {
    id: "counselor-detail",
    zone: "admin2",
    name: "상담사 상세 · 주간 배정 현황과 휴무일",
    wbs: "L.2.9 · L.2.10",
    real: "/admin2/counselors/[id]",
    base: "/admin2/counselors/kim-jiwon",
    states: [
      { slug: "", name: "주간 배정 현황 · 휴무일" },
      { slug: "week/next", name: "다음 주 · 배정 없음" },
      { slug: "dayoff", name: "휴무일 추가 창", popup: true },
      { slug: "dayoff/conflict", name: "휴무일 추가 창 · 그날 잡힌 면담 있음", popup: true },
      { slug: "dayoff/added", name: "휴무일 추가 뒤" },
      { slug: "dayoff/delete", name: "휴무일 삭제 확인 창", popup: true },
    ],
  },
  {
    id: "settings-interview",
    zone: "admin2",
    name: "시스템 설정 · 면담 설정",
    wbs: "L.2.14",
    real: "/admin2/settings",
    base: "/admin2/settings",
    states: [
      { slug: "interview", name: "면담 설정", note: "자동 배정 · 기록 기한 · 자동 종료 일수" },
      { slug: "interview/edit", name: "면담 설정 · 수정 중" },
      { slug: "interview/manual", name: "면담 설정 · 자동 배정 끔" },
      { slug: "interview/error", name: "면담 설정 · 입력 오류" },
      { slug: "interview/saved", name: "면담 설정 · 저장 완료" },
    ],
  },
  {
    id: "staff-counselor",
    zone: "admin2",
    name: "운영자 · 연결된 상담사 프로필",
    wbs: "L.2.16",
    real: "/admin2/staff · /admin2/staff/[id]",
    base: "/admin2/staff",
    states: [
      { slug: "", name: "목록 · 상담사 표시" },
      { slug: "EX-2609-001", name: "상세 · 상담사 프로필 연결됨" },
      { slug: "EX-2609-001/hidden", name: "상세 · 상담사 프로필 숨김", note: "소개 페이지와 면담 신청에 보이지 않는 상태" },
      { slug: "EX-2609-002", name: "상세 · 상담사 권한 없음" },
    ],
  },
  {
    id: "payments-counsel",
    zone: "admin2",
    name: "결제 내역 · 면담 구분",
    wbs: "K.2.3",
    real: "/admin2/payments",
    base: "/admin2/payments",
    states: [
      { slug: "", name: "전체 · 「구분」 열과 필터" },
      { slug: "counsel", name: "면담 결제만" },
      { slug: "exam", name: "진단 결제만" },
      { slug: "counsel/empty", name: "면담 결제만 · 그 기간에 결제 없음" },
    ],
  },
  {
    id: "audit-interview",
    zone: "admin2",
    name: "감사 로그 · 면담과 전문가 활동 기록",
    wbs: "K.1.6",
    real: "/admin2/audit",
    base: "/admin2/audit",
    states: [
      { slug: "", name: "전체 · 새 기록 포함" },
      { slug: "interview", name: "면담 기록만" },
      { slug: "expert", name: "전문가 활동만" },
    ],
  },
  {
    id: "grading-answers",
    zone: "admin2",
    name: "채점 상세 · 음성 입력 답과 사진 답안",
    wbs: "Q.1.6",
    real: "/admin2/grading/[id]",
    base: "/admin2/grading/answers",
    states: [
      { slug: "voice", name: "음성으로 입력한 답", note: "말한 것을 받아 적은 글을 채점한다" },
      { slug: "file", name: "사진 답안 · 확인 전" },
      { slug: "file/zoom", name: "사진 크게 보기 창", popup: true },
      { slug: "file/scored", name: "사진 답안 · 채점함" },
      { slug: "file/unreadable", name: "사진 답안 · 알아볼 수 없음", note: "다시 올려 달라고 요청" },
    ],
  },
  {
    id: "grading-members",
    zone: "admin2",
    name: "회원 채점 · 정오표와 채점하기 창",
    wbs: "Q.1.6",
    real: "/admin2/grading/members · /admin2/grading/members/[답안지]",
    base: "/admin2/grading/members",
    states: [
      { slug: "", name: "목록 · 채점할 답안지", who: "채점자" },
      { slug: "2026-3-0412", name: "답안지 · 정오표 · 채점 전", who: "채점자", note: "AI가 먼저 매긴 점수만 있다" },
      { slug: "2026-3-0412/grading", name: "답안지 · 정오표 · 채점 중", who: "채점자", note: "국어를 다 보고 수학을 보는 중" },
      { slug: "2026-3-0412/done", name: "답안지 · 정오표 · 채점 완료", who: "채점자", note: "부분 정답 △" },
      { slug: "2026-3-0412/grade", name: "채점하기 창 · 객관식", who: "채점자", popup: true, note: "응시 화면과 같은 틀 · 오른쪽 아래 점수 칸" },
      { slug: "2026-3-0412/grade/lowered", name: "채점하기 창 · 점수를 낮춤", who: "채점자", popup: true, note: "2점 만점에 2점 → 1점" },
      { slug: "2026-3-0412/grade/essay", name: "채점하기 창 · 논술형", who: "채점자", popup: true, note: "긴 글" },
      { slug: "2026-3-0412/grade/photo", name: "채점하기 창 · 사진 답안", who: "채점자", popup: true, note: "AI는 채점하지 않는다" },
      { slug: "2026-3-0412/grade/written", name: "채점하기 창 · 서술형", who: "채점자", popup: true, note: "3점 만점" },
      { slug: "2026-3-0412/grade/drawing", name: "채점하기 창 · 그리기", who: "채점자", popup: true },
      { slug: "2026-3-0412/grade/short", name: "채점하기 창 · 단답형", who: "채점자", popup: true, note: "묶인 두 문항" },
      { slug: "2026-3-0412/grade/last", name: "채점하기 창 · 마지막 문항", who: "채점자", popup: true, note: "「확인하고 마치기」" },
    ],
  },
  {
    id: "my-counsel",
    zone: "my",
    name: "보호자 홈 · 면담 상태",
    wbs: "M.2.13",
    real: "/my",
    base: "/my",
    states: [
      { slug: "counsel", name: "면담 예약 확정", who: "보호자" },
      { slug: "counsel/today", name: "오늘 면담 · 입장 가능", who: "보호자" },
      { slug: "counsel/pay-wait", name: "면담 결제 대기", who: "보호자" },
      { slug: "counsel/assigning", name: "상담 전문가 배정 중", who: "보호자" },
      { slug: "counsel/done", name: "면담 완료", who: "보호자" },
      { slug: "counsel/none", name: "신청한 면담 없음", who: "보호자", note: "결과가 발행된 학생에게 「면담 신청」" },
    ],
  },
  {
    id: "notification-settings",
    zone: "my",
    name: "알림 설정 · 면담 안내와 앱 알림",
    wbs: "L.1.13 · M.2.12",
    real: "/my/account/notification",
    base: "/my/account/notification",
    states: [
      { slug: "", name: "알림 설정", who: "보호자", note: "받을 소식 8가지 · 앱 알림 추가" },
      { slug: "push-off", name: "이 기기의 앱 알림이 꺼져 있음", who: "보호자" },
      { slug: "saved", name: "저장 완료", who: "보호자" },
    ],
  },
  {
    id: "exam-result-counsel",
    zone: "my",
    name: "결과 화면 · 「면담 신청」 버튼",
    wbs: "M.2.11",
    real: "/exam/result",
    base: "/exam/result",
    states: [
      { slug: "", name: "결과 발행됨 · 면담 신청 가능", who: "보호자" },
      { slug: "booked", name: "이미 면담을 신청함", who: "보호자" },
      { slug: "pending", name: "결과 발행 전", who: "보호자", note: "버튼이 없다" },
    ],
  },
  {
    id: "student-results-counsel",
    zone: "student",
    name: "진단 결과 · 「면담 신청」 버튼",
    wbs: "M.2.11",
    real: "/student/results · /student/results/[회차]/[학년]",
    base: "/student/results",
    states: [
      { slug: "", name: "목록 · 면담 신청 가능", who: "학생 (만 14세 이상)" },
      { slug: "detail", name: "결과지 · 면담 신청 가능", who: "학생 (만 14세 이상)" },
      { slug: "booked", name: "목록 · 이미 면담을 신청함", who: "학생 (만 14세 이상)" },
      { slug: "child", name: "목록 · 보호자가 신청", who: "학생 (만 14세 미만)", note: "버튼 대신 안내" },
    ],
  },
  {
    id: "exam-guide-mic",
    zone: "exam",
    name: "진단 안내 · 응시 전 마이크 점검",
    wbs: "Q.1.4",
    real: "/exam/info",
    base: "/exam/info",
    states: [
      { slug: "", name: "점검 전", who: "회원" },
      { slug: "guest", name: "점검 전", who: "비회원" },
      { slug: "mic/asking", name: "마이크 사용 허용을 기다리는 중", who: "회원" },
      { slug: "mic/listening", name: "말하는 중 · 소리 확인", who: "회원" },
      { slug: "mic/ok", name: "점검 통과", who: "회원", note: "받아 적은 글이 보인다" },
      { slug: "mic/denied", name: "마이크 사용이 막혀 있음", who: "회원" },
      { slug: "mic/none", name: "마이크를 찾지 못함", who: "회원" },
      { slug: "mic/quiet", name: "소리가 들리지 않음", who: "회원" },
      { slug: "mic/unsupported", name: "음성 입력을 쓸 수 없는 브라우저", who: "회원" },
    ],
  },
  {
    id: "report-answers",
    zone: "report",
    name: "진단 보고서 · 음성 입력 답과 사진 답안 표시",
    wbs: "Q.1.7",
    real: "/report/full (정밀본 과목 면)",
    base: "/report/answers",
    states: [
      { slug: "", name: "대표 문항의 답 · 음성 입력 표시와 사진 답안", note: "국어 면은 음성 입력, 과학 면은 사진" },
      { slug: "photo", name: "사진 답안 크게 보기 창", popup: true },
      { slug: "none", name: "글로 쓴 답만 있는 보고서", note: "표시가 붙지 않는다 — 지금과 같다" },
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
