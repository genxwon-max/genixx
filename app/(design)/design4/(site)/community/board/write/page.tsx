import type { Metadata } from "next";
import PageTitle from "@/components/design4/community/PageTitle";
import BoardWrite from "@/components/design4/community/BoardWrite";

export const metadata: Metadata = { title: "글쓰기 · 자유게시판" };

export default function BoardWritePage() {
  return (
    <section>
      <div>
        <PageTitle title="글쓰기" />
        <BoardWrite />
      </div>
    </section>
  );
}
