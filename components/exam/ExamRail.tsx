"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { activeExamHref } from "./ExamTabs";

/**
 * 오른쪽 빠른 메뉴 — 화면에 붙어 따라다니는 「리모컨」.
 *
 * 헤더 둘째 줄과 **같은 곳으로 가는 같은 메뉴**다. 목록이 길어 아래로 내려가면 헤더가
 * 화면 밖으로 나가는데, 접수하고 응시하고 결과를 보는 일은 그 자리에서 바로 옮겨 다니게
 * 되므로 한 벌을 옆에 붙여 둔다. 맨 아래 TOP은 긴 목록에서 머리로 돌아오는 길이다.
 *
 * ⚠ 넓은 화면(xl 이상)에서만 띄운다. 좁은 화면에서는 본문 위를 덮고, 헤더 메뉴가 이미
 *   화면 맨 위에 붙어 있어 하는 일이 겹친다.
 *
 * ⚠ 응시 화면(/exam/session)에서는 그리지 않는다 — 시험 도중에 나갈 길을 두지 않는다.
 */
const items: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/exam/apply",
    label: "접수하기",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        <path d="M7.5 13.5h4M7.5 17h7" />
      </>
    ),
  },
  {
    href: "/exam",
    label: "응시하기",
    icon: (
      <>
        <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
        <path d="M8 20.5h8M12 16.5v4" />
        <path d="M7.5 9h6M7.5 12.5h4" />
      </>
    ),
  },
  {
    href: "/exam/answers",
    label: "정답과 해설",
    icon: (
      <>
        <path d="M5.5 3.5h9l5 5v12a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 20.5v-15A1.5 1.5 0 0 1 5.5 3.5Z" />
        <path d="M14 3.5v5h5" />
        <path d="m8 13.5 2.5 2.5 4.5-4.5" />
      </>
    ),
  },
  {
    href: "/exam/report",
    label: "결과보기",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
        <path d="M8 16.5v-4M12 16.5v-7M16 16.5v-2.5" />
      </>
    ),
  },
];

export default function ExamRail() {
  const pathname = usePathname();
  if (pathname.startsWith("/exam/session")) return null;

  const active = activeExamHref(pathname);

  return (
    <nav aria-label="빠른 메뉴" className="fixed right-5 top-32 z-30 hidden w-[86px] xl:block">
      <ul className="overflow-hidden rounded-[2px] border border-soft-line bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
        {items.map((it) => {
          const on = it.href === active;
          return (
            <li key={it.href} className="border-b border-soft-line last:border-b-0">
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-1.5 px-2 py-3.5 text-center text-[12px] leading-tight transition-colors ${
                  on
                    ? "bg-soft-primary-soft font-bold text-soft-primary"
                    : "text-soft-ink hover:bg-slate-50"
                }`}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  {it.icon}
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="mt-2 flex w-full flex-col items-center gap-0.5 rounded-[2px] border border-soft-line bg-white px-2 py-2.5 text-[12px] font-semibold text-soft-muted transition-colors hover:bg-slate-50 hover:text-soft-ink"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m6 14 6-6 6 6" />
        </svg>
        TOP
      </button>
    </nav>
  );
}
