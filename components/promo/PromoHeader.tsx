"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { ArrowRight, CloseIcon, MenuIcon } from "@/components/Icons";
import { publicMenu, utilMenuIds } from "@/lib/nav";
import { roleHome, useSession } from "@/lib/authStore";

/**
 * 새 홍보 존 헤더.
 *
 * 사이트맵 공개 존 일곱 갈래(PUB-02 ~ PUB-08)를 전부 헤더에서 찾을 수 있게 한다.
 * 다만 일곱을 한 줄에 늘어놓으면 1240px 안에서 로고·CTA와 부딪치므로 두 층으로
 * 나눈다. 위 얇은 줄에는 필요할 때 찾아가는 셋(고객지원·파트너·정책)과 계정
 * 링크를, 아래 줄에는 학부모가 처음 훑는 넷(소개·서비스·샘플·콘텐츠)과 응시
 * 버튼을 둔다. 어느 쪽도 감추지 않는다 — 층만 다르다.
 */

const mainGroups = publicMenu.filter((g) => !utilMenuIds.includes(g.id));
const utilGroups = publicMenu.filter((g) => utilMenuIds.includes(g.id));

export default function PromoHeader() {
  const pathname = usePathname();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);

  const home = session ? roleHome[session.role] : null;

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
      className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 backdrop-blur"
      onMouseLeave={() => setOpenGroup(null)}
    >
      {/* ── 위층: 부가 갈래와 계정 ── */}
      <div className="hidden border-b border-brand-100 bg-brand-50/70 lg:block">
        <div className="container-x flex h-10 items-center justify-between gap-4">
          <nav aria-label="부가 메뉴" className="flex items-center gap-1">
            {utilGroups.map((g) => (
              <Link
                key={g.id}
                href={g.href}
                className={`type-caption rounded px-2.5 py-1 font-medium transition-colors hover:text-brand-700 ${
                  isActive(g.href) ? "text-brand-700" : "text-slate-500"
                }`}
              >
                {g.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {home ? (
              <Link
                href={home}
                className="type-caption rounded px-2.5 py-1 font-medium text-slate-500 transition-colors hover:text-brand-700"
              >
                내 대시보드
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="type-caption rounded px-2.5 py-1 font-medium text-slate-500 transition-colors hover:text-brand-700"
                >
                  로그인
                </Link>
                <span aria-hidden className="text-brand-200">
                  ·
                </span>
                <Link
                  href="/signup/type"
                  className="type-caption rounded px-2.5 py-1 font-medium text-slate-500 transition-colors hover:text-brand-700"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 아래층: 주 메뉴와 응시 버튼 ── */}
      <div className="container-x flex h-16 items-center justify-between gap-4 lg:h-[68px]">
        <Logo />

        <nav className="hidden h-full items-center lg:flex" aria-label="주요 메뉴">
          {mainGroups.map((group) => (
            <div
              key={group.id}
              className="flex h-full items-center"
              onMouseEnter={() => setOpenGroup(group.id)}
              onFocus={() => setOpenGroup(group.id)}
            >
              <Link
                href={group.href}
                aria-expanded={openGroup === group.id}
                className={`type-h4 rounded-lg px-3.5 py-2 font-bold transition-colors ${
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

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/sample/report"
            className="btn-flat btn-md border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
          >
            샘플 리포트
          </Link>
          <Link
            href="/exam"
            className="btn-flat btn-md gap-2 bg-brand-900 text-white hover:bg-brand-800"
          >
            무료 진단 체험
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="promo-nav"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          className="rounded-lg p-2 text-brand-900 transition-colors hover:bg-brand-50 lg:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* 데스크톱 드롭다운 */}
      {mainGroups
        .filter((group) => group.id === openGroup)
        .map((group) => (
          <div
            key={group.id}
            className="absolute inset-x-0 top-full hidden border-t border-brand-100 bg-white shadow-float lg:block"
          >
            <div className="container-x grid gap-8 py-8 lg:grid-cols-[260px_1fr]">
              <div className="rounded-md bg-brand-50/70 p-5">
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
                      <span className="type-h4 block font-bold text-brand-950">{child.label}</span>
                      <span className="type-meta mt-1 block text-slate-500">{child.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

      {/* 모바일 — 일곱 갈래를 층 구분 없이 그대로 편다 */}
      {open && (
        <div
          id="promo-nav"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-brand-100 bg-white lg:hidden"
        >
          <nav className="container-x flex flex-col py-3" aria-label="모바일 메뉴">
            {publicMenu.map((group) => {
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
              <Link
                href="/exam"
                className="btn-flat btn-md w-full bg-brand-900 text-white hover:bg-brand-800"
              >
                무료 진단 체험하기
              </Link>
              <Link
                href="/sample/report"
                className="btn-flat btn-md w-full border border-brand-200 bg-white text-brand-700"
              >
                샘플 리포트 보기
              </Link>
              {home ? (
                <Link href={home} className="type-meta py-2 text-center font-medium text-slate-600">
                  내 대시보드
                </Link>
              ) : (
                <p className="type-meta py-1 text-center text-slate-600">
                  <Link href="/login" className="font-medium hover:text-brand-700">
                    로그인
                  </Link>
                  <span aria-hidden className="mx-2 text-brand-200">
                    ·
                  </span>
                  <Link href="/signup/type" className="font-medium hover:text-brand-700">
                    회원가입
                  </Link>
                </p>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
