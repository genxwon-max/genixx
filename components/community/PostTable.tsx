"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type PostRow = {
  key: string;
  href: string;
  title: string;
  /** 제목 앞 알약 — strong이면 채운 알약(고정 공지 등) */
  tag?: { label: string; strong?: boolean };
  author?: string;
  date: string;
  /** 검색에 함께 걸 글 — 본문 등 */
  text?: string;
};

const PAGE = 10;

/**
 * 공지사항·자유게시판이 함께 쓰는 목록 — 검색 · 표 · 쪽 번호.
 *
 * 넓은 화면에서는 구분 | 제목 | (글쓴이) | 날짜 줄로, 좁은 화면에서는 제목 밑에 나머지를
 * 한 줄로 접어 내린다. 표(<table>)로 그리지 않는 까닭이 이 접힘이다.
 */
export default function PostTable({
  rows,
  withAuthor = false,
  empty,
  actions,
}: {
  rows: PostRow[];
  withAuthor?: boolean;
  /** 글이 하나도 없을 때의 말 */
  empty: string;
  /** 검색창 옆 자리 — 글쓰기 단추 등 */
  actions?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();
  const found = q
    ? rows.filter((r) => `${r.title}\n${r.text ?? ""}`.toLowerCase().includes(q))
    : rows;
  const pages = Math.max(1, Math.ceil(found.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = found.slice((cur - 1) * PAGE, cur * PAGE);

  const cols = withAuthor
    ? "md:grid-cols-[88px_1fr_110px_110px]"
    : "md:grid-cols-[88px_1fr_110px]";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-slate-500">
          전체 <b className="text-brand-800">{found.length}</b>건
          {q && <span> · 「{query.trim()}」 검색 결과</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(draft);
              setPage(1);
            }}
            className="flex items-center overflow-hidden rounded-lg border border-brand-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100"
          >
            <label htmlFor="post-search" className="sr-only">
              제목·내용 검색
            </label>
            <input
              id="post-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="제목·내용 검색"
              className="type-meta w-44 px-3 py-2 outline-none sm:w-56"
            />
            <button
              type="submit"
              className="type-meta border-l border-brand-100 px-3.5 py-2 font-bold text-brand-800 hover:bg-brand-50"
            >
              검색
            </button>
          </form>
          {actions}
        </div>
      </div>

      <div className="mt-4 border-t-2 border-brand-900">
        <div
          className={`type-meta hidden border-b border-brand-100 bg-brand-50/60 py-3 text-center font-bold text-slate-700 md:grid ${cols}`}
        >
          <span>구분</span>
          <span>제목</span>
          {withAuthor && <span>글쓴이</span>}
          <span>날짜</span>
        </div>

        {shown.length === 0 ? (
          <p className="type-body border-b border-brand-100 py-16 text-center text-slate-500">
            {q ? "찾는 글이 없습니다. 다른 낱말로 검색해 보세요." : empty}
          </p>
        ) : (
          <ul>
            {shown.map((r) => (
              <li key={r.key} className="border-b border-brand-100">
                <Link
                  href={r.href}
                  className={`group grid gap-1.5 px-2 py-4 transition-colors hover:bg-brand-50/50 md:items-center md:gap-0 md:px-0 ${cols}`}
                >
                  <span className="md:text-center">
                    {r.tag && (
                      <span
                        className={`type-caption inline-block rounded-full px-2.5 py-0.5 font-bold ${
                          r.tag.strong
                            ? "bg-brand-700 text-white"
                            : "border border-brand-200 text-brand-700"
                        }`}
                      >
                        {r.tag.label}
                      </span>
                    )}
                  </span>
                  <span className="type-body font-medium text-slate-900 group-hover:text-brand-800 group-hover:underline md:px-4">
                    {r.title}
                  </span>
                  <span className="type-meta flex gap-2 text-slate-500 md:contents">
                    {withAuthor && <span className="md:text-center">{r.author}</span>}
                    <span className="md:text-center">{r.date}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="쪽 넘기기" className="mt-8 flex justify-center gap-1">
          <PageButton label="이전 쪽" disabled={cur === 1} onClick={() => setPage(cur - 1)}>
            ‹
          </PageButton>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <PageButton
              key={n}
              label={`${n}쪽`}
              current={n === cur}
              onClick={() => setPage(n)}
            >
              {n}
            </PageButton>
          ))}
          <PageButton label="다음 쪽" disabled={cur === pages} onClick={() => setPage(cur + 1)}>
            ›
          </PageButton>
        </nav>
      )}
    </div>
  );
}

function PageButton({
  children,
  label,
  current,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`type-meta h-9 min-w-9 rounded-lg px-2 font-bold transition-colors disabled:opacity-30 ${
        current ? "bg-brand-900 text-white" : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
      }`}
    >
      {children}
    </button>
  );
}
