import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Chapter } from "@/components/site/Article";

const title = "진단 윤리 헌장";
const lead = "진단은 아이를 설명하기 위한 도구이지, 아이를 규정하기 위한 도구가 아닙니다.";

export const metadata: Metadata = { title, description: lead };

const promises = [
  {
    t: "줄 세우지 않습니다",
    d: "결과는 또래 서열이 아니라 해당 발달 단계 대비 위치로 제시합니다.",
  },
  {
    t: "단정하지 않습니다",
    d: "'이 아이는 ○○형'과 같은 명사형 라벨 대신 관찰된 행동을 서술합니다.",
  },
  {
    t: "부모를 평가하지 않습니다",
    d: "양육 관련 응답은 해석에만 사용하고 리포트에 출력하지 않습니다.",
  },
  {
    t: "아이에게도 설명합니다",
    d: "아이가 읽을 수 있는 문장으로 자기 데이터가 어떻게 쓰이는지 알립니다.",
  },
];

/** PUB-02-4 — 헌장 문구는 문서처럼 크게 싣고, 지키는 것은 조항처럼 번호를 붙여 읽힌다 */
export default function CharterPage() {
  return (
    <>
      <SubHero href="/about/charter" title={title} lead={lead} />

      <div className="container-x section-y">
        {/* 헌장 문구 — 어두운 상자 대신 큰 글씨와 인용 부호로 */}
        <figure className="mx-auto max-w-3xl pb-12 text-center md:pb-16">
          <span aria-hidden className="block h-10 font-serif text-7xl leading-none text-brand-300">
            &ldquo;
          </span>
          <blockquote className="type-h3 mt-2 font-bold leading-relaxed text-brand-950 md:text-[1.5rem]">
            발현되지 않은 재능은 진단할 수 없습니다.
            <br className="hidden sm:block" /> 점수가 낮은 영역은 약점이 아니라 아직 발현되지 않은
            영역입니다.
          </blockquote>
          <figcaption className="type-meta mt-5 text-slate-500">
            Article 7 · 라벨링 방지 원칙
            <span className="mt-1 block text-slate-400">
              이 문구는 헌장·동의서·리포트 세 곳에서 동일하게 노출됩니다.
            </span>
          </figcaption>
        </figure>

        <Chapter
          no="01"
          title="우리가 지키는 것"
          lead="결과를 만들고 전하는 모든 단계에서 지키는 네 가지입니다."
        >
          <ol className="border-b border-brand-100">
            {promises.map((p, i) => (
              <li key={p.t} className="flex gap-5 border-t border-brand-100 py-6 md:gap-8">
                <span className="type-h2 w-10 shrink-0 font-black tabular-nums leading-none text-brand-200">
                  {i + 1}
                </span>
                <div>
                  <h3 className="type-h4 font-bold text-brand-950">{p.t}</h3>
                  <p className="type-body mt-1.5 text-slate-600">{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Chapter>
      </div>
    </>
  );
}
