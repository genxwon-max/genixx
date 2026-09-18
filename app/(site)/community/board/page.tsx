import type { Metadata } from "next";
import PageTitle from "@/components/community/PageTitle";
import BoardList from "@/components/community/BoardList";

export const metadata: Metadata = {
  title: "자유게시판",
  description: "보호자·기관 회원이 진단 준비와 양육 경험을 나누는 자리입니다. (PUB-09-2)",
};

export default function BoardPage() {
  return (
    <section className="section-y">
      <div className="container-x max-w-5xl">
        <PageTitle
          title="자유게시판"
          lead="보호자·기관 회원이 진단 준비와 양육 경험을 나누는 자리입니다."
        />
        <BoardList />
      </div>
    </section>
  );
}
