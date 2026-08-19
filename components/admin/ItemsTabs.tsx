"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 문항 은행의 구역 갈래 (ADM-04).
 *
 * 정의서의 ADM-04는 하위 화면이 넷인데, 처음에는 그것을 한 페이지 안 네 구역으로
 * 세웠다. 화면 10장 길이가 되었고, 문항 하나 찾으러 온 사람이 보안 스위치까지 지나
 * 내려가야 했다. 하는 일이 다르면 화면도 나뉘어야 한다 — 목록은 **찾는 곳**,
 * 조립은 **만드는 곳**, 회전은 **살피는 곳**이다.
 *
 * ── 갈래 줄에서 지키는 것 둘 ──
 *
 * 1) **밑줄 탭으로 세운다.** 이 줄은 「어느 화면으로 갈까」를 묻고, 그 아래 목록의
 *    은행/전체 문항 단추는 「고른 화면 안에서 무엇을 볼까」를 묻는다. 둘 다 알약
 *    단추면 두 줄이 한 덩어리로 읽혀 어느 쪽이 상위인지 알 수 없다. 바깥 갈래는
 *    가볍게(밑줄), 안쪽 고르기는 그대로(알약) 둔다 — 설문 원본과 같은 규칙이다.
 *    색 하나로만 알리지 않는 것은 그대로다: 밑줄·글자 굵기·색이 함께 바뀐다.
 *
 * 2) **줄의 자리가 화면마다 같아야 한다.** 갈래를 눌렀는데 갈래 줄 자체가 위아래로
 *    움직이면, 다음 갈래를 누르려고 눈과 손이 매번 다시 자리를 찾는다. 그래서 세
 *    화면의 머리글을 똑같이 두고, 화면마다 다른 설명은 이 줄 **아래**에 적는다.
 *    움직여도 되는 것은 갈래 줄 아래쪽뿐이다.
 */
const tabs = [
  { href: "/admin/items", label: "문항 목록" },
  { href: "/admin/items/forms", label: "검사지 조립" },
  { href: "/admin/items/rotation", label: "문항 회전" },
];

export default function ItemsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="문항 은행 구역" className="mb-6 flex flex-wrap border-b border-exam-line">
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
