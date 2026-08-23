"use client";

import Link from "next/link";
import { useState } from "react";
import { menu } from "@/lib/nav";

/**
 * 큰 메뉴 — 여섯 갈래와, 마우스를 올리거나 초점이 들어오면 펼쳐지는 전체 판.
 *
 * 여닫기는 CSS(:hover / :focus-within)가 하고, 이 컴포넌트가 클라이언트인 이유는
 * Esc 하나 때문이다 — 키보드로 메뉴에 들어온 사람이 서른 개 링크를 다 지나지
 * 않고도 판을 닫을 수 있어야 한다(WCAG 1.4.13). Esc를 누르면 초점을 빼고, 마우스가
 * 올라가 있는 동안에도 data-dismissed로 판을 숨긴다. 마우스가 떠나면 되돌린다.
 */
export default function GovGnb() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <nav
      aria-label="주 메뉴"
      className="gv-gnb hidden self-stretch lg:block"
      data-dismissed={dismissed ? "" : undefined}
      onMouseLeave={() => setDismissed(false)}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        setDismissed(true);
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <ul className="flex h-full items-stretch">
        {menu.map((g) => (
          <li key={g.id} className="flex">
            <Link
              href={g.href}
              onFocus={() => setDismissed(false)}
              className="gv-head flex items-center whitespace-nowrap border-b-[3px] border-transparent px-4 text-[1.0625rem] text-(--g-ink) transition-colors hover:border-(--g-blue) hover:text-(--g-blue) xl:px-5"
            >
              {g.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="gv-mega absolute inset-x-0 top-full border-b border-(--g-line) bg-white shadow-[0_16px_32px_-16px_rgba(11,42,87,0.25)]">
        <div className="gv-wrap grid grid-cols-6 gap-x-6 py-8">
          {menu.map((g) => (
            <div key={g.id} className="border-l border-(--g-line) pl-5">
              <Link href={g.href} className="gv-head text-[0.9375rem] text-(--g-blue-2) hover:underline">
                {g.label}
              </Link>
              <ul className="mt-3 space-y-2">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="gv-small block text-(--g-ink-2) hover:text-(--g-blue) hover:underline">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
