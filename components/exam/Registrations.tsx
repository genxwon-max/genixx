"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCatalogRounds, type CatalogRound } from "@/lib/catalogRounds";
import { assessment } from "@/lib/exam";
import { evalName, trackOf, type TrackId } from "@/lib/examCatalog";
import { useWallet } from "@/lib/ticketStore";
import { btnBox } from "./ui";

/**
 * 탭 화면들이 함께 쓰는 조각 — 가운데 큰 제목과 「접수한 평가」 표.
 *
 * 응시하기 · 정답과 해설 두 탭이 같은 표(번호 · 검사명 · 접수일 · 마지막 칸)를 편다.
 * 마지막 칸만 탭마다 다르다 — 응시 버튼이거나 정답과 해설 버튼이다.
 */

/** 탭 이름을 그대로 쓰는 가운데 제목 */
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

/** 「2026-09-15T…」 → 「2026.09.15」 */
function day(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export function RegTable({
  rows,
  lastHead,
  renderLast,
  caption,
}: {
  rows: Registration[];
  lastHead: string;
  renderLast: (row: Registration) => ReactNode;
  caption: string;
}) {
  const th = "border-b border-soft-line px-4 py-4 font-semibold text-soft-ink";
  const td = "border-b border-soft-line px-4 py-4 text-soft-muted";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse bg-white text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[10%]" />
          <col />
          <col className="w-[18%]" />
          <col className="w-[24%]" />
        </colgroup>
        <thead>
          <tr className="border-t-2 border-soft-primary bg-slate-50">
            <th scope="col" className={`${th} text-left`}>
              번호
            </th>
            <th scope="col" className={th}>
              검사명
            </th>
            <th scope="col" className={th}>
              접수일
            </th>
            <th scope="col" className={th}>
              {lastHead}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className={`${td} text-center`}>
                내역이 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={`${r.round}-${r.track}`}>
                <td className={`${td} tabular-nums`}>{rows.length - i}</td>
                <td className={`${td} text-center font-semibold text-soft-ink`}>{r.title}</td>
                <td className={`${td} text-center tabular-nums`}>{day(r.at)}</td>
                <td className={`${td} text-center`}>{renderLast(r)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** 접수한 평가가 없을 때 표 아래에 두는 길 안내 */
export function GoApply() {
  return (
    <div className="mt-8 text-center">
      <p className="text-[14px] text-soft-muted">접수하기 탭에서 평가를 먼저 접수해 주세요.</p>
      <Link href="/exam/apply" className={`mt-4 ${btnBox}`}>
        접수하기로 이동
      </Link>
    </div>
  );
}
