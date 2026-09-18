import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "@/components/Icons";

/**
 * 읽는 화면(소개 갈래)의 본문 틀 — 카드를 늘어놓는 대신 글처럼 읽히게 한다.
 *
 * 한 구간은 가는 윗줄로 나누고, 넓은 화면에서는 왼쪽에 구간 번호·제목·설명을,
 * 오른쪽에 내용을 둔다. 상자·그림자 없이 줄과 여백만으로 묶어서, 눈이 제목 → 내용 순으로
 * 한 번에 내려가게 한다.
 */
export function Chapter({
  id,
  no,
  title,
  lead,
  children,
}: {
  /** 목차에서 건너올 자리 */
  id?: string;
  no: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-brand-100 py-12 first:border-t-0 first:pt-0 md:py-16"
    >
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
        <header className="lg:sticky lg:top-28 lg:self-start">
          <p className="type-eyebrow tabular-nums text-brand-500">{no}</p>
          <h2 className="type-h3 mt-2 font-black text-brand-950">{title}</h2>
          {lead && <p className="type-body mt-2.5 text-slate-600">{lead}</p>}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** 본문 사이에 끼우는 한마디 — 상자 대신 왼쪽 굵은 줄 */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <p className="type-body mt-10 max-w-2xl border-l-[3px] border-brand-300 pl-5 text-slate-700">
      {children}
    </p>
  );
}

/**
 * 「이름 — 설명」 줄 목록. 칸 상자 대신 가로줄로만 나누고, 넓은 화면에서는 이름을 왼쪽
 * 좁은 칸에 세워 설명이 한 줄로 흐르게 한다. aside는 오른쪽 끝의 짧은 값(소요 시간 등).
 */
export function Rows({
  items,
  term = "13rem",
}: {
  items: { t: ReactNode; d: ReactNode; aside?: ReactNode }[];
  /** 이름 칸 폭 */
  term?: string;
}) {
  const cols = items.some((it) => it.aside)
    ? "sm:grid-cols-[var(--term)_minmax(0,1fr)_auto]"
    : "sm:grid-cols-[var(--term)_minmax(0,1fr)]";
  return (
    <ul className="border-b border-brand-100">
      {items.map((it, i) => (
        <li
          key={i}
          className={`grid gap-1 border-t border-brand-100 py-5 sm:gap-6 ${cols}`}
          style={{ "--term": term } as CSSProperties}
        >
          <h3 className="type-h4 font-bold text-brand-950">{it.t}</h3>
          <p className="type-body text-slate-600">{it.d}</p>
          {it.aside && (
            <p className="type-body font-bold tabular-nums text-brand-800 sm:text-right">
              {it.aside}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 다 읽은 자리의 다음 걸음 — 상자 없이 한 문장과 글자 링크 */
export function NextStep({ text, href, label }: { text: ReactNode; href: string; label: string }) {
  return (
    <p className="type-body border-t border-brand-100 pt-8 text-slate-600">
      {text}{" "}
      <Link
        href={href}
        className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900"
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </p>
  );
}

/** 차례가 있는 목록 — 옅은 큰 번호와 가로줄. 절차·목차에 쓴다 */
export function Steps({ items }: { items: { t: ReactNode; d: ReactNode }[] }) {
  return (
    <ol className="border-b border-brand-100">
      {items.map((it, n) => (
        <li key={n} className="flex gap-5 border-t border-brand-100 py-5 md:gap-7">
          <span className="type-h3 w-7 shrink-0 font-black leading-snug tabular-nums text-brand-300">
            {n + 1}
          </span>
          <div>
            <h3 className="type-h4 font-bold text-brand-950">{it.t}</h3>
            <p className="type-body mt-1 text-slate-600">{it.d}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
