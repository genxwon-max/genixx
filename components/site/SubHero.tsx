import Link from "next/link";
import { legalGroup, siteMenu } from "@/lib/nav";
import SectionTabs from "./SectionTabs";

const groups = [...siteMenu, legalGroup];

/**
 * 하위 화면의 머리 — 현재 위치 줄 · 화면 이름 · 한두 줄 설명, 그 밑에 갈래 탭 줄.
 *
 * 탭을 옮겨 다닐 때 머리 높이가 흔들리지 않게 칸마다 줄 수를 미리 잡아 둔다.
 * 설명이 한 줄인 화면과 두 줄인 화면을 오가면 탭 줄과 본문이 위아래로 튀기 때문이다.
 *   넓은 화면  제목 1줄 · 설명 2줄
 *   좁은 화면  제목 2줄 · 설명 3줄
 * 글자보다 적게 잡으면 그만큼 늘어날 뿐 잘리지는 않는다. 그래서 설명은 넓은 화면에서
 * 두 줄(max-w-2xl로 약 90자) 안에 들게 쓴다. 제목 위 알약·버튼·강제 줄바꿈을 두지
 * 않는 것도 같은 까닭이다 — 형제 화면으로 가는 길은 탭 줄이, 다음 걸음은 본문이 맡는다.
 */
export default function SubHero({
  href,
  title,
  lead,
}: {
  href: string;
  title: string;
  lead: string;
}) {
  const group = groups.find((g) => href === g.href || href.startsWith(`${g.href}/`));
  const here = group?.children.find((c) => href === c.href || href.startsWith(`${c.href}/`));

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-[#f4f7ff] to-white">
        <div className="container-x py-10 md:py-14">
          {/* 한 줄로 고정 — 넘치면 끝을 줄인다 */}
          <nav
            aria-label="현재 위치"
            className="type-meta flex items-center gap-2 whitespace-nowrap text-slate-500"
          >
            <Link href="/" className="hover:text-brand-700">
              홈
            </Link>
            {group && (
              <>
                <span aria-hidden>›</span>
                <span className={here ? undefined : "font-medium text-brand-700"}>
                  {group.label}
                </span>
              </>
            )}
            {here && (
              <>
                <span aria-hidden>›</span>
                <span className="truncate font-medium text-brand-700">{here.label}</span>
              </>
            )}
          </nav>
          <h1 className="type-h2 mt-3 min-h-[2lh] max-w-3xl font-black text-brand-950 md:min-h-[1lh]">
            {title}
          </h1>
          <p className="type-body mt-2 min-h-[3lh] max-w-2xl text-slate-600 md:min-h-[2lh]">
            {lead}
          </p>
        </div>
      </section>
      <SectionTabs />
    </>
  );
}
