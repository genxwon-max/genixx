"use client";

import Link from "next/link";
import { parentMenu, studentMenu, studentTeenMenu } from "@/components/account/DashShell";
import { ChevronDown } from "@/components/Icons";
import { LogoLockup } from "@/components/Logo";

/**
 * 회원 대시보드 껍데기의 디자인용 사본 — 왼쪽 레일 · 상단 바 · 본문.
 *
 * 실제 껍데기(components/account/DashShell.tsx)는 로그인한 사람과 등록 학생을 저장소에서
 * 읽는다. 디자인 화면은 누가 열어도 같아야 하므로 이름 · 학생 수 · 알림 수를 넘겨받아 그대로
 * 그린다. 레일의 메뉴와 아이콘은 실제 껍데기의 것을 가져다 쓴다.
 *
 * 실제 껍데기와 다른 점은 하나 — 상단 바에 **알림 종**이 있다(WBS 7.1.1 · M.2.14).
 */

export type DashWho = "parent" | "student" | "teen";

const menus = { parent: parentMenu, student: studentMenu, teen: studentTeenMenu };

/** 화면마다 되풀이하는 껍데기 값 — 보호자 · 학생(만 14세 미만) · 학생(만 14세 이상) */
export const dashPeople = {
  parent: { name: "김지은", chip: { k: "등록 학생", v: "2명" } },
  student: { name: "이서준", chip: { k: "학년", v: "초등 4학년" } },
  teen: { name: "이하윤", chip: { k: "학년", v: "중학 2학년" } },
} as const;

export default function DashFrame({
  who,
  at,
  unread,
  bellHref,
  bellOpen = false,
  panel,
  children,
}: {
  who: DashWho;
  /** 레일에서 켜 둘 항목의 주소 */
  at: string;
  /** 읽지 않은 알림 수 — 0이면 종에 숫자를 달지 않는다 */
  unread: number;
  /** 종을 누르면 가는 주소 — 알림 목록이 열린 상태(열려 있을 때는 닫힌 상태) */
  bellHref: string;
  bellOpen?: boolean;
  /** 종 아래에 펼칠 알림 목록 */
  panel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const menu = menus[who];
  const me = dashPeople[who];

  return (
    <div className="flex min-h-full bg-[#f4f6fb] text-soft-ink">
      <aside className="sticky top-0 hidden h-screen w-[4.75rem] shrink-0 flex-col border-r border-soft-line bg-white lg:flex">
        <Link
          href="/"
          className="flex h-[4rem] items-center justify-center text-[15px] font-extrabold tracking-[0.1em] text-soft-primary"
        >
          GX
        </Link>
        <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-1 px-2 py-3">
          {menu.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              aria-current={m.href === at ? "page" : undefined}
              title={m.label}
              className={`flex w-full flex-col items-center gap-1 rounded-[12px] py-2.5 text-[11px] font-semibold transition-colors ${
                m.href === at
                  ? "bg-soft-primary-soft text-soft-primary"
                  : "text-soft-muted hover:bg-slate-50 hover:text-soft-ink"
              }`}
            >
              {m.icon}
              {m.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-soft-line bg-white">
          <div className="flex h-[4rem] items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="lg:hidden" aria-label="GENIXX 홈">
              <LogoLockup tone="soft" className="text-[1.125rem]" />
            </Link>
            <span className="hidden text-[15px] font-bold lg:inline">{me.name}님</span>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-[12.5px] md:inline-flex">
                <span className="text-soft-muted">{me.chip.k}</span>
                <span className="font-medium text-soft-ink">{me.chip.v}</span>
              </span>

              {/* 알림 종 — 읽지 않은 알림 수를 빨간 숫자로 단다. 누르면 바로 아래에 목록이 펼쳐진다 */}
              <div className="relative">
                <Link
                  href={bellHref}
                  aria-label={unread > 0 ? `알림, 읽지 않은 알림 ${unread}건` : "알림"}
                  aria-expanded={bellOpen}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-slate-100 ${
                    bellOpen ? "bg-soft-primary-soft text-soft-primary" : "text-soft-ink"
                  }`}
                >
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
                    <path d="M6 10a6 6 0 1 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5ZM10 19.5a2 2 0 0 0 4 0" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                      {unread}
                    </span>
                  )}
                </Link>
                {panel}
              </div>

              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-full pl-2 pr-2.5 text-[14px] text-soft-ink transition-colors hover:bg-slate-100"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-soft-primary-soft text-[13px] font-bold text-soft-primary">
                  {me.name.slice(0, 1)}
                </span>
                <span className="hidden sm:inline">{me.name}</span>
                <ChevronDown className="h-4 w-4 text-soft-muted" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[64rem] flex-1 px-4 pb-[5.25rem] pt-5 sm:px-6 sm:pt-6 lg:pb-8">
          {children}
        </main>

        <nav
          aria-label="주 메뉴"
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-soft-line bg-white lg:hidden"
        >
          {menu.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              aria-current={m.href === at ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                m.href === at ? "text-soft-primary" : "text-soft-muted"
              }`}
            >
              {m.icon}
              {m.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ───────────────────────── 알림 목록 ───────────────────────── */

export type Alert = {
  /** 무엇에 대한 알림인가 — 줄 맨 앞의 작은 분류 */
  kind: "진단" | "결제" | "결과" | "설문" | "면담" | "학생" | "안내";
  title: string;
  body: string;
  /** 언제 — 「방금 전」 · 「3시간 전」 · 「10.08」 */
  at: string;
  unread?: boolean;
};

/** 알림 한 줄 — 종 아래 목록과 전체 보기 화면이 같이 쓴다 */
export function AlertRow({ a, roomy = false }: { a: Alert; roomy?: boolean }) {
  return (
    <li
      className={`flex gap-3 border-b border-slate-100 last:border-b-0 ${roomy ? "px-5 py-4 sm:px-6" : "px-4 py-3.5"} ${
        a.unread ? "bg-soft-primary-soft/40" : ""
      }`}
    >
      {/* 읽지 않은 줄은 파란 점으로 표시한다 — 읽은 줄도 자리는 비워 두어 글 머리가 맞는다 */}
      <span
        aria-hidden
        className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${a.unread ? "bg-soft-primary" : "bg-transparent"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[12px] font-semibold text-soft-primary">{a.kind}</span>
          <span className={`text-[14px] text-soft-ink ${a.unread ? "font-bold" : "font-medium"}`}>
            {a.title}
          </span>
        </p>
        <p className="mt-1 text-[13px] leading-[1.65] text-soft-muted">{a.body}</p>
        <p className="mt-1.5 text-[12px] tabular-nums text-slate-400">
          {a.at}
          {a.unread && <span className="sr-only"> · 읽지 않음</span>}
        </p>
      </div>
    </li>
  );
}

/**
 * 종 아래에 펼쳐지는 알림 목록.
 *
 * 최근 알림 몇 건만 보여 주고, 나머지는 「전체 보기」로 넘긴다. 좁은 화면에서는 화면 폭에
 * 맞춰 줄어든다.
 */
export function BellPanel({
  alerts,
  allHref,
  settingsHref,
}: {
  alerts: Alert[];
  /** 「전체 보기」가 가는 주소 — 학생 화면에는 전체 보기가 없어 넘기지 않는다 */
  allHref?: string;
  /** 「알림 설정」이 가는 주소 — 학생은 알림을 고르지 않는다 */
  settingsHref?: string;
}) {
  const unread = alerts.filter((a) => a.unread).length;
  return (
    <div
      role="dialog"
      aria-label="알림"
      className="absolute right-0 top-11 z-30 w-[23rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[14px] border border-soft-line bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:w-auto"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-[15px] font-bold text-soft-ink">
          알림
          {unread > 0 && (
            <span className="ml-1.5 text-[13px] font-semibold text-soft-primary">새 알림 {unread}건</span>
          )}
        </p>
        {unread > 0 && (
          <button type="button" className="text-[12.5px] font-semibold text-soft-muted hover:text-soft-ink">
            모두 읽음으로 표시
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-[14px] font-bold text-soft-ink">새 알림이 없습니다</p>
          <p className="mt-1.5 text-[13px] leading-[1.7] text-soft-muted">
            진단 일정, 결제, 결과 발행 소식이 생기면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <ul className="max-h-[26rem] overflow-y-auto">
          {alerts.map((a) => (
            <AlertRow key={a.title + a.at} a={a} />
          ))}
        </ul>
      )}

      {(allHref || settingsHref) && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          {allHref && (
            <Link href={allHref} className="text-[13px] font-semibold text-soft-primary hover:underline">
              전체 보기
            </Link>
          )}
          {settingsHref && (
            <Link href={settingsHref} className="text-[13px] font-medium text-soft-muted hover:text-soft-ink">
              알림 설정
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 확인 창 ───────────────────────── */

/**
 * 회원 화면의 확인 창 — 실제 화면의 창(components/account/ConfirmDialog.tsx)과 같은 모양이다.
 * 디자인에서는 열린 채로 그려 두고, 단추는 넘겨받은 그대로 세운다.
 */
export function SoftDialog({
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
    >
      <div
        className={`w-full rounded-[16px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-7 ${
          wide ? "max-w-[30rem]" : "max-w-[26rem]"
        }`}
      >
        <h2 className="text-[18px] font-bold text-soft-ink">{title}</h2>
        <div className="mt-2.5 text-[14px] leading-relaxed text-soft-muted">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </div>
  );
}

/** 확인 창의 단추 모양 — 취소(테두리) · 실행(파랑) · 되돌릴 수 없는 실행(빨강) */
export const softBtn = {
  cancel:
    "inline-flex min-h-[2.875rem] items-center justify-center rounded-full border border-soft-line bg-white px-7 text-[15px] font-semibold text-soft-ink transition-colors hover:bg-slate-50",
  primary:
    "inline-flex min-h-[2.875rem] items-center justify-center rounded-full bg-soft-primary px-7 text-[15px] font-semibold text-white transition-colors hover:bg-soft-primary-dark",
  danger:
    "inline-flex min-h-[2.875rem] items-center justify-center rounded-full bg-[#c8382c] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#a92e24]",
};
