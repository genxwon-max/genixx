"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { examGuideLinks, examMenu } from "@/lib/examNav";

export { examMenu };

/**
 * 응시 존 메뉴 — 접수하기 · 응시하기 · 정답과 해설 · 결과보기.
 *
 * 헤더 둘째 줄에 선다. 첫 줄은 서비스 안내·고객지원처럼 **사이트 전체**를 도는 길이고,
 * 이 줄은 **시험을 보는 동안** 오가는 길이다. 두 길을 한 줄에 섞으면 어느 것이 지금 하는
 * 일인지 흐려진다.
 *
 * 응시 화면(/exam/session)에서는 아무것도 그리지 않는다 — 시험 도중에 나갈 길을 두지 않고,
 * 헤더가 64px로 남아야 한다(응시 화면은 「화면 높이 − 4rem」으로 판을 짠다).
 *
 * 과목 판(/exam/[회차]/[학년])은 응시하기 안의 화면이라 응시하기에 불을 켠다.
 */
/** 지금 열려 있는 메뉴 — /exam은 다른 것에 걸리지 않을 때의 바닥값이다 */
export function activeExamHref(pathname: string): string | null {
  /* 안내 화면(서비스 안내 · 시험 안내)은 메뉴 어느 것에도 속하지 않는다 */
  if (examGuideLinks.some((l) => pathname === l.href)) return null;
  return (
    examMenu.find(
      (t) => t.href !== "/exam" && (pathname === t.href || pathname.startsWith(`${t.href}/`)),
    )?.href ?? "/exam"
  );
}

export default function ExamTabs() {
  const pathname = usePathname();
  if (pathname.startsWith("/exam/session")) return null;

  const active = activeExamHref(pathname);

  return (
    <nav aria-label="응시 메뉴" className="shadow-[inset_0_1px_0_var(--color-exam-line)]">
      <ul className="container-x grid grid-cols-4 sm:flex sm:justify-center sm:gap-x-10 md:gap-x-14">
        {examMenu.map((t) => {
          const on = t.href === active;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative block whitespace-nowrap px-1 py-3 text-center text-[14px] transition-colors sm:px-2 sm:py-3.5 sm:text-[16px] ${
                  on ? "font-bold text-soft-primary" : "text-soft-ink/80 hover:text-soft-ink"
                }`}
              >
                {t.label}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-[3px] bg-soft-primary"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
