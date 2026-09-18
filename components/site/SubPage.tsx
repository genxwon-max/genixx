import Link from "next/link";
import { notFound } from "next/navigation";
import Blocks from "./Blocks";
import SectionTabs from "./SectionTabs";
import { legalGroup, siteMenu } from "@/lib/nav";
import { pageContent } from "@/lib/pageContent";
import { ArrowRight } from "@/components/Icons";

/** 이 화면이 속한 갈래 — 현재 위치 줄에 이름을 쓴다 */
function groupOf(href: string) {
  return [...siteMenu, legalGroup].find((g) => href.startsWith(`${g.href}/`)) ?? null;
}

export default function SubPage({ href }: { href: string }) {
  const content = pageContent[href];
  if (!content) notFound();

  const group = groupOf(href);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
        <div className="container-x py-10 md:py-14">
          <nav aria-label="현재 위치" className="type-meta flex flex-wrap items-center gap-2 text-slate-500">
            <Link href="/" className="hover:text-brand-700">
              홈
            </Link>
            <span aria-hidden>›</span>
            {group && <span>{group.label}</span>}
            <span aria-hidden>›</span>
            <span className="font-medium text-brand-700">{content.title}</span>
          </nav>
          {/* 화면 ID 알약을 걷었다 — 정의서의 번호는 만드는 사람의 말이지 읽는 사람의
              말이 아니다. 제목 위에 붙여 두면 그것부터 읽힌다 */}
          <h1 className="type-h2 mt-3 max-w-3xl font-black text-brand-950">{content.title}</h1>
          <p className="type-body mt-2 max-w-2xl text-slate-600">{content.lead}</p>
        </div>
      </section>

      {/* 형제 화면은 왼쪽 목록 대신 머리 밑 탭 줄로 오간다 — 갈래 첫 화면과 같은 모양 */}
      <SectionTabs />

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
              <Link
                href="/exam"
                className="btn btn-md bg-brand-900 text-white hover:bg-brand-800"
              >
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
