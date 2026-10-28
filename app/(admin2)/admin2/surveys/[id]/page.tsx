import SurveyDetail from "./SurveyDetail";

export const metadata = { title: "설문지 상세" };

/*
 * ADM-14 설문 한 벌 — 주소의 열쇠는 갈래-학년대(guardian-e34)다(lib/surveyStore.ts의 surveySlugOf).
 *
 * ⚠ key를 열쇠로 준다. 같은 경로 꼴 안에서 벌만 갈아 끼우면 React가 조각을 그대로 두어, 앞 벌에서
 *   열어 둔 탭 · 읽어 둔 파일이 다음 벌에 그대로 남는다.
 */
export default async function Admin2SurveyPage({ params }: PageProps<"/admin2/surveys/[id]">) {
  const { id } = await params;
  return <SurveyDetail key={id} slug={id} />;
}
