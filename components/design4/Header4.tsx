"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LockKeyhole, Menu, UserPlus, X } from "lucide-react";
import { LogoLockup } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { legalGroup, siteMenu } from "@/lib/nav";
import { D4_HOME, d4, groupOf, realOf } from "./paths";

/**
 * /design4 머리띠 — 공공 교육 포털처럼 두 줄로 나눈다.
 *
 *   윗줄    로고 · 로그인 · 회원가입 · 학생 접속(아이콘 단추)
 *   아랫줄  갈래 일곱(사이트맵 그대로) · 전체 메뉴 단추
 *
 * 갈래에 마우스를 올리거나 전체 메뉴 단추를 누르면 일곱 갈래의 하위 화면을 한 판에 다 펼친다.
 * 갈래마다 따로 여는 드롭다운보다 한 번에 사이트맵을 보여 주는 편이 찾기 빠르다.
 *
 * 화면을 내려도 따라오는 것은 두지 않는다(2026-11-12 요청). 머리띠도 문서 맨 위에 그대로 있다.
 * 사이트맵(lib/nav.ts siteMenu)은 건드리지 않고 그대로 읽는다.
 */
const groups = siteMenu;

/**
 * menu={false} — 로그인 · 회원가입 화면처럼 아랫줄(「재능·학력 진단 포털」 · 갈래 메뉴)을 걷는 자리(2026-11-12 요청).
 * 가입 · 로그인 도중 다른 메뉴로 새지 않게 하는 실제 계정 존과 같은 뜻이다.
 */
export default function Header4({ menu = true }: { menu?: boolean }) {
  const [panel, setPanel] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(groups[0].id);
  const current = groupOf(realOf(usePathname())).group?.id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900";

  return (
    <header
      className="relative z-40 bg-white"
      /* 머리띠는 화면을 옮겨도 그대로 있으므로, 링크를 누르면 펼친 메뉴를 닫는다 */
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) {
          setPanel(false);
          setMobile(false);
        }
      }}
    >
      {/* 윗줄 */}
      <div className="border-b border-slate-100">
        <div className="d4-container flex h-14 items-center justify-between">
          <Link href={D4_HOME} aria-label="모두의재능 홈">
            <LogoLockup className="text-[1.75rem]" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/design4/login/student" className="mr-1 hidden rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-bold text-white hover:bg-slate-700 sm:block">
              학생 접속코드로 진단하기
            </Link>
            <Link href="/design4/login" aria-label="로그인" title="로그인" className={iconBtn}>
              <LockKeyhole className="h-4 w-4" />
            </Link>
            <Link href="/design4/signup/type" aria-label="회원가입" title="회원가입" className={iconBtn}>
              <UserPlus className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setMobile(true)}
              className={`${iconBtn} lg:hidden`}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 아랫줄 — 넓은 화면만 */}
      <div className={menu ? "hidden lg:block" : "hidden"} onMouseLeave={() => setPanel(false)}>
        <div className="d4-container flex h-[72px] items-center">
          <p className="w-[11rem] shrink-0 text-[19px] font-black tracking-[-0.03em] text-[var(--d4-ink)]">
            재능·학력 진단 포털
          </p>
          <nav aria-label="주 메뉴" className="flex-1">
            <ul className="grid grid-cols-7">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={d4(g.href)}
                    onMouseEnter={() => setPanel(true)}
                    onFocus={() => setPanel(true)}
                    className={`block py-6 text-center text-[16px] font-bold transition-colors hover:text-[var(--d4-blue)] ${
                      current === g.id ? "text-[var(--d4-blue)]" : "text-slate-800"
                    }`}
                  >
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            aria-expanded={panel}
            aria-label={panel ? "전체 메뉴 닫기" : "전체 메뉴 열기"}
            onClick={() => setPanel((v) => !v)}
            className="ml-4 flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
          >
            {panel ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* 전체 메뉴 판 — 갈래 칸이 위 메뉴 칸과 줄을 맞춘다 */}
        {panel && (
          <div className="absolute inset-x-0 top-full border-y border-slate-200 bg-white shadow-[0_18px_30px_-18px_rgba(15,23,42,0.25)]">
            <div className="d4-container flex py-7">
              <div className="w-[11rem] shrink-0">
                <p className="text-[13px] font-bold text-slate-400">전체 메뉴</p>
              </div>
              <div className="grid flex-1 grid-cols-7">
                {groups.map((g) => (
                  <ul key={g.id} className="space-y-2.5 border-l border-slate-100 px-3 first:border-l-0">
                    {g.children.map((c) => (
                      <li key={c.href}>
                        <Link
                          href={d4(c.href)}
                          className="block text-center text-[14px] leading-snug text-slate-600 hover:font-semibold hover:text-[var(--d4-blue)]"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
              <div className="ml-4 w-10 shrink-0" />
            </div>
          </div>
        )}
      </div>

      {/* 좁은 화면 — 전체 메뉴를 판 하나로 */}
      {mobile && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
            <LogoLockup className="text-[1.25rem]" />
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setMobile(false)}
              className={iconBtn}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4">
            <Link href="/design4/login" className="rounded-lg bg-slate-900 py-3 text-center text-[14px] font-bold text-white">
              로그인
            </Link>
            <Link href="/design4/signup/type" className="rounded-lg border border-slate-200 py-3 text-center text-[14px] font-bold text-slate-800">
              회원가입
            </Link>
            <Link href="/design4/login/student" className="col-span-2 rounded-lg bg-[var(--d4-blue-soft)] py-3 text-center text-[14px] font-bold text-[var(--d4-blue)]">
              학생 접속코드로 진단하기
            </Link>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {[...groups, legalGroup].map((g) => {
              const open = mobileGroup === g.id;
              return (
                <li key={g.id} className="border-b border-slate-100">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setMobileGroup(open ? null : g.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-[16px] font-bold text-slate-900"
                  >
                    {g.label}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <ul className="bg-slate-50 px-5 py-2">
                      {g.children.map((c) => (
                        <li key={c.href}>
                          <Link href={d4(c.href)} className="block py-2.5 text-[14px] text-slate-600">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
