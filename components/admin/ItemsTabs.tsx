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
 * 1) **콘솔의 다른 갈래 줄과 같은 모양을 쓴다.** 사용자 갈래(학부모·학생·교사·기관),
 *    검수 갈래(대기·처리됨), 은행 갈래(은행·전체 문항)가 모두 이 모양이다. 여기만
 *    설명이 딸린 카드로 세웠더니 같은 콘솔 안에서 저 혼자 다른 화면이 되었다.
 *    고른 것을 색 하나로만 알리지 않는 것도 그대로 따른다 — 면·글자 굵기가 함께 바뀐다.
 *
 * 2) **줄의 자리가 화면마다 같아야 한다.** 갈래를 눌렀는데 갈래 줄 자체가 위아래로
 *    움직이면, 다음 갈래를 누르려고 눈과 손이 매번 다시 자리를 찾는다. 그래서 세
 *    화면의 머리글(제목·설명·버튼)을 똑같이 두고, 화면마다 다른 설명은 이 줄
 *    **아래**에 적는다. 움직여도 되는 것은 갈래 줄 아래쪽뿐이다.
 */
const tabs = [
  { href: "/admin/items", label: "문항 목록" },
  { href: "/admin/items/forms", label: "검사지 조립" },
  { href: "/admin/items/rotation", label: "문항 회전" },
];

export default function ItemsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="문항 은행 구역" className="mb-6 flex flex-wrap gap-2">
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
            className={`inline-flex min-h-[3rem] items-center rounded-md border px-5 adm-t-md transition-colors ${
              here
                ? "border-brand-900 bg-brand-900 font-black text-white"
                : "border-exam-line bg-white font-bold text-exam-text hover:bg-exam-raised"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
