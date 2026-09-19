import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { questionCountText } from "@/lib/exam";
import { Aside, Chapter, NextStep, Rows } from "@/components/site/Article";

const title = "학력진단 (무료)";
const lead =
  "국어(언어)·수학·과학 3과목을 과목별로 따로 풀어 지금의 이해 수준을 확인합니다. 회원가입 후 바로 이용할 수 있는 무료 진단입니다.";

export const metadata: Metadata = { title, description: lead };

const steps = [
  {
    t: "동의",
    d: "진단 윤리 헌장의 핵심을 먼저 읽고, 간단히 동의합니다.",
  },
  {
    t: "응시",
    d: `국어·수학·과학을 과목마다 따로 풉니다(${questionCountText()}, 과목당 40분). 세 과목을 모두 마쳐야 제출됩니다.`,
  },
  {
    t: "결과",
    d: "AI가 먼저 분석하고, 전문가가 확인해 승인하면 결과가 나옵니다.",
  },
];

/** PUB-03-1 */
export default function AcademicPage() {
  return (
    <>
      <SubHero href="/service/academic" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter no="01" title="결과지에서 보는 것">
          <Rows
            items={[
              {
                t: "과목별 이해 수준",
                d: "학년 성취기준에 비추어 지금 어디쯤 와 있는지 보여 드립니다.",
              },
              {
                t: "같은 학년 안에서의 위치",
                d: "같은 학년 응시자 전체의 분포 안에서 어디쯤인지 알려 드립니다.",
              },
              {
                t: "다음에 공부할 것",
                d: "아직 덜 잡힌 개념을 골라, 다음에 볼 내용을 세 줄로 짚어 드립니다.",
              },
            ]}
          />
        </Chapter>

        <Chapter no="02" title="진행 순서" lead="가입부터 결과까지 세 단계입니다.">
          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-4 md:block">
                <span className="type-h2 w-8 shrink-0 font-black leading-none tabular-nums text-brand-200">
                  {i + 1}
                </span>
                <div className="md:mt-3">
                  <h3 className="type-h4 font-bold text-brand-950">{s.t}</h3>
                  <p className="type-body mt-1.5 text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <Aside>
            학력진단은 재능진단으로 들어가는 입구입니다. 성적과 재능은 서로 다른 축이라, 학력 결과만
            보고 재능을 판단하지 않습니다.
          </Aside>
        </Chapter>

        <NextStep
          text="가입하면 바로 풀 수 있습니다."
          href="/exam"
          label="무료 학력진단 시작하기"
        />
      </div>
    </>
  );
}
