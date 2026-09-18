import NoticeView from "@/components/community/NoticeView";

export const metadata = { title: "공지사항" };

export default async function NoticeDetailPage({ params }: PageProps<"/community/notice/[id]">) {
  const { id } = await params;
  return (
    <section className="section-y">
      <div className="container-x max-w-4xl">
        <NoticeView id={id} />
      </div>
    </section>
  );
}
