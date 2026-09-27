"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { roleLabel, signOut, useSession, type Role } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { ChevronDown } from "@/components/Icons";
import { LogoLockup } from "@/components/Logo";
import { useSelf } from "@/components/student/self";

/**
 * 로그인 후 회원 존의 껍데기 — 좌측 아이콘 레일 + 상단 상태바.
 *
 * 공개 존(마케팅 헤더 + 푸터)과 다른 껍데기를 쓴다. 로그인한 사람에게 필요한 것은
 * 회사 소개 메뉴가 아니라 「내 자리에서 어디로 갈 수 있는가」다. 그래서 상단에는 등록
 * 학생 수와 계정만, 좌측에는 존 이동만 둔다. 회차·마감은 뺐다 — 보호자가 손댈 수 없는
 * 값이라 늘 켜 두면 배경이 되고, 회차는 결과·접수 화면이 저마다 자기 자리에서 말한다.
 *
 * 메뉴는 사이트맵·메뉴 정의서(2026-08-05, 개발발주용)의 P0 화면에서 뽑았다. 화면 ID를
 * 항목마다 적어 두었으니 정의서와 나란히 놓고 대조할 수 있다. 정의서에 있으나 아직
 * 화면이 없는 것(ORG-02-1 학급 구성 · ORG-05 집단 리포트)은 넣지 않았다. 눌러서 아무
 * 데도 가지 않는 메뉴를 세우는 것보다 없는 편이 낫다.
 *
 * 레일은 셋이다 — 학부모(/my) · 학생(/student) · 기관(/org). 학부모와 학생은 **주소로**
 * 가른다(menuFor). 한 주소에서 역할만 보고 갈랐을 때는 같은 화면이 두 사람 것이 되어,
 * 학생 쪽을 고치면 보호자 쪽이 함께 흔들렸다.
 *
 * 실제 응시(ASM-01)는 여기 없다. 학생 레일은 응시 존(/exam)으로 건너가는 길만 두고,
 * 문항을 푸는 자리는 시험지 껍데기(app/(exam)/layout.tsx)가 따로 두른다.
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
  pay: (
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5zM3.5 10h17M6.5 14.5h3" />
  ),
  talk: (
    <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7.5L8 20v-3.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5ZM7 9.5h10M7 12.5h6" />
  ),
  /** 시험지 — 학생의 「내 평가」 */
  paper: (
    <path d="M6.5 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM9 8h6M9 11.5h6M9 15h3.5" />
  ),
  /** 사람 하나 — 학생 자기 정보 */
  me: (
    <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.5 20c0-3.1 2.9-5.2 6.5-5.2s6.5 2.1 6.5 5.2" />
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
  { href: "/exam/result", label: "결과", sid: "RPT-01", icon: <Icon>{ic.report}</Icon> },
  { href: "/my/children", label: "학생", sid: "ACC-03", icon: <Icon>{ic.child}</Icon> },
  /* 결제·면담은 학생·설문 바로 밑에 둔다 — 아이를 등록하면 응시권을 사야 하고, 설문을
     내고 나면 결과를 놓고 이야기할 자리를 찾는다. 하려는 일의 차례가 곧 메뉴 차례다.
     면담은 정의서에 번호가 없어 설문 다음 번호를 임시로 붙였다(확정되면 함께 고친다). */
  { href: "/my/payments", label: "결제", sid: "PAY-03", icon: <Icon>{ic.pay}</Icon> },
  { href: "/my/surveys", label: "설문", sid: "ASM-05", icon: <Icon>{ic.survey}</Icon> },
  { href: "/my/interviews", label: "면담", sid: "ASM-06", icon: <Icon>{ic.talk}</Icon> },
  { href: "/mypage", label: "설정", sid: "ACC-04", icon: <Icon>{ic.settings}</Icon> },
];

/**
 * 학생(S) — 주소로 갈라 둔 학생 대시보드(/student).
 *
 * 학부모 메뉴를 그대로 물려주지 않는다. 아이에게 필요한 것은 **내가 볼 시험과 내 결과**
 * 하나뿐이고, 학생 등록·결제·면담처럼 보호자가 하는 일은 눌러 봐야 「보호자 계정에서
 * 확인하세요」만 나온다. 그래서 학생 등록은 이 레일에 아예 없다.
 *
 * 응시도 이 레일 안에서 한다 — 「평가 보기」가 과목 셋을 바로 펴고, 누르면 응시 창이
 * 뜬다. 접수(/exam/apply)와 정답·해설만 아직 응시 존에 남아 있다.
 */
const studentMenu: Item[] = [
  { href: "/student", label: "홈", sid: "ACC-03", icon: <Icon>{ic.home}</Icon> },
  { href: "/student/exams", label: "평가 보기", sid: "ASM-01", icon: <Icon>{ic.paper}</Icon> },
  { href: "/student/results", label: "응시 결과", sid: "RPT-01", icon: <Icon>{ic.report}</Icon> },
  { href: "/student/surveys", label: "설문", sid: "ASM-04", icon: <Icon>{ic.survey}</Icon> },
  { href: "/student/account", label: "내 정보", sid: "ACC-04", icon: <Icon>{ic.me}</Icon> },
];

/**
 * 학생(S) 가운데 **만 14세 이상** — 위 레일에 결제와 면담이 더 선다.
 *
 * 나이로 레일을 가르는 까닭은 법이 그 자리에서 갈리기 때문이다. 만 14세부터는 개인정보
 * 수집·이용에 본인이 동의할 수 있어(개인정보보호법 제22조의2) 학생에게 자기 계정과 자기
 * 연락처가 있고, 응시권을 사고 면담 시각을 잡는 일도 본인이 한다. 미만인 아이의 돈과
 * 약속은 실제로 보호자가 다루므로, 그 레일에 결제를 세우면 눌러 봐야 「보호자 계정에서」
 * 만 나온다 — 그래서 세우지 않는다.
 *
 * 결제가 본인 몫이 되었다고 계약까지 혼자 되는 것은 아니다. 만 19세 미만은 여전히
 * 미성년이라 결제 화면에서 법정대리인 동의를 한 칸 더 받는다(lib/account.ts의
 * MAJORITY_AGE · 결제 화면의 selfId 갈래).
 *
 * 차례는 보호자 레일과 같게 둔다 — 결제 · 설문 · 면담. 하려는 일의 차례가 곧 메뉴 차례다.
 */
const studentTeenMenu: Item[] = [
  { href: "/student", label: "홈", sid: "ACC-03", icon: <Icon>{ic.home}</Icon> },
  { href: "/student/exams", label: "평가 보기", sid: "ASM-01", icon: <Icon>{ic.paper}</Icon> },
  { href: "/student/results", label: "응시 결과", sid: "RPT-01", icon: <Icon>{ic.report}</Icon> },
  { href: "/student/payments", label: "결제", sid: "PAY-03", icon: <Icon>{ic.pay}</Icon> },
  { href: "/student/surveys", label: "설문", sid: "ASM-04", icon: <Icon>{ic.survey}</Icon> },
  { href: "/student/interviews", label: "면담", sid: "ASM-06", icon: <Icon>{ic.talk}</Icon> },
  { href: "/student/account", label: "내 정보", sid: "ACC-04", icon: <Icon>{ic.me}</Icon> },
];

/** 기관담당자·교사(I·T) — 정의서 10장 + P0로 이미 있는 응시 존 화면 */
const orgMenu: Item[] = [
  { href: "/org", label: "홈", sid: "ORG-01", icon: <Icon>{ic.home}</Icon> },
  { href: "/my/students", label: "명부", sid: "ORG-02-2", icon: <Icon>{ic.roster}</Icon> },
  { href: "/exam/result", label: "결과", sid: "RPT-01", icon: <Icon>{ic.report}</Icon> },
  { href: "/my/surveys", label: "설문", sid: "ORG-06", icon: <Icon>{ic.survey}</Icon> },
  { href: "/exam/payment", label: "응시권", sid: "ORG-03", icon: <Icon>{ic.ticket}</Icon> },
  { href: "/mypage", label: "설정", sid: "ACC-04", icon: <Icon>{ic.settings}</Icon> },
];

/**
 * 승인 전 계정 — 볼 수 있는 데이터가 없다. 명부·결과를 세워 두면 눌러 봐야 빈 화면이라
 * 승인 진행 상태와 설정만 남긴다.
 */
const pendingMenu: Item[] = [
  { href: "/my/pending", label: "승인 대기", sid: "ACC-01-4", icon: <Icon>{ic.home}</Icon> },
  { href: "/mypage", label: "설정", sid: "ACC-04", icon: <Icon>{ic.settings}</Icon> },
];

/** 학생 대시보드인가 — 주소가 정한다 */
export function isStudentZone(pathname: string) {
  return pathname === "/student" || pathname.startsWith("/student/");
}

/**
 * 어느 레일을 세울지 고른다.
 *
 * 학생과 학부모는 **주소로 가른다**(/student · /my). 역할만 보고 갈랐을 때는 한 화면이
 * 두 사람 것이 되어, 어느 쪽 화면을 손보는지 코드에서도 눌러 보는 자리에서도 흐렸다.
 * 주소가 다르면 링크 하나로 「네 자리」를 보여 줄 수 있고, 학생 화면을 세우는 동안
 * 보호자 화면을 건드리지 않는다.
 *
 * 기관(/org)은 아직 역할로 남긴다 — 명부(/my/students)처럼 주소를 학부모와 나눠 쓰는
 * 화면이 있어서, 주소만 보면 기관 회원이 학부모 레일을 보게 된다.
 */
function menuFor(role: Role | undefined, approved: boolean, pathname: string, teen: boolean) {
  if (isStudentZone(pathname)) return teen ? studentTeenMenu : studentMenu;
  if (!approved) return pendingMenu;
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
function UserMenu({
  name,
  role,
  myHref,
}: {
  name: string;
  role: Role | undefined;
  /** 「마이페이지」가 가는 곳 — 학생 자리에서는 학생 정보 화면이다 */
  myHref: string;
}) {
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
              {role ? roleLabel[role] : "회원"}
            </span>
          </p>
          <Link
            href={myHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-[14px] text-soft-ink transition-colors hover:bg-slate-50"
          >
            마이페이지
          </Link>
          <a
            href="/support/inquiry"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-[14px] text-soft-ink transition-colors hover:bg-slate-50"
          >
            1:1 문의
          </a>
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

  // 승인 전에는 레일을 줄인다. 세션이 아직 없는 동안(하이드레이션 전)은 정상으로 본다.
  const approved = session?.approved !== false;
  const isStudent = isStudentZone(pathname);
  /* 학생 레일의 나이 갈래는 **화면이 보고 있는 아이**로 센다(useSelf). 아래의 self는
     세션의 studentId만 보므로, 보호자가 아이 화면을 확인하러 들어왔을 때 비어 있다 —
     그 자리에서 레일과 본문이 서로 다른 아이를 말하지 않게 한 곳에서 읽는다. */
  const asStudent = useSelf();
  const menu = menuFor(session?.role, approved, pathname, asStudent.teen);
  const current = activeHref(menu, pathname);
  const isOrg = !isStudent && (session?.role === "director" || session?.role === "teacher");
  const mine = roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent"));
  /* 학생 자리에서는 이름도 명부에서 읽는다 — 접속코드로 들어온 세션의 name과 명부가
     어긋났을 때(개명·오타 수정) 화면에 뜨는 것은 명부 쪽이어야 한다 */
  const self = session?.studentId ? roster.find((s) => s.id === session.studentId) : undefined;
  const name = (isStudent ? (self?.name ?? session?.name) : session?.name) ?? (isStudent ? "학생" : "회원");

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
          {menu.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              aria-current={m.href === current ? "page" : undefined}
              title={m.label}
              className={`flex w-full flex-col items-center gap-1 rounded-[12px] py-2.5 text-[11px] font-semibold transition-colors ${
                m.href === current
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
        {/* 상단 상태바 */}
        <header className="sticky top-0 z-20 border-b border-soft-line bg-white">
          <div className="flex h-[4rem] items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="lg:hidden" aria-label="GENIXX 홈">
              <LogoLockup tone="soft" className="text-[1.125rem]" />
            </Link>
            <span className="hidden text-[15px] font-bold lg:inline">
              {isOrg ? (session?.org ?? "소속 기관") : `${name}님`}
            </span>

            <div className="ml-auto flex items-center gap-3">
              {/* 학생 자리에는 「등록 학생」이 없다 — 아이가 아이를 등록하지 않는다.
                  그 자리에 학교·학년을 적어, 내 화면이 맞는지 한 눈에 확인하게 한다 */}
              {isStudent ? (
                (self?.grade || self?.school) && (
                  <Chip k="학년" v={hydrated ? (self?.grade ?? self?.school ?? "—") : "—"} />
                )
              ) : (
                <Chip k="등록 학생" v={`${hydrated ? mine.length : 0}명`} />
              )}
              <UserMenu
                name={name}
                role={isStudent ? "student" : session?.role}
                myHref={isStudent ? "/student/account" : "/mypage"}
              />
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
          {menu.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              aria-current={m.href === current ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                m.href === current ? "text-soft-primary" : "text-soft-muted"
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
