import type { Metadata } from "next";
import SubHero from "@/components/site/SubHero";
import { Chapter } from "@/components/site/Article";

const title = "진단 원리 — AI 1차 분석 + 전문가 협진";
const lead =
  "AI는 판정하지 않습니다. AI가 1차 분석을 제안하고, 교육전문가가 협진으로 확정합니다. 진단 검사에서의 '의사 협진'이라고 이해하시면 됩니다.";

export const metadata: Metadata = { title, description: lead };

const flow = [
  {
    who: "AI",
    t: "1차 분석",
    d: "지필·SJT·설문·면담 4개 정보원을 정량·정성으로 분석해 제안값을 만듭니다.",
  },
  {
    who: "사람",
    t: "전문가 협진 판정",
    d: "교육과정 전문가와 계량심리 실무자가 케이스 회의에서 제안값을 승인하거나 조정합니다.",
  },
  {
    who: "사람",
    t: "리포트 승인",
    d: "승인 전에는 학부모 화면에 어떤 결과도 노출되지 않습니다.",
  },
];

const checkpoints = [
  {
    t: "저신뢰 자동 라우팅",
    d: "AI 채점 신뢰도가 기준 미만인 문항은 자동으로 사람에게 배정됩니다.",
  },
  {
    t: "이중 채점·일치도 추적",
    d: "인간 2인 독립 채점 표본으로 AI–인간 일치도를 지속 확인합니다.",
  },
  {
    t: "경계선 유보",
    d: "판정 컷 경계에 있는 사례는 확정하지 않고 다음 회차 재관찰로 넘깁니다.",
  },
  {
    t: "이해충돌 방지",
    d: "출제자와 검수자, 개발자와 검증자의 계정 권한을 구조적으로 분리합니다.",
  },
];

/**
 * PUB-02-2 — 결과가 확정되기까지를 한 줄 흐름으로 그리고, AI가 맡는 칸과 사람이 맡는
 * 칸을 색으로 가른다. 「AI는 제안, 사람이 확정」이 그림 한 장으로 읽히게.
 */
export default function HitlPage() {
  return (
    <>
      <SubHero href="/about/hitl" title={title} lead={lead} />

      <div className="container-x section-y">
        <Chapter
          no="01"
          title="결과가 확정되기까지"
          lead="AI가 제안하고, 사람이 판정하고, 사람이 승인해야 결과가 나갑니다."
        >
          <div className="relative">
            {/* 넓은 화면에서 세 단계를 잇는 가로줄 */}
            <span
              aria-hidden
              className="absolute left-4 right-[calc((100%-3rem)/3)] top-4 hidden h-px bg-brand-200 md:block"
            />
            <ol className="relative grid gap-8 md:grid-cols-3 md:gap-6">
              {flow.map((f, i) => {
                const ai = f.who === "AI";
                return (
                  <li key={f.t} className="relative flex gap-4 md:block">
                    <span
                      className={`type-h4 relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black ring-4 ring-white ${
                        ai ? "bg-accent-100 text-accent-600" : "bg-brand-900 text-white"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="md:mt-5">
                      <p className={`type-eyebrow ${ai ? "text-accent-600" : "text-brand-600"}`}>
                        {ai ? "AI가 제안" : "사람이 확정"}
                      </p>
                      <h3 className="type-h4 mt-1 font-bold text-brand-950">{f.t}</h3>
                      <p className="type-body mt-1.5 text-slate-600">{f.d}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Chapter>

        <Chapter
          no="02"
          title="사람이 반드시 개입하는 지점"
          lead="자동으로 흘러가다가도 아래 네 곳에서는 사람이 멈춰 세웁니다."
        >
          <ul className="border-b border-brand-100">
            {checkpoints.map((c) => (
              <li
                key={c.t}
                className="grid gap-1 border-t border-brand-100 py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6"
              >
                <h3 className="type-h4 font-bold text-brand-950">{c.t}</h3>
                <p className="type-body text-slate-600">{c.d}</p>
              </li>
            ))}
          </ul>
        </Chapter>
      </div>
    </>
  );
}
