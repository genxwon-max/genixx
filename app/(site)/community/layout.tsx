import SectionTabs from "@/components/site/SectionTabs";

/**
 * 커뮤니티(PUB-09) 머리 — 배너 제목 밑에 탭 줄을 두고, 칸마다 가운데 제목을 세운다.
 * 공지사항·자유게시판·오시는 길이 한 갈래라는 것이 탭 줄로 보이게 한다.
 */
export default function CommunityLayout({ children }: LayoutProps<"/community">) {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#f2f6ff] to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-accent-100/70 blur-2xl"
        />
        <div className="container-x relative py-10 text-center md:py-14">
          <p className="type-eyebrow text-brand-500">COMMUNITY</p>
          <p className="type-h2 mt-2 font-black text-brand-950">커뮤니티</p>
          <p className="type-body mt-2 text-slate-600">
            공지와 이야기, 찾아오시는 길을 한자리에 모았습니다.
          </p>
        </div>
      </section>
      <SectionTabs />
      {children}
    </>
  );
}
