import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PersonAvatar from "@/components/site/PersonAvatar";
import { groupOf, people, peopleDisclaimer, peopleOf, personById } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";

export function generateStaticParams() {
  return people.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/about/team/[id]">): Promise<Metadata> {
  const { id } = await params;
  const person = personById(id);
  if (!person) return {};
  return {
    title: `${person.name} · ${person.role}`,
    description: person.headline,
  };
}

export default async function PersonPage({ params }: PageProps<"/about/team/[id]">) {
  const { id } = await params;
  const person = personById(id);
  if (!person) notFound();

  const group = groupOf(person.group);
  const siblings = peopleOf(person.group).filter((p) => p.id !== person.id);

  return (
    <>
      <section className="border-b border-brand-100 bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
        <div className="container-x section-y">
          <nav aria-label="현재 위치" className="type-meta flex flex-wrap items-center gap-2 text-slate-500">
            <Link href="/about" className="hover:text-brand-700">
              GENIXX 소개
            </Link>
            <span aria-hidden>›</span>
            <Link href="/about/team" className="hover:text-brand-700">
              참여진
            </Link>
            <span aria-hidden>›</span>
            <span className="font-medium text-brand-700">{person.name}</span>
          </nav>

          <div className="mt-7 flex flex-wrap items-start gap-6">
            <PersonAvatar person={person} size={96} className="shadow-card" />
            <div className="min-w-0 flex-1">
              <span className={`type-tag inline-flex rounded-full px-3 py-1 ${group.tone}`}>
                {group.label}
              </span>
              <h1 className="type-h1 mt-3 font-black text-brand-950">{person.name}</h1>
              <p className="type-lead mt-2 font-bold text-brand-700">{person.role}</p>
              <p className="type-meta mt-1 text-slate-500">{person.org}</p>
              <p className="type-lead mt-5 max-w-2xl text-slate-600">{person.headline}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {person.tags.map((t) => (
                  <li
                    key={t}
                    className="type-tag rounded-full bg-white px-3 py-1.5 text-brand-700 shadow-card"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-14">
          <div className="space-y-10">
            <div>
              <h2 className="type-h2 font-black text-brand-950">소개</h2>
              <p className="type-lead mt-4 text-slate-600">{person.bio}</p>
            </div>

            <div>
              <h2 className="type-h2 font-black text-brand-950">주요 이력</h2>
              <ol className="mt-5 space-y-3">
                {person.career.map((c, i) => (
                  <li
                    key={c}
                    className="flex gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-card"
                  >
                    <span className="type-caption flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">
                      {person.career.length - i}
                    </span>
                    <p className="type-body text-slate-700">{c}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="type-h2 font-black text-brand-950">GENIXX에서 만든 것</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {person.works.map((w) => (
                  <li
                    key={w}
                    className="type-body rounded-2xl border border-brand-100 bg-white p-5 text-slate-700 shadow-card"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
              <h2 className="type-h4 font-black text-brand-950">회차에서 맡는 일</h2>
              <ul className="mt-4 space-y-2.5">
                {person.duty.map((d) => (
                  <li key={d} className="type-meta flex gap-2.5 text-slate-600">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${group.dot}`} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {siblings.length > 0 && (
              <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                <h2 className="type-h4 font-black text-brand-950">같은 파트 참여진</h2>
                <ul className="mt-4 space-y-1">
                  {siblings.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/about/team/${s.id}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50"
                      >
                        <PersonAvatar person={s} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="type-h4 block truncate font-bold text-brand-950">
                            {s.name}
                          </span>
                          <span className="type-caption block truncate text-slate-500">
                            {s.role}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="type-caption rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-4 text-amber-900">
              {peopleDisclaimer}
            </p>

            <Link
              href="/about/team"
              className="btn btn-md w-full border border-brand-200 text-brand-800 hover:bg-brand-50"
            >
              참여진 전체 보기
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
