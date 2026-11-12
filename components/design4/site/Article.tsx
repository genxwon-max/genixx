import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Info } from "lucide-react";
import { d4 } from "../paths";

/**
 * /design4 읽는 화면의 본문 조각 — 공개 사이트 components/site/Article.tsx와 이름 · 받는 값이 같다.
 * 사본 화면은 import 경로만 바꿔 이 모양을 입는다.
 *
 * 공개 사이트는 구간 제목을 왼쪽 칸에 세우고 화면을 내리면 따라오게(sticky) 했는데, 여기서는
 * 제목을 본문 위에 얹는다(2026-11-12 「왼쪽이 따라 내려오는 것 전부 제거」). 제목 앞 파란 막대 ·
 * 둥근 테두리 상자 · 회색 안내 상자는 공공 교육 포털의 하위 화면을 따랐다.
 */
export function Chapter({
  id,
  title,
  lead,
  children,
}: {
  id?: string;
  /** 공개 사이트와 모양을 맞추려고 받기만 한다 */
  no?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-8 first:mt-0 md:mt-14">
      <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.02em] text-slate-900 md:text-[21px]">
        <span aria-hidden className="h-[1.05em] w-[5px] shrink-0 rounded-full bg-[var(--d4-blue)]" />
        {title}
      </h2>
      {lead && <p className="mt-2 text-[14.5px] leading-[1.75] text-slate-600 md:text-[15px]">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** 본문 사이 한마디 — 파란 바탕 안내 상자 */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 flex gap-2.5 rounded-xl bg-[var(--d4-blue-soft)] px-5 py-4 text-[14px] leading-[1.75] text-slate-700">
      <Info aria-hidden className="mt-[0.3em] h-4 w-4 shrink-0 text-[var(--d4-blue)]" />
      <span>{children}</span>
    </p>
  );
}

/** 「이름 — 설명」 줄 목록 — 둥근 테두리 상자 안에 가는 줄로 나눈다 */
export function Rows({
  items,
  term = "13rem",
}: {
  items: { t: ReactNode; d: ReactNode; aside?: ReactNode }[];
  term?: string;
}) {
  const cols = items.some((it) => it.aside)
    ? "sm:grid-cols-[var(--term)_minmax(0,1fr)_auto]"
    : "sm:grid-cols-[var(--term)_minmax(0,1fr)]";
  return (
    <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((it, i) => (
        <li
          key={i}
          className={`grid gap-1 border-t border-slate-100 px-5 py-4 first:border-t-0 sm:gap-6 md:px-6 ${cols}`}
          style={{ "--term": term } as CSSProperties}
        >
          <h3 className="text-[15px] font-bold leading-relaxed text-slate-900">{it.t}</h3>
          <p className="text-[14.5px] leading-[1.75] text-slate-600">{it.d}</p>
          {it.aside && (
            <p className="text-[14.5px] font-bold tabular-nums text-[var(--d4-blue)] sm:text-right">{it.aside}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 다 읽은 자리의 다음 걸음 — 남색 띠 하나와 단추 */
export function NextStep({ text, href, label }: { text: ReactNode; href: string; label: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-[var(--d4-ink)] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between md:px-8">
      <p className="text-[15px] leading-relaxed text-white/90">{text}</p>
      <Link
        href={d4(href)}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-5 py-3 text-[14px] font-bold text-[var(--d4-ink)] hover:bg-slate-100"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** 차례가 있는 목록 — 단계 칸을 두 줄로 세운다 */
export function Steps({ items }: { items: { t: ReactNode; d: ReactNode }[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {items.map((it, n) => (
        <li key={n} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <span className="inline-block rounded-full bg-[var(--d4-blue-soft)] px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[var(--d4-blue)]">
            STEP {String(n + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-3 text-[16px] font-bold text-slate-900">{it.t}</h3>
          <p className="mt-1.5 text-[14.5px] leading-[1.75] text-slate-600">{it.d}</p>
        </li>
      ))}
    </ol>
  );
}
