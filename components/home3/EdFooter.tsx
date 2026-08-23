import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { legalLinks, menu } from "@/lib/nav";
import { company } from "@/lib/site";

/**
 * 잡지의 판권면처럼 — 워드마크 하나, 사이트 지도, 법정 표기.
 *
 * 소개 문단과 단추는 두지 않는다. 바로 위 테라코타 띠가 이미 같은 단추 둘을
 * 놓고 있고, 거기에 또 놓으면 한 화면에 같은 단추가 넷이 된다. 사이트의 일곱
 * 갈래는 자식까지 전부 싣는다 — 헤더가 이 장의 차례만 맡으므로 사이트 지도는
 * 여기가 유일한 자리다. 법정 표기는 lib/site에서 읽는다.
 */
export default function EdFooter() {
  return (
    <footer className="border-t border-(--line)">
      <div className="ed-wrap py-12 lg:py-16">
        <span className="inline-flex items-center gap-2 text-(--ink)">
          <BrandMark className="h-5 w-auto" />
          <span className="font-brand text-[1.125rem] font-semibold leading-none">GENIXX</span>
        </span>

        <nav
          aria-label="사이트 갈래"
          className="mt-10 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5"
        >
          {menu.map((g) => (
            <div key={g.id}>
              <Link href={g.href} className="ed-serif text-[0.9375rem] font-bold text-(--ink) hover:text-(--accent)">
                {g.label}
              </Link>
              <ul className="mt-3 space-y-1.5">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="ed-small text-(--ink-2) hover:text-(--ink)">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-(--line)">
        <div className="ed-wrap flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="ed-small text-(--ink-2)">
            {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.bizNo}
            <br />
            {company.address} · {company.email}
            <br />© 2026 {company.name}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {legalLinks.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className="ed-small font-medium text-(--ink-2) hover:text-(--ink)">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
