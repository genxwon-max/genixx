import Link from "next/link";
import BrandMark from "@/components/BrandMark";

/**
 * 잡지 문법 헤더. 한 층, 얇은 선 하나, 단추 하나.
 *
 * 메뉴는 사이트 전체의 일곱 갈래가 아니라 **이 한 장 안의 차례**다. 이 시안의
 * 첫 화면은 다른 곳으로 보내는 문이 아니라 끝까지 읽히는 기사여야 하고, 그래서
 * 헤더도 기사의 차례처럼 군다. 사이트의 나머지 갈래는 푸터에 있다.
 */
const chapters = [
  { href: "#who", label: "누구를 위해" },
  { href: "#what", label: "무엇을 재나" },
  { href: "#experts", label: "전문가단" },
  { href: "#how", label: "절차" },
  { href: "#faq", label: "자주 묻는 질문" },
];

export default function EdHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--paper)/92 backdrop-blur">
      <div className="ed-wrap flex h-[68px] items-center justify-between gap-6">
        <Link href="/home3" aria-label="GENIXX 홈" className="inline-flex items-center gap-2.5 text-(--ink)">
          <BrandMark className="h-6 w-auto" />
          <span className="font-brand text-[1.375rem] font-semibold leading-none tracking-[0.005em]">
            GENIXX
          </span>
        </Link>

        {/* 768~840px에서는 다섯 이름표가 들어갈 자리가 없어 낱말이 꺾였다. lg부터만 */}
        <nav aria-label="차례" className="hidden items-center gap-6 lg:flex">
          {chapters.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className="ed-small whitespace-nowrap font-medium text-(--ink-2) transition-colors hover:text-(--ink)"
            >
              {c.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="ed-small hidden font-medium text-(--ink-2) hover:text-(--ink) sm:block">
            로그인
          </Link>
          <Link href="/exam" className="ed-btn ed-btn-accent h-11 px-5 text-sm">
            무료 진단 시작
          </Link>
        </div>
      </div>
    </header>
  );
}
