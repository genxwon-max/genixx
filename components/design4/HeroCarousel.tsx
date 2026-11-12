"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Pause, Play } from "lucide-react";

export type HeroSlide = {
  key: string;
  /** 판 아래 탭에 적는 짧은 이름 */
  label: string;
  /** 판 바탕 — CSS background 값 */
  bg: string;
  /** 밝은 바탕(노랑 등)이면 글자를 어둡게 */
  light?: boolean;
  tag: string;
  title: ReactNode;
  sub: string;
  link: { href: string; label: string };
  /** 오른쪽 그림 — 서버에서 만든 ImageSlot을 받는다 */
  image: ReactNode;
};

const INTERVAL = 6000;

/**
 * /design4 첫 화면의 큰 판 — 왼쪽 칸을 쓰고 오른쪽에는 로그인 상자가 선다.
 *
 * 판 아래쪽에 판마다 이름을 단 탭을 늘어놓고, 지금 판의 탭 밑줄이 6초 동안 차오르면 다음 판으로
 * 넘어간다. 탭을 누르면 그 판으로 바로 간다. 오른쪽 끝에 멈춤 / 재생.
 * 움직임을 줄이도록 설정한 사람에게는 저절로 넘기지 않는다.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = slides.length;

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % n), INTERVAL);
    return () => window.clearTimeout(t);
  }, [i, playing, n]);

  const s = slides[i];
  const ink = s.light ? "text-slate-900" : "text-white";
  const tabInk = s.light ? "text-slate-900" : "text-white";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="주요 안내"
      className="relative overflow-clip rounded-[32px] transition-[background] duration-500"
      style={{ background: s.bg }}
    >
      {/* 장식 — 큰 원 두 개 */}
      <span aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-white/[0.07]" />

      <div
        key={s.key}
        aria-roledescription="slide"
        aria-label={`${i + 1} / ${n}`}
        className="d4-fade relative grid gap-6 px-7 pb-36 pt-10 sm:px-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center md:pb-32 md:pt-12 lg:grid-cols-1 lg:px-12 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
      >
        <div>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-[12px] font-bold ${
              s.light ? "border-slate-900/30 text-slate-900" : "border-white/50 text-white"
            }`}
          >
            {s.tag}
          </span>
          <h2 className={`mt-4 text-[26px] font-bold leading-[1.38] tracking-[-0.03em] sm:text-[34px] xl:text-[32px] ${ink}`}>
            {s.title}
          </h2>
          <p className={`mt-4 text-[16px] sm:text-[18px] ${s.light ? "text-slate-700" : "text-white/85"}`}>{s.sub}</p>
          <Link
            href={s.link.href}
            className={`mt-7 inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-[14px] font-bold transition-colors ${
              s.light ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-white text-slate-900 hover:bg-slate-100"
            }`}
          >
            {s.link.label}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative hidden h-60 md:block lg:hidden xl:block xl:h-64">{s.image}</div>
      </div>

      {/* 판 이름 탭 + 멈춤 */}
      <div className="absolute inset-x-0 bottom-16 flex items-end gap-4 px-7 sm:px-12 md:bottom-14">
        <ul className="grid flex-1 grid-cols-3 gap-3 sm:gap-5" role="tablist">
          {slides.map((sl, k) => {
            const on = k === i;
            return (
              <li key={sl.key} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setI(k)}
                  className={`block w-full text-left text-[12.5px] font-bold sm:text-[14px] ${tabInk} ${on ? "" : "opacity-60 hover:opacity-90"}`}
                >
                  <span className="truncate">{sl.label}</span>
                  <span aria-hidden className={`mt-2 block h-[3px] overflow-hidden rounded-full ${s.light ? "bg-slate-900/15" : "bg-white/25"}`}>
                    {on && (
                      <span
                        key={`${k}-${playing}`}
                        className={`block h-full rounded-full ${s.light ? "bg-slate-900" : "bg-white"} ${playing ? "d4-progress" : "w-full"}`}
                        style={playing ? { animationDuration: `${INTERVAL}ms` } : undefined}
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          aria-label={playing ? "자동 넘김 멈춤" : "자동 넘김 시작"}
          onClick={() => setPlaying((v) => !v)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            s.light ? "bg-slate-900/10 text-slate-900" : "bg-white/15 text-white"
          }`}
        >
          {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        </button>
      </div>
    </section>
  );
}
