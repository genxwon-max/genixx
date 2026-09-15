"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { admin2Nav, findAdmin2 } from "@/lib/admin2";
import { roleOf } from "@/lib/admin";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  adminSignOut,
  bumpZoom,
  patchAdminPrefs,
  useAdminPrefs,
} from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { useItems } from "@/lib/itemStore";
import { scoreDone, useExpert } from "@/lib/expertStore";
import { useInterviewDesk } from "@/lib/interviewStore";
import { usePendingApprovals } from "@/lib/approvalStore";
import ConsoleGate from "./ConsoleGate";
import Palette from "./Palette";

/**
 * 콘솔 껍데기 — 어두운 왼쪽 기둥(216px) + 같은 색 상단 바(40px) + 밝은 본문.
 *
 * 본문은 화면마다 판 하나다. 껍데기가 그 판을 두르고, 화면은 그 안을 채운다 — 목록
 * 화면만 제 판을 두르고 나머지는 회색 바탕에 판 여럿을 흩어 놓았더니 화면마다 「어디까지가
 * 이 화면인가」가 달랐다. 판을 여기서 한 번만 두르면 그 물음이 화면 밖으로 나간다.
 *
 * 기둥과 상단 바를 같은 색으로 둔다. 상단 바가 희면 기둥 위쪽에서 어두운 면이 끊기고,
 * 그 자리에 흰 띠 하나가 가로로 누워 본문의 흰 판과 붙어 보인다 — 어디까지가 껍데기이고
 * 어디부터가 화면인지가 그 줄에서 흐려진다. 둘을 같은 색으로 두면 껍데기가 ㄱ자로 한
 * 덩어리가 되고, 본문은 그 안에 놓인 흰 판 하나가 된다.
 *
 * 맨 위에는 /admin처럼 글자 크기(－ ＋) 띠를 한 줄 둔다. 한동안 「밀도가 곧 성능이고,
 * 배율을 열면 표 열 폭이 화면마다 달라진다」며 두지 않았다. 그래도 13px을 하루 종일 읽는
 * 자리라 크기를 맞출 길은 콘솔이 줘야 한다 — 브라우저 확대는 주소(호스트) 단위로 기억되어
 * 같은 사이트의 회원 화면까지 함께 커진다. 배율은 콘솔 전체에 zoom으로 건다(admin2.css
 * .a2-shell 주석).
 *
 * 로그인한 사람은 상단 바의 로그아웃 바로 왼쪽에 적는다. 기둥 맨 아래에 두었을 때는
 * 「누구로 들어와 있나」가 왼쪽 아래, 로그아웃이 오른쪽 위로 화면 대각선 끝과 끝에 섰다.
 * 둘은 같은 물음(이 계정으로 계속할 것인가)의 두 쪽이라 한 자리에 둔다.
 *
 * 기존 /admin 껍데기와 다른 점 둘:
 *  1) 기둥 자체는 접지 않는다. 아이콘만 남는 축소 모드는 「무슨 아이콘이었지」를 매번
 *     묻게 만든다. 대신 **그룹 단위로** 접는다 — 지금 있는 그룹만 펴 둔다.
 *  2) Ctrl/⌘+K로 화면을 옮긴다. 마우스로 기둥까지 가는 왕복이 사라진다.
 *
 * 로그인하지 않았거나 슈퍼 관리자가 아니면 아무것도 그리지 않는다 — 이 콘솔은
 * 운영자 계정·권한과 감사 로그에 닿으므로 메뉴 구조조차 미리 보여 줄 이유가 없다.
 */
export default function Shell({ children }: { children: React.ReactNode }) {
  const prefs = useAdminPrefs();
  const hydrated = useHydrated();
  /* 문항은 브라우저 저장소에만 있어 서버에서 세지 못한다. 기둥의 배지를 서버에서
     센 값으로 박아 두면 「문항 검수 3」을 눌렀는데 다섯 줄인 화면이 된다.
     껍데기가 클라이언트 컴포넌트이므로 여기서 살아 있는 목록을 세어 넘긴다.
     세는 조건은 각 화면이 목록을 고르는 조건과 같아야 한다 — 출제는 작성 중+반려됨,
     검수는 검수 대기, 가입 승인은 아직 처리하지 않은 신청이다. */
  const items = useItems();
  const { scores } = useExpert();
  const desk = useInterviewDesk();
  const live = {
    drafts: items.filter((i) => i.state === "draft" || i.state === "rejected").length,
    review: items.filter((i) => i.state === "submitted").length,
    approvals: usePendingApprovals(),
    /* 채점도 브라우저 저장소에 있다 — 세는 조건은 채점 화면의 「검토 대기」 탭과 같다 */
    grading: scores.filter((t) => !scoreDone(t)).length,
    /* 면담은 「아직 날짜가 없는 것」을 센다 — 들어온 신청과 대상으로 받아 둔 것.
       세는 조건은 면담 관리 목록의 「신청 접수」·「선발됨」 두 탭과 같아야 한다.
       다르게 세면 8을 눌렀는데 열한 줄인 화면이 된다.
       ⚠ 「지난 일정」은 여기 넣지 않는다. 그것은 날짜가 있는 줄이라 기둥의 숫자가
         「잡아야 할 것」이 아니라 「신경 쓸 것」으로 뜻이 넓어진다 */
    interviews: desk.filter((r) => r.state === "applied" || r.state === "queued").length,
  };
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  /* 펼쳐 둔 그룹. 처음에는 지금 있는 그룹 하나만 편다 — 넷을 다 펴 두면 접는 뜻이 없다.
     주소를 모르는 화면(빵부스러기가 비는 자리)에서는 첫 그룹을 편다. 아무것도 안 펴면
     기둥에 이름표 넷만 남아 고장 난 것처럼 보인다.

     저장소에 담지 않는다. 껍데기가 레이아웃에 있어 화면을 옮겨 다녀도 이 값은 그대로
     남고, 새로고침하면 「지금 있는 그룹만 펴진 상태」로 돌아간다 — 그것이 마침 기본값이라
     기억해 둘 것이 없다. */
  const [groups, setGroups] = useState<string[]>(() => [
    findAdmin2(pathname)?.group ?? admin2Nav[0].label,
  ]);

  /* 접힌 그룹 안의 화면으로 건너가면(⌘K · 화면 안의 링크) 그 그룹을 편다.
     효과(useEffect)로 하지 않는다 — 효과 안에서 상태를 바꾸면 한 번 그린 뒤에 다시 그리게
     되어, 접힌 기둥이 한 프레임 보였다가 펴진다. 주소가 바뀐 그 렌더에서 바로 맞춘다
     (React가 「props가 바뀔 때 상태 고치기」로 적어 둔 꼴).
     사람이 접어 둔 그룹을 제멋대로 다시 열지는 않는다 — 주소가 그대로면 여기를 안 지난다 */
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    const g = findAdmin2(pathname)?.group;
    if (g && !groups.includes(g)) setGroups([...groups, g]);
  }
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
    <div className="a2-shell" style={{ ["--a2-zoom" as string]: prefs.a2Zoom }}>
      <ZoomBar value={prefs.a2Zoom} />

      {/* 띠 아래 전부가 배율을 받는다. 화면 높이 · 띠 아래 자리는 배율로 나눈 값을 쓴다 */}
      <div className="a2-scaled flex min-h-(--a2-screen)">
        {/* ── 왼쪽 기둥 ── */}
        <aside
          className={`a2-side fixed inset-y-0 left-0 z-40 flex w-[216px] shrink-0 flex-col bg-(--a2-side) lg:sticky lg:top-(--a2-top) lg:h-(--a2-screen) ${
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
            {admin2Nav.map((g, gi) => {
              const shown = groups.includes(g.label);
              /* 접힌 그룹의 건수는 머리로 올려 더한다. 올리지 않으면 「가입 승인 5」가 접는
                 순간 사라져, 기둥의 배지가 오늘 할 일을 알려 주던 일을 못 하게 된다.
                 펼쳤을 때는 적지 않는다 — 같은 수가 머리와 항목에 두 번 서면 그 둘이
                 다른 것을 세는 값인 줄 안다 */
              const waiting = g.items.reduce(
                (sum, it) => sum + (it.live ? live[it.live] : (it.count ?? 0)),
                0,
              );
              return (
                <div key={g.label} className="mb-1">
                  <button
                    type="button"
                    className="a2-nav-group"
                    aria-expanded={shown}
                    aria-controls={`a2-nav-${gi}`}
                    /* 이 nav는 눌린 자리에서 좁은 화면의 기둥을 닫는다(아래 onClick).
                       그룹을 접으려고 누른 것까지 기둥을 닫아 버리면 접은 결과를 못 본다 */
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroups((v) =>
                        v.includes(g.label) ? v.filter((x) => x !== g.label) : [...v, g.label],
                      );
                    }}
                  >
                    <span aria-hidden className="a2-nav-caret">
                      {shown ? "▾" : "▸"}
                    </span>
                    {g.label}
                    {!shown && waiting > 0 && <span className="a2-nav-count">{waiting}</span>}
                  </button>
                  {/* 접으면 아예 그리지 않는다. 숨기기만 하면 Tab이 안 보이는 링크를 짚는다 */}
                  {shown && (
                    <ul id={`a2-nav-${gi}`} className="a2-nav-list">
                      {g.items.map((it) => {
                        /* 지금 화면은 하나다 — 주소 앞머리가 걸리는 항목을 다 칠하면,
                           한 항목의 주소가 다른 항목의 앞머리인 자리(개인정보 관리 ·
                           파기 스케줄러)에서 둘이 함께 「여기」라고 말한다. 가장 긴
                           주소가 이기는 셈은 findAdmin2가 이미 하고 있으므로 그것을 쓴다 */
                        const on = here?.item.href === it.href;
                        const count = it.live ? live[it.live] : it.count;
                        return (
                          <li key={it.href}>
                            <Link href={it.href} className="a2-nav-item" aria-current={on ? "page" : undefined}>
                              {it.label}
                              {count ? <span className="a2-nav-count">{count}</span> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
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
          <header className="sticky top-(--a2-top) z-20 flex h-10 items-center gap-2 border-b border-(--a2-side-line) bg-(--a2-side) px-3">
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
              className="a2-btn a2-btn-sm a2-btn-dark lg:hidden"
              aria-expanded={open}
            >
              메뉴
            </button>

            {/* 빵부스러기 — 지금 어느 그룹의 어느 화면인지 */}
            <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1.5">
              <span className="a2-t-sm text-(--a2-side-ink-2)">{here?.group ?? "콘솔"}</span>
              <span aria-hidden className="a2-t-sm text-(--a2-side-ink-2)">
                /
              </span>
              <span className="truncate a2-t-sm font-bold text-white">{here?.item.label ?? "—"}</span>
            </nav>

            {/* 「예시 데이터」 꼬리표와 「기존 콘솔」 단추를 뺐다.
                앞엣것이 말하던 것은 화면마다 아래에 서 있는 고지(SeedNote)가 그대로 하고 있고,
                뒤엣것은 /admin으로 나가는 문이라 이 콘솔에서 매번 지나가는 자리에 둘 일이
                아니다. 주소를 직접 치면 그대로 열린다. */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="a2-btn a2-btn-sm a2-btn-dark hidden sm:inline-flex"
              >
                화면 찾기
                <span className="a2-kbd border-(--a2-side-line) bg-(--a2-side) text-(--a2-side-ink-2)">⌘K</span>
              </button>
              {/* 누구로 들어와 있나 — 로그아웃 바로 왼쪽. 상단 바가 40px이라 두 줄로 쌓지 않고
                  한 줄에 이름 · 역할 · 아이디를 늘어놓는다. 좁아지면 역할 · 아이디부터 접는다 */}
              <div className="hidden min-w-0 items-center gap-2 border-l border-(--a2-side-line) pl-2 sm:flex">
                <span
                  aria-hidden
                  className="a2-t-xs flex h-6 w-6 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-side-2) font-bold text-white"
                >
                  {prefs.staffName.slice(0, 1) || "관"}
                </span>
                <span className="truncate a2-t-sm font-bold text-white">{prefs.staffName}</span>
                <span className="hidden truncate a2-t-xs text-(--a2-side-ink-2) md:inline">
                  {roleOf(prefs.role).short} · <span className="a2-mono">{prefs.loginId}</span>
                </span>
              </div>
              <button type="button" onClick={adminSignOut} className="a2-btn a2-btn-sm a2-btn-dark">
                로그아웃
              </button>
            </div>
          </header>

          {/* 회색 바탕은 판 둘레 16px만 남는다. 판을 자를 때 overflow-clip을 쓴다 —
              hidden은 스크롤 컨테이너를 만들어 표 머리 행의 sticky를 죽인다(TableBox 주석) */}
          <main className="min-w-0 flex-1 p-4">
            <div className="a2-panel overflow-clip">{children}</div>
          </main>
        </div>

        {palette && <Palette onClose={() => setPalette(false)} />}
      </div>
    </div>
  );
}

/**
 * 글자 크기 — 맨 위 띠 오른쪽 끝에 － 배율 ＋.
 *
 * 눈금은 /admin과 같은 여섯 칸(ZOOM_LEVELS)이고, 값은 따로 든다(lib/adminStore.ts a2Zoom).
 *
 * 「원래대로」는 100%일 때도 자리를 비워 둔다. 띠가 오른쪽 끝에 붙어 있어서, 처음 ＋를 누른
 * 순간 그 글자가 생겨나면 － ＋가 왼쪽으로 밀려 다음 ＋가 손 밑에서 빠진다.
 */
function ZoomBar({ value }: { value: number }) {
  const off = value === 1;
  return (
    <div className="a2-zoombar">
      <span>글자 크기</span>
      <button
        type="button"
        className="a2-zoom-btn"
        onClick={() => bumpZoom(-1, "a2Zoom")}
        disabled={value <= ZOOM_MIN}
        aria-label="글자 크기 줄이기"
      >
        －
      </button>
      {/* 지금 배율을 적어 두어야 「원래대로」로 돌아올 수 있다 */}
      <span className="a2-mono min-w-[2.5rem] text-center text-(--a2-side-ink)" aria-live="polite">
        {Math.round(value * 100)}%
      </span>
      <button
        type="button"
        className="a2-zoom-btn"
        onClick={() => bumpZoom(1, "a2Zoom")}
        disabled={value >= ZOOM_MAX}
        aria-label="글자 크기 키우기"
      >
        ＋
      </button>
      <button
        type="button"
        onClick={() => patchAdminPrefs({ a2Zoom: 1 })}
        className={`rounded-(--a2-radius) px-1.5 underline underline-offset-2 hover:text-white ${off ? "invisible" : ""}`}
      >
        원래대로
      </button>
    </div>
  );
}
