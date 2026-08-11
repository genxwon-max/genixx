"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * 계정 존 껍데기 — 상단 유틸리티 바 + 헤더 + 푸터.
 *
 * 원본(3a)이 헤더에 글자크기 －／＋ 와 고대비 토글을 상시로 두라고 정했다.
 * WCAG 2.1 AA를 목표로 하고, 학부모가 모바일에서 먼저 본다는 전제(사이트맵 12장)라
 * 유틸리티 바는 좁은 화면에서 접근성 도구만 남긴다.
 */

const zoomSteps = [1, 1.125, 1.25] as const;

export default function AccountChrome({ children }: { children: React.ReactNode }) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div
      className={`flex min-h-full flex-col bg-acc-bg text-acc-ink ${
        highContrast ? "acc-high-contrast" : ""
      }`}
      style={{ ["--acc-zoom" as string]: zoomSteps[zoomIdx] }}
    >
      {/* 유틸리티 바 */}
      <div className="h-[2.375rem] border-b border-acc-divider bg-acc-bar">
        <div className="container-x flex h-[2.375rem] items-center justify-end gap-3 text-[12px] text-acc-muted">
          <Link href="/support/faq" className="hidden hover:underline sm:inline">
            본인인증 안내
          </Link>
          <span aria-hidden className="hidden text-acc-line sm:inline">
            |
          </span>
          <Link href="/support/inquiry" className="hidden hover:underline sm:inline">
            고객지원
          </Link>
          <span aria-hidden className="hidden text-acc-line sm:inline">
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
                className="flex h-5 w-5 items-center justify-center border border-acc-field bg-white text-[11px] disabled:opacity-40"
              >
                －
              </button>
              <button
                type="button"
                onClick={() => setZoomIdx((i) => Math.min(zoomSteps.length - 1, i + 1))}
                disabled={zoomIdx === zoomSteps.length - 1}
                aria-label="글자 크게"
                className="flex h-5 w-5 items-center justify-center border border-acc-field bg-white text-[11px] disabled:opacity-40"
              >
                ＋
              </button>
            </span>
          </span>

          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            aria-pressed={highContrast}
            className={`border px-2 py-0.5 text-[11px] ${
              highContrast
                ? "border-acc-ink bg-acc-ink text-white"
                : "border-acc-field bg-white text-acc-muted"
            }`}
          >
            고대비
          </button>
        </div>
      </div>

      {/* 헤더 — 아래 굵은 파란 선이 이 존의 표식 */}
      <header className="border-b-2 border-acc-primary bg-white">
        <div className="container-x flex h-[4.75rem] items-center justify-between gap-4">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-[20px] font-extrabold tracking-[0.16em] text-acc-primary">
              GENIXX
            </span>
            <span className="hidden text-[13px] text-acc-dim sm:inline">재능진단 플랫폼</span>
          </Link>
          <nav className="hidden gap-8 text-[15px] font-semibold text-acc-body lg:flex">
            <Link href="/service" className="hover:text-acc-primary">
              서비스 안내
            </Link>
            <Link href="/sample" className="hover:text-acc-primary">
              샘플 리포트
            </Link>
            <Link href="/about/team" className="hover:text-acc-primary">
              연구·자문진
            </Link>
            <Link href="/support" className="hover:text-acc-primary">
              고객지원
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-acc-ink text-[12.5px] text-acc-placeholder">
        <div className="container-x flex flex-col gap-3 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="font-semibold text-white hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/legal/terms" className="hover:underline">
              이용약관
            </Link>
            <Link href="/legal/ai-notice" className="hover:underline">
              AI 이용·행동로그 고지
            </Link>
            <Link href="/legal/privacy-kids" className="hover:underline">
              아동용 눈높이 고지
            </Link>
          </div>
          <p>© GENIXX. 개인정보 보관 5년 후 자동 파기</p>
        </div>
      </footer>
    </div>
  );
}
