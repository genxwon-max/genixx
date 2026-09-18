import Link from "next/link";
import { notFound } from "next/navigation";
import Blocks from "./Blocks";
import SubHero from "./SubHero";
import { pageContent } from "@/lib/pageContent";
import { ArrowRight } from "@/components/Icons";

export default function SubPage({ href }: { href: string }) {
  const content = pageContent[href];
  if (!content) notFound();

  return (
    <>
      <SubHero href={href} title={content.title} lead={content.lead} />

      <section className="section-y">
        <div className="container-x">
          <div>
            <Blocks blocks={content.blocks} />

            <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-brand-50/70 p-6 md:p-7">
              <div>
                <p className="type-h3 font-black text-brand-950">
                  무료 학력진단으로 먼저 확인해 보세요
                </p>
                <p className="type-body mt-2 text-slate-600">
                  국어·수학·과학 3과목, 각 4문항이면 충분합니다.
                </p>
              </div>
              <Link href="/exam" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
                평가 시작하기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
