"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "@/lib/authStore";
import { assessment } from "@/lib/exam";
import { evalName, trackOf } from "@/lib/examCatalog";
import { useCatalogRounds } from "@/lib/catalogRounds";
import { getRecord, useExamStore, useHydrated } from "@/lib/examStore";
import { phaseTone, progressOf, type Phase } from "@/lib/progress";
import { useReports } from "@/lib/reportStore";
import { useExamConfig } from "@/lib/roundStore";
import { useRoster, type Student } from "@/lib/roster";
import { useTickets, walletOf } from "@/lib/ticketStore";
import { btnBoxGhost, eyebrow, govTable, panel, td, tdStrong, th } from "./ui";

/**
 * 결과 리포트 목록 (/exam/result) — 아직 볼 결과가 없을 때 서는 자리.
 *
 * 예전에는 「아직 최종 제출 전입니다」 한 장을 가운데에 띄우고 응시 현황으로 돌려보냈다.
 * 보호자는 아이가 여럿이라 그 한 장이 누구 이야기인지 알 수 없었다. 여기서는 사람과
 * 평가를 줄로 세운다 — **누가** 어떤 평가를 봤고 그 결과가 지금 어디까지 왔는지.
 *
 * 비어 있을 때도 화면을 갈아 끼우지 않고 같은 표 안에서 말한다. 학생이 아예 없으면
 * 「아직 등록된 학생이 없습니다」, 학생은 있는데 접수한 평가가 없으면 「아직 응시한
 * 시험이 없습니다」 — 둘은 해야 할 일이 다르므로 문구도 가는 길도 나눈다.
 *
 * 줄은 **접수 기록**(lib/ticketStore.ts)에서 나온다. 접수 기록이 없는데 응시 기록만
 * 남은 아이(시연용 씨앗·예전 저장분)는 지금 회차 이름으로 한 줄을 세운다 — 응시한
 * 흔적이 있는데 목록에서 사라지면 「내 결과가 없어졌다」로 읽힌다.
 */

type ResultRow = {
  key: string;
  student: Student;
  /** 어떤 평가를 봤는가 */
  title: string;
  /** 접수 시각 (ISO) — 접수 기록이 없으면 없다 */
  at: string | null;
  phase: Phase;
  finalized: boolean;
  published: boolean;
};

/** 「2026-09-15T…」 → 「2026.09.15」 */
function day(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function ResultIndex() {
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const tickets = useTickets();
  const reports = useReports();
  const rounds = useCatalogRounds();
  const config = useExamConfig();
  // progressOf가 응시 기록을 React 밖에서 읽는다. 기록이 바뀌면 다시 세도록 구독만 걸어 둔다.
  const store = useExamStore();

  /**
   * 누구의 결과를 모아 보는 자리인가.
   *
   * 학생 세션은 자기 것만 본다. 보호자는 자기가 등록한 아이들, 기관은 소속 학생.
   * 명부를 통째로 펴면 남의 아이 이름이 목록에 선다.
   */
  const scope = useMemo(() => {
    if (session?.role === "student") return roster.filter((s) => s.id === session.studentId);
    if (session?.role === "parent") return roster.filter((s) => s.owner === "parent");
    if (session?.role === "director" || session?.role === "teacher")
      return roster.filter((s) => s.owner === "director");
    return roster;
  }, [roster, session]);

  const rows = useMemo(() => {
    const out: ResultRow[] = [];

    for (const student of scope) {
      const record = getRecord(student.id);
      const { phase } = progressOf(student);
      const published =
        reports.find((r) => r.studentId === student.id)?.state === "published";
      const uses = walletOf(tickets, student.id).used;

      if (uses.length === 0) {
        // 접수 기록이 없는데 응시도 하지 않았으면 결과 목록에 설 까닭이 없다
        if (phase === "미응시") continue;
        out.push({
          key: student.id,
          student,
          title: `${assessment.name} ${config.roundLabel}`,
          at: record.finalizedAt,
          phase,
          finalized: record.finalized,
          published,
        });
        continue;
      }

      for (const use of uses) {
        const info = rounds.find((r) => r.id === use.round);
        out.push({
          key: `${student.id}-${use.round}-${use.track}`,
          student,
          title: `${assessment.name} ${evalName(use.round, use.track, info?.label)} · ${trackOf(use.track).short}`,
          at: use.at,
          phase,
          finalized: record.finalized,
          published,
        });
      }
    }

    // 최근에 접수한 것이 위로. 접수일이 없는 줄은 뒤에 붙인다.
    return out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, tickets, reports, rounds, config, store]);

  return (
    <div>
      <header className="border-b border-soft-line pb-5">
        <p className={eyebrow}>RPT-01 · 결과 리포트</p>
        <h1 className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">
          결과 리포트
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          누가 어떤 평가를 봤는지와 그 결과가 지금 어디까지 왔는지를 모아 둔 자리입니다.
        </p>
      </header>

      <div className={`mt-6 overflow-x-auto ${panel}`}>
        <table className={`${govTable} min-w-[720px]`}>
          <caption className="sr-only">응시한 평가와 결과 발행 상태</caption>
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={th}>번호</th>
              <th className={th}>학생</th>
              <th className={th}>평가</th>
              <th className={th}>접수일</th>
              <th className={th}>진행</th>
              <th className={th}>결과</th>
            </tr>
          </thead>
          <tbody>
            {!hydrated ? (
              <tr>
                <td colSpan={6} className={`${td} py-12`}>
                  결과를 불러오는 중입니다…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${td} py-14`}>
                  <p className="text-[14px] font-semibold text-soft-ink">
                    {scope.length === 0
                      ? "아직 등록된 학생이 없습니다."
                      : "아직 응시한 시험이 없습니다."}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
                    {scope.length === 0
                      ? "학생을 등록하면 접속코드가 발급되고, 그때부터 응시 기록이 이 목록에 쌓입니다."
                      : "접수한 평가를 아이가 응시하고 최종 제출하면 이 목록에 결과가 올라옵니다."}
                  </p>
                  <Link
                    href={scope.length === 0 ? "/my/children/new" : "/my/children"}
                    className={`mt-5 ${btnBoxGhost}`}
                  >
                    {scope.length === 0 ? "학생 등록하기" : "학생 목록으로"}
                  </Link>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const tone = phaseTone[r.phase];
                return (
                  <tr key={r.key}>
                    <td className={`${td} tabular-nums`}>{rows.length - i}</td>
                    <td className={tdStrong}>{r.student.name}</td>
                    <td className={`${td} text-left text-soft-ink`}>{r.title}</td>
                    <td className={`${td} tabular-nums`}>{r.at ? day(r.at) : "—"}</td>
                    <td className={td}>
                      <span className={`inline-flex items-center gap-1.5 ${tone.text}`}>
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {r.phase}
                      </span>
                    </td>
                    <td className={td}>
                      {/* 결과 칸은 셋으로 갈린다 — 아직 제출 전 · 사람이 확인하는 중 · 발행 완료 */}
                      {!r.finalized ? (
                        "응시 완료 후 공개"
                      ) : !r.published ? (
                        "전문가 확인 중"
                      ) : (
                        <Link
                          href={`/exam/result?student=${r.student.id}`}
                          className={btnBoxGhost}
                        >
                          결과 보기
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
