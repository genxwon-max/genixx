"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { siteMenu } from "@/lib/nav";
import { roleHome, useSession } from "@/lib/authStore";
import { CloseIcon, MenuIcon } from "./Icons";

/**
 * 홍보 존 헤더 오른쪽.
 *
 * 세 갈래를 나란히 둔다 — 로그인 · 회원가입 · 평가로 가기.
 * 앞의 둘은 보호자·기관이 쓰는 문이고, 「평가로 가기」는 학생 전용 문이다. 학생은
 * 계정이 없고 보호자가 발급한 접속코드로만 들어오므로(ACC-02-1) 로그인과 같은 자리에
 * 두면 헷갈린다. 그래서 버튼 안에 「학생 전용」을 붙여 둔다.
 *
 * 이미 로그인한 사람에게는 로그인·회원가입 대신 자기 대시보드로 가는 문을 보여 준다.
 */
function HeaderActions({
  onNavigate,
  /** 모바일 메뉴에서는 세로로 쌓이므로 글자 링크도 폭을 채운다 */
  stacked,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  const session = useSession();
  const home = session ? roleHome[session.role] : null;
  const quiet = `type-h4 rounded-lg px-3.5 py-2 font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 ${
    stacked ? "w-full text-center" : ""
  }`;

  return (
    <>
      {home ? (
        <Link
          href={home}
          onClick={onNavigate}
          className={quiet}
        >
          내 대시보드
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className={quiet}
          >
            로그인
          </Link>
          <Link
            href="/signup/type"
            onClick={onNavigate}
            className="btn btn-md border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
          >
            회원가입
          </Link>
        </>
      )}
      <Link
        href="/login/student"
        onClick={onNavigate}
        className="btn btn-md gap-2 bg-brand-900 text-white shadow-card hover:bg-brand-800"
      >
        평가로 가기
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
          학생 전용
        </span>
      </Link>
    </>
  );
}

/**
 * 굵기를 바꿔도 폭이 흔들리지 않는 메뉴 글자.
 * 굵은 글자를 보이지 않게 겹쳐 두어 자리를 미리 잡는다 — 이 폭이 아래 드롭다운
 * 칸의 폭과 같아야 칸이 메뉴 글자 밑에 줄 맞춰 선다.
 */
function SteadyLabel({ text }: { text: string }) {
  return (
    <span className="grid">
      <span aria-hidden className="invisible col-start-1 row-start-1 font-bold">
        {text}
      </span>
      <span className="col-start-1 row-start-1 text-center">{text}</span>
    </span>
  );
}

/** 메뉴 칸과 드롭다운 칸이 같이 쓰는 폭 — 둘이 어긋나면 줄이 안 맞는다 */
const navCell = "min-w-[5.25rem] shrink-0";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-shadow ${
        scrolled ? "shadow-card" : "border-b border-brand-100"
      }`}
      onMouseLeave={() => setOpenGroup(null)}
    >
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Logo />

        <nav className="hidden h-full items-center xl:flex" aria-label="주요 메뉴">
          {siteMenu.map((group) => (
            <div
              key={group.id}
              className="flex h-full shrink-0 items-center"
              onMouseEnter={() => setOpenGroup(group.id)}
              onFocus={() => setOpenGroup(group.id)}
            >
              <Link
                href={group.href}
                aria-expanded={openGroup !== null}
                className={`type-h4 ${navCell} flex justify-center whitespace-nowrap px-2.5 py-2 transition-colors ${
                  isActive(group.href)
                    ? "font-bold text-brand-700"
                    : openGroup === group.id
                      ? "font-bold text-brand-950"
                      : "font-medium text-slate-700 hover:font-bold hover:text-brand-950"
                }`}
              >
                <SteadyLabel text={group.label} />
              </Link>
            </div>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <HeaderActions />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          className="rounded-lg p-2 text-brand-900 transition-colors hover:bg-brand-50 xl:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* 데스크톱 드롭다운 — 메뉴 하나에 올려도 전체 하위 메뉴를 칸으로 펼친다.
          머리띠와 같은 줄을 한 번 더 깔고(로고·오른쪽 버튼은 보이지 않게 폭만 차지)
          칸마다 메뉴 글자와 같은 폭을 주어, 하위 메뉴가 제 메뉴 밑에 줄 맞춰 선다. */}
      {openGroup && (
        <div className="absolute inset-x-0 top-full hidden border-t border-brand-100 bg-white shadow-float xl:block">
          <div className="container-x flex justify-between gap-4 py-5">
            <div aria-hidden className="invisible h-0 shrink-0 overflow-hidden">
              <Logo />
            </div>
            <div className="flex">
              {siteMenu.map((group) => (
                <div
                  key={group.id}
                  className={`${navCell} flex flex-col`}
                  onMouseEnter={() => setOpenGroup(group.id)}
                  onFocus={() => setOpenGroup(group.id)}
                >
                  {/* 폭 맞춤용 — 위 메뉴 글자와 같은 폭을 잡는다 */}
                  <span
                    aria-hidden
                    className="type-h4 invisible h-0 overflow-hidden whitespace-nowrap px-2.5 font-bold"
                  >
                    {group.label}
                  </span>
                  {/* w-0 min-w-full: 긴 하위 메뉴가 칸을 넓히지 않고 칸 안에서 줄바꿈된다.
                      break-keep이라 낱말 중간이 아니라 띄어쓰기에서 끊긴다 */}
                  <ul className="w-0 min-w-full">
                    {group.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setOpenGroup(null)}
                          className={`type-meta block break-keep py-1.5 text-center transition-colors hover:text-brand-700 ${
                            isActive(child.href)
                              ? "font-bold text-brand-700"
                              : openGroup === group.id
                                ? "text-slate-800"
                                : "text-slate-500"
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div aria-hidden className="invisible flex h-0 shrink-0 items-center gap-2 overflow-hidden">
              <HeaderActions />
            </div>
          </div>
        </div>
      )}

      {/* 모바일 */}
      {open && (
        <div
          id="mobile-nav"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-brand-100 bg-white xl:hidden"
        >
          <nav className="container-x flex flex-col py-3" aria-label="모바일 메뉴">
            {siteMenu.map((group) => {
              const expanded = mobileGroup === group.id;
              return (
                <div key={group.id} className="border-b border-brand-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => setMobileGroup(expanded ? null : group.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                  >
                    <span className="type-h4 font-bold text-slate-900">{group.label}</span>
                    <span
                      aria-hidden
                      className={`text-brand-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                  {expanded && (
                    <ul className="pb-3" onClick={() => setOpen(false)}>
                      {group.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="type-meta block rounded-lg px-3 py-2.5 text-slate-600"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <div className="mt-4 flex flex-col gap-2 pb-6">
              <HeaderActions stacked onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
