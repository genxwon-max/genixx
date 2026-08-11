import Link from "next/link";
import PageHero from "@/components/PageHero";
import { menu } from "@/lib/nav";
import { ArrowRight } from "@/components/Icons";

const tones = [
  "bg-surface-blue text-brand-700",
  "bg-surface-violet text-accent-600",
  "bg-surface-mint text-emerald-700",
  "bg-surface-amber text-amber-700",
  "bg-surface-sky text-brand-600",
];

export default function HubPage({
  groupId,
  title,
  desc,
}: {
  groupId: string;
  title: React.ReactNode;
  desc: string;
}) {
  const group = menu.find((g) => g.id === groupId)!;

  return (
    <>
      <PageHero
        eyebrow={`${group.id} · ${group.label}`}
        title={title}
        desc={desc}
        primary={{ label: "평가 시작하기", href: "/exam" }}
        secondary={{ label: "샘플 리포트 보기", href: "/sample" }}
      />

      <section className="section-y">
        <div className="container-x">
          <ul className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {group.children.map((child, i) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float md:p-7"
                >
                  <span
                    className={`type-tag inline-flex w-fit rounded-full px-3 py-1 ${tones[i % tones.length]}`}
                  >
                    {child.id}
                  </span>
                  <h2 className="type-h3 mt-4 font-black text-brand-950">{child.label}</h2>
                  <p className="type-body mt-2 flex-1 text-slate-600">{child.desc}</p>
                  <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    자세히 보기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
