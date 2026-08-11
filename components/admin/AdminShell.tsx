"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminMenu, pending, roleOf, staffRoles, type AdminMenuItem } from "@/lib/admin";
import { patchAdminPrefs, useAdminPrefs, zoomSteps } from "@/lib/adminStore";
import { MenuIcon, CloseIcon, ChevronDown } from "@/components/Icons";
import * as a from "./ui";

/**
 * 관리자 콘솔 껍데기 — 왼쪽 메뉴 + 상단 바.
 *
 * 50~60대 사용자를 기준으로 잡은 규칙:
 *  - 메뉴는 접히지 않는다. 아이콘만 남는 축소 모드를 두지 않는다.
 *    (아이콘의 뜻을 외우게 하는 대신 항상 글자를 보여 준다)
 *  - 현재 위치는 색 하나로만 알리지 않는다. 왼쪽 굵은 막대 + 배경 + 굵은 글씨를 겹친다.
 *  - 상단에 '글자 크기' 버튼을 상시로 둔다. 브라우저 확대를 몰라도 바로 키울 수 있게.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const prefs = useAdminPrefs();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = roleOf(prefs.role);

  return (
    <div
      className="min-h-full bg-exam-bg text-exam-text"
      style={{ ["--adm-zoom" as string]: prefs.zoom }}
    >
      {/* ── 상단 바 ── */}
      <header className="sticky top-0 z-40 border-b border-exam-line bg-white">
        <div className="flex h-[4.5rem] items-center gap-4 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`${a.btnGhost} lg:hidden`}
            aria-expanded={open}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            메뉴
          </button>

          <Link href="/admin" className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black tracking-tight text-brand-900">GENIXX</span>
            <span className="adm-t-sm font-bold text-exam-muted">관리자</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <ZoomControl value={prefs.zoom} />
            <RoleSwitch value={prefs.role} />
            <div className="hidden items-center gap-2.5 border-l border-exam-line pl-4 sm:flex">
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 adm-t-sm font-black text-white"
              >
                {prefs.staffName.slice(1)}
              </span>
              <span className="leading-tight">
                <span className="block adm-t-sm font-bold text-exam-text">{prefs.staffName}</span>
                <span className="block adm-t-xs text-exam-muted">{role.label}</span>
              </span>
            </div>
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
          } w-full shrink-0 border-r border-exam-line bg-white lg:sticky lg:top-[4.5rem] lg:block lg:h-[calc(100vh-4.5rem)] lg:w-[17.5rem] lg:overflow-y-auto`}
        >
          <div className="px-3 py-5">
            {adminMenu.map((group) => (
              <div key={group.label} className="mb-6 last:mb-2">
                <p className="px-3 pb-2 adm-t-xs font-bold text-exam-muted">{group.label}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <MenuLink
                        item={item}
                        active={
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href)
                        }
                        onNavigate={() => setOpen(false)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Link
              href="/"
              className="mt-2 flex min-h-[2.75rem] items-center gap-2 rounded-md px-3 adm-t-sm font-bold text-exam-muted hover:bg-exam-raised hover:text-exam-text"
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
      // 현재 위치는 색·배경·굵기·왼쪽 막대 네 가지로 동시에 표시한다
      className={`relative flex min-h-[3rem] items-center gap-2 rounded-md py-2 pl-4 pr-3 adm-t-md transition-colors ${
        active
          ? "bg-brand-50 font-black text-brand-900 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-full before:bg-brand-900"
          : "font-bold text-exam-text hover:bg-exam-raised"
      }`}
    >
      <span className="flex-1">{item.label}</span>
      {count > 0 && (
        <span className="shrink-0 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 adm-t-xs font-bold tabular-nums text-rose-700">
          {count}
        </span>
      )}
    </Link>
  );
}

/** 글자 크기 — 세 단계. 지금 단계를 글자로도 보여 준다. */
function ZoomControl({ value }: { value: number }) {
  return (
    <div className="hidden items-center gap-1 rounded-md border border-exam-line p-1 md:flex">
      <span className="px-2 adm-t-xs font-bold text-exam-muted">글자 크기</span>
      {zoomSteps.map((step) => (
        <button
          key={step.value}
          type="button"
          onClick={() => patchAdminPrefs({ zoom: step.value })}
          aria-pressed={value === step.value}
          className={`min-h-[2.5rem] rounded px-3.5 adm-t-sm font-bold transition-colors ${
            value === step.value
              ? "bg-brand-900 text-white"
              : "text-exam-text hover:bg-exam-raised"
          }`}
        >
          {step.label}
        </button>
      ))}
    </div>
  );
}

/** 권한별로 화면이 어떻게 달라지는지 확인하기 위한 역할 전환 (시연용) */
function RoleSwitch({ value }: { value: string }) {
  return (
    <label className="relative hidden lg:block">
      <span className="sr-only">운영자 역할 전환</span>
      <select
        value={value}
        onChange={(e) => patchAdminPrefs({ role: e.target.value as never })}
        className="min-h-[2.75rem] appearance-none rounded-md border border-exam-line bg-white py-2 pl-4 pr-10 adm-t-sm font-bold text-exam-text outline-none focus:border-brand-600"
      >
        {staffRoles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-exam-muted"
      />
    </label>
  );
}
