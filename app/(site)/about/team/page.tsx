import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import PersonCard from "@/components/site/PersonCard";
import SectionHead from "@/components/site/SectionHead";
import { people, peopleDisclaimer, peopleGroups, peopleOf } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";

export const metadata: Metadata = {
  title: "참여진 소개",
  description:
    "진단 설계·AI 개발·문항 출제·평가 판정에 참여하는 전문가와 각자의 역할, 이력을 공개합니다. (PUB-02-5)",
};

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="PUB-02-5 · 연구·자문진"
        title={
          <>
            누가 만들었고
            <br />
            누가 판정하는지 공개합니다
          </>
        }
        desc="진단 도구를 설계한 사람, AI를 만든 사람, 문항을 쓴 사람, 결과를 판정하는 사람을 각각 밝힙니다. 이해충돌을 막기 위해 만든 사람과 검증하는 사람의 권한은 구조적으로 분리되어 있습니다."
        primary={{ label: "진단 원리 보기", href: "/about/hitl" }}
      />

      <section className="section-y">
        <div className="container-x">
          <p className="type-meta rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-4 text-amber-900">
            {peopleDisclaimer}
          </p>

          {/* 역할 요약 */}
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
            {peopleGroups.map((g) => (
              <li
                key={g.id}
                className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card"
              >
                <span className={`type-tag inline-flex rounded-full px-3 py-1 ${g.tone}`}>
                  {g.label}
                </span>
                <p className="type-body mt-3.5 text-slate-600">{g.desc}</p>
                <p className="type-meta mt-3 font-bold text-brand-700">
                  {peopleOf(g.id).length}명 참여
                </p>
              </li>
            ))}
          </ul>

          {/* 그룹별 인물 */}
          {peopleGroups.map((g) => (
            <div key={g.id} id={g.id} className="mt-14 scroll-mt-28">
              <div className="flex items-center gap-3 border-b border-brand-100 pb-4">
                <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} aria-hidden />
                <h2 className="type-h2 font-black text-brand-950">{g.label}</h2>
                <span className="type-meta text-slate-500">{peopleOf(g.id).length}명</span>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
                {peopleOf(g.id).map((p) => (
                  <li key={p.id}>
                    <PersonCard person={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section-y bg-brand-50/50">
        <div className="container-x">
          <SectionHead
            title="역할 분리 원칙"
            lead="같은 사람이 만들고 같은 사람이 검증하면 오류가 걸러지지 않습니다. GENIXX는 아래 네 가지 경계를 계정 권한 수준에서 분리합니다."
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5">
            {[
              { t: "출제자 ↔ 검수자", d: "문항을 쓴 사람은 자신의 문항을 승인할 수 없습니다." },
              { t: "개발자 ↔ 검증자", d: "AI 모델을 만든 사람은 그 모델의 편향을 검증하지 않습니다." },
              { t: "채점자 ↔ 판정자", d: "1차 채점과 최종 판정을 다른 인력이 담당합니다." },
              { t: "판정 ↔ 발행", d: "판정 확정과 리포트 발행 승인을 분리해 기록합니다." },
            ].map((r) => (
              <li key={r.t} className="rounded-3xl border border-brand-100 bg-white p-6 md:p-7">
                <h3 className="type-h3 font-black text-brand-950">{r.t}</h3>
                <p className="type-body mt-2 text-slate-600">{r.d}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-white p-6 shadow-card md:p-7">
            <div>
              <p className="type-h3 font-black text-brand-950">
                총 {people.length}명이 한 회차에 참여합니다
              </p>
              <p className="type-body mt-2 text-slate-600">
                판정 근거와 확정자 기록은 회차별로 보존됩니다.
              </p>
            </div>
            <Link href="/about/hitl" className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
              진단 원리 자세히 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
