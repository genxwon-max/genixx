import type { Metadata } from "next";
import PageTitle from "@/components/community/PageTitle";
import BoardWrite from "@/components/community/BoardWrite";

export const metadata: Metadata = { title: "글쓰기 · 자유게시판" };

export default function BoardWritePage() {
  return (
    <section className="section-y">
      <div className="container-x max-w-4xl">
        <PageTitle title="글쓰기" />
        <BoardWrite />
      </div>
    </section>
  );
}
