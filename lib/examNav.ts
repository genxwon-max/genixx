/**
 * 응시 존 메뉴 목록.
 *
 * 서버 레이아웃(app/(exam)/layout.tsx)과 클라이언트 화면이 함께 읽으므로 "use client" 파일
 * 밖에 둔다 — 클라이언트 모듈에서 내보낸 배열은 서버에서 펼칠 수 없다.
 */

/**
 * 헤더에서 응시 존 안에 머무는 안내 — 누르면 사이트로 나가지 않고 이 레이아웃 안에서 열린다.
 */
export const examGuideLinks = [
  { href: "/exam/guide", label: "서비스 안내" },
  { href: "/exam/info", label: "진단 안내" },
];

/**
 * 진단을 받는 차례 — 접수부터 결과까지 네 단계가 모두 학생 대시보드(/student)에 있다.
 *
 * 예전에는 응시 존 헤더 둘째 줄의 탭(접수하기 · 응시하기 · 정답과 해설 · 결과보기)이었다.
 * 같은 일을 하는 화면이 대시보드에도 있어 넷을 대시보드로 모았고, 이름도 대시보드 메뉴
 * (components/account/DashShell.tsx의 studentMenu)와 같게 적는다. 진단 안내(/exam/info)가
 * 이 차례를 그대로 읽는다 — 안내에 적힌 단계와 메뉴가 같은 이름이어야 읽은 대로 누를 수 있다.
 */
export const examSteps = [
  { href: "/student/apply", label: "진단 접수" },
  { href: "/student/exams", label: "내 진단" },
  { href: "/student/answers", label: "정답과 해설" },
  { href: "/student/results", label: "진단 결과" },
];
