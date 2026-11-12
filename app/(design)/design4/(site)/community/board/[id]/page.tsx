import BoardView from "@/components/design4/community/BoardView";

export const metadata = { title: "자유게시판" };

export default async function BoardPostPage({ params }: PageProps<"/design4/community/board/[id]">) {
  const { id } = await params;
  return (
    <section>
      <div>
        <BoardView id={id} />
      </div>
    </section>
  );
}
