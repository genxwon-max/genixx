"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, CheckIcon, CloseIcon } from "@/components/Icons";
import { circled, subjects } from "@/lib/exam";
import { markKinds, type MarkKind, type TryItem } from "@/lib/tryItems";

/** 밑줄 세 갈래의 색 — newhome.css의 --nh-*와 같은 값을 Tailwind 쪽에서 쓴다 */
const kindTone: Record<MarkKind, { dot: string; chip: string }> = {
  base: { dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700" },
  creative: { dot: "bg-accent-500", chip: "bg-accent-100 text-accent-600" },
  talent: { dot: "bg-emerald-500", chip: "bg-surface-mint text-emerald-700" },
};

/**
 * 간단 진단서 — 문항 판 **위에** 같은 크기로 겹쳐 뜬다.
 *
 * 처음에는 화면 오른쪽 끝에서 전면 서랍으로 밀어 냈는데, 그러면 방금 푼 문항이 화면
 * 밖으로 밀려나 「무엇에 대한 진단서인지」가 사라졌다. 문항 자리에 그대로 겹쳐 두고
 * 아래의 문항을 희미하게 비쳐 보이게 하면, 판이 어디서 나온 것인지 눈으로 따라간다.
 * 살짝 어긋나게 얹는 것도 같은 까닭이다 — 아래에 뭔가 있다는 것이 보여야 한다.
 *
 * 문항 하나를 푼 것으로 낼 수 있는 말은 많지 않다. 그래서 점수·백분위를 만들어 내지
 * 않고 **이 한 문항에서 보이는 것 세 줄**과 다음에 해 볼 것만 적는다. 실제 진단서가
 * 무엇을 더 담는지는 아래 요약본·정밀본 칸으로 넘긴다.
 *
 * 닫혀 있을 때도 DOM에 남겨 두어야 나타나는 움직임이 산다. 대신 inert를 걸어 보조기기와
 * 탭 이동에서 통째로 빠지게 한다.
 */
export default function ReportPanel({
  item,
  picked,
  open,
  onClose,
}: {
  item: TryItem;
  picked: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLElement | null>(null);

  /* 열리면 닫기 단추로 초점을 옮기고, 닫으면 부르기 전 자리로 돌려준다.
     쪽 전체를 잠그지는 않는다 — 전면 서랍이 아니라 문항 자리에 얹힌 판이라, 판이
     길면 쪽을 굴려 내려 읽어야 한다. */
  useEffect(() => {
    if (!open) return;
    backRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      backRef.current?.focus?.();
    };
  }, [open, onClose]);

  const subject = subjects.find((s) => s.id === item.subject)!;
  const right = picked === item.answer;

  return (
    <div
      role="dialog"
      aria-label="체험 진단서"
      inert={!open}
      aria-hidden={!open}
      /* 문항 판과 같은 크기(inset-0)로 그 자리에 얹고, 화면이 넓을 때만 오른쪽·위로 20px씩
         어긋나게 민다. 어긋난 만큼 아래의 문항 판 가장자리가 희미하게 비쳐서 「이 문항의
         진단서」라는 것이 보인다. 폰에서는 옆으로 삐져나갈 자리가 없어 딱 겹친다. */
      className={`absolute inset-0 z-30 flex flex-col overflow-hidden rounded-2xl border border-accent-200 bg-white shadow-float transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 sm:translate-x-5 sm:-translate-y-5"
          : "pointer-events-none translate-x-8 translate-y-2 scale-[0.98] opacity-0"
      }`}
    >
      {/* ── 머리 ── */}
      <header className="shrink-0 border-b border-brand-100 bg-accent-100/40 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-eyebrow text-accent-600">체험 진단서</p>
            <p className="type-h3 mt-1 font-black text-brand-950">이 한 문항에서 보인 것</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-mt-1.5 -mr-1.5 rounded-full p-2 text-slate-500 transition-colors hover:bg-white hover:text-brand-700"
            aria-label="닫고 문항으로 돌아가기"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="type-caption mt-2 text-slate-500">
          {subject.name} · 체험 문항 1개 · 점수와 백분위는 내지 않습니다
        </p>
      </header>

      {/* ── 본문 ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {/* 고른 답 */}
        <section>
          <p className="type-tag text-slate-500">고른 보기</p>
          <div
            className={`mt-2 rounded-xl border px-4 py-3.5 ${
              right ? "border-emerald-200 bg-surface-mint" : "border-amber-200 bg-surface-amber"
            }`}
          >
            <p className="type-body flex gap-2 font-bold text-brand-950">
              <span aria-hidden className="shrink-0 tabular-nums">
                {picked === null ? "—" : circled(picked)}
              </span>
              <span>{picked === null ? "아직 고르지 않았습니다" : item.choices[picked].text}</span>
            </p>
            <p
              className={`type-caption mt-2 font-bold ${
                right ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {right ? "정답입니다" : `정답은 ${circled(item.answer)}번입니다`}
            </p>
          </div>
        </section>

        {/* 보이는 것 세 줄 */}
        <section className="mt-6">
          <p className="type-tag text-slate-500">이 문항이 보는 것</p>
          <ul className="mt-2.5 space-y-3">
            {item.report.reads.map((r) => (
              <li key={r.t} className="flex gap-3">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kindTone[r.kind].dot}`}
                />
                <div>
                  <p className="type-h4 font-black text-brand-950">{r.t}</p>
                  <p className="type-meta mt-0.5 text-slate-600">{r.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 한 줄 소견 */}
        {/* 면을 깔지 않고 왼쪽 선 하나로만 세운다 — 인용 부호처럼 읽히면 충분하다 */}
        <section className="mt-6 border-l-2 border-slate-300 py-0.5 pl-4">
          <p className="type-tag text-slate-500">읽어 드리면</p>
          <p className="type-body mt-1.5 text-slate-700">
            {right ? item.report.right : item.report.wrong}
          </p>
        </section>

        {/* 다음에 해 볼 것 */}
        <section className="mt-6">
          <p className="type-tag text-slate-500">집에서 해 볼 것</p>
          <ul className="mt-2.5 space-y-2">
            {item.report.next.map((n) => (
              <li key={n} className="type-body flex gap-2 text-slate-700">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                {n}
              </li>
            ))}
          </ul>
        </section>

        {/* 밑줄 세 갈래가 무엇이었는지 — 화면에서 본 색과 같은 색으로 다시 적는다 */}
        <section className="mt-6 rounded-xl bg-slate-50 px-4 py-4">
          <p className="type-tag text-slate-500">밑줄의 종류</p>
          <ul className="mt-2.5 space-y-2">
            {(Object.keys(markKinds) as MarkKind[]).map((k) => (
              <li key={k} className="type-caption flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`type-tag rounded-full px-2 py-0.5 ${kindTone[k].chip}`}>
                  {markKinds[k].name}
                </span>
                <span className="text-slate-600">{markKinds[k].desc}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 실제 진단서 */}
        <section className="mt-6 border-t border-brand-100 pt-5">
          <p className="type-h4 font-black text-brand-950">실제 진단서에는</p>
          <p className="type-meta mt-1.5 text-slate-600">
            세 과목을 모두 푼 뒤, 재능 여덟 갈래의 좌표와 유형·실행 가이드까지 담아 발행합니다.
            AI가 1차로 분석하고 교육전문가가 협진으로 확정한 뒤에야 공개됩니다.
          </p>
        </section>
      </div>

      {/* ── 바닥 단추 ── */}
      <footer className="shrink-0 border-t border-brand-100 bg-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/exam" className="btn btn-md flex-1 bg-brand-900 text-white hover:bg-brand-800">
            무료 학력진단 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-md flex-1 border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
          >
            문항으로 돌아가기
          </button>
        </div>
        <p className="type-caption mt-3 text-slate-500">
          체험용 화면입니다. 여기서 고른 답은 어디에도 저장되지 않고, 실제 진단 결과와 무관합니다.
        </p>
      </footer>
    </div>
  );
}
