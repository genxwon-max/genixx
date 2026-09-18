import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "./Icons";
import SectionTabs from "./site/SectionTabs";

type Props = {
  eyebrow: string;
  title: ReactNode;
  desc: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  children?: ReactNode;
};

/** 화면 이름 띠. 바로 밑에 같은 갈래의 탭 줄이 따라 선다(갈래 밖 화면에서는 안 그린다) */
export default function PageHero({ eyebrow, title, desc, primary, secondary, children }: Props) {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#f2f6ff] to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-accent-100/70 blur-2xl"
        />
        {/* 화면 이름 띠 — 본문보다 앞서 화면을 다 차지하지 않게 높이와 글자를 한 단계 낮춰 둔다 */}
        <div className="container-x relative py-10 md:py-14">
          <p className="type-eyebrow inline-flex items-center rounded-full bg-white px-3 py-1 text-brand-700 shadow-card">
            {eyebrow}
          </p>
          <h1 className="type-h2 mt-3 max-w-3xl font-black text-brand-950">{title}</h1>
          <p className="type-body mt-2 max-w-2xl text-slate-600">{desc}</p>
          {(primary || secondary) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {primary && (
                <Link
                  href={primary.href}
                  className="btn btn-md bg-brand-900 text-white shadow-card hover:bg-brand-800"
                >
                  {primary.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {secondary && (
                <Link
                  href={secondary.href}
                  className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
                >
                  {secondary.label}
                </Link>
              )}
            </div>
          )}
          {children}
        </div>
      </section>
      <SectionTabs />
    </>
  );
}
