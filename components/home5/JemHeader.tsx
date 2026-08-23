import Link from "next/link";
import Jempy from "@/components/home5/Jempy";

/**
 * 잼 파인더 헤더 — 떠 있는 알약 한 줄.
 *
 * 2026년 소비자 화면의 관행: 화면 위에 붙은 반투명 알약, 안에 로고·차례·단추 하나.
 * 차례는 이 한 장의 구간이다(사이트의 나머지 갈래는 푸터). 폰은 <details>로 연다.
 * 헤더 단추는 옅은 단추 — 첫 화면과 마지막 띠의 채움 단추와 한 화면에 겹치지 않게.
 */
const chapters = [
  { href: "#map", label: "재능 지도" },
  { href: "#report", label: "리포트" },
  { href: "#how", label: "진행 방법" },
  { href: "#who", label: "누가 정하나" },
  { href: "#name", label: "잼피와 이름" },
  { href: "#faq", label: "궁금한 점" },
];

export default function JemHeader() {
  return (
    <header className="sticky top-0 z-50 pt-4">
      <div className="jm-wrap">
        <div className="relative flex h-16 items-center justify-between gap-4 rounded-full border border-(--j-line) bg-white/85 pl-4 pr-2 shadow-[var(--j-shadow)] backdrop-blur-md">
          <Link href="/home5" aria-label="잼 파인더 홈" className="flex h-12 items-center gap-2">
            <Jempy pose="hi" compact className="h-10 w-10" label="" />
            <span className="jm-h4 leading-none text-(--j-ink)">잼 파인더</span>
            <span className="jm-tiny hidden rounded-full bg-(--j-soft) px-2 py-0.5 font-bold text-(--j-primary) md:inline">
              by GENIXX
            </span>
          </Link>

          <nav aria-label="차례" className="hidden items-center gap-1 lg:flex">
            {chapters.map((c) => (
              <a
                key={c.href}
                href={c.href}
                className="jm-small inline-flex h-11 items-center rounded-full px-4 font-bold text-(--j-ink-2) transition-colors hover:bg-(--j-soft) hover:text-(--j-primary)"
              >
                {c.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="jm-small hidden h-11 items-center px-3 font-bold text-(--j-ink-2) hover:text-(--j-ink) sm:inline-flex">
              로그인
            </Link>
            <Link href="/exam" className="jm-btn jm-btn-soft jm-btn-sm hidden sm:inline-flex">
              무료로 보석 찾기
            </Link>
            <details className="jm-menu lg:hidden">
              <summary className="jm-btn jm-btn-soft jm-btn-sm cursor-pointer px-4">
                <span className="jm-menu-closed">메뉴</span>
                <span className="jm-menu-open">닫기</span>
              </summary>
              <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-[1.5rem] border border-(--j-line) bg-white p-3 shadow-[var(--j-shadow-up)]">
                <nav aria-label="전체 차례" className="grid gap-1">
                  {chapters.map((c) => (
                    <a key={c.href} href={c.href} className="jm-body rounded-2xl px-4 py-3 font-bold text-(--j-ink) hover:bg-(--j-soft)">
                      {c.label}
                    </a>
                  ))}
                  <Link href="/exam" className="jm-btn jm-btn-primary mt-2 sm:hidden">
                    무료로 보석 찾기
                  </Link>
                  <Link href="/login" className="jm-btn jm-btn-soft sm:hidden">
                    로그인
                  </Link>
                </nav>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
