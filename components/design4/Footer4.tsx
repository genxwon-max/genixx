import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import { policyLinks } from "@/lib/nav";
import { company } from "@/lib/site";
import { d4 } from "./paths";

/**
 * /design4 푸터 — 어두운 바탕 한 판. 위에 로고 · 주소 · 연락처 · 사업자 정보,
 * 가는 줄 아래에 정책 링크와 저작권. 정책 띠는 공개 사이트와 같은 목록(policyLinks)을 읽는다.
 */
export default function Footer4() {
  return (
    <footer className="bg-[#1f2228] text-[13px] leading-relaxed text-slate-400">
      <div className="d4-container py-10">
        <LogoLockup tone="white" className="text-[1.625rem]" />
        <address className="mt-5 not-italic">{company.address}</address>
        <p className="mt-1">
          이메일 : {company.email}
          <span className="mx-3 text-slate-600">|</span>
          대표전화 : {company.tel}
          <span className="mx-3 text-slate-600">|</span>
          FAX : {company.fax}
        </p>
        <p className="mt-1">
          상호 : {company.name}
          <span className="mx-3 text-slate-600">|</span>
          대표 : {company.ceo}
          <span className="mx-3 text-slate-600">|</span>
          사업자등록번호 : {company.bizNo}
          <span className="mx-3 text-slate-600">|</span>
          통신판매업 신고번호 : {company.mailOrderNo}
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {policyLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={d4(l.href)}
                  className={l.strong ? "font-bold text-white hover:underline" : "text-slate-300 hover:text-white"}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-slate-500">
            Copyright © {new Date().getFullYear()} {company.enName} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
