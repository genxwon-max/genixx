"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminMenu, canAny, pending, roleOf, staffRoles, type AdminMenuItem } from "@/lib/admin";
import { patchAdminPrefs, useAdminPrefs, zoomSteps } from "@/lib/adminStore";
import { MenuIcon, CloseIcon, ChevronDown } from "@/components/Icons";

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
 *  - 상단에 '글자 크기' 버튼을 상시로 둔다.
 *
 * 메뉴는 역할이 가진 권한만 남긴다. 출제자에게 검수 워크벤치를 세워 두면 이해충돌을
 * 막으려고 권한을 갈라 놓은 뜻이 흐려진다(정의서 9장).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const prefs = useAdminPrefs();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = roleOf(prefs.role);

  const groups = adminMenu
    .map((g) => ({ ...g, items: g.items.filter((i) => canAny(prefs.role, i.needs)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="min-h-full bg-[#f4f6fb] text-soft-ink"
      style={{ ["--adm-zoom" as string]: prefs.zoom }}
    >
      {/* ── 상단 바 ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white">
        <div className="flex h-[4.5rem] items-center gap-4 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-md border border-white/20 px-4 adm-t-sm font-bold text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-expanded={open}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            메뉴
          </button>

          <Link href="/admin" className="flex items-baseline gap-2.5">
            <span className="text-2xl font-black tracking-tight text-white">GENIXX</span>
            <span className="adm-t-sm font-bold text-slate-400">관리자 콘솔</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <ZoomControl value={prefs.zoom} />
            <RoleSwitch value={prefs.role} />
            <div className="hidden items-center gap-2.5 border-l border-white/15 pl-4 sm:flex">
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 adm-t-sm font-black text-white"
              >
                {prefs.staffName.slice(1)}
              </span>
              <span className="leading-tight">
                <span className="block adm-t-sm font-bold text-white">{prefs.staffName}</span>
                <span className="block adm-t-xs text-slate-400">{role.short}</span>
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
          } w-full shrink-0 bg-slate-900 text-slate-300 lg:sticky lg:top-[4.5rem] lg:block lg:h-[calc(100vh-4.5rem)] lg:w-[17.5rem] lg:overflow-y-auto`}
        >
          <div className="px-3 py-5">
            {/* 지금 어떤 역할로 보고 있는지 메뉴 맨 위에 적는다 —
                메뉴가 역할마다 달라지므로 "왜 그 항목이 없는지"의 답이 여기 있다 */}
            <div className="mb-5 rounded-lg bg-white/5 px-4 py-3.5">
              <p className="adm-t-sm font-bold text-white">{role.label}</p>
              <p className="mt-1 adm-t-xs leading-relaxed text-slate-400">{role.desc}</p>
            </div>

            {groups.map((group) => (
              <div key={group.label} className="mb-6 last:mb-2">
                <p className="px-3 pb-2 adm-t-xs font-bold text-slate-500">{group.label}</p>
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
        <span className="shrink-0 rounded-md bg-rose-500/20 px-2 py-0.5 adm-t-xs font-bold tabular-nums text-rose-300">
          {count}
        </span>
      )}
    </Link>
  );
}

/** 글자 크기 — 세 단계. 지금 단계를 글자로도 보여 준다. */
function ZoomControl({ value }: { value: number }) {
  return (
    <div className="hidden items-center gap-1 rounded-md border border-white/20 p-1 md:flex">
      <span className="px-2 adm-t-xs font-bold text-slate-400">글자 크기</span>
      {zoomSteps.map((step) => (
        <button
          key={step.value}
          type="button"
          onClick={() => patchAdminPrefs({ zoom: step.value })}
          aria-pressed={value === step.value}
          className={`min-h-[2.5rem] rounded px-3.5 adm-t-sm font-bold transition-colors ${
            value === step.value ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"
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
        className="min-h-[2.75rem] appearance-none rounded-md border border-white/20 bg-white/10 py-2 pl-4 pr-10 adm-t-sm font-bold text-white outline-none focus:border-white/50"
      >
        {staffRoles.map((r) => (
          <option key={r.id} value={r.id} className="text-slate-900">
            {r.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}
