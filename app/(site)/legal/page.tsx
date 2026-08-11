import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { legalLinks } from "@/lib/nav";
import { ArrowRight } from "@/components/Icons";

export const metadata: Metadata = {
  title: "정책·법적 고지",
  description: "이용약관, 개인정보처리방침, 아동용 눈높이 고지, AI 이용 고지, 환불 규정.",
};

export default function LegalPage() {
  return (
    <>
      <PageHero
        eyebrow="PUB-08 · 정책·법적 고지"
        title={
          <>
            무엇을 모으고 어떻게 쓰는지
            <br />
            숨기지 않습니다
          </>
        }
        desc="아동 데이터를 다루는 서비스이므로 수집 범위·보관 기간·파기 절차를 명시하고, 아이가 직접 읽을 수 있는 고지문도 따로 제공합니다."
      />

      <section className="section-y">
        <div className="container-x">
          <ul className="grid gap-4 md:grid-cols-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-7 shadow-card transition-shadow hover:shadow-float"
                >
                  <span className="type-tag w-fit rounded-full bg-brand-50 px-3 py-1 text-brand-700">
                    {l.id}
                  </span>
                  <h2 className="type-h3 mt-4 font-black text-brand-950">{l.label}</h2>
                  <p className="type-body mt-2 flex-1 text-slate-600">
                    {l.desc}
                  </p>
                  <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    문서 보기
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
