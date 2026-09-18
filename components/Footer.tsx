import Link from "next/link";
import Logo from "./Logo";
import PolicyBar from "./PolicyBar";
import { company } from "@/lib/site";
import { siteMenu } from "@/lib/nav";

/**
 * 공개 존 푸터.
 *
 * 맨 위에 정책 띠를 눕히고 그 아래로 갈래별 링크와 회사 정보를 쌓는다. 예전에는
 * 정책·법적 고지를 다른 갈래와 같은 모양의 칸으로 세웠는데, 그러면 「이용약관」이
 * 「샘플 리포트」와 같은 무게로 읽힌다. 계정 존 푸터와 같은 띠를 쓰므로 두 존을
 * 오가도 정책으로 가는 길이 늘 같은 자리에 있다.
 */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-100 bg-brand-50/60">
      <PolicyBar tone="site" />

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
          {siteMenu.slice(0, 4).map((group) => (
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
        {siteMenu.slice(4).map((group) => (
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
          <p>© {new Date().getFullYear()} GENIXX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
