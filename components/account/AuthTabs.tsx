"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { themeOf, type Variant } from "@/lib/authVariant";

/**
 * 로그인 / 회원가입 전환 탭.
 * 폼 상단에 붙고 아래로 가로선이 지나간다. 선택된 쪽만 굵은 글씨 + 파란 밑줄.
 *
 * 정본 경로(/login · /signup/type)와 비교용 시안 경로(/login1 · /signup2 …)가
 * 함께 있으므로, 지금 있는 자리에 맞는 짝으로 링크를 건다.
 */
function useHrefs() {
  const pathname = usePathname();
  const m = /^\/(login|signup|org|my)([12])$/.exec(pathname);
  const suffix = m ? m[2] : "";
  return {
    onSignup: pathname.startsWith("/signup"),
    loginHref: suffix ? `/login${suffix}` : "/login",
    signupHref: suffix ? `/signup${suffix}` : "/signup/type",
    isVariantRoute: Boolean(suffix),
  };
}

export default function AuthTabs({ variant }: { variant: Variant }) {
  const t = themeOf(variant);
  const { onSignup, loginHref, signupHref } = useHrefs();

  const tabs = [
    { href: loginHref, label: "로그인", active: !onSignup },
    { href: signupHref, label: "회원가입", active: onSignup },
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

/** 두 시안을 오가는 스위치 (비교용 — 하나로 확정되면 지운다) */
export function VariantSwitch({
  variant,
  kind,
}: {
  variant: Variant;
  kind: "login" | "signup" | "org" | "my";
}) {
  const t = themeOf(variant);
  const { isVariantRoute } = useHrefs();
  const base = `/${kind}`;

  return (
    <div className={`mt-8 flex flex-wrap items-center justify-center gap-2 text-[13px] ${t.muted}`}>
      {isVariantRoute ? (
        <>
          <span>
            시안 {t.id} · {t.label}
          </span>
          <Link
            href={`${base}${t.other}`}
            className="font-bold underline underline-offset-2 hover:opacity-80"
          >
            시안 {t.other} · {themeOf(t.other).label} 보기 →
          </Link>
        </>
      ) : (
        <>
          <span>다른 시안 보기</span>
          <Link href={`${base}1`} className="font-bold underline underline-offset-2">
            시안 1 · 전문가
          </Link>
          <span aria-hidden>·</span>
          <Link href={`${base}2`} className="font-bold underline underline-offset-2">
            시안 2 · 둥글둥글
          </Link>
        </>
      )}
    </div>
  );
}
