"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoLockup } from "@/components/Logo";
import PolicyBar from "@/components/PolicyBar";
import { company } from "@/lib/site";

/**
 * 계정 존 껍데기 — 상단 유틸리티 바 + 헤더 + 푸터.
 *
 * 원본(3a)이 헤더에 글자크기 －／＋ 와 고대비 토글을 상시로 두라고 정했다.
 * WCAG 2.1 AA를 목표로 하고, 학부모가 모바일에서 먼저 본다는 전제(사이트맵 12장)라
 * 유틸리티 바는 좁은 화면에서 접근성 도구만 남긴다.
 *
 * 톤은 시안 2「둥글둥글」로 확정했다. 헤더 아래 굵은 남색 선을 옅은 실선으로 낮추고
 * 바탕을 연파랑으로 깐다. 고대비 토글은 globals.css의 .acc-high-contrast가 soft-* 변수까지
 * 함께 올려 주므로 그대로 동작한다.
 *
 * 푸터는 의뢰인이 보내 준 시안을 따른다 — 옅은 회색 판 위에 로고를 세우고 그 아래로
 * 주소 · 사업자 정보 · 연락처 · 저작권을 왼쪽 정렬로 쌓는다. 예전에는 짙은 남색 판에
 * 법적 고지 링크만 늘어놓았는데, 연파랑 바탕에 흰 카드가 떠 있는 화면 끝에 검은 띠가
 * 얹히면 그 띠가 제일 먼저 눈에 들어왔다.
 *
 * 값은 전부 lib/site.ts의 company에서 읽는다. 같은 정보를 운영 콘솔(/admin2/settings)도
 * 같은 자리에서 읽으므로, 상호나 번호가 바뀌면 그 파일 한 곳만 고치면 된다.
 *
 * 회사 정보 위에는 **정책 띠**를 한 줄 세운다. 저작권 줄 옆에 조그맣게 붙여 두었더니
 * 「덧붙인 것」으로 읽혔는데, 동의를 받는 화면에서 개인정보처리방침으로 가는 길은
 * 덧붙임이 아니다. 개인정보처리방침만 굵게 두는 것도 관행이 아니라 표시 의무다.
 */

const zoomSteps = [1, 1.125, 1.25] as const;

/** 「라벨 값」 한 쌍 — 라벨만 진하게 (시안의 대표 / 사업자등록번호 / TEL …) */
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      <b className="font-bold text-soft-ink">{label}</b> {children}
    </span>
  );
}

/** 항목 사이를 가르는 옅은 세로선 */
function Bar() {
  return (
    <span aria-hidden className="text-soft-line">
      |
    </span>
  );
}

export default function AccountChrome({ children }: { children: React.ReactNode }) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div
      className={`flex min-h-full flex-col bg-[#eef3fe] text-soft-ink ${
        highContrast ? "acc-high-contrast" : ""
      }`}
      style={{ ["--acc-zoom" as string]: zoomSteps[zoomIdx] }}
    >
      {/* 유틸리티 바 */}
      <div className="h-[2.375rem] border-b border-soft-line/60 bg-white/60">
        <div className="container-x flex h-[2.375rem] items-center justify-end gap-3 text-[12px] text-soft-muted">
          <Link href="/support/faq" className="hidden hover:underline sm:inline">
            본인인증 안내
          </Link>
          <span aria-hidden className="hidden text-soft-line sm:inline">
            |
          </span>
          <Link href="/support/inquiry" className="hidden hover:underline sm:inline">
            고객지원
          </Link>
          <span aria-hidden className="hidden text-soft-line sm:inline">
            |
          </span>

          <span className="flex items-center gap-1.5">
            글자크기
            <span className="inline-flex gap-[3px]">
              <button
                type="button"
                onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                aria-label="글자 작게"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-soft-line bg-white text-[11px] disabled:opacity-40"
              >
                －
              </button>
              <button
                type="button"
                onClick={() => setZoomIdx((i) => Math.min(zoomSteps.length - 1, i + 1))}
                disabled={zoomIdx === zoomSteps.length - 1}
                aria-label="글자 크게"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-soft-line bg-white text-[11px] disabled:opacity-40"
              >
                ＋
              </button>
            </span>
          </span>

          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            aria-pressed={highContrast}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
              highContrast
                ? "border-soft-ink bg-soft-ink text-white"
                : "border-soft-line bg-white text-soft-muted"
            }`}
          >
            고대비
          </button>
        </div>
      </div>

      {/* 헤더 */}
      <header className="border-b border-soft-line/70 bg-white">
        <div className="container-x flex h-[4.75rem] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <LogoLockup tone="soft" className="text-[1.25rem]" />
            <span className="hidden text-[13px] text-soft-muted sm:inline">재능진단 플랫폼</span>
          </Link>
          <nav className="hidden gap-8 text-[15px] font-semibold text-soft-ink lg:flex">
            <Link href="/service" className="hover:text-soft-primary">
              서비스 안내
            </Link>
            <Link href="/sample" className="hover:text-soft-primary">
              샘플 리포트
            </Link>
            <Link href="/about/team" className="hover:text-soft-primary">
              연구·자문진
            </Link>
            <Link href="/support" className="hover:text-soft-primary">
              고객지원
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-soft-line/70 bg-[#f4f5f7]">
        <PolicyBar tone="account" />

        <div className="container-x flex flex-col gap-6 py-11">
          <LogoLockup tone="ink" className="text-[1.25rem]" />

          <div className="flex flex-col gap-2 text-[13px] leading-[1.7] text-soft-muted">
            <p>{company.address}</p>

            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Info label="대표">{company.ceo}</Info>
              <Bar />
              <Info label="사업자등록번호">{company.bizNo}</Info>
              <Bar />
              <Info label="통신판매 신고번호">{company.mailOrderNo}</Info>
            </p>

            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Info label="TEL">
                <a href={`tel:${company.tel.replace(/-/g, "")}`} className="hover:underline">
                  {company.tel}
                </a>
              </Info>
              <Bar />
              <Info label="FAX">{company.fax}</Info>
              <Bar />
              <Info label="E-mail">
                <a href={`mailto:${company.email}`} className="hover:underline">
                  {company.email}
                </a>
              </Info>
            </p>
          </div>

          {/* 정책 링크는 위 띠로 올라갔다. 여기는 저작권 한 줄만 남는다 */}
          <p className="border-t border-soft-line/60 pt-5 text-[12.5px] text-soft-muted">
            Copyrightⓒ {company.enName} All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
