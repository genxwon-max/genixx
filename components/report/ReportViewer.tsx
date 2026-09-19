"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { editions, type Edition } from "@/lib/diagReport";
import { assessment } from "@/lib/exam";
import { saveReportPdf } from "@/lib/reportPdf";
import { serifKr } from "./font";

const PAGE_PX = 794; // 210mm

/**
 * 보고서 새 창의 틀 — 위쪽 띠(인쇄 안 됨)와 종이 더미.
 *
 * 띠에는 인쇄와 PDF 저장만 둔다. 요약본과 정밀본은 결과 화면에서 따로 여는 물건이라
 * 이 창 안에서 서로 오가게 하지 않는다.
 *   인쇄      브라우저 인쇄 창 — A4 여백 없음·배경색 유지는 report.css의 @page가 맡는다.
 *   PDF 저장  누르면 바로 파일이 내려받아진다(lib/reportPdf).
 */
export default function ReportViewer({
  edition,
  name,
  printable = true,
  notice,
  children,
}: {
  edition: Edition;
  name: string;
  /** 잠긴 정밀본처럼 인쇄할 지면이 없으면 끈다 */
  printable?: boolean;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const stack = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const fileName = `${assessment.name}_${editions[edition].label}_${name}`;

  /* 좁은 창에서는 종이를 통째 줄인다 — 글자를 다시 흘리면 인쇄본과 모양이 달라진다.
     폭은 스크롤 막대를 뺀 clientWidth로 잰다(innerWidth로 재면 막대만큼 종이 오른쪽이 잘린다) */
  useEffect(() => {
    const root = document.documentElement;
    const fit = () => {
      const z = Math.min(1, (root.clientWidth - 24) / PAGE_PX);
      stack.current?.style.setProperty("--rp-zoom", String(z));
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(root);
    return () => watch.disconnect();
  }, []);

  /* 인쇄 창의 기본 파일 이름도 문서 제목을 따른다 */
  const print = () => {
    const before = document.title;
    document.title = fileName;
    const restore = () => {
      document.title = before;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const save = async () => {
    const pages = Array.from(stack.current?.querySelectorAll<HTMLElement>(".rp-page") ?? []);
    if (!pages.length) return;
    setSaving(true);
    try {
      await saveReportPdf(pages, fileName);
    } catch {
      window.alert("PDF를 만들지 못했습니다. 인쇄에서 「PDF로 저장」을 골라 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rp min-h-screen ${serifKr.variable}`}>
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <p className="text-[13px] text-slate-600">
            <b className="text-slate-900">{assessment.name} 재능 진단 보고서</b>
            <span className="ml-2">
              {name} · {editions[edition].label}
            </span>
          </p>
          <div className="flex gap-2">
            {printable && (
              <>
                <button
                  type="button"
                  onClick={print}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 hover:border-slate-400"
                >
                  인쇄
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving ? "PDF 만드는 중…" : "PDF 저장"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => window.close()}
              className="rounded-md px-2 py-1.5 text-[13px] text-slate-500 hover:text-slate-800"
            >
              닫기
            </button>
          </div>
        </div>
        {notice && (
          <div className="border-t border-slate-100 bg-slate-50">
            <p className="mx-auto max-w-[1100px] px-4 py-2 text-[12px] leading-relaxed text-slate-600">
              {notice}
            </p>
          </div>
        )}
      </div>

      <div ref={stack} className="rp-stack">
        {children}
      </div>
    </div>
  );
}
