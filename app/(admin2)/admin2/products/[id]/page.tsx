import ProductEdit from "./ProductEdit";

export const metadata = { title: "상품 수정" };

/**
 * PAY-01-1 상품 수정.
 *
 * 상품은 브라우저 저장소에만 있어 서버에서 읽지 못한다. 주소에서 상품 번호만 꺼내
 * 넘기고 안은 클라이언트가 그린다.
 */
export default async function Admin2ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* key를 상품 번호로 준다. 같은 경로 꼴 안에서 상품만 갈아 끼우면 React가 컴포넌트를
     그대로 두어, 앞 상품에서 채우던 칸이 다음 상품 화면에 그대로 남는다 */
  return <ProductEdit key={id} id={id} />;
}
