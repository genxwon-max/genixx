import NoticeDetail from "./NoticeDetail";

export const metadata = { title: "공지 상세" };

/*
 * ADM-15 공지 상세.
 *
 * `new`도 이 주소로 온다 — 만드는 화면과 고치는 화면이 같은 칸을 쓰므로 둘로 가르면
 * 같은 폼을 두 곳에서 그리게 된다. 번호는 저장할 때 받는다(NoticeDetail).
 */
export default async function Admin2NoticeDetailPage({ params }: PageProps<"/admin2/notices/[id]">) {
  const { id } = await params;
  return <NoticeDetail key={id} id={id} />;
}
