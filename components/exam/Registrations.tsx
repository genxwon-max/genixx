"use client";

import type { ReactNode } from "react";
import { useCatalogRounds, type CatalogRound } from "@/lib/catalogRounds";
import { assessment } from "@/lib/exam";
import { evalName, trackOf, type TrackId } from "@/lib/examCatalog";
import { useWallet, type UseTier } from "@/lib/ticketStore";

/**
 * 응시 존과 학생 대시보드가 함께 쓰는 조각 — 가운데 큰 제목과 「접수한 진단」 읽기.
 *
 * 예전에는 응시 존의 탭 셋(응시하기 · 정답과 해설 · 결과보기)이 같은 표(번호 · 진단명 ·
 * 접수일 · 마지막 칸)를 폈고 그 표가 여기 있었다. 탭이 학생 대시보드로 옮겨 가면서 표는
 * 대시보드의 목록(components/student/diag.tsx의 DiagRow)이 대신한다. 접수 기록을 읽는
 * useRegistrations는 그 목록이 그대로 쓴다.
 */

/** 응시 존 화면(진단 둘러보기 · 서비스 안내 · 진단 안내)의 가운데 제목 */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="pb-2 pt-4 text-center md:pt-8">
      <h1 className="text-[32px] font-bold tracking-tight text-soft-ink md:text-[44px]">
        {children}
      </h1>
      {sub && <p className="mt-3 text-[14px] leading-relaxed text-soft-muted">{sub}</p>}
    </div>
  );
}

export type Registration = {
  round: string;
  track: TrackId;
  /** 무료 진단으로 접수한 것인가 유료 진단인가 */
  tier: UseTier;
  /** 접수 시각 (ISO) */
  at: string;
  /** 평가가 목록에서 사라졌으면 없다 */
  info?: CatalogRound;
  title: string;
};

/** 접수한 평가 — 최근에 접수한 것이 위로 */
export function useRegistrations(studentId: string): Registration[] {
  const wallet = useWallet(studentId);
  const rounds = useCatalogRounds();
  return [...wallet.used].reverse().map((u) => {
    const info = rounds.find((r) => r.id === u.round);
    return {
      ...u,
      info,
      title: `${assessment.name} ${evalName(u.round, u.track, info?.label)} · ${trackOf(u.track).short}`,
    };
  });
}
