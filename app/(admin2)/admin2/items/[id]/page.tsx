import ItemDetail from "./ItemDetail";

export const metadata = { title: "문항 상세" };

/**
 * ADM-04-1 문항 상세 — 등록 · 수정 · 검수.
 *
 * 문항은 브라우저 저장소에만 있어 서버에서 읽지 못한다. 이 파일은 주소에서 문항
 * 번호만 꺼내 넘기고 안은 클라이언트가 그린다.
 */
export default async function Admin2ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* key를 문항 번호로 준다. 같은 경로 꼴 안에서 문항만 갈아 끼우면 React가 컴포넌트를
     그대로 두어, 앞 문항에서 쓰던 검수 체크와 메모가 다음 문항 화면에 그대로 남는다. */
  return <ItemDetail key={id} id={id} />;
}
