"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as a from "./ui";

/**
 * 문항 은행의 구역 이동 줄 (ADM-04).
 *
 * 정의서의 ADM-04는 하위 화면이 넷인데, 처음에는 그것을 한 페이지 안 네 구역으로
 * 세웠다. 화면 10장 길이가 되었고, 문항 하나 찾으러 온 사람이 보안 스위치까지
 * 지나 내려가야 했다. 하는 일이 다르면 화면도 나뉘어야 한다 —
 * 목록은 **찾는 곳**, 조립은 **만드는 곳**, 회전은 **살피는 곳**이다.
 *
 * 그래서 셋을 주소로 갈랐다. 왼쪽 메뉴에도 같은 셋이 하위 항목으로 서 있지만,
 * 메뉴를 접어 두고 쓰는 사람이 많아 화면 안에도 길을 둔다.
 *
 * 문항 목록을 첫 화면으로 둔 것은 여기 오는 열에 아홉이 문항을 찾으러 오기
 * 때문이다. 카테고리 화면을 앞에 세우면 그 아홉이 매번 한 번씩 더 눌러야 한다.
 */
const tabs = [
  { href: "/admin/items", label: "문항 목록", desc: "확정된 문항을 훑고 고릅니다" },
  { href: "/admin/items/forms", label: "검사지 조립", desc: "회차에 나갈 검사지를 만듭니다" },
  { href: "/admin/items/rotation", label: "문항 회전", desc: "노출 이력과 앵커 상태를 봅니다" },
];

export default function ItemsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="문항 은행 구역" className="mb-6 grid gap-2 sm:grid-cols-3">
      {tabs.map((t) => {
        /* 문항 상세(/admin/items/IT-2601)도 목록 쪽이다 — 다른 두 주소가 아니면 목록 */
        const here =
          t.href === "/admin/items"
            ? !tabs.slice(1).some((x) => pathname.startsWith(x.href))
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={here ? "page" : undefined}
            className={`block min-h-[2.75rem] rounded-md border px-4 py-2.5 transition-colors ${
              here
                ? "border-brand-900 bg-brand-50"
                : "border-exam-line bg-white hover:bg-exam-raised"
            }`}
          >
            <span className={`block adm-t-md font-bold ${here ? "text-brand-800" : "text-exam-text"}`}>
              {t.label}
            </span>
            <span className={`${a.hint} mt-0.5 block`}>{t.desc}</span>
          </Link>
        );
      })}
    </nav>
  );
}
