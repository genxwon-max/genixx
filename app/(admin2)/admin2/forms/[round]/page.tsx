import RoundFormsView from "./RoundFormsView";

export const metadata = { title: "회차 문항 편성" };

/*
 * ADM-04-3 평가별 문항관리 — 한 회차의 검사지를 과목 탭으로 편다.
 *
 * 회차·검사지·문항이 전부 브라우저 저장소라(lib/roundPlanStore.ts · formStore.ts ·
 * itemStore.ts) 서버에서 회차 이름조차 확실히 알 수 없다. 여기서는 주소에서 회차 번호와
 * 처음 열 과목만 꺼내 넘긴다.
 *
 * `?subject=`는 목록의 과목 꼬리표가 붙여 보내는 값이다 — 표에서 「수학 3」을 누르면 그
 * 검사지가 열린 채로 이 화면이 뜬다. 없거나 이 회차에 없는 과목이면 첫 과목을 연다.
 */
export default async function Admin2RoundFormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ round: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { round } = await params;
  const { subject } = await searchParams;
  /* key를 회차 번호로 준다 — 회차만 갈아 끼울 때 앞 회차에서 고르던 문항 체크가 다음
     회차 화면에 그대로 남는 것을 막는다 */
  return <RoundFormsView key={round} id={round} subject={subject} />;
}
