import type { Metadata } from "next";
import PageTitle from "@/components/design4/community/PageTitle";
import NoticeList from "@/components/design4/community/NoticeList";

export const metadata: Metadata = {
  title: "공지사항",
  description: "회차 일정과 점검 안내를 알려 드립니다. (PUB-09-1)",
};

export default function NoticePage() {
  return (
    <section>
      <div>
        <PageTitle title="공지사항" />
        <NoticeList />
      </div>
    </section>
  );
}
