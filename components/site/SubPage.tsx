import { notFound } from "next/navigation";
import Blocks from "./Blocks";
import SubHero from "./SubHero";
import { NextStep } from "./Article";
import { pageContent } from "@/lib/pageContent";

export default function SubPage({ href }: { href: string }) {
  const content = pageContent[href];
  if (!content) notFound();

  return (
    <>
      <SubHero href={href} title={content.title} lead={content.lead} />

      <div className="container-x section-y">
        <Blocks blocks={content.blocks} />
        {/* 다 읽은 자리의 다음 걸음 — 권유 상자 대신 한 문장 */}
        <div className="mt-12 md:mt-16">
          <NextStep
            text="국어·수학·과학 3과목으로 아이의 지금을 먼저 확인해 보세요."
            href="/exam"
            label="무료 학력진단 시작하기"
          />
        </div>
      </div>
    </>
  );
}
