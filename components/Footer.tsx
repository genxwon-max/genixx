import Link from "next/link";
import Logo from "./Logo";
import { company } from "@/lib/site";
import { legalLinks, menu } from "@/lib/nav";
import { stockSources } from "@/lib/stock";

export default function Footer() {
  const sources = stockSources();

  return (
    <footer className="mt-auto border-t border-brand-100 bg-brand-50/60">
      <div className="container-x grid gap-10 py-12 lg:grid-cols-[300px_1fr] lg:gap-14 lg:py-16">
        <div>
          <Logo />
          <p className="type-body mt-4 max-w-sm text-slate-600">
            GENIXX는 학력과 재능을 서로 다른 축으로 진단하고, AI 1차 분석을 교육전문가가 협진으로
            확정하는 재능 진단 플랫폼입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/exam"
              className="btn btn-sm bg-brand-900 font-medium text-white hover:bg-brand-800"
            >
              무료 학력진단 시작
            </Link>
            <Link
              href="/partner/contact"
              className="btn btn-sm border border-brand-200 bg-white font-medium text-brand-800 hover:border-brand-400"
            >
              기관 도입 문의
            </Link>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {menu.slice(0, 4).map((group) => (
            <div key={group.id}>
              <h2 className="type-h4 font-bold text-slate-900">{group.label}</h2>
              <ul className="mt-4 space-y-2.5">
                {group.children.map((child) => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="type-meta text-slate-600 transition-colors hover:text-brand-700"
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container-x grid gap-8 border-t border-brand-100 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {menu.slice(4).map((group) => (
          <div key={group.id}>
            <h2 className="type-h4 font-bold text-slate-900">{group.label}</h2>
            <ul className="mt-4 space-y-2.5">
              {group.children.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className="type-meta text-slate-600 transition-colors hover:text-brand-700"
                  >
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="type-h4 font-bold text-slate-900">정책·법적 고지</h2>
          <ul className="mt-4 space-y-2.5">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="type-meta text-slate-600 transition-colors hover:text-brand-700"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="type-h4 font-bold text-slate-900">고객지원</h2>
          <ul className="type-meta mt-4 space-y-2.5 text-slate-600">
            <li>
              <a href={`tel:${company.tel.replace(/-/g, "")}`} className="font-bold text-brand-800">
                {company.tel}
              </a>
            </li>
            <li>{company.hours}</li>
            <li>
              <a href={`mailto:${company.email}`} className="transition-colors hover:text-brand-700">
                {company.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-100">
        <div className="container-x type-caption flex flex-col gap-2 py-6 text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.bizNo} · {company.address}
          </p>
          <div className="flex flex-col gap-1 md:items-end">
            <p>© {new Date().getFullYear()} GENIXX. All rights reserved.</p>
            {sources.length > 0 && (
              <p>
                사진 제공:{" "}
                {sources.map((s, i) => (
                  <span key={s.name}>
                    {i > 0 && ", "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline transition-colors hover:text-brand-700"
                    >
                      {s.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
