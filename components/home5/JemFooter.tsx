import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import Jempy from "@/components/home5/Jempy";
import { legalLinks, menu } from "@/lib/nav";
import { company } from "@/lib/site";

/**
 * 잼 파인더 푸터 — 잼피가 손을 흔들고, 사이트 갈래와 법정 표기.
 * 「잼 파인더」는 이 시안의 이름 제안이라, GENIXX가 운영한다는 줄을 반드시 남긴다.
 */
export default function JemFooter() {
  return (
    <footer className="mt-8 border-t border-(--j-line) bg-(--j-bg-2)">
      <div className="jm-wrap grid gap-12 py-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16 lg:py-16">
        <div className="flex items-start gap-4">
          <Jempy pose="wave" className="h-24 w-24 shrink-0" label="" />
          <div>
            <p className="jm-h3 leading-none text-(--j-ink)">잼 파인더</p>
            <p className="jm-small mt-2 text-(--j-ink-2)">
              GENIXX가 운영하는 초등 3~4학년 재능 진단의 새 이름 제안. 잼피는 이 시안의 상징 캐릭터예요.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-(--j-ink-2)">
              <BrandMark className="h-4 w-auto" />
              <span className="font-brand text-[0.9375rem] font-semibold leading-none">GENIXX</span>
            </span>
          </div>
        </div>

        <nav aria-label="사이트 갈래" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {menu.map((g) => (
            <div key={g.id}>
              <Link href={g.href} className="jm-small font-bold text-(--j-ink) hover:text-(--j-primary)">
                {g.label}
              </Link>
              <ul className="mt-3 space-y-2">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="jm-tiny text-(--j-ink-2) hover:text-(--j-primary)">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-(--j-line)">
        <div className="jm-wrap flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="jm-tiny text-(--j-ink-3)">
            {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.bizNo}
            <br />
            {company.address} · {company.email}
            <br />© 2026 {company.name}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((l) => (
              <li key={l.id}>
                <Link
                  href={l.href}
                  className={`jm-tiny hover:text-(--j-ink) ${l.id === "PUB-08-2" ? "font-bold text-(--j-ink)" : "font-medium text-(--j-ink-3)"}`}
                >
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
