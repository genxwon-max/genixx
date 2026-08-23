"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { admin2Nav, findAdmin2 } from "@/lib/admin2";
import { roleOf } from "@/lib/admin";
import { adminSignOut, useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import ConsoleGate from "./ConsoleGate";
import Palette from "./Palette";

/**
 * 콘솔 껍데기 — 어두운 왼쪽 기둥(216px) + 얇은 상단 바(40px) + 밝은 본문.
 *
 * 기존 /admin 껍데기와 다른 점 셋:
 *  1) 기둥을 접지 않는다. 대신 처음부터 216px로 좁게 짜고 항목 높이를 28px로 둔다.
 *     아이콘만 남는 축소 모드는 「무슨 아이콘이었지」를 매번 묻게 만든다.
 *  2) 글자 크기 조절(－ ＋)이 없다. 이 콘솔은 한 사람이 하루 종일 표를 보는 자리라
 *     밀도가 곧 성능이고, 배율을 열면 표 열 폭이 화면마다 달라진다.
 *  3) Ctrl/⌘+K로 화면을 옮긴다. 마우스로 기둥까지 가는 왕복이 사라진다.
 *
 * 로그인하지 않았거나 슈퍼 관리자가 아니면 아무것도 그리지 않는다 — 이 콘솔은
 * 운영자 계정·권한과 감사 로그에 닿으므로 메뉴 구조조차 미리 보여 줄 이유가 없다.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const here = findAdmin2(pathname);

  // 저장된 로그인 상태는 브라우저에만 있어서, 하이드레이션 전에는 판단하지 않는다
  if (!hydrated) return <div className="min-h-screen bg-(--a2-bg)" />;
  if (!prefs.loginId || prefs.role !== "super") {
    return <ConsoleGate role={prefs.loginId ? prefs.role : null} name={prefs.staffName} />;
  }

  return (
    <div className="flex min-h-screen">
      {/* ── 왼쪽 기둥 ── */}
      <aside
        className={`a2-side fixed inset-y-0 left-0 z-40 flex w-[216px] shrink-0 flex-col bg-(--a2-side) lg:sticky lg:top-0 lg:h-screen ${
          open ? "flex" : "max-lg:hidden"
        }`}
      >
        <div className="flex h-10 items-center gap-2 border-b border-(--a2-side-line) px-3">
          <Link href="/admin2" className="flex items-baseline gap-1.5 text-white">
            <span className="font-brand text-[0.9375rem] font-semibold leading-none">GENIXX</span>
            <span className="a2-t-xs font-bold text-(--a2-side-ink-2)">CONSOLE</span>
          </Link>
        </div>

        {/* 좁은 화면에서 기둥은 본문을 덮고 서 있다. 주소가 바뀌는 것을 효과로 지켜보는
            대신 눌린 자리에서 닫는다 — 같은 화면 링크를 눌러도 닫혀야 하고, 효과로 하면
            글자 하나 칠 때마다 다시 그리는 값을 하나 더 만든다. */}
        <nav
          ref={navRef}
          aria-label="콘솔 메뉴"
          onClick={() => setOpen(false)}
          className="flex-1 overflow-y-auto px-2 py-2"
        >
          {admin2Nav.map((g) => (
            <div key={g.label} className="mb-1">
              <p className="a2-nav-group">{g.label}</p>
              <ul>
                {g.items.map((it) => {
                  const on = it.exact
                    ? pathname === it.href
                    : pathname === it.href || pathname.startsWith(`${it.href}/`);
                  return (
                    <li key={it.href}>
                      <Link href={it.href} className="a2-nav-item" aria-current={on ? "page" : undefined}>
                        {it.label}
                        {it.count ? <span className="a2-nav-count">{it.count}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-(--a2-side-line) p-2">
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="a2-nav-item w-full justify-between"
          >
            화면 찾기
            <span className="a2-kbd border-(--a2-side-line) bg-(--a2-side-2) text-(--a2-side-ink-2)">⌘K</span>
          </button>
          <div className="mt-1 flex items-center gap-2 rounded-(--a2-radius) px-2 py-1.5">
            <span
              aria-hidden
              className="a2-t-xs flex h-6 w-6 items-center justify-center rounded-(--a2-radius) bg-(--a2-side-2) font-bold text-white"
            >
              {prefs.staffName.slice(0, 1) || "관"}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate a2-t-sm font-bold text-white">{prefs.staffName}</span>
              <span className="block truncate a2-t-xs text-(--a2-side-ink-2)">
                {roleOf(prefs.role).short} · {prefs.loginId}
              </span>
            </span>
          </div>
        </div>
      </aside>

      {/* 좁은 화면에서 기둥을 열면 본문을 덮는다 */}
      {open && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── 상단 바 ── */}
        <header className="sticky top-0 z-20 flex h-10 items-center gap-2 border-b border-(--a2-line) bg-(--a2-panel) px-3">
          {/* 열면 초점을 기둥 첫 링크로 옮긴다 — 그러지 않으면 Tab이 기둥을 건너뛰고
              장막에 덮여 못 누르는 본문으로 들어간다. 닫으면 이 단추로 돌려준다. */}
          <button
            type="button"
            ref={menuBtnRef}
            onClick={() => {
              const next = !open;
              setOpen(next);
              requestAnimationFrame(() => {
                if (next) navRef.current?.querySelector<HTMLElement>("a")?.focus();
                else menuBtnRef.current?.focus();
              });
            }}
            className="a2-btn a2-btn-sm lg:hidden"
            aria-expanded={open}
          >
            메뉴
          </button>

          {/* 빵부스러기 — 지금 어느 그룹의 어느 화면인지 */}
          <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1.5">
            <span className="a2-t-sm text-(--a2-ink-4)">{here?.group ?? "콘솔"}</span>
            <span aria-hidden className="a2-t-sm text-(--a2-ink-4)">
              /
            </span>
            <span className="truncate a2-t-sm font-bold text-(--a2-ink)">{here?.item.label ?? "—"}</span>
            {here && <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{here.item.code}</span>}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setPalette(true)} className="a2-btn a2-btn-sm hidden sm:inline-flex">
              화면 찾기
              <span className="a2-kbd">⌘K</span>
            </button>
            <span className="a2-tag a2-tag-accent" title="지금 보고 있는 환경">
              예시 데이터
            </span>
            <Link href="/admin" className="a2-btn a2-btn-sm hidden md:inline-flex">
              기존 콘솔
            </Link>
            <button type="button" onClick={adminSignOut} className="a2-btn a2-btn-sm">
              로그아웃
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>

      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
}
