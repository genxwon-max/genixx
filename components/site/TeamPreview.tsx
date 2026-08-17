import Link from "next/link";
import PersonAvatar from "./PersonAvatar";
import SectionHead from "./SectionHead";
import { people, peopleGroups, peopleOf } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";

/**
 * 홈에서 보여주는 참여진 요약.
 *
 * flat은 홍보 존(/home2)이 쓰는 각진 규격이다. 그 화면은 둥근 모서리와 그림자를
 * 걷어내고 실선으로만 칸을 나누는데, 이 구간만 알약과 그림자로 남으면 남의 집에서
 * 가져다 붙인 것처럼 보인다. 기존 첫 화면(/)은 그대로 두어야 해서 값으로 가른다.
 */
export default function TeamPreview({ flat = false }: { flat?: boolean }) {
  const card = flat
    ? "rounded-md border border-brand-200 bg-white transition-colors hover:border-brand-400"
    : "rounded-3xl border border-brand-100 bg-white shadow-card transition-shadow hover:shadow-float";

  const featured = peopleGroups
    .map((g) => peopleOf(g.id)[0])
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="section-y">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="참여진"
            title={
              <>
                누가 만들었고
                <br />
                누가 판정하는지 공개합니다
              </>
            }
            lead="진단을 설계한 연구진, AI를 만든 개발진, 문항을 쓴 출제·검수진, 결과를 확정하는 평가진까지. 만든 사람과 검증하는 사람의 권한은 구조적으로 분리되어 있습니다."
          />
          <Link
            href="/about/team"
            className={`${flat ? "btn-flat" : "btn"} btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400`}
          >
            참여진 전체 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {featured.map((p) => {
            const g = peopleGroups.find((x) => x.id === p.group)!;
            return (
              <li key={p.id}>
                <Link
                  href={`/about/team/${p.id}`}
                  className={`group flex h-full flex-col p-6 ${card}`}
                >
                  <div className="flex items-center gap-3.5">
                    <PersonAvatar person={p} size={56} />
                    <div className="min-w-0">
                      <p className="type-h3 font-black text-brand-950">{p.name}</p>
                      <p className="type-caption mt-0.5 truncate text-slate-500">{p.role}</p>
                    </div>
                  </div>
                  <span
                    className={`type-tag mt-4 w-fit px-2.5 py-1 ${flat ? "rounded-sm" : "rounded-full"} ${g.tone}`}
                  >
                    {g.label}
                  </span>
                  <p className="type-body mt-3 flex-1 text-slate-600">{p.headline}</p>
                  <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
                    프로필
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="type-caption mt-6 text-slate-400">
          한 회차에 총 {people.length}명이 참여하며, 판정 근거와 확정자 기록은 회차별로 보존됩니다.
        </p>
      </div>
    </section>
  );
}
