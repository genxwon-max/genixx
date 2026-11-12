"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, House } from "lucide-react";
import { d4, groupOf, realOf } from "./paths";

/**
 * /design4 하위 화면의 틀 — 왼쪽에 갈래 메뉴, 오른쪽에 현재 위치 줄과 본문.
 * 공공 교육 포털의 하위 화면 모양을 따른다.
 *
 * **왼쪽 메뉴는 화면을 내려도 따라오지 않는다**(2026-11-12 요청). 문서 흐름에 그대로 서 있다.
 * 좁은 화면에서는 왼쪽 칸 대신 본문 위에 가로로 밀어 넘기는 줄로 바뀐다.
 *
 * 홈(/design4/home)은 틀 없이 그대로 그린다.
 */
export default function Frame4({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const real = realOf(pathname);
  if (real === "/") return <>{children}</>;

  const { group, here } = groupOf(real);

  return (
    <div className="d4-container grid gap-6 pb-20 pt-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-12 lg:pb-24 lg:pt-10">
      {group && (
        <nav aria-label={`${group.label} 메뉴`} className="min-w-0">
          {/* 넓은 화면 — 갈래 이름 상자 + 하위 화면 목록 */}
          <div className="hidden overflow-hidden rounded-[22px] bg-white shadow-[0_6px_24px_-10px_rgba(15,31,75,0.22)] ring-1 ring-slate-100 lg:block">
            <p
              className="m-3 rounded-2xl px-4 py-5 text-center text-[17px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#3f72f2 0%,#1c45c4 100%)" }}
            >
              {group.label}
            </p>
            <ul className="px-4 pb-5 pt-1">
              {group.children.map((c) => {
                const on = c.href === here?.href;
                return (
                  <li key={c.href}>
                    <Link
                      href={d4(c.href)}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-start gap-2 rounded-lg px-2 py-2 text-[14.5px] leading-snug transition-colors ${
                        on ? "font-bold text-[var(--d4-blue)]" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-[var(--d4-blue)]" : "bg-transparent"}`}
                      />
                      {c.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 좁은 화면 — 가로 줄 */}
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max gap-2">
              {group.children.map((c) => {
                const on = c.href === here?.href;
                return (
                  <li key={c.href}>
                    <Link
                      href={d4(c.href)}
                      aria-current={on ? "page" : undefined}
                      className={`block whitespace-nowrap rounded-full px-4 py-2 text-[14px] ${
                        on
                          ? "bg-[var(--d4-blue)] font-bold text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {c.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}

      <div className={`min-w-0 ${group ? "" : "lg:col-span-2"}`}>
        <nav aria-label="현재 위치" className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-500">
          <Link href={d4("/")} aria-label="홈" className="hover:text-slate-900">
            <House className="h-3.5 w-3.5" />
          </Link>
          {group && (
            <>
              <ChevronRight aria-hidden className="h-3 w-3 text-slate-300" />
              <span className={here ? undefined : "font-medium text-slate-800"}>{group.label}</span>
            </>
          )}
          {here && (
            <>
              <ChevronRight aria-hidden className="h-3 w-3 text-slate-300" />
              <span className="truncate font-medium text-slate-800">{here.label}</span>
            </>
          )}
        </nav>
        {children}
      </div>
    </div>
  );
}
