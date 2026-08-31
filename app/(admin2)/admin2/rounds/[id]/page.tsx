import RoundPlanView from "./RoundPlanView";

export const metadata = { title: "회차 편성" };

/**
 * ADM-05-4 회차 편성 — 문항을 짜 넣고, 기간을 정하고, 회차를 연다.
 *
 * 편성 · 검사지 · 개폐 기록이 모두 브라우저 저장소에 있어 서버에서 읽지 못한다.
 * 이 파일은 주소에서 회차 번호만 꺼내 넘긴다.
 */
export default async function Admin2RoundPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* key를 회차 번호로 준다 — 회차만 갈아 끼울 때 앞 회차에서 고치던 기간 값이 다음
     회차 화면의 날짜 칸에 그대로 남는 것을 막는다. */
  return <RoundPlanView key={id} id={id} />;
}
