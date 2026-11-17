"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { themeOf } from "@/lib/authVariant";

/**
 * 로그인 / 회원가입 전환 탭 — 회색 바탕에 고른 쪽만 흰 알약.
 * 로그인(LoginPanel)과 회원가입(SignupType)이 같은 탭을 쓴다. 회원가입만 밑줄 탭이라
 * 두 화면 위쪽이 달라 보인다는 말에 로그인 쪽 모양으로 맞췄다(2026-11-17).
 *
 * 두 주소는 각각 하나뿐이다 — /login 과 /signup/type.
 */

const t = themeOf(2);

export default function AuthTabs({
  /** 흰 판 밖(옅은 파랑 바탕)에 놓일 때 — 회색 바가 바탕에 묻히지 않게 한 단계 진하게 */
  onTint = false,
}: {
  onTint?: boolean;
}) {
  const pathname = usePathname();
  const onSignup = pathname.startsWith("/design4/signup");

  const tabs = [
    { href: "/design4/login", label: "로그인", active: !onSignup },
    { href: "/design4/signup/type", label: "회원가입", active: onSignup },
  ];

  return (
    <nav
      aria-label="로그인 또는 회원가입"
      className={`grid grid-cols-2 rounded-xl p-1 text-center text-[14.5px] font-bold ${
        onTint ? "bg-slate-200/70" : "bg-slate-100"
      }`}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`rounded-lg py-2.5 transition-colors ${
            tab.active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
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
