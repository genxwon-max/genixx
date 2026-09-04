import ProductsView from "./ProductsView";

export const metadata = { title: "상품 관리" };

/*
 * PAY-01 상품 관리 — 파는 것의 목록.
 *
 * 이 콘솔이 파는 것은 물건이 아니라 응시권과 리포트다. 그래서 재고·배송·옵션 칸을 두지
 * 않고, 상품 하나가 답하는 것을 넷으로 줄였다 — 무엇인가 · 얼마인가 · 어떻게 보이는가 ·
 * 지금 파는가(lib/productStore.ts 머리 주석).
 *
 * 상품은 브라우저 저장소에만 있어 서버에서 세지 못한다. 머리·탭·표를 ProductsView
 * (클라이언트)가 맡고, 여기에는 문서 제목만 남는다.
 */
export default function Admin2ProductsPage() {
  return <ProductsView />;
}
