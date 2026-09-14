import FaqDetail from "./FaqDetail";

export const metadata = { title: "자주 묻는 질문 상세" };

/* `new`도 이 주소로 온다 — 만드는 화면과 고치는 화면이 같은 칸을 쓴다 */
export default async function Admin2FaqDetailPage({ params }: PageProps<"/admin2/faq/[id]">) {
  const { id } = await params;
  return <FaqDetail key={id} id={id} />;
}
