"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

/** 응시 화면(실제 응시 · 셋트)인가 — 둘 다 /exam/session 아래에 있다 */
export const isExamScreen = (pathname: string) => pathname.startsWith("/exam/session/");

/**
 * 응시 화면의 바탕 — 시험지처럼 흰 종이.
 *
 * 응시 존의 색 토큰(globals.css의 --color-exam-*)을 이 틀 안에서만 덮는다. 헤더 · 자료 ·
 * 문제 · 이동판 · 하단 바가 모두 이 토큰을 쓰므로 한 곳에서 바꾸면 화면 전체가 희어진다.
 * raised만은 옅은 회색으로 남긴다 — 번호 단추에 마우스를 올렸을 때의 표시가 사라지면 안 된다.
 */
const examScreenColors = {
  "--color-exam-bg": "#ffffff",
  "--color-exam-panel": "#ffffff",
  "--color-exam-raised": "#f4f5f7",
} as CSSProperties;

/**
 * 응시 존 바깥 틀.
 *
 * 응시 화면에서는 틀을 화면 높이에 못 박고 바깥 스크롤을 막는다. 전체화면에서 페이지가
 * 통째로 밀려 올라가면 헤더(남은 시간)가 화면 밖으로 나가고 하단 바가 흔들린다. 넘치는
 * 것은 본문 안(자료 · 문항 칸)에서만 스크롤된다.
 */
export function ExamShell({
  className,
  style,
  children,
}: {
  className: string;
  /** 응시 존 전체에 거는 색과 모서리 — 응시 화면에서는 아래 흰 종이 값이 덧씌워진다 */
  style?: CSSProperties;
  children: ReactNode;
}) {
  const locked = isExamScreen(usePathname());
  return (
    <div
      className={`${className} ${locked ? "h-dvh overflow-hidden" : "min-h-full"} flex flex-col`}
      style={locked ? { ...style, ...examScreenColors } : style}
    >
      {children}
    </div>
  );
}

/** 본문 — 응시 화면에서는 남은 높이 안에서만 스크롤한다 */
export function ExamMain({ children }: { children: ReactNode }) {
  const locked = isExamScreen(usePathname());
  return <main className={locked ? "min-h-0 flex-1 overflow-y-auto" : "flex-1"}>{children}</main>;
}

/**
 * 헤더 첫 줄의 안내 메뉴 — 응시 화면에서는 그리지 않는다.
 * 시험 도중에 사이트로 나가는 길을 두지 않는다(응시 메뉴 · 리모컨과 같은 약속).
 */
export function ExamSiteNav({ links }: { links: { href: string; label: string }[] }) {
  if (isExamScreen(usePathname())) return null;
  return (
    <nav aria-label="사이트 안내" className="hidden lg:block">
      <ul className="flex items-center gap-x-7">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="whitespace-nowrap text-[15px] text-soft-ink/80 transition-colors hover:text-soft-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * 응시 화면에서는 감춘다 — 로고와 이름, 로그아웃 자리.
 *
 * 시험지 한 장을 보는 자리에 머리가 둘이면 어느 쪽이 지금 보는 시험인지 읽는 데 시간이
 * 든다. 응시 중에는 머리를 하나만 두고, 거기에 평가명 · 과목 · 남은 시간만 세운다
 * (components/exam/ExamStatusBar.tsx).
 */
export function ExamSiteBrand({ children }: { children: ReactNode }) {
  if (isExamScreen(usePathname())) return null;
  return <>{children}</>;
}
