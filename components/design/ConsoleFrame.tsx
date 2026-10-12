import Link from "next/link";
import { admin2Nav } from "@/lib/admin2";

/**
 * 운영 콘솔 껍데기의 디자인용 사본 — 왼쪽 메뉴 · 상단 바 · 본문 판.
 *
 * 실제 껍데기(components/admin2/Shell.tsx)는 로그인과 화면 권한을 저장소에서 읽어 그린다.
 * 디자인 화면은 누가 열어도 같아야 하므로, 로그인한 사람과 메뉴의 건수를 여기 적어 둔다.
 * 모양은 같은 클래스(admin2.css)를 그대로 쓴다.
 *
 * 메뉴에는 새 화면 둘(운영 지표 · 면담 상품)이 들어가 있다 — 실제 메뉴(lib/admin2.ts)에는
 * 아직 없는 항목이다.
 *
 * 콘솔에 들어오는 사람은 두 부류다. **최상위 관리자**는 서비스를 열 때부터 있는 계정이고,
 * 나머지는 모두 사이트에서 전문가로 가입해 가입 승인에서 권한을 받은 **전문가 회원**이다.
 * 전문가에게는 받은 권한의 화면만 메뉴에 보인다(only).
 *
 * 왼쪽 메뉴 맨 아래의 「내 정보」는 어느 권한으로 들어와도 같은 자리에 있다. 권한마다 내 정보
 * 화면이 다르므로 갈 주소는 화면이 넘긴다(meHref).
 */

type NavItem = { label: string; href: string; count?: number; expertOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

/** 브라우저 저장소에서 세던 건수 — 디자인에서는 고정 값 */
const liveCounts = { drafts: 3, review: 4, approvals: 3, grading: 6, interviews: 8 };

/** 그룹 이름 → 그 그룹에서 「앞 항목」 뒤에 끼울 새 화면 */
const added: Record<string, { after: string; item: NavItem }> = {
  운영: { after: "/admin2", item: { label: "운영 지표", href: "/design/admin2/metrics" } },
  "면담 관리": {
    after: "/admin2/counselors",
    item: { label: "면담 상품", href: "/design/admin2/consult-products" },
  },
};

const fullNav: NavGroup[] = admin2Nav.map((g) => {
  const items: NavItem[] = g.items.map((it) => ({
    label: it.label,
    href: it.href,
    count: it.live ? liveCounts[it.live] : it.count,
    expertOnly: it.expertOnly,
  }));
  const extra = added[g.label];
  if (extra) {
    const at = items.findIndex((it) => it.href === extra.after);
    items.splice(at + 1, 0, extra.item);
  }
  return { label: g.label, items };
});

/** 상단 바에 적는 「누구로 들어와 있나」 */
export type ConsoleMe = { name: string; role: string; loginId: string };

/** 최상위 관리자의 「내 정보」 디자인 주소 */
const ME_HREF = "/design/admin2/me";

/** 처음부터 있는 계정 — 서비스를 열 때 DB에 넣어 두는 최상위 관리자 */
export const superAdmin: ConsoleMe = { name: "박서준", role: "최상위 관리자", loginId: "admin.park" };

export default function ConsoleFrame({
  at,
  crumb,
  me = superAdmin,
  meHref = ME_HREF,
  only,
  children,
}: {
  /** 왼쪽 메뉴에서 켜 둘 항목의 주소 */
  at: string;
  /** 메뉴에 없는 화면(내 정보)의 이름 — 상단 바의 현재 위치에 적는다 */
  crumb?: string;
  /** 로그인한 사람. 넘기지 않으면 최상위 관리자다 */
  me?: ConsoleMe;
  /** 이 사람의 「내 정보」 디자인 주소. 넘기지 않으면 최상위 관리자의 것이다 */
  meHref?: string;
  /**
   * 권한을 받은 화면만 보이는 사람(전문가)의 메뉴 — 이 주소들만 남긴다.
   * 넘기지 않으면 최상위 관리자의 메뉴(전문가 전용 화면을 뺀 전부)다.
   */
  only?: string[];
  children: React.ReactNode;
}) {
  const nav = fullNav
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => (only ? only.includes(it.href) : !it.expertOnly)),
    }))
    .filter((g) => g.items.length > 0);
  const group = nav.find((g) => g.items.some((it) => it.href === at));
  const here = group?.items.find((it) => it.href === at);
  /* 메뉴에 없는 화면에서는 첫 그룹을 펴 둔다 — 실제 껍데기와 같다 */
  const opened = group ?? nav[0];

  return (
    <div className="a2-shell">
      <div className="a2-zoombar">
        <span>글자 크기</span>
        <button type="button" className="a2-zoom-btn" aria-label="글자 크기 줄이기">
          －
        </button>
        <span className="a2-mono min-w-[2.5rem] text-center text-(--a2-side-ink)">100%</span>
        <button type="button" className="a2-zoom-btn" aria-label="글자 크기 키우기">
          ＋
        </button>
        <span className="invisible px-1.5">원래대로</span>
      </div>

      <div className="a2-scaled flex min-h-(--a2-screen)">
        <aside className="a2-side sticky top-(--a2-top) hidden h-(--a2-screen) w-[216px] shrink-0 flex-col bg-(--a2-side) lg:flex">
          <div className="flex h-10 items-center gap-2 border-b border-(--a2-side-line) px-3">
            <Link href="/admin2" className="flex items-baseline gap-1.5 text-white">
              <span className="font-brand text-[0.9375rem] font-semibold leading-none">GENIXX</span>
              <span className="a2-t-xs font-bold text-(--a2-side-ink-2)">CONSOLE</span>
            </Link>
          </div>

          <nav aria-label="콘솔 메뉴" className="flex-1 overflow-y-auto px-2 py-2">
            {nav.map((g) => {
              const shown = g === opened;
              const waiting = g.items.reduce((sum, it) => sum + (it.count ?? 0), 0);
              return (
                <div key={g.label} className="mb-1">
                  <button type="button" className="a2-nav-group" aria-expanded={shown}>
                    <span aria-hidden className="a2-nav-caret">
                      {shown ? "▾" : "▸"}
                    </span>
                    {g.label}
                    {!shown && waiting > 0 && <span className="a2-nav-count">{waiting}</span>}
                  </button>
                  {shown && (
                    <ul className="a2-nav-list">
                      {g.items.map((it) => (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            className="a2-nav-item"
                            aria-current={it.href === at ? "page" : undefined}
                          >
                            {it.label}
                            {it.count ? <span className="a2-nav-count">{it.count}</span> : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-(--a2-side-line) p-2">
            <Link
              href={meHref}
              className="a2-nav-item"
              aria-current={at === "/admin2/me" ? "page" : undefined}
            >
              내 정보
            </Link>
            <button type="button" className="a2-nav-item w-full justify-between">
              화면 찾기
              <span className="a2-kbd border-(--a2-side-line) bg-(--a2-side-2) text-(--a2-side-ink-2)">
                ⌘K
              </span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-(--a2-top) z-20 flex h-10 items-center gap-2 border-b border-(--a2-side-line) bg-(--a2-side) px-3">
            <button type="button" className="a2-btn a2-btn-sm a2-btn-dark lg:hidden">
              메뉴
            </button>
            <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1.5">
              <span className="a2-t-sm text-(--a2-side-ink-2)">{group?.label ?? "콘솔"}</span>
              <span aria-hidden className="a2-t-sm text-(--a2-side-ink-2)">
                /
              </span>
              <span className="truncate a2-t-sm font-bold text-white">{here?.label ?? crumb ?? "—"}</span>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="a2-btn a2-btn-sm a2-btn-dark hidden sm:inline-flex">
                화면 찾기
                <span className="a2-kbd border-(--a2-side-line) bg-(--a2-side) text-(--a2-side-ink-2)">
                  ⌘K
                </span>
              </button>
              <Link
                href={meHref}
                title="내 정보"
                className="hidden min-w-0 items-center gap-2 border-l border-(--a2-side-line) pl-2 hover:opacity-80 sm:flex"
              >
                <span
                  aria-hidden
                  className="a2-t-xs flex h-6 w-6 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-side-2) font-bold text-white"
                >
                  {me.name.slice(0, 1)}
                </span>
                <span className="truncate a2-t-sm font-bold text-white">{me.name}</span>
                <span className="hidden truncate a2-t-xs text-(--a2-side-ink-2) md:inline">
                  {me.role} · <span className="a2-mono">{me.loginId}</span>
                </span>
              </Link>
              <button type="button" className="a2-btn a2-btn-sm a2-btn-dark">
                로그아웃
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4">
            <div className="a2-panel overflow-clip">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

/**
 * 콘솔의 확인 창 — 화면 가운데에 뜨는 작은 판.
 *
 * 실제 화면의 창(components/admin2/EditGuard.tsx의 LeaveDialog)과 같은 모양이다. 디자인에서는
 * 열린 채로 그려 두고, 닫는 단추는 창이 닫힌 상태의 주소로 이어 둔다.
 */
export function ConsoleDialog({
  title,
  wide = false,
  children,
  actions,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`a2-panel w-full p-5 shadow-[var(--a2-shadow)] ${wide ? "max-w-[34rem]" : "max-w-[26rem]"}`}
      >
        <h2 className="a2-h">{title}</h2>
        <div className="mt-2 a2-t-sm leading-[1.6] text-(--a2-ink-2)">{children}</div>
        <div className="mt-4 flex flex-wrap justify-end gap-1.5">{actions}</div>
      </div>
    </div>
  );
}
