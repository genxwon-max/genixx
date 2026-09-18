/**
 * 응시 존 메뉴 목록.
 *
 * 서버 레이아웃(app/(exam)/layout.tsx)과 클라이언트 메뉴(ExamTabs · ExamRail)가 함께 읽으므로
 * "use client" 파일 밖에 둔다 — 클라이언트 모듈에서 내보낸 배열은 서버에서 펼칠 수 없다.
 */

/**
 * 헤더 둘째 줄의 응시 메뉴 — 접수하기 · 응시하기 · 정답과 해설 · 결과보기.
 * 과목 판(/exam/[회차]/[학년])은 응시하기 안의 화면이라 응시하기에 불을 켠다.
 */
export const examMenu = [
  { href: "/exam/apply", label: "접수하기" },
  { href: "/exam", label: "응시하기" },
  { href: "/exam/answers", label: "정답과 해설" },
  { href: "/exam/report", label: "결과보기" },
];

/**
 * 헤더 첫 줄에서 응시 존 안에 머무는 안내 — 누르면 사이트로 나가지 않고 이 레이아웃
 * 안에서 열려, 아래 응시 메뉴와 오른쪽 리모컨이 그대로 남는다.
 */
export const examGuideLinks = [
  { href: "/exam/guide", label: "서비스 안내" },
  { href: "/exam/info", label: "시험 안내" },
];
