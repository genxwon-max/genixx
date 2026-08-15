"use client";

import { useEffect, useState } from "react";
import { axes, primaryTypes } from "@/lib/result";

/**
 * 히어로 아래 「어떤 유형이 나오나」 띠.
 *
 * ⚠ 흔히 쓰는 "지금까지 12,450명이 진단받았습니다" 식의 실시간 카운터는 두지
 *   않았다. 2026 파일럿이 아직 접수 중이라 셀 실적이 없고, 없는 숫자를 세는
 *   순간 광고가 아니라 거짓말이 된다. 대신 결과지가 실제로 내보내는 유형
 *   이름을 돌려 보여 준다 — 호기심은 같은 크기로 자극하면서 근거는 진짜다.
 *
 * 돌리는 대상은 2026년에 실제로 측정하는 세 축의 유형뿐이다. 아직 재지 못하는
 * 축의 유형을 예시로 걸면 "지금 받으면 저게 나온다"로 읽힌다.
 */
const items = axes
  .filter((axis) => axis.subject)
  .map((axis) => ({ axis, ...primaryTypes[axis.id] }));

const INTERVAL = 3600;

export default function TypeTicker() {
  const [at, setAt] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setAt((v) => (v + 1) % items.length), INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const now = items[at];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-brand-100 bg-white/80 px-4 py-3 shadow-card backdrop-blur">
      <span className="type-tag shrink-0 rounded-full bg-surface-blue px-2.5 py-1 text-brand-700">
        결과 유형 예시
      </span>

      {/* 3.6초마다 글자가 바뀌는 자리를 읽어 주면 화면낭독기 사용자는 소음이 된다.
          돌아가는 칸은 감추고, 대신 전체 목록을 한 번에 읽히도록 따로 둔다. */}
      <p aria-hidden className="min-w-0 flex-1">
        <b
          key={now.name}
          className="animate-fade-up type-h4 inline-block font-black text-brand-900"
        >
          {now.name}형
        </b>
        <span className="type-meta ml-2 text-slate-600">{now.tagline}</span>
      </p>

      <span className="sr-only">
        2026 파일럿에서 나올 수 있는 재능 유형은{" "}
        {items.map((i) => `${i.name}형(${i.tagline})`).join(", ")}입니다.
      </span>
    </div>
  );
}
