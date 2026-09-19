import type { Metadata } from "next";
import Link from "next/link";
import SubHero from "@/components/site/SubHero";
import PersonAvatar from "@/components/site/PersonAvatar";
import { Chapter } from "@/components/site/Article";
import { people, peopleGroups, peopleOf } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";

export const metadata: Metadata = {
  title: "참여진 소개",
  description:
    "진단 설계·AI 개발·문항 출제·평가 판정에 참여하는 전문가와 각자의 역할, 이력을 공개합니다. (PUB-02-5)",
};

export default function TeamPage() {
  return (
    <>
      <SubHero
        href="/about/team"
        title="참여진 소개"
        lead="진단을 설계한 사람, AI를 만든 사람, 문항을 쓴 사람, 결과를 판정하는 사람을 밝힙니다. 이해충돌을 막으려 만드는 권한과 검증하는 권한을 나눠 두었습니다."
      />

      <div className="container-x section-y">
        {/* 네 직무 바로가기 — 누르면 그 구간으로 내려간다. 설명은 구간 머리에 한 번만 쓴다 */}
        <nav aria-label="직무별 바로가기">
          <ul className="flex flex-wrap gap-x-7 gap-y-3 border-y border-brand-100 py-4">
            {peopleGroups.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="type-h4 flex items-center gap-2 font-bold text-brand-950 hover:text-brand-700"
                >
                  <span className={`h-2 w-2 rounded-full ${g.dot}`} aria-hidden />
                  {g.label}
                  <span className="type-meta font-medium text-slate-500">
                    {peopleOf(g.id).length}명
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-14 md:mt-20">
          {peopleGroups.map((g, gi) => (
            <Chapter
              key={g.id}
              id={g.id}
              no={String(gi + 1).padStart(2, "0")}
              title={g.label}
              lead={g.desc}
            >
              <ul className="border-b border-brand-100">
                {peopleOf(g.id).map((p) => (
                  <li key={p.id} className="border-t border-brand-100">
                    <Link
                      href={`/about/team/${p.id}`}
                      className="group flex items-start gap-4 py-5 sm:gap-5"
                    >
                      <PersonAvatar person={p} size={56} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2.5">
                          <span className="type-h4 font-bold text-brand-950 group-hover:text-brand-700">
                            {p.name}
                          </span>
                          <span className="type-meta text-slate-500">
                            {p.role} · {p.org}
                          </span>
                        </p>
                        <p className="type-body mt-1 text-slate-700">{p.headline}</p>
                        <p className="type-meta mt-1.5 text-brand-600">{p.tags.join(" · ")}</p>
                      </div>
                      <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Chapter>
          ))}

          <Chapter
            no={String(peopleGroups.length + 1).padStart(2, "0")}
            title="역할 분리 원칙"
            lead="같은 사람이 만들고 같은 사람이 검증하면 오류가 걸러지지 않습니다. GENIXX는 아래 네 가지 경계를 계정 권한 수준에서 분리합니다."
          >
            <ul className="border-b border-brand-100">
              {[
                { t: "출제자 ↔ 검수자", d: "문항을 쓴 사람은 자신의 문항을 승인할 수 없습니다." },
                {
                  t: "개발자 ↔ 검증자",
                  d: "AI 모델을 만든 사람은 그 모델의 편향을 검증하지 않습니다.",
                },
                { t: "채점자 ↔ 판정자", d: "1차 채점과 최종 판정을 다른 인력이 담당합니다." },
                { t: "판정 ↔ 발행", d: "판정 확정과 리포트 발행 승인을 분리해 기록합니다." },
              ].map((r) => (
                <li
                  key={r.t}
                  className="grid gap-1 border-t border-brand-100 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
                >
                  <h3 className="type-h4 font-bold text-brand-950">{r.t}</h3>
                  <p className="type-body text-slate-600">{r.d}</p>
                </li>
              ))}
            </ul>
            <p className="type-body mt-8 text-slate-600">
              총 {people.length}명이 한 회차에 참여하며, 판정 근거와 확정자 기록은 회차별로
              보존됩니다.{" "}
              <Link
                href="/about/hitl"
                className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900"
              >
                진단 원리 자세히 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </Chapter>
        </div>
      </div>
    </>
  );
}
