import Link from "next/link";
import PageHero from "@/components/PageHero";
import { menu } from "@/lib/nav";
import { ArrowRight } from "@/components/Icons";


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
        eyebrow={group.label}
        title={title}
        desc={desc}
        primary={{ label: "평가 시작하기", href: "/exam" }}
        secondary={{ label: "샘플 리포트 보기", href: "/sample" }}
      />

      <section className="section-y">
        <div className="container-x">
          <ul className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {group.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float md:p-7"
                >
                  {/* 카드 위에 화면 ID 알약을 달아 두었다가 걷었다. 사이트를 보러 온
                      사람에게 「PUB-06-1」은 아무 뜻이 없고, 제목이 이미 그 자리를 한다 */}
                  <h2 className="type-h3 font-black text-brand-950">{child.label}</h2>
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
