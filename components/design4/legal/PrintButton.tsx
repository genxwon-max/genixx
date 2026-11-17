"use client";

import { Printer } from "lucide-react";

/** 정책 문서 인쇄 — 머리띠 · 메뉴 · 푸터는 design4.css의 @media print가 걷는다 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900"
    >
      <Printer className="h-3.5 w-3.5" />
      인쇄
    </button>
  );
}
