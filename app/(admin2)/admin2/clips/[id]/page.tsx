import ClipEdit from "./ClipEdit";

export const metadata = { title: "홍보 영상 상세" };

/*
 * ADM-15-2-1 홍보 영상 상세.
 *
 * `new`도 이 주소로 온다 — 거는 화면과 고치는 화면이 같은 칸을 쓴다. 번호는 저장할 때
 * 받는다(ClipEdit).
 */
export default async function Admin2ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClipEdit key={id} id={id} />;
}
