"use client";

import { useEffect, useRef } from "react";
import { sampleReport } from "@/lib/diagReport";
import { serifKr } from "./font";
import { Overview } from "./FullPages";
import "./report.css";

const PAGE_PX = 794;

/**
 * 샘플 화면(PUB-04-1)의 정밀본 한 면 미리보기 — 종합 진단 결과 면.
 *
 * 그림처럼 보이게 둔다: 고를 수도 누를 수도 없고, 위쪽만 또렷하고 아래로 갈수록 흐려지며
 * 사라진다. 한 면을 통째 보여 주면 보고서를 다 읽은 것처럼 되어, 「이런 결과지가 나온다」는
 * 인상만 남기고 나머지는 가린다. 지면 자체는 실제 보고서와 같은 컴포넌트다.
 */
export default function ReportPreview() {
  const box = useRef<HTMLDivElement>(null);
  const r = sampleReport;

  /* 칸 폭에 맞춰 종이를 통째 줄인다 */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () =>
      el.style.setProperty("--rp-zoom", String(Math.min(1, el.clientWidth / PAGE_PX)));
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <figure className="mx-auto max-w-[640px]">
      <div
        ref={box}
        aria-hidden
        className={`rp relative select-none overflow-hidden rounded-t-md bg-transparent ${serifKr.variable}`}
        style={{ height: "calc(1123px * var(--rp-zoom, 0.8) * 0.72)" }}
      >
        <div className="pointer-events-none" style={{ zoom: "var(--rp-zoom, 0.8)" }}>
          <Overview r={r} foot={`전문가 40인 중 ${r.reviewers}인 교차검증 · AI 정밀분석`} />
        </div>
        {/* 아래로 갈수록 흐리게 — 흐림을 먼저 깔고 그 위를 흰색으로 덮는다 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] backdrop-blur-[3px]"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 55%)" }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-white/0 via-white/70 to-white" />
      </div>
      <figcaption className="type-meta mt-3 text-center text-slate-500">
        정밀본 셋째 면 · 종합 진단 결과 (가상의 아이로 꾸민 샘플)
      </figcaption>
    </figure>
  );
}
