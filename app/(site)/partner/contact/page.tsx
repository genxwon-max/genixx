import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "기관 도입 문의",
  description: "교육청·학교·학원·영재교육원 대상 도입 문의. (PUB-07-1)",
};

const benefits = [
  {
    t: "학급·학년 집단 리포트",
    d: "분포와 강세 영역을 집단 단위로 확인합니다. 최소 인원 미만 집단은 재식별 방지를 위해 통계를 제공하지 않습니다.",
  },
  {
    t: "교사 관찰 설문 연동",
    d: "담당 교사가 12문 모듈을 입력하면 학생·학부모 응답과 함께 4원 검증 축이 완성됩니다.",
  },
  {
    t: "응시권·일정 관리",
    d: "응시권 구매·배정·회수, 고사실 배정, 실시간 진행 모니터링을 기관 콘솔에서 처리합니다.",
  },
  {
    t: "동의 범위 준수",
    d: "학생 개인 상세 데이터는 학부모가 동의한 범위 안에서만 열람할 수 있습니다.",
  },
];

const steps = [
  { t: "문의 접수", d: "아래 양식으로 기관 정보와 대상 인원을 알려 주세요." },
  { t: "사전 협의", d: "담당자가 1~2 영업일 안에 연락드려 일정과 범위를 협의합니다." },
  { t: "시범 운영", d: "한 학급 규모로 먼저 운영하며 문항 이독성과 운영 동선을 점검합니다." },
  { t: "정식 도입", d: "응시권 배정과 교사 계정 승인 후 회차 단위로 운영합니다." },
];

export default function PartnerContactPage() {
  return (
    <>
      <PageHero
        eyebrow="PUB-07-1 · 기관 도입 문의"
        title={
          <>
            학교와 기관을 위한
            <br />
            단체 진단 운영
          </>
        }
        desc="교육청·학교·학원·영재교육원 단위로 도입할 수 있습니다. 파일럿 참여 기관에는 집단 리포트를 무상으로 제공합니다."
      />

      <section className="section-y">
        <div className="container-x">
          <ul className="grid gap-5 md:grid-cols-2">
            {benefits.map((b) => (
              <li key={b.t} className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
                <h2 className="type-h3 font-black text-brand-950">{b.t}</h2>
                <p className="type-body mt-2 text-slate-600">{b.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <h2 className="type-h2 font-black text-brand-950">도입 절차</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-brand-100 bg-white p-6">
                <span className="type-h4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 font-black text-white">
                  {i + 1}
                </span>
                <h3 className="type-h3 mt-4 font-black text-brand-950">{s.t}</h3>
                <p className="type-body mt-2 text-slate-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-y">
        <div className="container-x max-w-3xl">
          <h2 className="type-h2 font-black text-brand-950">도입 문의하기</h2>
          <p className="type-lead mt-3 text-slate-600">
            기관명과 대상 학년·인원을 함께 적어 주시면 상담이 빠릅니다.
          </p>
          <div className="mt-8">
            <InquiryForm
              categories={[
                "학교 도입 문의",
                "교육청·지자체 사업 문의",
                "학원·영재교육원 문의",
                "집단 리포트 문의",
                "기타 제휴 제안",
              ]}
              orgLabel="기관명"
              submitLabel="도입 문의 접수하기"
            />
          </div>
        </div>
      </section>
    </>
  );
}
