import TemplateDetail from "./TemplateDetail";

export const metadata = { title: "해석 템플릿 상세" };

/*
 * ADM-08-1 해석 템플릿 상세 — 한 칸의 문구를 쓰는 자리.
 *
 * 목록 아래에 판으로 펴서 고치던 것을 제 주소로 뺐다. 문구가 한두 문장이라 처음에는 목록에
 * 붙여 두는 편이 낫다고 보았는데, 두 가지가 걸렸다 —
 *
 *   ① 주소가 없어 「이 칸 좀 봐 달라」고 링크를 건넬 수가 없다. 문구는 여럿이 함께 다듬는
 *      글이라 그 왕복이 잦다(공지를 상세로 뺀 것과 같은 까닭).
 *   ② 이 콘솔의 다른 목록은 전부 상세로 간다. 템플릿만 목록에서 펴지면, 「고치기」를 눌렀을
 *      때 무엇이 일어날지가 화면마다 달라진다.
 *
 * 주소로 빼면서 얻은 것이 하나 더 있다. 목록에 붙어 있을 때는 표를 밀어내지 않으려고 판을
 * 좁게 써야 했는데, 이제 고쳐 온 자취와 라벨링 점검을 나란히 펼 자리가 생겼다.
 *
 * ⚠ 주소에 서는 열쇠는 top-e34-language-L3 꼴이다(lib/reportAssets.ts의 keyOf). 아무 글자나
 *   칠 수 있으므로 parseKey가 네 토막을 전부 확인하고, 모르는 값이면 「없는 칸」을 그린다 —
 *   격자에 없는 유령 칸이 저장되지 않게.
 *
 * ⚠ key를 열쇠로 준다. 같은 경로 꼴 안에서 칸만 갈아 끼우면 React가 조각을 그대로 두어,
 *   앞 칸에 쓰던 글이 다음 칸 화면에 그대로 남는다.
 */
export default async function Admin2ReportTemplatePage({
  params,
}: PageProps<"/admin2/reports/templates/[id]">) {
  const { id } = await params;
  return <TemplateDetail key={id} id={id} />;
}
