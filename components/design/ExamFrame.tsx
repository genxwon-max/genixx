"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/Icons";
import Logo from "@/components/Logo";
import ExamFooterNote from "@/components/exam/ExamFooterNote";
import { ExamSiteNav } from "@/components/exam/ExamShell";
import { ExamClock, HeadRow, exitLinkClass } from "@/components/exam/ExamStatusBar";
import { examPaper, examSerif, examZone as zone } from "@/components/exam/skin";
import { assessment } from "@/lib/exam";
import { examGuideLinks } from "@/lib/examNav";

/**
 * 응시 화면 껍데기의 디자인용 사본 — 시험지 머리 한 줄과 흰 종이 바탕.
 *
 * 실제 껍데기(app/(exam)/layout.tsx)는 머리를 주소와 응시 기록에서 읽어 그린다
 * (components/exam/ExamStatusBar.tsx). 디자인 화면은 누가 열어도 같아야 하므로 진단 이름 ·
 * 과목 · 남은 시간을 여기 적어 넣는다. 머리 줄과 남은 시간 칸, 「나가기」의 모양은 실제
 * 화면의 조각을 그대로 쓴다.
 */

/* 시험지 글꼴과 응시 존의 색 · 모서리는 응시 존 레이아웃과 같은 값을 쓴다(components/exam/skin.ts) */
const myeongjo = examSerif;
const siteZone = zone;

/** 응시 화면에서는 그 위에 흰 종이를 덧씌운다(ExamShell) */
const examZone = { ...zone, ...examPaper } as CSSProperties;

/** 머리의 안내 — 응시 존 레이아웃과 같다 */
const siteLinks = [
  ...examGuideLinks,
  { href: "/sample", label: "샘플 리포트" },
  { href: "/about/team", label: "연구·자문진" },
  { href: "/support", label: "고객지원" },
];

const chip =
  "rounded-[2px] border border-exam-line px-4 py-2 text-[13px] font-bold text-exam-text transition-colors hover:bg-exam-raised";

/**
 * 응시 존의 **응시 화면 밖** 껍데기 — 진단 둘러보기 · 안내 화면이 쓰는 한 줄 머리.
 *
 * 접수 · 응시 · 정답과 해설 · 결과가 학생 대시보드로 옮겨 가면서 머리 둘째 줄의 탭과 오른쪽
 * 메뉴는 없어졌다(app/(exam)/layout.tsx). 머리 오른쪽의 로그인 줄만 실제와 다르다 —
 * 실제(components/exam/SessionBar.tsx)는 로그인을 저장소에서 읽고, 여기서는 비회원 · 회원을
 * 주소가 정한다.
 */
export function ExamSiteFrame({
  as,
  member = { name: "이서준", home: "/design/student" },
  children,
}: {
  as: "guest" | "member";
  /** 로그인한 사람의 이름과 「내 대시보드」가 가는 곳 — 넘기지 않으면 학생 이서준이다 */
  member?: { name: string; home: string };
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-exam-bg text-exam-text ${myeongjo.variable} flex min-h-dvh flex-col`}
      style={siteZone}
    >
      <header className="sticky top-0 z-40 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span aria-hidden className="hidden h-5 w-px bg-exam-line sm:block" />
            <span className="hidden text-[13px] font-bold text-exam-muted sm:inline">
              {assessment.name} 재능진단
            </span>
          </div>
          <ExamSiteNav links={siteLinks} />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {as === "guest" ? (
              <>
                <Link href="/login/student" className={chip}>
                  로그인
                </Link>
                <Link
                  href="/signup/type"
                  className="rounded-[2px] bg-soft-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-soft-primary-dark"
                >
                  회원가입
                </Link>
              </>
            ) : (
              <>
                <span className="hidden text-[13px] text-exam-muted sm:block">
                  <b className="text-exam-text">{member.name}</b> 님
                </span>
                <Link href={member.home} className={chip}>
                  내 대시보드
                </Link>
                <button type="button" className={chip}>
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <ExamFooterNote />
    </div>
  );
}

export default function ExamFrame({
  name,
  subject,
  clock,
  exitHref,
  closable = false,
  children,
}: {
  /** 진단 이름 — 「2026 3분기 초4 진단」 */
  name: string;
  subject: string | null;
  /** 남은 시간. 비회원 셋트와 시작 전 · 나간 뒤에는 시계가 없다 */
  clock?: { remain: number; limitMin: number; low?: boolean };
  /** 「나가기」가 가는 주소 — 나갈지 묻는 창이 열린 상태다. 없으면 두지 않는다 */
  exitHref?: string;
  /** 「창 닫기」 — 시작하기 전의 표지에만 있다 */
  closable?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-exam-bg text-exam-text ${myeongjo.variable} flex h-dvh flex-col overflow-hidden`}
      style={examZone}
    >
      <header className="sticky top-0 z-40 shrink-0 bg-exam-panel shadow-[inset_0_-1px_0_var(--color-exam-line)]">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <HeadRow name={name} subject={subject}>
              {clock && (
                <ExamClock remain={clock.remain} limitMin={clock.limitMin} low={!!clock.low} />
              )}
              {exitHref && (
                <Link href={exitHref} className={exitLinkClass}>
                  나가기
                </Link>
              )}
              {closable && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 text-[13px] text-exam-muted transition-colors hover:bg-exam-raised hover:text-exam-text"
                >
                  <CloseIcon className="h-4 w-4" />
                  창 닫기
                </button>
              )}
            </HeadRow>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
