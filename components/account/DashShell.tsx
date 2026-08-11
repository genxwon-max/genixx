"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { roleLabel, signOut, useSession, type Role } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { assessment, deadlineDays } from "@/lib/exam";
import { ChevronDown } from "@/components/Icons";

/**
 * 로그인 후 회원 존의 껍데기 — 좌측 아이콘 레일 + 상단 상태바.
 *
 * 공개 존(마케팅 헤더 + 푸터)과 다른 껍데기를 쓴다. 로그인한 사람에게 필요한 것은
 * 회사 소개 메뉴가 아니라 「지금 어느 회차이고, 내 자리에서 어디로 갈 수 있는가」다.
 * 그래서 상단에는 회차·마감·역할을, 좌측에는 존 이동만 둔다.
 *
 * 메뉴는 사이트맵·메뉴 정의서(2026-08-05, 개발발주용)의 P0 화면에서 뽑았다. 화면 ID를
 * 항목마다 적어 두었으니 정의서와 나란히 놓고 대조할 수 있다. 정의서에 있으나 아직
 * 화면이 없는 것(ORG-02-1 학급 구성 · ORG-05 집단 리포트 · PAY 존 전체)은 넣지 않았다.
 * 눌러서 아무 데도 가지 않는 메뉴를 세우는 것보다 없는 편이 낫다.
 *
 * 반응형은 정의서 12장을 따른다 — 학부모는 모바일 우선이라 좁은 화면에서 레일이
 * 하단 탭으로 내려간다.
 */

type Item = {
  href: string;
  label: string;
  /** 사이트맵 화면 ID */
  sid: string;
  icon: React.ReactNode;
  /** 하위 경로까지 이 항목으로 친다 */
  match?: string[];
};

/* ── 아이콘 (20px 선 아이콘) ── */
const ic = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />
  ),
  exam: (
    <path d="M5 3.5h11l3 3V20.5H5zM15.5 3.5v3.5H19M8.5 12h7M8.5 16h4.5" />
  ),
  report: (
    <path d="M4 20h16M7.5 20v-7M12 20V6.5M16.5 20v-4.5" />
  ),
  child: (
    <path d="M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
  ),
  survey: (
    <path d="M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v15L12 17l-5.5 3V5A1.5 1.5 0 0 1 8 3.5ZM9.5 8.5h5M9.5 12h3" />
  ),
  roster: (
    <path d="M4 6.5h16M4 12h16M4 17.5h10" />
  ),
  ticket: (
    <path d="M3.5 8.5A2 2 0 0 0 5.5 6.5h13a2 2 0 0 0 2 2v2a2 2 0 0 0 0 3v2a2 2 0 0 0-2 2h-13a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-3zM9.5 6.5v11" />
  ),
  settings: (
    <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.75 2.75l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.75-2.75l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3.5a1.94 1.94 0 1 1 0-3.88h.09A1.6 1.6 0 0 0 5.06 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.94 1.94 0 1 1 2.75-2.75l.06.06a1.6 1.6 0 0 0 1.77.32H9.4a1.6 1.6 0 0 0 .97-1.47V3.5a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.75 2.75l-.06.06a1.6 1.6 0 0 0-.32 1.77V9.4a1.6 1.6 0 0 0 1.47.97h.17a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.47.97Z" />
  ),
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 학부모(P) — 정의서 5·6·7장에서 P 권한 P0 화면 */
const parentMenu: Item[] = [
  { href: "/my", label: "홈", sid: "ACC-03", icon: <Icon>{ic.home}</Icon> },
  {
    href: "/exam",
    label: "응시",
    sid: "ASM-01",
    icon: <Icon>{ic.exam}</Icon>,
    match: ["/exam/session", "/exam/prepare"],
  },
  { href: "/exam/result", label: "결과", sid: "RPT-01", icon: <Icon>{ic.report}</Icon> },
  { href: "/my/children", label: "학생", sid: "ACC-03", icon: <Icon>{ic.child}</Icon> },
  { href: "/my/surveys", label: "설문", sid: "ASM-05", icon: <Icon>{ic.survey}</Icon> },
  { href: "/mypage", label: "설정", sid: "ACC-04", icon: <Icon>{ic.settings}</Icon> },
];

/** 기관담당자·교사(I·T) — 정의서 10장 + P0로 이미 있는 응시 존 화면 */
const orgMenu: Item[] = [
  { href: "/org", label: "홈", sid: "ORG-01", icon: <Icon>{ic.home}</Icon> },
  { href: "/my/students", label: "명부", sid: "ORG-02-2", icon: <Icon>{ic.roster}</Icon> },
  { href: "/exam", label: "응시", sid: "ASM-01", icon: <Icon>{ic.exam}</Icon> },
  { href: "/my/surveys", label: "설문", sid: "ORG-06", icon: <Icon>{ic.survey}</Icon> },
  { href: "/exam/payment", label: "응시권", sid: "ORG-03", icon: <Icon>{ic.ticket}</Icon> },
  { href: "/mypage", label: "설정", sid: "ACC-04", icon: <Icon>{ic.settings}</Icon> },
];

function menuFor(role: Role | undefined) {
  return role === "director" || role === "teacher" ? orgMenu : parentMenu;
}

/**
 * 지금 열려 있는 항목의 href.
 *
 * 접두사만 보면 /exam/result에서 「응시」와 「결과」가 함께 켜지고, /my/children에서
 * 「홈」까지 켜진다. 걸리는 것 중 가장 긴 것 하나만 고른다.
 */
function activeHref(menu: Item[], pathname: string) {
  let best = "";
  for (const m of menu) {
    if (m.match?.some((x) => pathname === x || pathname.startsWith(`${x}/`))) return m.href;
    const hit = pathname === m.href || pathname.startsWith(`${m.href}/`);
    if (hit && m.href.length > best.length) best = m.href;
  }
  return best;
}

/* ── 상단 사용자 메뉴 ── */
function UserMenu({ name, role }: { name: string; role: Role | undefined }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-1.5 rounded-full pl-2 pr-2.5 text-[14px] text-soft-ink transition-colors hover:bg-slate-100"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-soft-primary-soft text-[13px] font-bold text-soft-primary">
          {name.slice(0, 1)}
        </span>
        <span className="hidden sm:inline">{name}</span>
        <ChevronDown className="h-4 w-4 text-soft-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-[14px] border border-soft-line bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
        >
          <p className="border-b border-slate-100 px-4 py-3">
            <span className="block text-[14px] font-bold text-soft-ink">{name}</span>
            <span className="mt-0.5 block text-[12.5px] text-soft-muted">
              {role ? roleLabel[role] : "학부모"}
            </span>
          </p>
          <Link
            href="/mypage"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-[14px] text-soft-ink transition-colors hover:bg-slate-50"
          >
            마이페이지
          </Link>
          <Link
            href="/support/inquiry"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-[14px] text-soft-ink transition-colors hover:bg-slate-50"
          >
            1:1 문의
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut();
              router.push("/login");
            }}
            className="block w-full border-t border-slate-100 px-4 py-3 text-left text-[14px] text-soft-muted transition-colors hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 상단 오른쪽 상태 표시.
 * 알약을 세 개 늘어놓으면 헤더가 시끄러워진다. 면을 걷고 가는 선으로만 나눈다.
 */
function Chip({ k, v }: { k: string; v: string }) {
  return (
    <span className="hidden items-center gap-1.5 border-l border-soft-line pl-3 text-[12.5px] first:border-l-0 first:pl-0 md:inline-flex">
      <span className="text-soft-muted">{k}</span>
      <span className="font-medium text-soft-ink">{v}</span>
    </span>
  );
}

export default function DashShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();

  const menu = menuFor(session?.role);
  const current = activeHref(menu, pathname);
  const name = session?.name ?? "회원";
  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent"));
  const dday = hydrated ? deadlineDays() : null;

  return (
    <div className="flex min-h-full bg-[#f4f6fb] text-soft-ink">
      {/* 좌측 레일 — 넓은 화면 */}
      <aside className="sticky top-0 hidden h-screen w-[4.75rem] shrink-0 flex-col border-r border-soft-line bg-white lg:flex">
        <Link
          href="/"
          className="flex h-[4rem] items-center justify-center text-[15px] font-extrabold tracking-[0.1em] text-soft-primary"
        >
          GX
        </Link>
        <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-1 px-2 py-3">
          {menu.map((m) => {
            const on = m.href === current;
            return (
              <Link
                key={m.label}
                href={m.href}
                aria-current={on ? "page" : undefined}
                title={`${m.label} · ${m.sid}`}
                className={`flex flex-col items-center gap-1 rounded-[12px] py-2.5 text-[11px] font-semibold transition-colors ${
                  on
                    ? "bg-soft-primary-soft text-soft-primary"
                    : "text-soft-muted hover:bg-slate-50 hover:text-soft-ink"
                }`}
              >
                {m.icon}
                {m.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단 상태바 */}
        <header className="sticky top-0 z-20 border-b border-soft-line bg-white">
          <div className="flex h-[4rem] items-center gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="text-[18px] font-extrabold tracking-[0.14em] text-soft-primary lg:hidden"
            >
              GENIXX
            </Link>
            <span className="hidden text-[15px] font-bold lg:inline">
              {isOrg ? (session?.org ?? "소속 기관") : `${name}님`}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <Chip k="회차" v={assessment.round} />
              {dday !== null && (
                <Chip k="응시 마감" v={dday > 0 ? `D-${dday}` : dday === 0 ? "오늘" : "마감"} />
              )}
              <Chip k={isOrg ? "등록 학생" : "등록 학생"} v={`${hydrated ? mine.length : 0}명`} />
              <UserMenu name={name} role={session?.role} />
            </div>
          </div>
        </header>

        {/* 본문 폭·여백은 여기서 한 번만 정한다. 하위 화면(/my/children 등)이 저마다
            컨테이너를 두지 않아도 레일에 딱 붙지 않는다. */}
        <main className="mx-auto w-full max-w-[64rem] flex-1 px-4 pb-[5.25rem] pt-5 sm:px-6 sm:pt-6 lg:pb-8">
          {children}
        </main>

        <nav
          aria-label="주 메뉴"
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-soft-line bg-white lg:hidden"
        >
          {menu.map((m) => {
            const on = m.href === current;
            return (
              <Link
                key={m.label}
                href={m.href}
                aria-current={on ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  on ? "text-soft-primary" : "text-soft-muted"
                }`}
              >
                {m.icon}
                {m.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
