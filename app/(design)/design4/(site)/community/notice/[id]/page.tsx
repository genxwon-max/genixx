import NoticeView from "@/components/design4/community/NoticeView";

export const metadata = { title: "공지사항" };

export default async function NoticeDetailPage({ params }: PageProps<"/design4/community/notice/[id]">) {
  const { id } = await params;
  return (
    <section>
      <div>
        <NoticeView id={id} />
      </div>
    </section>
  );
}
