import ReviewQueue from "./ReviewQueue";

export const metadata = { title: "문항 검수" };

/*
 * EXP-03 문항 검수 — 넘어온 문항의 목록.
 *
 * 실제 검수(3단 짚기 · 사유 코드 · 승인/반려)는 문항 상세의 오른쪽 검수판에서 한다.
 * 목록에서 승인 단추를 열지 않는 까닭은 ReviewQueue.tsx 머리 주석에 적어 두었다.
 */
export default function Admin2ReviewPage() {
  return <ReviewQueue />;
}
