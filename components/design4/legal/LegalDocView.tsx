import Link from "next/link";
import {
  Baby,
  CalendarClock,
  CircleCheck,
  Globe,
  Handshake,
  Headset,
  History,
  ListOrdered,
  Share2,
  Target,
  UserRound,
} from "lucide-react";
import SubHero from "@/components/design4/site/SubHero";
import PrintButton from "./PrintButton";
import { company } from "@/lib/site";
import type { Article, LegalDoc, LegalLabel, Para } from "@/lib/design4Legal";

/**
 * /design4 정책 문서 한 장 — 공공 · 교육 기관 누리집의 약관 화면 모양.
 *
 *   머리(제목 · 설명) → 시행일 줄(개정 이력 · 인쇄) → [처리 표시] → [한눈에 보기] → 목차
 *   → 장 · 조 본문 → 부칙 → 개정 이력 → 문의
 *
 * 조 안의 문장이 둘 이상이면 ① ②를 붙이고(항), 목록은 1. 2.(호)로 단다.
 * 아동용 고지(kids)는 조 번호 없이 질문 카드로 크게 그린다.
 */

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮";

const labelIcon: Record<LegalLabel["icon"], typeof UserRound> = {
  collect: UserRound,
  purpose: Target,
  period: CalendarClock,
  child: Baby,
  share: Share2,
  outsource: Handshake,
  abroad: Globe,
  contact: Headset,
};

const anchor = (a: Article, i: number) => (a.no ? `a${a.no}` : `q${i + 1}`);
const heading = (a: Article) => (a.no ? `제${a.no}조(${a.title})` : a.title);

export default function LegalDocView({ doc }: { doc: LegalDoc }) {
  const articles = doc.chapters.flatMap((c) => c.articles);
  const numbered = articles.some((a) => a.no);

  return (
    <article className="d4-legal">
      <SubHero href={`/legal/${doc.slug}`} title={doc.title} lead={doc.lead} />

      {/* 시행일 줄 */}
      <div className="-mt-4 mb-10 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-slate-600">
          <span>
            시행일 <b className="font-bold text-slate-900">{doc.effective}</b>
          </span>
          <span className="text-slate-300">|</span>
          <a href="#history" className="flex items-center gap-1 hover:text-[var(--d4-blue)]">
            <History className="h-3.5 w-3.5" />
            개정 이력 {doc.history.length}건
          </a>
        </p>
        <div className="d4-noprint">
          <PrintButton />
        </div>
      </div>

      {/* 개인정보 처리 표시 */}
      {doc.labels && (
        <section aria-labelledby="labels" className="mb-10">
          <h2 id="labels" className="text-[17px] font-bold text-slate-900">
            주요 개인정보 처리 표시
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {doc.labels.map((l) => {
              const Icon = labelIcon[l.icon];
              return (
                <li key={l.t} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--d4-blue-soft)] text-[var(--d4-blue)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[14px] font-bold text-slate-900">{l.t}</b>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500">{l.d}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 한눈에 보기 */}
      {doc.summary && (
        <section aria-labelledby="summary" className="mb-10 rounded-[22px] border border-[var(--d4-blue)]/25 bg-[var(--d4-blue-soft)]/60 p-6 md:p-7">
          <h2 id="summary" className="text-[17px] font-bold text-[var(--d4-ink)]">
            한눈에 보기
          </h2>
          <ul className="mt-4 space-y-2.5">
            {doc.summary.map((s) => (
              <li key={s} className="flex gap-2.5 text-[14.5px] leading-[1.75] text-slate-700">
                <CircleCheck className="mt-[0.3em] h-4 w-4 shrink-0 text-[var(--d4-blue)]" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 목차 — 조가 셋 이상일 때만 */}
      {articles.length >= 3 && (
        <nav aria-labelledby="toc" className="mb-12 rounded-[22px] bg-[var(--d4-tint)] p-6 md:p-7">
          <h2 id="toc" className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
            <ListOrdered className="h-4 w-4 text-slate-500" />
            목차
          </h2>
          <div className="mt-4 space-y-4">
            {doc.chapters.map((c, ci) => (
              <div key={ci}>
                {c.title && <p className="mb-1.5 text-[13px] font-bold text-slate-500">{c.title}</p>}
                <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {c.articles.map((a) => {
                    const i = articles.indexOf(a);
                    return (
                      <li key={anchor(a, i)}>
                        <a href={`#${anchor(a, i)}`} className="text-[14px] text-slate-700 hover:text-[var(--d4-blue)] hover:underline">
                          {heading(a)}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </nav>
      )}

      {/* 본문 */}
      {doc.kids ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {articles.map((a, i) => (
            <li key={a.title} id={anchor(a, i)} className="scroll-mt-6 rounded-[22px] border border-slate-200 bg-white p-6 md:p-7">
              <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[var(--d4-ink)]">{a.title}</h2>
              <div className="mt-3 space-y-2">
                {a.body.map((p, pi) =>
                  typeof p === "string" ? (
                    <p key={pi} className="text-[16px] leading-[1.85] text-slate-700">
                      {p}
                    </p>
                  ) : null,
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-12">
          {doc.chapters.map((c, ci) => (
            <section key={ci} aria-label={c.title}>
              {c.title && (
                <h2 className="mb-6 flex items-center gap-2.5 text-[20px] font-bold tracking-[-0.02em] text-slate-900">
                  <span aria-hidden className="h-5 w-1 rounded-full bg-[var(--d4-blue)]" />
                  {c.title}
                </h2>
              )}
              <div className="space-y-9">
                {c.articles.map((a) => {
                  const i = articles.indexOf(a);
                  return <ArticleBlock key={anchor(a, i)} id={anchor(a, i)} article={a} numbered={numbered} />;
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 부칙 */}
      {doc.addendum && (
        <section aria-labelledby="addendum" className="mt-12 border-t border-slate-200 pt-8">
          <h2 id="addendum" className="text-[17px] font-bold text-slate-900">
            부칙
          </h2>
          {doc.addendum.map((t) => (
            <p key={t} className="mt-3 text-[15px] leading-[1.85] text-slate-700">
              {t}
            </p>
          ))}
        </section>
      )}

      {/* 개정 이력 */}
      <section id="history" aria-labelledby="history-h" className="mt-12 scroll-mt-6">
        <h2 id="history-h" className="text-[17px] font-bold text-slate-900">
          개정 이력
        </h2>
        <Table head={["시행일", "내용"]} rows={doc.history.map((h) => [h.date, h.note])} />
      </section>

      {/* 문의 */}
      <aside className="d4-noprint mt-12 flex flex-col gap-4 rounded-[22px] bg-[var(--d4-ink)] p-6 text-white md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <p className="text-[16px] font-bold">이 문서에 대해 궁금한 점이 있으신가요?</p>
          <p className="mt-1 text-[13.5px] text-white/70">
            {company.tel} · {company.email} · {company.hours}
          </p>
        </div>
        <Link
          href="/design4/legal"
          className="shrink-0 rounded-lg bg-white px-4 py-2.5 text-center text-[14px] font-bold text-[var(--d4-ink)] hover:bg-white/90"
        >
          다른 정책 보기
        </Link>
      </aside>
    </article>
  );
}

function ArticleBlock({ id, article, numbered }: { id: string; article: Article; numbered: boolean }) {
  const sentences = article.body.filter((p) => typeof p === "string").length;
  let n = 0;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6">
      <h3 id={`${id}-h`} className="text-[16.5px] font-bold text-slate-900">
        {numbered ? heading(article) : article.title}
      </h3>
      <div className="mt-3 space-y-2.5">
        {article.body.map((p, pi) => {
          if (typeof p === "string") {
            const mark = sentences > 1 ? CIRCLED[n++] : null;
            return (
              <p key={pi} className="flex gap-1.5 text-[15px] leading-[1.85] text-slate-700">
                {mark && <span className="shrink-0 text-slate-500">{mark}</span>}
                <span>{p}</span>
              </p>
            );
          }
          return <Extra key={pi} para={p} />;
        })}
      </div>
    </section>
  );
}

function Extra({ para }: { para: Exclude<Para, string> }) {
  if ("items" in para) {
    return (
      <ol className="space-y-1.5 pl-5">
        {para.items.map((t, i) => (
          <li key={t} className="flex gap-2 text-[14.5px] leading-[1.8] text-slate-600">
            <span className="w-5 shrink-0 text-right tabular-nums text-slate-500">{i + 1}.</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    );
  }
  if ("table" in para) return <Table head={para.table.head} rows={para.table.rows} />;
  return <p className="text-[13.5px] leading-[1.75] text-slate-500">※ {para.note}</p>;
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] border-t-2 border-slate-800 text-left text-[14px]">
        <thead>
          <tr className="border-b border-slate-300 bg-slate-50">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-bold text-slate-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-slate-200 align-top">
              {r.map((c, ci) => (
                <td key={ci} className={`px-4 py-3 leading-[1.7] ${ci === 0 ? "font-medium text-slate-800" : "text-slate-600"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
