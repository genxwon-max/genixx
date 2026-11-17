import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Headset } from "lucide-react";
import SubHero from "@/components/design4/site/SubHero";
import { company } from "@/lib/site";
import { d4LegalDocs, d4LegalGroups } from "@/lib/design4Legal";

export const metadata: Metadata = {
  title: "정책·법적 고지",
  description: "이용약관, 개인정보처리방침, 아동용 고지, AI 이용 고지, 환불 규정, 전자금융거래 이용약관, 지식재산보호정책.",
};

/**
 * /design4 정책 모음 — 문서 열 가지를 세 묶음(약관 · 거래 / 개인정보 · 아동 보호 / 권리 보호)으로 나눠
 * 시행일과 함께 목록으로 보인다. 공공 · 교육 기관 누리집의 「정책 모음」 화면처럼 카드보다 목록이 찾기 빠르다.
 */
export default function LegalPage() {
  return (
    <>
      <SubHero
        href="/design4/legal"
        title="정책·법적 고지"
        lead="모두의재능은 아동의 정보를 다루는 서비스입니다. 무엇을 모으고 언제 지우는지, 결제와 환불은 어떻게 되는지, 진단 문항과 리포트는 어떻게 보호되는지 조문으로 모두 공개합니다."
      />

      <div className="space-y-12">
        {d4LegalGroups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-4 flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.02em] text-slate-900">
              <span aria-hidden className="h-5 w-1 rounded-full bg-[var(--d4-blue)]" />
              {g}
            </h2>
            <ul className="border-t-2 border-slate-800">
              {d4LegalDocs
                .filter((d) => d.group === g)
                .map((d) => (
                  <li key={d.slug} className="border-b border-slate-200">
                    <Link
                      href={`/design4/legal/${d.slug}`}
                      className="group flex items-center gap-4 px-2 py-5 transition-colors hover:bg-slate-50 md:px-4"
                    >
                      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--d4-blue-soft)] text-[var(--d4-blue)] sm:flex">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[16px] font-bold text-slate-900 group-hover:text-[var(--d4-blue)]">{d.label}</b>
                        <span className="mt-1 block text-[13.5px] leading-snug text-slate-500">{d.desc}</span>
                      </span>
                      <span className="hidden shrink-0 text-[13px] text-slate-500 md:block">시행 {d.effective}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="mt-12 flex items-start gap-4 rounded-[22px] bg-[var(--d4-tint)] p-6 md:p-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--d4-blue)] ring-1 ring-slate-200">
          <Headset className="h-5 w-5" />
        </span>
        <div className="text-[14px] leading-[1.75] text-slate-600">
          <p className="text-[15.5px] font-bold text-slate-900">개인정보 보호책임자 · 청소년보호 책임자</p>
          <p className="mt-1">
            {company.ceo} (대표이사) · {company.tel} · {company.email}
          </p>
          <p>{company.hours}</p>
        </div>
      </aside>
    </>
  );
}
