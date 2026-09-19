import Logo from "./Logo";
import PolicyBar from "./PolicyBar";
import { company } from "@/lib/site";

/**
 * 공개 존 푸터 — 회색 정책 띠 한 줄과 회사 정보만 둔다.
 *
 * 예전에는 갈래별 링크 일곱 칸과 소개 문구·버튼·고객지원 칸까지 쌓았는데, 헤더와
 * 탭 줄이 이미 같은 길을 다 내고 있어 푸터가 사이트맵을 한 번 더 그리는 셈이었다.
 * 국내 기관·교육 사이트가 흔히 쓰는 모양대로 「정책 띠 → 로고 → 주소 → 사업자 정보
 * → 연락처 → 저작권」 순으로 줄인다.
 */
export default function Footer() {
  const sep = (
    <span aria-hidden className="mx-2.5 text-slate-300">
      |
    </span>
  );

  return (
    <footer className="mt-auto bg-slate-100">
      <PolicyBar tone="band" />

      <div className="container-x py-10 text-[13px] leading-relaxed text-slate-500 md:py-12">
        <Logo tone="ink" className="text-[1.375rem]" />

        <address className="mt-5 not-italic">{company.address}</address>
        <p className="mt-1.5">
          <b className="font-bold text-slate-700">상호</b> {company.name}
          {sep}
          <b className="font-bold text-slate-700">대표</b> {company.ceo}
          {sep}
          <b className="font-bold text-slate-700">사업자등록번호</b> {company.bizNo}
          {sep}
          <b className="font-bold text-slate-700">통신판매업 신고번호</b> {company.mailOrderNo}
        </p>
        <p className="mt-1.5">
          <b className="font-bold text-slate-700">TEL</b>{" "}
          <a href={`tel:${company.tel.replace(/-/g, "")}`} className="hover:text-slate-700">
            {company.tel}
          </a>
          {sep}
          <b className="font-bold text-slate-700">FAX</b> {company.fax}
          {sep}
          <b className="font-bold text-slate-700">E-mail</b>{" "}
          <a href={`mailto:${company.email}`} className="hover:text-slate-700">
            {company.email}
          </a>
        </p>
        <p className="mt-4">
          Copyright © {new Date().getFullYear()} {company.enName} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
