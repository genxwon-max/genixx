"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { themeOf } from "@/lib/authVariant";

/**
 * 로그인 / 회원가입 전환 탭.
 * 폼 상단에 붙고 아래로 가로선이 지나간다. 선택된 쪽만 굵은 글씨 + 파란 밑줄.
 *
 * 두 주소는 각각 하나뿐이다 — /login 과 /signup/type. 한때는 시안 비교용으로
 * /login1·/login2·/signup1·/signup2가 함께 있어서 「지금 있는 자리에 맞는 짝」을
 * 계산했지만, 둥글둥글로 확정하면서 그 갈래를 지웠다.
 */

const t = themeOf(2);

export default function AuthTabs() {
  const pathname = usePathname();
  const onSignup = pathname.startsWith("/signup");

  const tabs = [
    { href: "/login", label: "로그인", active: !onSignup },
    { href: "/signup/type", label: "회원가입", active: onSignup },
  ];

  return (
    <nav aria-label="로그인 또는 회원가입" className={t.tabBar}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`flex-1 py-3.5 text-center text-[16px] transition-colors ${
            tab.active ? t.tabOn : t.tabOff
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * 단계가 바뀔 때 자리가 밀리지 않도록, 되돌아가기 줄은 **늘 같은 높이를 차지한다.**
 * 버튼이 없을 때도 빈 줄로 남겨 둔다. 로그인·회원가입 두 화면이 같은 자리를 쓴다.
 */
export function BackRow({ onClick, label }: { onClick?: () => void; label?: string }) {
  return (
    <div className="flex h-6 items-center">
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className={`text-[13px] font-semibold ${t.muted} hover:underline`}
        >
          ← {label ?? "이전으로"}
        </button>
      )}
    </div>
  );
}
