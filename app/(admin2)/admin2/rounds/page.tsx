import RoundsView from "./RoundsView";

export const metadata = { title: "평가 회차" };

/*
 * ADM-05 평가 회차.
 *
 * 회차 상태 · 응시 기간 · 편성은 브라우저 저장소가 들고 있어(lib/roundPlanStore.ts ·
 * lib/formStore.ts) 서버에서 읽으면 씨앗값만 나온다. 그 값을 그리는 것은 표뿐이고,
 * 표가 제 몫의 클라이언트 경계를 들고 있다.
 */
export default function Admin2Rounds() {
  return <RoundsView />;
}
