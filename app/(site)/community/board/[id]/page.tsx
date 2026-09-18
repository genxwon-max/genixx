import BoardView from "@/components/community/BoardView";

export const metadata = { title: "자유게시판" };

export default async function BoardPostPage({ params }: PageProps<"/community/board/[id]">) {
  const { id } = await params;
  return (
    <section className="section-y">
      <div className="container-x max-w-4xl">
        <BoardView id={id} />
      </div>
    </section>
  );
}
