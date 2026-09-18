import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { legalLinks } from "@/lib/nav";
import LinkCards from "@/components/site/LinkCards";

export const metadata: Metadata = {
  title: "정책·법적 고지",
  description: "이용약관, 개인정보처리방침, 아동용 눈높이 고지, AI 이용 고지, 환불 규정.",
};

export default function LegalPage() {
  return (
    <>
      <SubHero
        href="/legal"
        title="정책·법적 고지"
        lead="아동 데이터를 다루는 서비스이므로 수집 범위·보관 기간·파기 절차를 명시하고, 아이가 직접 읽을 수 있는 고지문도 따로 제공합니다."
      />

      <section className="section-y">
        <div className="container-x">
          <LinkCards items={legalLinks} cta="문서 보기" />
        </div>
      </section>
    </>
  );
}
