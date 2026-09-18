"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { buildLiveReport, editions, type Edition } from "@/lib/diagReport";
import { SUBJECT_IDS, type SubjectId } from "@/lib/exam";
import { useExamRecord, useHydrated } from "@/lib/examStore";
import { decideType, scoreAxes, scoreSubject } from "@/lib/result";
import { useReportOf } from "@/lib/reportStore";
import { unlockFull, useFullUnlocked } from "@/lib/reportUnlockStore";
import { useRoster } from "@/lib/roster";
import { useExamConfig } from "@/lib/roundStore";
import FullPages from "./FullPages";
import ReportViewer from "./ReportViewer";
import SummaryPages from "./SummaryPages";

/**
 * 회원이 받는 진단 보고서 새 창 — /report/summary?student= · /report/full?student=
 *
 * 누구의 보고서인지는 결과 화면(ResultView)과 같은 규칙으로 정한다. 학생은 자기 것, 보호자·
 * 기관은 ?student= 로 받되 내 명부에 있는 아이일 때만 연다. 발행(EXP-08) 전이면 열지 않는다
 * — 결과 화면이 열리지 않는 아이의 보고서가 새 창에서만 열리면 그 약속이 거짓이 된다.
 */
export default function LiveReport({ edition }: { edition: Edition }) {
  const hydrated = useHydrated();
  const session = useSession();
  const config = useExamConfig();
  const params = useSearchParams();
  const roster = useRoster();

  const asked = params.get("student");
  const mine = asked ? roster.find((s) => s.id === asked) : null;
  const studentId = mine?.id ?? session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const report = useReportOf(studentId);
  const unlocked = useFullUnlocked(studentId);

  if (!hydrated) return <Notice>보고서를 불러오는 중입니다…</Notice>;
  if (!session) {
    return (
      <Notice action={<Link href="/login">로그인</Link>}>
        로그인한 뒤에 보고서를 열 수 있습니다.
      </Notice>
    );
  }
  if (!record.finalized || !report || report.state !== "published") {
    return (
      <Notice action={<Link href="/exam/result">결과 목록으로</Link>}>
        아직 발행되지 않은 보고서입니다. 전문가 확인이 끝나면 열립니다.
      </Notice>
    );
  }

  const scores: Partial<Record<SubjectId, number>> = {};
  for (const id of SUBJECT_IDS) {
    if (record.subjects[id].status === "submitted") scores[id] = scoreSubject(record, id).score;
  }
  const type = decideType(scoreAxes(record));
  const r = buildLiveReport({
    name: report.student,
    grade: report.grade,
    date: new Date(record.finalizedAt ?? report.assembledAt),
    reportId: report.id,
    round: config.roundLabel,
    scores,
    typeName: type?.name,
    typeDesc: type?.summary,
  });

  const lockedFull = edition === "full" && !unlocked;

  return (
    <ReportViewer
      edition={edition}
      name={r.student.name}
      printable={!lockedFull}
      notice={
        <>
          <b>시안</b> · 과목 점수·백분위·유형·이름은 이 응시 기록에서 계산했고, 영역별 세부
          점수·풀이 시간·서술 문구는 아직 예시 문안입니다.
        </>
      }
    >
      {edition === "summary" ? (
        <SummaryPages r={r} />
      ) : lockedFull ? (
        <section className="rp-page items-center justify-center text-center">
          <p className="text-[11px] font-bold tracking-[0.12em] text-(--rp-accent)">
            정밀본 · 전 10면
          </p>
          <p className="rp-serif mt-3 text-[30px] text-(--rp-ink)">
            {r.student.name} 학생의 정밀본
          </p>
          <p className="mt-3 max-w-[120mm] text-[13px] leading-[1.8]">
            영역별 근거와 대표 문항 답안 리뷰, 학습 성향, 학생용 성장 지도, 3개월 로드맵과 전문가
            총평이 실립니다.
          </p>
          <p className="mt-6 text-[13px] text-(--rp-muted)">
            <s>{editions.full.price}</s>{" "}
            <b className="ml-1 text-(--rp-ink)">2026 파일럿 기간 무료</b>
          </p>
          <button
            type="button"
            onClick={() => unlockFull(studentId)}
            className="no-print mt-5 rounded-md bg-[#1d1d19] px-6 py-3 text-[14px] font-bold text-white hover:bg-black"
          >
            정밀본 받기
          </button>
        </section>
      ) : (
        <FullPages r={r} />
      )}
    </ReportViewer>
  );
}

function Notice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center text-[14px] text-slate-600">
      <p>{children}</p>
      {action && (
        <span className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-800 hover:border-slate-400">
          {action}
        </span>
      )}
    </div>
  );
}
