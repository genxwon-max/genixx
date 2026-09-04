import ProductForm from "../ProductForm";

export const metadata = { title: "상품 등록" };

/**
 * PAY-01-1 상품 등록.
 *
 * 등록과 수정이 같은 폼(ProductForm)이다. 칸이 같고 검사도 같은데 화면을 둘로 두면
 * 칸을 하나 더할 때마다 두 곳을 고쳐야 하고, 언젠가 한쪽만 고친다.
 */
export default function Admin2ProductNewPage() {
  return <ProductForm />;
}
