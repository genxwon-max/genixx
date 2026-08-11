"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { menu } from "@/lib/nav";
import { ArrowRight, CloseIcon, MenuIcon } from "./Icons";

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

        <nav className="hidden h-full items-center lg:flex" aria-label="주요 메뉴">
          {menu.map((group) => (
            <div
              key={group.id}
              className="flex h-full items-center"
              onMouseEnter={() => setOpenGroup(group.id)}
              onFocus={() => setOpenGroup(group.id)}
            >
              <Link
                href={group.href}
                aria-expanded={openGroup === group.id}
                className={`type-h4 rounded-lg px-3.5 py-2 font-medium transition-colors ${
                  isActive(group.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {group.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* 홍보 존의 주 행동은 하나로 유지한다.
            로그인·회원가입은 평가 존(ACC 화면)이 자체적으로 안내하므로 헤더에서는 빼둔다. */}
        <div className="hidden items-center lg:flex">
          <Link
            href="/exam"
            className="btn btn-md bg-brand-900 text-white shadow-card hover:bg-brand-800"
          >
            평가 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          className="rounded-lg p-2 text-brand-900 transition-colors hover:bg-brand-50 lg:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* 데스크톱 드롭다운 */}
      {menu
        .filter((group) => group.id === openGroup)
        .map((group) => (
        <div
          key={group.id}
          className="absolute inset-x-0 top-full hidden border-t border-brand-100 bg-white shadow-float lg:block"
        >
          <div className="container-x grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
            <div className="rounded-2xl bg-brand-50/70 p-5">
              <p className="type-eyebrow text-brand-500">{group.id}</p>
              <p className="type-h3 mt-2 font-black text-brand-950">{group.label}</p>
              <p className="type-meta mt-2 text-slate-600">{group.summary}</p>
              <Link
                href={group.href}
                onClick={() => setOpenGroup(null)}
                className="type-meta mt-4 inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
              >
                전체 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {group.children.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={() => setOpenGroup(null)}
                    className="block rounded-xl p-4 transition-colors hover:bg-brand-50"
                  >
                    <span className="type-h4 block font-bold text-brand-950">
                      {child.label}
                    </span>
                    <span className="type-meta mt-1 block text-slate-500">
                      {child.desc}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        ))}

      {/* 모바일 */}
      {open && (
        <div
          id="mobile-nav"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-brand-100 bg-white lg:hidden"
        >
          <nav className="container-x flex flex-col py-3" aria-label="모바일 메뉴">
            {menu.map((group) => {
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
                      <li>
                        <Link
                          href={group.href}
                          className="type-meta block rounded-lg px-3 py-2.5 font-medium text-brand-700"
                        >
                          {group.label} 전체 보기
                        </Link>
                      </li>
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

            <div className="mt-4 flex flex-col gap-2 pb-6" onClick={() => setOpen(false)}>
              <Link href="/exam" className="btn btn-md w-full bg-brand-900 text-white">
                평가 시작하기
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
