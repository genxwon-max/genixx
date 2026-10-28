import AuthoringView from "./AuthoringView";

export const metadata = { title: "문항 출제" };

/*
 * EXP-02 문항 출제.
 *
 * 문항은 브라우저 저장소에만 있어(lib/itemStore.ts) 서버에서 세지 못한다. 이 파일은
 * 껍데기만 두고 안을 클라이언트로 내린다 — 문항 은행(ADM-04)과 같은 꼴이다.
 *
 * ?similar=IT-2601,IT-2602 — 문항 은행에서 줄을 골라 「비슷한 문항 만들기」를 누르면 그 문항을 원본으로
 * 고른 채 AI 출제 판이 열린다.
 */
export default async function Admin2AuthoringPage({ searchParams }: PageProps<"/admin2/authoring">) {
  const { similar } = await searchParams;
  const ids = typeof similar === "string" && similar ? similar.split(",").filter(Boolean) : [];
  /* 다른 원본을 골라 다시 들어오면 판을 새로 세운다 — 앞에서 고른 것이 남지 않게 */
  return <AuthoringView key={ids.join(",")} similar={ids} />;
}
