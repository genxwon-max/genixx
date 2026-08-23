import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { legalLinks, menu } from "@/lib/nav";
import { company } from "@/lib/site";

/**
 * 공공기관 문법 푸터 — 정보가 많은 세 층.
 *
 *  1) 사이트 지도: 여섯 갈래의 자식을 전부 싣는다. 헤더의 큰 메뉴와 같은 목록이지만
 *     푸터에서 다시 한 번 — 공공 누리집의 관행이고, 접근성 면에서도 끝에 있는 것이
 *     맞다.
 *  2) 정책 줄: 개인정보처리방침은 굵게(개인정보보호법 제30조 — 누구나 쉽게 확인할 수 있게 공개).
 *  3) 기관 표기: 회사명·대표·사업자등록번호·주소·대표 전화·운영 시간. lib/site.
 */
export default function GovFooter() {
  return (
    <footer className="border-t-2 border-(--g-navy) bg-(--g-bg)">
      <div className="gv-wrap py-10 lg:py-12">
        <nav
          id="sitemap"
          aria-label="사이트 지도"
          className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5"
        >
          {menu.map((g) => (
            <div key={g.id}>
              <Link href={g.href} className="gv-head text-[0.9375rem] text-(--g-ink) hover:text-(--g-blue)">
                {g.label}
              </Link>
              <ul className="mt-3 space-y-1.5">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="gv-small text-(--g-ink-2) hover:text-(--g-blue) hover:underline">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-y border-(--g-line)">
        <div className="gv-wrap flex min-h-12 items-center py-3">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {legalLinks.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.href}
                  className={`gv-small hover:underline ${
                    l.id === "PUB-08-2" ? "font-bold text-(--g-blue-2)" : "font-medium text-(--g-ink-2)"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a href="#sitemap" className="gv-small font-medium text-(--g-ink-2) hover:underline">
                사이트맵
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="gv-wrap flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <BrandMark className="mt-0.5 h-5 w-auto shrink-0 text-(--g-ink-3)" />
          <div>
            <p className="font-brand text-[1rem] font-semibold leading-none text-(--g-ink-2)">GENIXX</p>
            <p className="gv-small mt-3 text-(--g-ink-2)">
              {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.bizNo}
              <br />
              {company.address}
              <br />
              대표 전화 {company.tel} ({company.hours}) · {company.email}
            </p>
            <p className="gv-small mt-3 text-(--g-ink-3)">© 2026 {company.name}. All rights reserved.</p>
          </div>
        </div>
        <p className="gv-small max-w-sm text-(--g-ink-3)">
          TalentMe는 GENIXX가 운영하는 재능 진단의 이름입니다. 결과는 아이를 규정하는 등급이 아니라 이번 회차에
          관찰된 행동의 기록이며, 회차가 바뀌면 바뀔 수 있습니다.
        </p>
      </div>
    </footer>
  );
}
