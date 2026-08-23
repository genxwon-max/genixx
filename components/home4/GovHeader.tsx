import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import GovGnb from "@/components/home4/GovGnb";
import { menu } from "@/lib/nav";
import { company } from "@/lib/site";

/**
 * 공공기관 문법 헤더 — 세 층.
 *
 *  1) 유틸 줄: 남색 바탕에 작은 글자. 계정 링크와 대표 전화.
 *  2) 본 줄: 상징·기관명, 큰 메뉴(여섯 갈래, GovGnb), 접수 단추.
 *  3) 큰 메뉴 판: GovGnb 안. :hover / :focus-within으로 열리고 Esc로 닫힌다.
 *
 * 폰에서는 <details>로 전체 메뉴를 여닫는다 — JS가 없다.
 */
export default function GovHeader() {
  return (
    <header className="relative z-50 bg-white">
      {/* 1) 유틸 줄 */}
      <div className="bg-(--g-navy) text-white">
        <div className="gv-wrap flex h-9 items-center justify-between gap-4">
          <p className="gv-small truncate text-white/85">GENIXX 재능진단 플랫폼 · TalentMe 공식 안내</p>
          <ul className="flex shrink-0 items-center divide-x divide-white/25">
            <li className="pr-3">
              <Link href="/login" className="gv-small text-white/90 hover:text-white">
                로그인
              </Link>
            </li>
            <li className="px-3">
              <Link href="/signup" className="gv-small text-white/90 hover:text-white">
                회원가입
              </Link>
            </li>
            <li className="hidden pl-3 sm:block">
              <a href={`tel:${company.tel.replace(/-/g, "")}`} className="gv-small text-white/90 hover:text-white">
                고객지원 {company.tel}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* 2) 본 줄 */}
      <div className="border-b border-(--g-line)">
        <div className="gv-wrap flex h-20 items-center justify-between gap-6">
          <Link href="/home4" aria-label="GENIXX 홈" className="flex shrink-0 items-center gap-3 text-(--g-blue-2)">
            <BrandMark className="h-7 w-auto" />
            <span className="flex flex-col leading-none">
              <span className="font-brand text-[1.5rem] font-semibold tracking-[0.005em]">GENIXX</span>
              <span className="gv-small mt-1 font-medium text-(--g-ink-2)">재능진단 플랫폼</span>
            </span>
          </Link>

          <GovGnb />

          <div className="flex shrink-0 items-center gap-3">
            {/* 375px에서는 워드마크·단추 둘이 335px에 안 들어간다. 같은 단추가 첫 화면에 있으니 sm부터만 */}
            <Link href="/exam" className="gv-btn gv-btn-blue hidden h-11 px-5 text-sm sm:inline-flex">
              접수 신청
            </Link>

            {/* 폰 메뉴 — details가 열림 상태를 스스로 알리므로 aria-label을 덧씌우지 않는다 */}
            <details className="gv-menu lg:hidden">
              <summary className="gv-btn gv-btn-line h-11 cursor-pointer px-3.5 text-sm">
                <span className="gv-menu-closed">전체 메뉴</span>
                <span className="gv-menu-open">닫기</span>
              </summary>
              <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-117px)] overflow-y-auto border-b border-(--g-line) bg-white shadow-[0_16px_32px_-16px_rgba(11,42,87,0.25)]">
                <nav aria-label="전체 메뉴" className="gv-wrap grid gap-x-6 gap-y-7 py-7 sm:grid-cols-2">
                  {menu.map((g) => (
                    <div key={g.id}>
                      <Link href={g.href} className="gv-head text-[1rem] text-(--g-blue-2)">
                        {g.label}
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {g.children.map((c) => (
                          <li key={c.id}>
                            <Link href={c.href} className="gv-body block text-(--g-ink-2)">
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
