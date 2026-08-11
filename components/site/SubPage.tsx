import Link from "next/link";
import { notFound } from "next/navigation";
import Blocks from "./Blocks";
import { menu, legalLinks, type SubMenu } from "@/lib/nav";
import { pageContent } from "@/lib/pageContent";
import { ArrowRight } from "@/components/Icons";

/** 형제 페이지 목록 — 좌측 서브 내비게이션에 사용 */
function siblingsOf(href: string): { label: string; items: SubMenu[] } | null {
  const group = menu.find((g) => href.startsWith(`${g.href}/`));
  if (group) return { label: group.label, items: group.children };
  if (href.startsWith("/legal/")) return { label: "정책·법적 고지", items: legalLinks };
  return null;
}

export default function SubPage({ href }: { href: string }) {
  const content = pageContent[href];
  if (!content) notFound();

  const siblings = siblingsOf(href);

  return (
    <>
      <section className="border-b border-brand-100 bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
        <div className="container-x section-y">
          <nav aria-label="현재 위치" className="type-meta flex flex-wrap items-center gap-2 text-slate-500">
            <Link href="/" className="hover:text-brand-700">
              홈
            </Link>
            <span aria-hidden>›</span>
            {siblings && <span>{siblings.label}</span>}
            <span aria-hidden>›</span>
            <span className="font-medium text-brand-700">{content.title}</span>
          </nav>
          <p className="type-eyebrow mt-5 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-brand-700 shadow-card">
            {content.id}
          </p>
          <h1 className="type-h1 mt-4 max-w-3xl font-black text-brand-950">{content.title}</h1>
          <p className="type-lead mt-4 max-w-2xl text-slate-600">{content.lead}</p>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[230px_1fr] lg:gap-14">
          {siblings && (
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <p className="type-eyebrow px-3 text-slate-400">{siblings.label}</p>
              <ul className="mt-3 space-y-0.5">
                {siblings.items.map((s) => {
                  const active = s.href === href;
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        aria-current={active ? "page" : undefined}
                        className={`type-body block rounded-xl px-3 py-2.5 transition-colors ${
                          active
                            ? "bg-brand-50 font-bold text-brand-800"
                            : "text-slate-600 hover:bg-brand-50/60 hover:text-brand-700"
                        }`}
                      >
                        {s.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}

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
