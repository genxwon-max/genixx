import RoundsView from "./RoundsView";

export const metadata = { title: "회차·응시" };

/*
 * ADM-05 회차·응시.
 *
 * 회차 상태 · 응시 기간 · 편성은 브라우저 저장소가 들고 있어(lib/roundPlanStore.ts ·
 * lib/formStore.ts) 서버에서 읽으면 씨앗값만 나온다. 이 파일은 문서 제목만 달고 안은
 * 클라이언트가 그린다 — 한 화면 안에서 표는 「응시 진행중」, 머리는 「준비중」이라고
 * 말하는 일을 없애려는 것이다.
 */
export default function Admin2Rounds() {
  return <RoundsView />;
}
