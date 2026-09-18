"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { legalGroup, siteMenu } from "@/lib/nav";

const groups = [...siteMenu, legalGroup];

/**
 * 화면 이름 띠(히어로) 바로 밑의 갈래 탭 — 같은 갈래의 형제 화면을 한 줄로 늘어놓고,
 * 지금 있는 칸에 밑줄을 긋는다. 주소로 갈래를 찾으므로 어느 화면에 두어도 된다.
 * 갈래 밖 화면(홈 · /legal 모음 화면처럼 갈래 자체인 주소)에서는 아무것도 그리지 않는다.
 *
 * 좁은 화면에서는 옆으로 밀어 넘긴다. 목록이 폭보다 좁으면 가운데, 넓으면 왼쪽부터
 * 서게 w-max + min-w-full로 감싼다 — justify-center만 두면 넘친 앞쪽 탭이 잘려서
 * 밀어도 닿지 않는다. 세로로는 넘칠 것이 없으니 overflow-y-hidden으로 막는다
 * (overflow-x만 auto로 두면 브라우저가 세로도 auto로 셈해 1px에 세로 막대가 생긴다).
 */
export default function SectionTabs() {
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  const group = groups.find((g) => pathname.startsWith(`${g.href}/`));

  /* 좁은 화면에서 지금 칸이 오른쪽 밖에 있으면(법적 고지 마지막 칸 등) 가운데로 밀어 둔다.
     scrollIntoView는 페이지까지 세로로 움직이므로 탭 줄의 가로 위치만 고친다 */
  useEffect(() => {
    const el = box.current;
    const cur = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !cur) return;
    const a = el.getBoundingClientRect();
    const b = cur.getBoundingClientRect();
    el.scrollLeft += b.left - a.left - (a.width - b.width) / 2;
  }, [pathname]);

  if (!group) return null;

  return (
    <nav aria-label={`${group.label} 메뉴`} className="border-b border-brand-100 bg-white">
      <div
        ref={box}
        className="container-x overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max min-w-full justify-center gap-1 sm:gap-4">
          {group.children.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`type-h4 block whitespace-nowrap border-b-2 px-3 py-3.5 transition-colors sm:px-4 ${
                    active
                      ? "border-brand-700 font-bold text-brand-800"
                      : "border-transparent font-medium text-slate-500 hover:text-brand-800"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
