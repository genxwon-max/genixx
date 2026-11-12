import { notFound } from "next/navigation";
import Blocks from "./Blocks";
import SubHero from "./SubHero";
import { NextStep } from "./Article";
import { pageContent } from "@/lib/pageContent";

/** /design4 글 화면 — 공개 사이트 SubPage와 같은 글(lib/pageContent)을 design4 모양으로 편다 */
export default function SubPage({ href }: { href: string }) {
  const content = pageContent[href];
  if (!content) notFound();

  return (
    <>
      <SubHero href={href} title={content.title} lead={content.lead} />
      <Blocks blocks={content.blocks} />
      <div className="mt-14">
        <NextStep
          text="국어·수학·과학 3과목으로 아이의 지금을 먼저 확인해 보세요."
          href="/exam"
          label="무료 학력진단 시작하기"
        />
      </div>
    </>
  );
}
