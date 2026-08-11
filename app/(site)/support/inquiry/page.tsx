import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import PageHero from "@/components/PageHero";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "1:1 문의",
  description: "비회원도 이메일 인증으로 문의할 수 있습니다. (PUB-06-2)",
};

export default function InquiryPage() {
  return (
    <>
      <PageHero
        eyebrow="PUB-06-2 · 1:1 문의"
        title="문의를 남겨 주세요"
        desc="영업일 기준 1~2일 안에 답변드립니다. 회원이 아니어도 이메일 인증만으로 접수할 수 있습니다."
      />

      <section className="section-y">
        <div className="container-x grid max-w-5xl gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <InquiryForm
              categories={[
                "진단 내용 문의",
                "응시 중 오류 신고",
                "결과 해석 문의",
                "개인정보·동의 관련",
                "결제·환불 문의",
                "기타",
              ]}
              orgLabel="소속 (선택)"
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
              <p className="type-eyebrow text-brand-500">대표전화</p>
              <a
                href={`tel:${company.tel.replace(/-/g, "")}`}
                className="type-h3 mt-1.5 block font-black text-brand-900"
              >
                {company.tel}
              </a>
              <p className="type-meta mt-1.5 text-slate-500">{company.hours}</p>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
              <p className="type-eyebrow text-brand-500">이메일</p>
              <a
                href={`mailto:${company.email}`}
                className="type-h4 mt-1.5 block font-black text-brand-900"
              >
                {company.email}
              </a>
              <p className="type-meta mt-1.5 text-slate-500">24시간 접수 · 순차 답변</p>
            </div>
            <div className="rounded-2xl bg-brand-50/70 p-6">
              <p className="type-h4 font-black text-brand-900">응시 중 오류인가요?</p>
              <p className="type-meta mt-2 text-slate-600">
                응시 화면에서 발생한 문제는 회차·과목·문항 번호를 함께 적어 주시면 훨씬 빠르게 확인할
                수 있습니다.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
