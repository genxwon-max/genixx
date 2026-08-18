"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  adminMenu,
  canAny,
  pending,
  roleOf,
  subHref,
  type AdminMenuItem,
} from "@/lib/admin";
import {
  adminSignOut,
  bumpZoom,
  patchAdminPrefs,
  useAdminPrefs,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { MenuIcon, CloseIcon } from "@/components/Icons";
import { LogoLockup } from "@/components/Logo";
import ConsoleLogin from "./ConsoleLogin";

/**
 * 관리자·전문가 콘솔 껍데기 — 어두운 왼쪽 메뉴 + 어두운 상단 바.
 *
 * 회원 대시보드(/my)와 같은 골격을 쓰되 색을 뒤집었다. 하루 종일 문항과 판정을 보는
 * 자리라, 내부 도구와 회원 화면을 한눈에 구분할 수 있어야 실수로 학부모 화면인 줄
 * 알고 조작하는 일이 없다. 본문은 밝게 둔다 — 지문·표·통계를 읽는 면까지 어두우면
 * 오래 보기 힘들다.
 *
 * 50~60대 사용자를 기준으로 잡은 규칙은 그대로 지킨다:
 *  - 메뉴는 접히지 않는다. 아이콘만 남는 축소 모드를 두지 않는다.
 *  - 현재 위치는 색 하나로만 알리지 않는다. 왼쪽 굵은 막대 + 배경 + 굵은 글씨를 겹친다.
 *  - 상단 얇은 띠에 '글자 크기' － ＋ 를 상시로 둔다.
 *
 * 메뉴는 역할이 가진 권한만 남긴다. 출제자에게 검수 워크벤치를 세워 두면 이해충돌을
 * 막으려고 권한을 갈라 놓은 뜻이 흐려진다(정의서 9장).
 *
 * 들어오지 않은 사람에게는 아무것도 그리지 않고 로그인 화면만 낸다. 운영자 계정은
 * 학생 개인정보에 닿기 때문에, 메뉴 구조조차 미리 보여 줄 이유가 없다.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = roleOf(prefs.role);
  const [hash, setHash] = useHash(pathname);

  const groups = adminMenu
    .map((g) => ({ ...g, items: g.items.filter((i) => canAny(prefs.role, i.needs)) }))
    .filter((g) => g.items.length > 0);

  // 저장된 로그인 상태는 브라우저에만 있어서, 하이드레이션 전에는 판단하지 않는다
  if (!hydrated) {
    return <div className="min-h-screen bg-slate-900" />;
  }
  if (!prefs.loginId) {
    return <ConsoleLogin />;
  }

  return (
    <div
      className="min-h-full bg-[#f4f6fb] text-soft-ink"
      style={{ ["--adm-zoom" as string]: prefs.zoom }}
    >
      {/* 임시 비밀번호를 아직 안 바꿨으면 맨 위에 한 줄로 알린다. 막지는 않는다 —
          바꾸는 것이 낫지만 강제하면 급한 일을 못 하게 된다. 경고색은 쓰지 않는다.
          위험을 알리는 자리가 아니라 언젠가 하면 되는 일을 적어 두는 자리다. */}
      {prefs.temp && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-exam-line bg-white px-4 py-2.5 lg:px-6">
          <span className="adm-t-sm font-bold text-exam-text">임시 비밀번호를 쓰고 계십니다.</span>
          <span className="adm-t-sm text-exam-muted">
            지금 바꾸지 않아도 됩니다. 편하실 때 바꾸시면 됩니다.
          </span>
          <Link
            href="/admin/account"
            className="ml-auto adm-t-sm font-bold text-exam-text underline underline-offset-4"
          >
            비밀번호 바꾸기
          </Link>
        </div>
      )}

      {/* ── 상단 바 ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white">
        {/* 맨 윗줄은 글자 크기만 두는 얇은 띠다. 배율은 하루에 한두 번 만지고 마는
            설정이라, 헤더 한복판에서 늘 자리를 차지할 이유가 없다. */}
        <div className="flex h-7 items-center justify-end gap-2 bg-slate-950 px-4 lg:px-6">
          <ZoomControl value={prefs.zoom} />
        </div>

        {/* 태블릿 폭에서는 오른쪽 묶음이 한 줄에 다 서지 못한다. 줄을 접게 두고 높이를 늘린다.

            높이는 min-h로 잡는다. 이 콘솔은 --adm-zoom으로 글자를 1.6배까지 키우는데,
            h로 못 박으면 글자만 커지고 바는 그대로라 넘친다. */}
        <div className="flex min-h-[2.75rem] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-1.5 lg:flex-nowrap lg:py-0 lg:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-[2.25rem] items-center gap-2 rounded-md border border-white/20 px-3.5 adm-t-sm font-bold text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-expanded={open}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            메뉴
          </button>

          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoLockup tone="white" className="text-[1.125rem]" />
            <span className="adm-t-sm font-bold text-slate-400">관리자 콘솔</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 border-l border-white/15 pl-3 sm:flex">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 adm-t-xs font-black text-white"
              >
                {prefs.staffName.slice(1)}
              </span>
              <span className="leading-tight">
                <span className="block adm-t-sm font-bold text-white">{prefs.staffName}</span>
                <span className="block adm-t-xs text-slate-400">
                  {role.short} · {prefs.loginId}
                </span>
              </span>
            </div>

            <Link
              href="/admin/account"
              className="hidden min-h-[2.25rem] items-center rounded-md border border-white/20 px-3.5 adm-t-sm font-bold text-white transition-colors hover:bg-white/10 sm:inline-flex"
            >
              내 계정
            </Link>
            <button
              type="button"
              onClick={adminSignOut}
              className="inline-flex min-h-[2.25rem] items-center rounded-md border border-white/20 px-3.5 adm-t-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 모바일에서 메뉴를 열면 본문 위로 쌓이고, lg부터 왼쪽에 나란히 선다.
          그냥 flex로 두면 열린 메뉴(w-full)가 본문을 옆으로 짜부라뜨린다. */}
      <div className="lg:flex">
        {/* ── 왼쪽 메뉴 ── */}
        <nav
          aria-label="관리자 메뉴"
          className={`${
            open ? "block" : "hidden"
          } w-full shrink-0 bg-slate-900 text-slate-300 lg:sticky lg:top-[4.5rem] lg:block lg:h-[calc(100vh-4.5rem)] lg:w-[17.5rem] lg:overflow-y-auto`}
        >
          <div className="px-3 py-5">
            {/* 지금 어떤 역할로 보고 있는지 메뉴 맨 위에 적는다 —
                메뉴가 역할마다 달라지므로 "왜 그 항목이 없는지"의 답이 여기 있다.
                무슨 일을 하는 역할인지는 적지 않는다. 매일 들어오는 사람에게
                자기 직무 설명이 늘 붙어 있을 이유가 없다. */}
            <p className="mb-5 px-3 adm-t-sm font-bold text-white">{role.label}</p>

            {groups.map((group) => (
              <div key={group.label} className="mb-6 last:mb-2">
                <p className="px-3 pb-2 adm-t-xs font-bold text-slate-500">{group.label}</p>
                <ul>
                  {group.items.map((item) => {
                    const active =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <MenuLink item={item} active={active} onNavigate={() => setOpen(false)} />
                        {/* 정의서상의 하위 화면. 독립 화면이 없는 것은 상위 화면 안의
                            구역으로 보낸다 — 적어만 두고 못 누르게 하면 「아직 없는 것」인지
                            「내가 못 찾는 것」인지 구분할 길이 없다. */}
                        {active && item.children && (
                          <ul className="mb-2 ml-4 border-l border-white/10 pl-3">
                            {item.children.map((c) => {
                              const href = subHref(item, c);
                              const here = hash !== "" && href.endsWith(`#${hash}`);
                              return (
                                <li key={c.id}>
                                  <Link
                                    href={href}
                                    onClick={() => {
                                      setOpen(false);
                                      setHash(c.id);
                                      /* 같은 주소를 다시 누르면 Next는 아무것도 하지
                                         않는다. 구역을 읽다가 위로 올라온 뒤 다시
                                         누른 사람에게는 그것이 고장으로 보이므로,
                                         이미 열려 있는 화면이면 직접 옮겨 준다. */
                                      document.getElementById(c.id)?.scrollIntoView();
                                    }}
                                    aria-current={here ? "location" : undefined}
                                    title={`${c.id} · ${c.desc}`}
                                    className={`flex min-h-[2.5rem] items-center rounded-md px-2 py-1.5 adm-t-sm transition-colors ${
                                      here
                                        ? "bg-white/10 font-bold text-white"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    }`}
                                  >
                                    {c.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <Link
              href="/"
              className="mt-2 flex min-h-[2.75rem] items-center gap-2 rounded-md px-3 adm-t-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white"
            >
              ← 홈페이지로 나가기
            </Link>
          </div>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

/**
 * 지금 주소의 # 뒤. 하위 항목 중 어디를 눌렀는지 메뉴에 표시하려고 본다.
 *
 * usePathname은 해시를 주지 않는다. 같은 화면 안 구역으로 옮겨 다니는 동안 메뉴가
 * 아무 반응도 하지 않으면 눌린 것인지 알 수 없어서, 해시를 따로 좇는다.
 */
function useHash(pathname: string) {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    /* 주소가 바뀔 때 한 번 읽고, 뒤로·앞으로에 따라 오는 hashchange도 받는다.
       ⚠ Next의 <Link>는 pushState로 옮기므로 hashchange가 오지 않는다. 눌러서
         옮긴 경우는 아래 onClick이 직접 알려 준다. */
    read();
    /* 주소를 그대로 붙여 넣거나 즐겨찾기로 들어오면 브라우저가 앵커로 내려 주지
       않는다 — 화면이 그려지기 전이라 그 자리가 아직 없기 때문이다. 그릴 것을
       다 그린 다음 한 번 더 옮겨 준다. */
    const at = window.location.hash.slice(1);
    const jump = at
      ? requestAnimationFrame(() => document.getElementById(decodeURIComponent(at))?.scrollIntoView())
      : 0;
    window.addEventListener("hashchange", read);
    return () => {
      cancelAnimationFrame(jump);
      window.removeEventListener("hashchange", read);
    };
  }, [pathname]);
  return [hash, setHash] as const;
}

function MenuLink({
  item,
  active,
  onNavigate,
}: {
  item: AdminMenuItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const count = item.badge ? pending[item.badge] : 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={`${item.label} · ${item.id}`}
      // 현재 위치는 색·배경·굵기·왼쪽 막대 네 가지로 동시에 표시한다
      className={`relative flex min-h-[3rem] items-center gap-2 rounded-md py-2 pl-4 pr-3 adm-t-md transition-colors ${
        active
          ? "bg-white/10 font-black text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-white"
          : "font-bold text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex-1">{item.label}</span>
      {count > 0 && (
        <span className="shrink-0 adm-t-sm font-bold tabular-nums text-rose-300">{count}</span>
      )}
    </Link>
  );
}

/**
 * 글자 크기 — 얇은 띠에 － ＋ 두 개만.
 *
 * 보이는 크기는 작게 두되 누를 수 있는 넓이는 줄이지 않는다. 24px짜리 단추를 그대로
 * 두면 손이 정확하지 않은 사람이 못 누르므로, `after`로 위아래를 넓혀 실제 판정
 * 범위를 44px로 되돌려 놓았다. 눈에 작고 손에 크다.
 *
 * 글자 크기는 --adm-zoom 하나만 바꾸며, 콘솔의 모든 크기가 이 변수에 곱해져 있어
 * 화면 전체가 같은 비율로 커진다(app/globals.css의 adm-t-* 참조).
 */
function ZoomControl({ value }: { value: number }) {
  const hit =
    "relative inline-flex h-6 w-7 items-center justify-center rounded text-[15px] font-black leading-none transition-colors after:absolute after:inset-x-0 after:-inset-y-[10px] after:content-['']";

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-bold text-slate-400">글자 크기</span>
      <button
        type="button"
        onClick={() => bumpZoom(-1)}
        disabled={value <= ZOOM_MIN}
        aria-label="글자 크기 줄이기"
        className={`${hit} ${
          value <= ZOOM_MIN
            ? "cursor-not-allowed text-slate-600"
            : "text-slate-200 hover:bg-white/15"
        }`}
      >
        －
      </button>
      {/* 지금 배율을 적어 두어야 「원래대로」로 돌아올 수 있다 */}
      <span className="min-w-[2.75rem] text-center text-[11px] font-bold tabular-nums text-slate-300">
        {Math.round(value * 100)}%
      </span>
      <button
        type="button"
        onClick={() => bumpZoom(1)}
        disabled={value >= ZOOM_MAX}
        aria-label="글자 크기 키우기"
        className={`${hit} ${
          value >= ZOOM_MAX
            ? "cursor-not-allowed text-slate-600"
            : "text-slate-200 hover:bg-white/15"
        }`}
      >
        ＋
      </button>
      {value !== 1 && (
        <button
          type="button"
          onClick={() => patchAdminPrefs({ zoom: 1 })}
          className="relative ml-0.5 rounded px-1.5 text-[11px] font-bold text-slate-400 underline underline-offset-2 transition-colors hover:text-white after:absolute after:inset-x-0 after:-inset-y-[10px] after:content-['']"
        >
          원래대로
        </button>
      )}
    </div>
  );
}

