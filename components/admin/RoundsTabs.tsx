"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 회차의 구역 갈래 (ADM-05).
 *
 * 회차 화면이 하는 일은 셋인데 서로 층위가 다르다 — 지금 어디까지 왔는지 **보는**
 * 일, 이번 회차에 무엇이 나갈지 **짜는** 일, 응시 환경을 **손보는** 일. 셋을 한
 * 페이지에 이어 붙이면 편성판이 응시 현황 표 아래로 밀려 내려가, 회차를 열려고 온
 * 사람이 그 판을 지나쳐 버린다.
 *
 * ⚠ 문항 은행(ItemsTabs)과 같은 규칙을 그대로 지킨다.
 *
 *   1) **바깥 갈래는 밑줄, 안쪽 고르기는 알약.** 이 줄은 「어느 화면으로 갈까」이고,
 *      화면 안의 알약 단추는 「고른 화면에서 무엇을 볼까」다.
 *   2) **세 화면의 머리글이 똑같아야 한다.** 갈래를 눌렀는데 갈래 줄이 위아래로
 *      움직이면 다음 갈래를 누르려고 눈과 손이 매번 자리를 다시 찾는다. 화면마다
 *      다른 것(회차 고르개·설명)은 모두 이 줄 **아래**에 둔다.
 */
const tabs = [
  { href: "/admin/rounds", label: "응시 현황" },
  { href: "/admin/rounds/exam", label: "회차 편성" },
  { href: "/admin/rounds/security", label: "응시 화면 보호" },
];

export default function RoundsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="회차 구역" className="mb-6 flex flex-wrap border-b border-exam-line">
      {tabs.map((t) => {
        const here =
          t.href === "/admin/rounds"
            ? !tabs.slice(1).some((x) => pathname.startsWith(x.href))
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={here ? "page" : undefined}
            className={`-mb-px inline-flex min-h-[2.75rem] items-center border-b-2 px-4 py-2.5 adm-t-md transition-colors ${
              here
                ? "border-brand-900 font-black text-brand-800"
                : "border-transparent font-bold text-exam-muted hover:text-exam-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
