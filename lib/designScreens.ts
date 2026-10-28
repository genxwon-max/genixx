/**
 * 디자인 보기 (/design/…) — 화면 한 장, 상태 하나마다 주소를 따로 둔다.
 *
 * 여기 모은 것은 WBS에는 있는데 화면이 없던 것들이다. 실제 화면과 달리 **저장소를 읽지 않는다.**
 * 로그인했는지, 무엇을 눌렀는지에 따라 모양이 바뀌면 같은 주소가 사람마다 다른 화면이 되어
 * 디자인을 주소로 넘길 수 없다. 그래서 로그인 전 · 로그인 후, 팝업이 열린 화면 · 닫힌 화면을
 * 주소로 가르고, 화면에 보이는 값은 전부 그 화면 파일에 적어 둔다.
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
 *
 * 넷째 묶음은 **알아볼 수 없는 사진 답안을 다시 받는 길**이다(2026-10-21). 채점자가 「알아볼 수
 * 없음」을 고른 뒤의 운영자 확인 목록 · 요청 단추 · 최종 제출 뒤 보호자와 학생이 사진을 다시 올리는
 * 화면 · 메일 · 알림톡 · 알림 종. 모두 같은 학생의 같은 답을 말한다(components/design/screens/photoFlow.ts).
 */

export type DesignZone =
  | "account"
  | "exam"
  | "admin2"
  | "my"
  | "student"
  | "report"
  | "site"
  | "mail"
  | "message";

export const zoneLabel: Record<DesignZone, string> = {
  account: "가입 · 로그인",
  exam: "진단 응시",
  admin2: "운영 콘솔",
  my: "보호자",
  student: "학생",
  report: "진단 보고서",
  site: "공개 사이트",
  mail: "이메일",
  message: "알림톡 · 문자",
};

export type DesignState = {
  /** 화면 주소 뒤에 붙는 꼬리. 빈 값이면 화면 주소 그대로다 */
  slug: string;
  name: string;
  /**
   * 누구의 화면인가 — 목록의 「구분」 칸에 적힌다. 사람에 따라 갈리는 화면에만 적는다.
   *
   * **사람의 종류로 적는다** — 사용자 · 학생 · 보호자 · 전문가 · 최상위 관리자. 「비회원」이라고는
   * 적지 않는다(2026-10-12 요청). 같은 화면이 로그인 전과 후에 다르면 「사용자 · 로그인 전」처럼
   * 종류 뒤에 덧붙이고, 전문가로 가입하는 화면은 「전문가」다.
   */
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
      { slug: "", name: "회원 유형 선택", who: "전문가", note: "개인 / 전문가" },
      { slug: "method", name: "가입 수단 선택", who: "전문가" },
      { slug: "join", name: "정보 입력 · 빈 양식", who: "전문가", note: "아이디 가입" },
      { slug: "join/pass", name: "정보 입력 · 휴대폰 본인인증 진행 중", who: "전문가" },
      { slug: "join/terms", name: "정보 입력 · 약관 전문 펼침", who: "전문가" },
      { slug: "join/filled", name: "정보 입력 · 입력 완료", who: "전문가" },
      { slug: "join/error", name: "정보 입력 · 입력 오류", who: "전문가" },
      { slug: "join/minor", name: "정보 입력 · 성년이 아님", who: "전문가", note: "본인인증 결과 미성년" },
      { slug: "join/social", name: "정보 입력 · 간편 가입", who: "전문가", note: "카카오 · 네이버 · 구글" },
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
      { slug: "", name: "승인을 기다리는 중", who: "전문가", note: "가입 직후 도착하는 화면" },
      { slug: "rejected", name: "가입 신청 반려", who: "전문가" },
      { slug: "no-duty", name: "받은 권한 없음", who: "전문가", note: "승인 뒤 권한을 모두 거둔 계정" },
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
      { slug: "", name: "로그인", who: "최상위 관리자" },
      { slug: "error", name: "아이디 · 비밀번호 틀림", who: "최상위 관리자" },
      { slug: "locked", name: "로그인 잠김", who: "최상위 관리자", note: "5번 틀린 뒤" },
      { slug: "mfa", name: "2단계 인증", who: "최상위 관리자" },
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
      { slug: "", name: "최상위 관리자로 로그인", who: "최상위 관리자", note: "왼쪽 메뉴 맨 아래 「내 정보」 — 어느 권한으로 들어와도 같은 자리" },
      { slug: "first", name: "처음 받은 비밀번호 사용 중", who: "최상위 관리자", note: "비밀번호를 바꾸라는 안내" },
      { slug: "edit", name: "연락처 수정 중", who: "최상위 관리자" },
      { slug: "password", name: "비밀번호 변경 창", who: "최상위 관리자", popup: true },
      { slug: "password/error", name: "비밀번호 변경 창 · 입력 오류", who: "최상위 관리자", popup: true },
      { slug: "password/done", name: "비밀번호 변경 완료", who: "최상위 관리자" },
      { slug: "mfa", name: "2단계 인증 다시 설정 창", who: "최상위 관리자", popup: true },
      { slug: "find", name: "화면 찾기 창 · 「내 정보」를 찾은 모습", who: "최상위 관리자", popup: true, note: "메뉴 그룹 밖에 있는 「내 정보」도 화면 찾기에 나온다" },
      { slug: "author", name: "출제자로 로그인", who: "전문가", note: "왼쪽 메뉴에 문항 출제 · 문항 은행 · 내 정보" },
      { slug: "reviewer", name: "검토자로 로그인", who: "전문가", note: "왼쪽 메뉴에 문항 검수 · 문항 은행 · 내 정보" },
      { slug: "grader", name: "진단 위원으로 로그인", who: "전문가", note: "왼쪽 메뉴에 진단 채점 · 회원 채점 · 내 정보" },
      { slug: "counselor", name: "상담사로 로그인", who: "전문가", note: "왼쪽 메뉴에 내 상담 · 내 상담 일정 · 내 정보 · 프로필이 상담사 카드에 표시된다" },
      { slug: "expert", name: "권한을 둘 받은 계정으로 로그인", who: "전문가", note: "출제자 · 상담사 권한을 함께 받은 계정" },
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
      { slug: "photo", name: "새 알림 있음 · 답 사진을 다시 올려 달라는 요청", who: "보호자", note: "이서준의 보호자 이정민 · 홈 맨 위에 할 일과 「사진 다시 올리기」" },
      { slug: "photo/alerts", name: "알림 목록 열림 · 답 사진을 다시 올려 달라는 요청", who: "보호자", popup: true },
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
      { slug: "photo", name: "새 알림 있음 · 답 사진을 다시 올려 달라는 요청", who: "학생 (만 14세 미만)", note: "홈의 「지금 할 일」에 요청 · 「사진 다시 올리기」" },
      { slug: "photo/alerts", name: "알림 목록 열림 · 답 사진을 다시 올려 달라는 요청", who: "학생 (만 14세 미만)", popup: true },
    ],
  },
  {
    id: "answer-photo",
    zone: "my",
    name: "사진 다시 올리기 · 알림톡 · 메일로 받은 링크",
    wbs: "Q.1.6",
    real: "/answer/photo?req=[링크]",
    base: "/answer/photo",
    states: [
      { slug: "", name: "올리기 전", who: "보호자", note: "로그인 없이 링크로 엶 · 다시 찍을 문항과 처음 사진 · 처음에 쓴 종이를 그대로 · 다시 찍는 법" },
      { slug: "picked", name: "사진을 고른 뒤", who: "보호자", note: "보내기 전에 크게 보고 확인 · 돌리기 · 다른 사진으로 바꾸기" },
      { slug: "error", name: "사진이 아닌 파일을 고름", who: "보호자" },
      { slug: "sent", name: "보낸 뒤", who: "보호자", note: "채점을 이어서 하고 결과가 발행되면 알린다는 안내" },
      { slug: "done", name: "이미 보낸 링크를 다시 엶", who: "보호자" },
      { slug: "expired", name: "기한이 지난 링크", who: "보호자", note: "지금 올라와 있는 사진으로 채점한다는 안내" },
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
      { slug: "", name: "목록", who: "사용자 · 로그인 전" },
      { slug: "member", name: "목록", who: "사용자 · 로그인 후" },
      { slug: "empty", name: "목록 · 소개할 전문가 없음", who: "사용자 · 로그인 전" },
      { slug: "kim-jiwon", name: "상세", who: "사용자 · 로그인 전" },
      { slug: "member/kim-jiwon", name: "상세", who: "사용자 · 로그인 후" },
      { slug: "kim-jiwon/login", name: "로그인 안내 창", who: "사용자 · 로그인 전", popup: true },
      { slug: "member/kim-jiwon/no-report", name: "진단 결과 필요 안내 창", who: "사용자 · 로그인 후", popup: true },
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
      { slug: "", name: "진단 목록", who: "사용자 · 로그인 전", note: "줄마다 「무료로 풀어보기」 · 머리가 한 줄이다" },
      { slug: "card", name: "진단 목록 · 카드로 보기", who: "사용자 · 로그인 전" },
      { slug: "empty", name: "진단 목록 · 찾는 진단 없음", who: "사용자 · 로그인 전" },
      { slug: "student", name: "내 진단으로 넘어가는 중", who: "학생", note: "학생은 자기 대시보드로 보낸다" },
      { slug: "parent", name: "응시는 학생 계정에서", who: "보호자" },
    ],
  },
  /* ── 진단 응시 — 머리의 「나가기」 (가입 전 셋트 · 무료 진단 · 유료 진단) ── */
  {
    id: "exam-trial",
    zone: "exam",
    name: "셋트 응시 · 나가기",
    wbs: "Q3 5.2.1 ~ 5.2.3",
    real: "/exam/session/trial/[회차]/[학년]",
    base: "/exam/session/trial",
    states: [
      { slug: "", name: "응시 중", who: "사용자 · 로그인 전", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "사용자 · 로그인 전", popup: true },
      { slug: "left", name: "나간 뒤 · 표지로 돌아옴", who: "사용자 · 로그인 전", note: "답은 창을 닫기 전까지 남는다" },
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
      { slug: "", name: "응시 중", who: "학생 · 무료", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "학생 · 무료", popup: true },
      { slug: "left", name: "나간 뒤 · 남은 기회 있음", who: "학생 · 무료" },
      { slug: "left/none", name: "나간 뒤 · 남은 기회 없음", who: "학생 · 무료" },
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
      { slug: "", name: "응시 중", who: "학생 · 유료", note: "머리 오른쪽 끝의 「나가기」" },
      { slug: "exit", name: "나가기 확인 창", who: "학생 · 유료", popup: true },
      { slug: "left", name: "나간 뒤 · 남은 기회 있음", who: "학생 · 유료" },
      { slug: "left/none", name: "나간 뒤 · 남은 기회 없음", who: "학생 · 유료" },
    ],
  },
  /* ── 진단 응시 — 함께 읽는 자료가 없는 독립 문항. 왼쪽 자료 칸 없이 문항만 가운데에 선다 ── */
  {
    id: "exam-match",
    zone: "exam",
    name: "독립 문항 · 선 잇기",
    wbs: "없음",
    real: "/exam/session/paid/[과목]",
    base: "/exam/session/match",
    states: [
      { slug: "", name: "잇기 전", who: "학생 · 유료", note: "왼쪽 자료 칸이 없다 · 왼쪽 2개와 오른쪽 5개 · 직접 이어 보는 화면은 /exam/session/design/match" },
      { slug: "picked", name: "왼쪽 항목을 고른 뒤", who: "학생 · 유료", note: "이을 오른쪽 항목을 누르면 선이 이어진다" },
      { slug: "doing", name: "잇는 중", who: "학생 · 유료", note: "선 3개 · 왼쪽 한 항목에 선 여럿" },
      { slug: "done", name: "모두 이은 뒤", who: "학생 · 유료", note: "문항 이동판과 「응답」 수에 답한 문항으로 표시된다" },
    ],
  },
  /* ── 진단 응시 — 출제할 때 답 칸 표시로 쓴 문항(2026-10-16). 칸이 문항 글의 그 자리에 선다 ── */
  {
    id: "exam-slots",
    zone: "exam",
    name: "답 칸 표시로 쓴 문항",
    wbs: "없음",
    real: "/exam/session/paid/[과목]",
    base: "/exam/session/slots",
    states: [
      { slug: "", name: "쓰기 전", who: "학생 · 유료", note: "괄호 자리에 짧은 칸 · 「이유를 쓰시오」 아래 쓰는 칸 · 직접 써 보는 화면은 /exam/session/design/slots" },
      { slug: "doing", name: "짧은 칸만 쓴 뒤", who: "학생 · 유료", note: "칸을 다 채우지 않아 아직 답한 문항으로 세지 않는다" },
      { slug: "done", name: "모두 쓴 뒤", who: "학생 · 유료", note: "문항 이동판과 「응답」 수에 답한 문항으로 표시된다" },
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
    real: "/student/exams · /student/exams/[회차]/[학년] · …/[학년]/photo",
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
      { slug: "2026-4/e4/photo", name: "진단 한 건 · 답 사진을 다시 올려 달라는 요청", who: "학생 · 유료", note: "최종 제출 뒤 운영자가 요청 · 맨 위에 요청과 「사진 다시 올리기」" },
      { slug: "2026-4/e4/photo/upload", name: "사진 다시 올리기 · 올리기 전", who: "학생 · 유료", note: "다시 찍을 문항과 처음 사진 · 처음에 쓴 종이를 그대로 · 다시 찍는 법" },
      { slug: "2026-4/e4/photo/picked", name: "사진 다시 올리기 · 사진을 고른 뒤", who: "학생 · 유료", note: "보내기 전에 크게 보고 확인 · 보낸 뒤에는 바꿀 수 없다" },
      { slug: "2026-4/e4/photo/sent", name: "사진 다시 올리기 · 보낸 뒤", who: "학생 · 유료", note: "채점을 이어서 한다는 안내 · 「내 진단으로」" },
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
      { slug: "2026-3/e4/match", name: "정오표 · 선 잇기 문항이 든 과학", who: "학생 · 유료", note: "과학 5번이 선 잇기 독립 문항 · 정답과 내 답이 글로 적힌다" },
      { slug: "2026-3/e4/match/review", name: "답안 풀이 보기 창 · 선 잇기 오답", who: "학생 · 유료", popup: true, note: "바르게 이은 선 · 잘못 이은 선 · 잇지 않은 정답 · 왼쪽 자료 칸이 없다" },
      { slug: "2026-3/e4/slots", name: "정오표 · 답 칸 표시로 쓴 문항이 든 과학", who: "학생 · 유료", note: "과학 5번 · 서술 칸이 있어 「채점 중」" },
      { slug: "2026-3/e4/slots/review", name: "답안 풀이 보기 창 · 답 칸 표시로 쓴 문항", who: "학생 · 유료", popup: true, note: "괄호 자리 · 「이유를 쓰시오」 아래에 낸 답이 그 자리에 그대로" },
      { slug: "2026-2/e4", name: "진단 한 건 · 정오표", who: "학생 · 무료", note: "20문항" },
      { slug: "2026-4/e4", name: "진단 한 건 · 최종 제출 전", who: "학생", note: "정답이 아직 열리지 않았다" },
    ],
  },
  {
    id: "student-result-wait",
    zone: "student",
    name: "진단 결과 · 결과를 기다리는 화면과 발행된 결과지",
    wbs: "v4/new/student-results",
    real: "/student/results/[회차]/[학년]",
    base: "/student/results",
    states: [
      { slug: "2026-4/e4", name: "전문가 확인 중", who: "학생", note: "「정답과 해설 보기」" },
      { slug: "2026-3/e4", name: "결과지 · 스케줄러가 발행한 뒤", who: "학생", note: "채점 완료 7일 뒤 아침에 자동 발행 · 「전문가 진단」은 조립 규칙이 넣은 문단 그대로" },
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
      { slug: "rest", name: "그 외 기록만", note: "스케줄러 변경 · 조립 규칙 변경 · 리포트 자동 발행 · 사진 다시 올리기 요청 · 기한 늘림 · 채점으로 돌려보냄 기록이 여기에 표시된다" },
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
      { slug: "voice", name: "음성으로 입력한 답", who: "채점자", note: "말한 것을 받아 적은 글을 채점한다" },
      { slug: "file", name: "사진 답안 · 확인 전", who: "채점자" },
      { slug: "file/zoom", name: "사진 크게 보기 창", who: "채점자", popup: true },
      { slug: "file/scored", name: "사진 답안 · 채점함", who: "채점자" },
      { slug: "file/unreadable", name: "사진 답안 · 알아볼 수 없음", who: "채점자", note: "저장하면 운영자 확인으로 넘어간다" },
      { slug: "file/waiting", name: "사진 답안 · 운영자 확인 중", who: "채점자", note: "보호자에게 다시 올려 달라고 요청한 동안 점수 칸이 잠긴다" },
      { slug: "file/reuploaded", name: "사진 답안 · 다시 올라온 사진", who: "채점자", note: "채점 대기로 돌아옴 · 처음 사진과 나란히 보고 같은 종이인지 확인" },
    ],
  },
  /* ── 채점자가 「알아볼 수 없음」으로 넘긴 사진 답안 — 운영자가 보호자에게 다시 올려 달라고 요청한다(2026-10-21) ── */
  {
    id: "grading-checks",
    zone: "admin2",
    name: "운영자 확인 · 알아볼 수 없는 사진 답안",
    wbs: "Q.1.6",
    real: "/admin2/grading/checks · /admin2/grading/checks/[응답]",
    base: "/admin2/grading/checks",
    states: [
      { slug: "", name: "목록 · 확인 대기", who: "최상위 관리자", note: "왼쪽 메뉴 채점 관리의 「운영자 확인」 · 채점자가 넘긴 이유와 넘긴 때" },
      { slug: "requested", name: "목록 · 다시 올리기 요청함", who: "최상위 관리자", note: "기한 · 보호자가 알림톡을 읽었는지" },
      { slug: "expired", name: "목록 · 기한 지남", who: "최상위 관리자" },
      { slug: "done", name: "목록 · 처리 완료", who: "최상위 관리자", note: "다시 올라와 채점 대기로 돌아간 것 · 다시 받지 않고 채점으로 돌려보낸 것" },
      { slug: "empty", name: "목록 · 확인할 응답 없음", who: "최상위 관리자" },
      { slug: "SC-2610-0164", name: "상세 · 확인 대기 · 흐린 사진", who: "최상위 관리자", note: "채점자가 넘긴 이유와 메모 · 사진 · 학생과 보호자 · 「다시 올려 달라고 요청」" },
      { slug: "SC-2610-0164/request", name: "다시 올려 달라고 요청하는 창", who: "최상위 관리자", popup: true, note: "이유 · 보호자에게 보낼 말 · 올릴 기한 3일 · 보낼 곳(알림톡 · 이메일 · 앱 알림)" },
      { slug: "SC-2610-0164/requested", name: "상세 · 요청한 뒤 · 다시 올라오기를 기다림", who: "최상위 관리자", note: "알림 발송 내역 · 기한 하루 전 안내 예정 · 「다시 알리기」" },
      { slug: "SC-2610-0164/remind", name: "다시 알리기 창", who: "최상위 관리자", popup: true },
      { slug: "SC-2610-0164/uploaded", name: "상세 · 사진이 다시 올라온 뒤", who: "최상위 관리자", note: "처음 사진과 다시 올린 사진 · 운영자를 거치지 않고 채점 대기로 돌아감" },
      { slug: "SC-2610-0139", name: "상세 · 기한 지남 · 빛이 비친 사진", who: "최상위 관리자", note: "보호자가 알림톡을 읽지 않음 · 「기한 늘리기」 · 「지금 사진으로 채점」(빈 종이 상세의 돌려보내는 창과 같다)" },
      { slug: "SC-2610-0139/extend", name: "기한 늘리기 창", who: "최상위 관리자", popup: true },
      { slug: "SC-2610-0139/extended", name: "상세 · 기한을 늘린 뒤", who: "최상위 관리자", note: "늘렸다는 안내가 발송 내역에 · 다시 기다림" },
      { slug: "SC-2610-0152", name: "상세 · 확인 대기 · 빈 종이", who: "최상위 관리자", note: "다시 받으면 답을 새로 쓸 수 있게 되어 「채점으로 돌려보내기」를 권한다" },
      { slug: "SC-2610-0152/return", name: "채점으로 돌려보내는 창", who: "최상위 관리자", popup: true, note: "지금 사진으로 채점 · 사유 · 보호자에게 알릴지" },
      { slug: "SC-2610-0152/returned", name: "상세 · 채점으로 돌려보낸 뒤", who: "최상위 관리자" },
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
      { slug: "2026-3-0412/done", name: "답안지 · 정오표 · 채점 완료", who: "채점자", note: "부분 정답 △ · 리포트가 리포트 승인 목록에 표시된다" },
      { slug: "2026-3-0412/grade", name: "채점하기 창 · 객관식", who: "채점자", popup: true, note: "응시 화면과 같은 틀 · 오른쪽 아래 점수 칸" },
      { slug: "2026-3-0412/grade/lowered", name: "채점하기 창 · 점수를 낮춤", who: "채점자", popup: true, note: "2점 만점에 2점 → 1점" },
      { slug: "2026-3-0412/grade/essay", name: "채점하기 창 · 논술형", who: "채점자", popup: true, note: "긴 글" },
      { slug: "2026-3-0412/grade/photo", name: "채점하기 창 · 사진 답안", who: "채점자", popup: true, note: "AI는 채점하지 않는다 · 점수 칸 아래 「알아볼 수 없음」" },
      { slug: "2026-3-0412/grade/unreadable", name: "채점하기 창 · 사진 답안 · 알아볼 수 없음", who: "채점자", popup: true, note: "수학 3번에 흐린 사진을 낸 답안지 · 이유 · 운영자에게 남길 말 · 이동판에 붉게 「운영자 확인」" },
      { slug: "2026-3-0412/held", name: "답안지 · 정오표 · 사진 답안을 운영자 확인으로 넘긴 뒤", who: "채점자", note: "「운영자 확인」 탭 · 채점 칸 · 응시 판의 안내 · 채점 중" },
      { slug: "2026-3-0412/held/done", name: "답안지 · 정오표 · 운영자 확인 1문항만 남음", who: "채점자", note: "나머지를 모두 확인해도 채점이 끝나지 않고 리포트가 만들어지지 않는다" },
      { slug: "2026-3-0412/grade/written", name: "채점하기 창 · 서술형", who: "채점자", popup: true, note: "3점 만점" },
      { slug: "2026-3-0412/grade/drawing", name: "채점하기 창 · 그리기", who: "채점자", popup: true },
      { slug: "2026-3-0412/grade/short", name: "채점하기 창 · 단답형", who: "채점자", popup: true, note: "묶인 두 문항" },
      { slug: "2026-3-0412/grade/last", name: "채점하기 창 · 마지막 문항", who: "채점자", popup: true, note: "「확인하고 마치기」" },
      { slug: "2026-3-0412/grade/match", name: "채점하기 창 · 선 잇기", who: "채점자", popup: true, note: "선 잇기 문항이 든 시험지 · 기계가 먼저 채점 · 선의 색으로 맞고 틀린 것이 보인다" },
      { slug: "2026-3-0412/grade/slots", name: "채점하기 창 · 답 칸 표시로 쓴 문항", who: "채점자", popup: true, note: "괄호 자리의 짧은 칸 · 「이유를 쓰시오」 아래 쓰는 칸에 낸 답이 그 자리에 · 예시 답은 칸 이름(정답 1 · 서술형 1)으로" },
    ],
  },
  {
    id: "report-approval",
    zone: "admin2",
    name: "리포트 승인 · 채점 완료 뒤 자동 발행",
    wbs: "v4/new/11 · v4/new/12",
    real: "/admin2/reports/approval · /admin2/reports/approval/[리포트]",
    base: "/admin2/reports/approval",
    states: [
      { slug: "", name: "목록 · 발행 예정", who: "최상위 관리자", note: "채점이 끝난 답안지의 리포트만 · 스케줄러는 값만 표시하고 「스케줄러에서 변경」" },
      { slug: "saved", name: "목록 · 스케줄러를 3일로 줄인 뒤", who: "최상위 관리자", note: "스케줄러 화면에서 저장한 뒤 — 예정일이 당겨지고, 지난 4건이 발행됨" },
      { slug: "check", name: "목록 · 확인 필요", who: "최상위 관리자", note: "검토가 필요한 표현이 있어 자동 발행에서 빠진 리포트" },
      { slug: "done", name: "목록 · 발행 완료", who: "최상위 관리자", note: "자동 발행 · 직접 발행" },
      { slug: "all", name: "목록 · 전체", who: "최상위 관리자", note: "발행 예정 · 확인 필요 · 발행 완료를 한 표에" },
      { slug: "empty", name: "목록 · 발행을 기다리는 리포트 없음", who: "최상위 관리자" },
      { slug: "RP-2026-3-0474", name: "상세 · 발행 예정", who: "최상위 관리자", note: "예정일 아침에 자동 발행 · 「지금 발행」 · 조립 내역(규칙마다 넣은 문단과 근거)" },
      { slug: "RP-2026-3-0474/publish", name: "지금 발행 확인 창", who: "최상위 관리자", popup: true },
      { slug: "RP-2026-3-0474/published", name: "상세 · 직접 발행한 뒤", who: "최상위 관리자" },
      { slug: "RP-2026-3-0474/auto", name: "상세 · 자동으로 발행된 뒤", who: "최상위 관리자", note: "아무도 누르지 않았다" },
      { slug: "RP-2026-3-0474/preview", name: "리포트 보기 창", who: "최상위 관리자", popup: true, note: "회원이 받는 모습" },
      { slug: "RP-2026-3-0474/preview/edit", name: "리포트 보기 창 · 고치는 중", who: "최상위 관리자", popup: true },
      { slug: "RP-2026-3-0474/preview/edit/leave", name: "리포트 보기 창 · 고치다가 닫으려 할 때", who: "최상위 관리자", popup: true, note: "고친 것을 버릴지 묻는 창" },
      { slug: "RP-2026-3-0467", name: "상세 · 확인 필요", who: "최상위 관리자", note: "사람이 고친 문단에 검토가 필요한 표현 · 자동 발행에서 빠짐 · 「지금 발행」이 눌리지 않는다" },
      { slug: "RP-2026-3-0467/fix", name: "리포트 보기 창 · 검토가 필요한 표현", who: "최상위 관리자", popup: true, note: "막는 표현이 문단 아래에 표시된다" },
      { slug: "RP-2026-3-0467/fixed", name: "상세 · 표현을 고친 뒤", who: "최상위 관리자", note: "예정일이 지나 다음 자동 발행 때 나간다" },
    ],
  },
  {
    id: "report-rules",
    zone: "admin2",
    name: "조립 규칙 · 채점 결과가 리포트가 되는 기준",
    wbs: "v4/new/11 · 사이트맵 ADM-08-4",
    real: "/admin2/reports/rules",
    base: "/admin2/reports/rules",
    states: [
      { slug: "", name: "조립 규칙", who: "최상위 관리자", note: "표본 — 한 축이 뚜렷한 학생 · 규칙 7개 가운데 6개가 문단을 넣는다" },
      { slug: "preview", name: "리포트 미리 보기 창", who: "최상위 관리자", popup: true, note: "표본을 지금 규칙으로 조립하면 회원이 받는 모습" },
      { slug: "sample/gap", name: "표본 · 전체 점수는 낮고 한 축만 높은 학생", who: "최상위 관리자", note: "교차 셀 「학력 부진 × 재능 강세」의 문구가 들어간다" },
      { slug: "sample/even", name: "표본 · 세 축이 고른 학생", who: "최상위 관리자", note: "낮은 축 문단이 빠지고 · 5학년 문구가 없어 3학년 문구로 대체" },
      { slug: "sample/low", name: "표본 · 모든 축이 낮게 나온 학생", who: "최상위 관리자", note: "가장 높은 축도 L1 구간의 문구를 받는다" },
      { slug: "sample/single", name: "표본 · 한 과목만 응시한 학생", who: "최상위 관리자", note: "견줄 축이 없어 낮은 축 · 교차 해석이 빠진다" },
      { slug: "edit/cut", name: "발현 밴드 컷을 고치는 중", who: "최상위 관리자", note: "L3 컷 75 → 80 · 저장하면 발행 전 7건 가운데 2건이 달라진다는 안내" },
      { slug: "edit/rule", name: "규칙을 고치는 중", who: "최상위 관리자", note: "낮은 축의 점수 차 10 → 20 · 「집에서 해 볼 것」 꺼짐" },
      { slug: "edit/cell", name: "교차 셀의 문구를 고치는 중", who: "최상위 관리자", note: "칸을 열어 리포트 제목 · 문구 · 다음 단계를 고친다" },
      { slug: "edit/invalid", name: "저장할 수 없는 값", who: "최상위 관리자", note: "L2 컷이 L3 컷보다 높다 · 저장이 잠긴다" },
      { slug: "edit/leave", name: "저장하지 않고 나가려 할 때 묻는 창", who: "최상위 관리자", popup: true, note: "계속 편집 · 저장하지 않고 나가기 · 저장하고 나가기" },
      { slug: "saved", name: "저장한 뒤", who: "최상위 관리자", note: "마지막 변경이 적히고 표본의 문단이 새 컷을 따른다" },
    ],
  },
  {
    id: "report-templates",
    zone: "admin2",
    name: "해석 템플릿 · 고친 문구가 들어가는 리포트의 범위",
    wbs: "v4/new/11 · 사이트맵 ADM-08-1",
    real: "/admin2/reports/templates · /admin2/reports/templates/[칸]",
    base: "/admin2/reports/templates",
    states: [
      { slug: "", name: "목록", who: "최상위 관리자", note: "학년 · 항목 · 재능 축 · 발현 밴드마다 한 칸" },
      { slug: "add", name: "템플릿 추가 창", who: "최상위 관리자", popup: true, note: "「문구를 채우면 발행을 기다리는 리포트부터 들어갑니다」" },
      { slug: "add/filled", name: "템플릿 추가 창 · 입력 완료", who: "최상위 관리자", popup: true },
      { slug: "top-e4-language-L3", name: "한 칸 · 기본 문구", who: "최상위 관리자", note: "강하게 나타난 축 · 초등 4학년 · 언어 · L3" },
      { slug: "top-e4-language-L3/edit", name: "한 칸 · 고치는 중", who: "최상위 관리자", note: "저장 줄의 안내 — 발행을 기다리는 리포트와 앞으로 조립하는 리포트에 들어간다" },
      { slug: "top-e4-language-L3/blocked", name: "한 칸 · 금지 표현", who: "최상위 관리자", note: "저장이 잠긴다" },
      { slug: "top-e4-language-L3/edited", name: "한 칸 · 저장한 뒤", who: "최상위 관리자", note: "「수정됨」 · 「기본 문구로 되돌리기」" },
      { slug: "top-e4-language-L3/edited/again", name: "한 칸 · 다시 고쳐 저장한 뒤", who: "최상위 관리자", note: "앞에 저장한 글이 수정 이력에 남는다" },
    ],
  },
  {
    id: "privacy",
    zone: "admin2",
    name: "개인정보 관리 · 「개인정보 파기」로 가는 버튼과 안내",
    wbs: "Q3 6.14",
    real: "/admin2/privacy · /admin2/privacy/[회원]",
    base: "/admin2/privacy",
    states: [
      { slug: "", name: "목록 · 전체", who: "최상위 관리자", note: "머리 오른쪽의 「개인정보 파기 6」 — 예전 이름은 「파기 스케줄러」" },
      { slug: "withdrawn", name: "목록 · 동의 철회", who: "최상위 관리자" },
      { slug: "guardian", name: "목록 · 법정대리인 없음", who: "최상위 관리자" },
      { slug: "M-20633", name: "상세 · 파기 대기", who: "최상위 관리자", note: "「파기는 「개인정보 파기」에서 실행합니다」" },
      { slug: "M-20391", name: "상세 · 파기 완료", who: "최상위 관리자", note: "이력에 파기 한 줄 · 파기 사유" },
    ],
  },
  {
    id: "item-preview",
    zone: "admin2",
    name: "문항 미리보기 · 독립 문항과 선 잇기",
    wbs: "없음",
    real: "/admin2/items/[문항] (미리보기 창)",
    base: "/admin2/items/preview",
    states: [
      { slug: "", name: "독립 문항 · 객관식", who: "검토자", popup: true, note: "지문이 없으면 문항만 가운데 한 칸에 · 정답과 해설 켬" },
      { slug: "plain", name: "독립 문항 · 정답과 해설 끔", who: "검토자", popup: true, note: "아이가 보는 그대로" },
      { slug: "match", name: "독립 문항 · 선 잇기", who: "검토자", popup: true, note: "선을 긋는 칸으로 보인다 · 정답은 검수자에게만 글로" },
      { slug: "match/plain", name: "독립 문항 · 선 잇기 · 정답과 해설 끔", who: "검토자", popup: true },
    ],
  },
  /* ── 문항 출제 — 답 칸을 문항 글의 표시로 만든다(2026-10-16). 형식도 표시에서 정해진다 ── */
  {
    id: "item-slots",
    zone: "admin2",
    name: "문항 상세 · 답 칸 표시로 칸 만들기",
    wbs: "ADM-04-1",
    real: "/admin2/items/[문항]",
    base: "/admin2/items/IT-2701",
    states: [
      { slug: "", name: "쓰기 전", who: "전문가 · 출제자", note: "형식 「정해지지 않음」 · 정답 줄 자리에 표시를 쓰는 법" },
      { slug: "doc", name: "문서 편집기 · 원고를 붙여 넣은 뒤", who: "전문가 · 출제자", popup: true, note: "리본의 「답 칸」 단추 여덟 · 답이 그 자리에 적힌 원고" },
      { slug: "doc/slots", name: "문서 편집기 · 답을 골라 표시로 바꾼 뒤", who: "전문가 · 출제자", popup: true, note: "「수증기」를 골라 [정답] → [정답1: 수증기] · 모범 답 문단을 골라 {서술형} · 상태 줄 「답 칸 2개」" },
      { slug: "doc/guide", name: "문서 편집기 · 표시 안내를 편 모습", who: "전문가 · 출제자", popup: true, note: "표시 여덟 가지와 객관식 — 학생 화면 · 정답 적는 것 · 예" },
      { slug: "slots", name: "표시를 넣고 적용한 뒤 · 정답 비어 있음", who: "전문가 · 출제자", note: "문항 상자에 노란 이름표 「정답 1 · 정답 없음」 · 표시마다 정답 줄 · 형식은 서술형으로 정해짐" },
      { slug: "slots/filled", name: "칸마다 정답을 적은 뒤", who: "전문가 · 출제자", note: "이름표에 정답이 함께 · 단답 정답 여럿은 쉼표로" },
      { slug: "slots/check", name: "칸이 생기지 않는 표시", who: "전문가 · 출제자", note: "사진을 다른 표시와 함께 씀(붉은 이름표) · 원고의 문제 이름표 「[서술형 2]」는 칸으로 읽지 않음" },
      { slug: "preview", name: "미리보기 창 · 학생 화면", who: "전문가 · 출제자", popup: true, note: "괄호 자리에 짧은 칸 · 「이유를 쓰시오」 아래 쓰는 칸 · 칸마다 정답" },
      { slug: "preview/plain", name: "미리보기 창 · 정답과 해설 끔", who: "전문가 · 출제자", popup: true, note: "아이가 보는 그대로" },
      { slug: "preview/types", name: "미리보기 창 · 유형 아홉 가지", who: "전문가 · 출제자", popup: true, note: "단답형 · OX · 선택형 · 서술형 · 논술형 · 그리기 · 사진 · 선 잇기 · 객관식" },
      { slug: "types/short", name: "유형 · 단답형 [정답1]", who: "전문가 · 출제자", note: "정답 여럿은 쉼표로 · 단위" },
      { slug: "types/ox", name: "유형 · OX [OX1]", who: "전문가 · 출제자", note: "한 문항에 OX 칸 둘" },
      { slug: "types/pick", name: "유형 · 선택형 [선택1]", who: "전문가 · 출제자", note: "고를 것과 그중 정답" },
      { slug: "types/write", name: "유형 · 서술형 {서술형1}", who: "전문가 · 출제자", note: "예시 답" },
      { slug: "types/essay", name: "유형 · 논술형 {논술형1}", who: "전문가 · 출제자", note: "예시 답 · 학생 화면은 긴 글 칸과 글자 수" },
      { slug: "types/draw", name: "유형 · 그리기 {그리기1}", who: "전문가 · 출제자", note: "밑그림 · 채점 메모 · 비워 두어도 됨" },
      { slug: "types/photo", name: "유형 · 사진 {사진1}", who: "전문가 · 출제자", note: "한 문항에 하나, 다른 표시 없이" },
      { slug: "types/match", name: "유형 · 선 잇기 {선잇기1}", who: "전문가 · 출제자", note: "왼쪽 · 오른쪽 항목과 정답인 선" },
      { slug: "types/choice", name: "유형 · 객관식 ① ② ③ …", who: "전문가 · 출제자", note: "표시 없이 줄 맨 앞의 보기 번호로 정해짐" },
      { slug: "legacy", name: "예전 방식으로 만든 문항 · 승인됨", who: "전문가 · 출제자", note: "잠긴 문항은 지금 칸을 요약만 한다 — 응시 기록의 칸 차례를 지키려고 옮기지 않는다" },
      { slug: "legacy/converted", name: "그 문항을 새 버전으로 수정한 판", who: "전문가 · 출제자", note: "열자마자 표시로 옮겨져 있다 · 문장 속 괄호 → ( [정답1] ) ( [정답2] ) · 「이유」 칸 → {서술형1} · 적어 둔 정답은 그대로" },
    ],
  },
  /* ── 세트를 「새 버전으로 수정」한 판 — 예전 방식의 칸이 열자마자 표시로 옮겨져 있다(2026-10-16) ── */
  {
    id: "item-slots-set",
    zone: "admin2",
    name: "세트 문항 상세 · 새 버전으로 수정한 판(표시로 옮겨짐)",
    wbs: "ADM-04-1",
    real: "/admin2/items/[문항]",
    base: "/admin2/items/IT-2629",
    states: [
      { slug: "", name: "세트 · 문항 목록", who: "전문가 · 출제자", note: "승인된 세트(IT-SET-04 · 영월 한반도 지형)의 새 버전 · 유형 칸은 표시에서 정해진 형식" },
      { slug: "q1", name: "문항 1 · 문장 속 괄호와 이유", who: "전문가 · 출제자", note: "강물은 ( [정답1] )보다 ( [정답2] )에서 … · ○ 이유 : {서술형1} · 정답 A · B가 그대로" },
      { slug: "q2", name: "문항 2 · 흐르는 방향과 이유", who: "전문가 · 출제자", note: "○ 강물이 흐르는 방향 : 강물은 ( [정답1] )에서 ( [정답2] )쪽으로 흐른다." },
      { slug: "q3", name: "문항 3 · 이유와 그림(비워 두어도 됨)", who: "전문가 · 출제자", note: "{서술형1} · {그리기1}" },
      { slug: "q4", name: "문항 4 · 그림 둘", who: "전문가 · 출제자", note: "{그리기1} · {그리기2} · 밑그림이 그대로 · 형식은 이미지 첨부" },
      { slug: "preview", name: "미리보기 창 · 세트 학생 화면", who: "전문가 · 출제자", popup: true, note: "왼쪽 지문 · 오른쪽 문항 1~4 — 괄호 자리 칸 · 이유 칸 · 그림 칸" },
    ],
  },
  /* ── 문항 상세에 원안지 양식(10.22)의 항목을 얹음(2026-10-28) — 화면 모양은 그대로, 빨간 안내는 빈 칸에만 ── */
  {
    id: "item-card",
    zone: "admin2",
    name: "문항 상세 · 원안지 양식(10.22) 항목",
    wbs: "ADM-04-1",
    real: "/admin2/items/[문항]",
    base: "/admin2/items/IT-2702",
    states: [
      { slug: "", name: "빈 문항", who: "전문가 · 출제자", note: "새 문항 — 칸마다 원안지의 빨간 안내(「(수정 사용)」 · 「(해당하는 곳에 체크)」 · 「S1, S2도 기록하고 …」) · 인지단계 네 개 중 하나 고르기 · 대상·교과·단원 한 줄(단원을 고르면 성취기준 코드가 들어감), 출제 의도의 파란 「반드시 기록하여 주세요.」 · 새 칸: NCIC · 2022 확인, 그림·삽화 사양, 불인정 예, 이 문항의 특성" },
      { slug: "filled", name: "채운 문항", who: "전문가 · 출제자", note: "원안지의 예시 문항(3학년 국어 「빗방울 악단」 S1)을 칸마다 적은 뒤 — 안내가 모두 사라짐 · 배점 2점" },
      { slug: "figure", name: "그림 있음 · 확인 칸이 남음", who: "전문가 · 출제자", note: "그림 있음 아래 세 칸 중 둘만 짚음 — 체크리스트 마지막 줄에 빨간 경고, 검수로 제출이 꺼짐" },
      { slug: "checked", name: "Ⅱ. 체크리스트 · 열두 줄 확인", who: "전문가 · 출제자", note: "원안지의 열두 줄 · 위 12항을 모두 확인하였음 · 검수로 제출이 켜짐" },
      { slug: "set", name: "세트 · 문항 목록", who: "전문가 · 출제자", note: "지시문 · 보기·지문(시) · 문항 1 ~ 4 · 체크리스트는 세트 통째로 한 벌" },
      { slug: "set/q1", name: "세트 · 문항 1 (S1)", who: "전문가 · 출제자", note: "목록에서 들어간 문항 — 원래 화면 그대로 분류 · 문항 판" },
      { slug: "set/q4", name: "세트 · 문항 4 (S4)", who: "전문가 · 출제자", note: "{서술형1} 표시로 서술형 · 배점 6점 · 나머지 칸은 빨간 안내" },
    ],
  },
  {
    id: "schedulers",
    zone: "admin2",
    name: "스케줄러 · 리포트와 개인정보 스케줄러를 한곳에",
    wbs: "v4/new/11 · Q3 6.14",
    real: "/admin2/schedulers",
    base: "/admin2/schedulers",
    states: [
      { slug: "", name: "스케줄러", who: "최상위 관리자", note: "리포트 — 채점 완료 7일 뒤 오전 9시 · 개인정보 — 자동 파기 켜짐" },
      { slug: "report/edit", name: "리포트 스케줄러 · 날을 당기는 중", who: "최상위 관리자", note: "7일 → 3일 · 저장하면 4건이 바로 발행된다는 안내" },
      { slug: "report/time", name: "리포트 스케줄러 · 발행 시각을 고치는 중", who: "최상위 관리자", note: "오전 9시 → 오후 2시" },
      { slug: "report/now", name: "리포트 스케줄러 · 채점이 끝나는 대로", who: "최상위 관리자", note: "시각 칸이 잠긴다 · 기다리던 6건이 모두 나간다는 안내" },
      { slug: "report/saved", name: "리포트 스케줄러 · 저장한 뒤", who: "최상위 관리자", note: "3일 · 마지막 변경이 적힌다" },
      { slug: "privacy/edit", name: "개인정보 스케줄러 · 보관기간을 고치는 중", who: "최상위 관리자", note: "탈퇴 30일 → 14일 · 파기 대기 3건 → 5건" },
      { slug: "privacy/saved", name: "개인정보 스케줄러 · 저장한 뒤", who: "최상위 관리자" },
      { slug: "privacy/off", name: "개인정보 스케줄러 · 자동 파기 꺼짐", who: "최상위 관리자", note: "보관기간이 지나도 파기 대기에 오르지 않는다" },
    ],
  },
  {
    id: "privacy-purge",
    zone: "admin2",
    name: "개인정보 파기 · 예전 이름 「파기 스케줄러」",
    wbs: "Q3 6.14",
    real: "/admin2/privacy/purge",
    base: "/admin2/privacy/purge",
    states: [
      { slug: "", name: "파기 대기", who: "최상위 관리자", note: "파기 실행 판은 접혀 있다" },
      { slug: "run", name: "파기 실행 판을 폄", who: "최상위 관리자", note: "자동 파기는 값만 표시하고 「스케줄러에서 변경」 · 사유를 적어야 실행" },
      { slug: "done", name: "파기 완료", who: "최상위 관리자", note: "방금 지운 줄이 넘어와 있다" },
      { slug: "off", name: "자동 파기가 꺼져 있을 때", who: "최상위 관리자", note: "철회 요청만 대기에 있다" },
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
      { slug: "", name: "알림 설정", who: "보호자", note: "받을 소식 9가지(답 사진 다시 올리기는 필수) · 앱 알림 추가" },
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
      { slug: "", name: "점검 전", who: "사용자 · 로그인 후" },
      { slug: "guest", name: "점검 전", who: "사용자 · 로그인 전" },
      { slug: "mic/asking", name: "마이크 사용 허용을 기다리는 중", who: "사용자 · 로그인 후" },
      { slug: "mic/listening", name: "말하는 중 · 소리 확인", who: "사용자 · 로그인 후" },
      { slug: "mic/ok", name: "점검 통과", who: "사용자 · 로그인 후", note: "받아 적은 글이 보인다" },
      { slug: "mic/denied", name: "마이크 사용이 막혀 있음", who: "사용자 · 로그인 후" },
      { slug: "mic/none", name: "마이크를 찾지 못함", who: "사용자 · 로그인 후" },
      { slug: "mic/quiet", name: "소리가 들리지 않음", who: "사용자 · 로그인 후" },
      { slug: "mic/unsupported", name: "음성 입력을 쓸 수 없는 브라우저", who: "사용자 · 로그인 후" },
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
      { slug: "photo-request", name: "답 사진 다시 올리기 요청", who: "보호자", note: "운영자가 요청을 보낼 때 · 「사진 다시 올리기」" },
      { slug: "photo-remind", name: "답 사진 올릴 기한 하루 전", who: "보호자", note: "그때까지 올라오지 않았을 때만" },
      { slug: "photo-received", name: "다시 올린 답 사진 받음", who: "보호자" },
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
  {
    id: "alimtalk",
    zone: "message",
    name: "알림톡 · 문자",
    wbs: "v4/ns/7.1.2",
    real: "(알림톡 · 문자 본문)",
    base: "/message",
    states: [
      { slug: "photo-request", name: "알림톡 · 답 사진 다시 올리기 요청", who: "보호자", note: "단추 「사진 다시 올리기」 · 로그인 없이 열리는 링크" },
      { slug: "photo-request/sms", name: "문자 · 알림톡을 받을 수 없을 때", who: "보호자", note: "같은 내용을 장문 문자로 · 링크 주소를 글 안에" },
      { slug: "photo-remind", name: "알림톡 · 답 사진 올릴 기한 하루 전", who: "보호자", note: "그때까지 올라오지 않았을 때만" },
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
