import SecurityView from "./SecurityView";

export const metadata = { title: "응시 화면 보호" };

/*
 * ADM-05-3 응시 화면 보호 — 응시 화면의 글 복사 · 오른쪽 클릭 막기 · 응시자 표시 겹치기를 켜고 끈다.
 *
 * 9월 27일 옛 콘솔(/admin/rounds/security)을 걷어 낼 때 함께 사라졌다가 2026-10-28 다시 세웠다. 그동안
 * 설정은 남아 응시 화면이 읽고 있었지만 바꿀 자리가 없었다.
 */
export default function Admin2SecurityPage() {
  return <SecurityView />;
}
