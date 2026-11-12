"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * /design4 홈의 알림판 — 공지사항과 자주 묻는 질문을 탭 하나로 묶는다.
 * 두 칸을 나란히 세우던 것을 한 칸으로 줄이고, 남는 폭은 오른쪽 진행 절차가 쓴다.
 */
export default function BoardTabs({
  notices,
  faqs,
}: {
  notices: { title: string; date: string; href: string; pinned?: boolean }[];
  faqs: { q: string; href: string }[];
}) {
  const [tab, setTab] = useState<"notice" | "faq">("notice");
  const more = tab === "notice" ? notices[0]?.href : faqs[0]?.href;

  const tabBtn = (id: "notice" | "faq", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`relative pb-3 text-[20px] font-bold tracking-[-0.03em] transition-colors sm:text-[22px] ${
        tab === id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
      {tab === id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-[var(--d4-blue)]" />}
    </button>
  );

  return (
    <div className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex items-end justify-between border-b border-slate-200">
        <div role="tablist" className="flex gap-6">
          {tabBtn("notice", "공지사항")}
          {tabBtn("faq", "자주 묻는 질문")}
        </div>
        {more && (
          <Link
            href={more}
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-bold text-slate-500 hover:text-slate-900"
          >
            전체 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {tab === "notice" ? (
        <ul role="tabpanel">
          {notices.map((n) => (
            <li key={n.title} className="border-b border-slate-100 last:border-b-0">
              <Link href={n.href} className="group flex items-center gap-3 py-4">
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-bold ${
                    n.pinned ? "bg-[var(--d4-blue)] text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {n.pinned ? "중요" : "안내"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-800 group-hover:text-[var(--d4-blue)]">
                  {n.title}
                </span>
                <span className="shrink-0 text-[13.5px] tabular-nums text-slate-400">{n.date}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul role="tabpanel">
          {faqs.map((f) => (
            <li key={f.q} className="border-b border-slate-100 last:border-b-0">
              <Link href={f.href} className="group flex items-center gap-3 py-4">
                <span className="shrink-0 text-[15px] font-black text-[var(--d4-blue)]">Q.</span>
                <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-800 group-hover:text-[var(--d4-blue)]">
                  {f.q}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--d4-blue)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 목록 밑 — 찾는 답이 없을 때 갈 곳. 옆 진행 절차와 높이가 맞도록 빈 자리를 위에 둔다 */}
      <div aria-hidden className="min-h-5 flex-1" />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--d4-tint)] px-5 py-4">
        <p className="text-[14px] text-slate-600">찾는 내용이 없나요? 궁금한 것을 남겨 주시면 답해 드립니다.</p>
        <Link
          href="/design4/support/inquiry"
          className="inline-flex items-center gap-1 text-[13.5px] font-bold text-[var(--d4-blue)] hover:underline"
        >
          1:1 문의하기
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
