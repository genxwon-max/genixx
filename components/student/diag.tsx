"use client";

import Link from "next/link";
import { SUBJECT_IDS, freeOrder, tierOf } from "@/lib/exam";
import type { CatalogRound } from "@/lib/catalogRounds";
import { dotDate, evalName } from "@/lib/examCatalog";
import {
  allSubmitted,
  getRecord,
  regId,
  submittedCount,
  useExamVersion,
  type ExamRecord,
  type RegRef,
} from "@/lib/examStore";
import { reportFor, useReports, type ReportDoc } from "@/lib/reportStore";
import { isAnswered } from "@/components/exam/ExamSession";
import { useRegistrations, type Registration } from "@/components/exam/Registrations";
import { Head, btnGo, cardBox } from "./self";

/**
 * 학생 대시보드의 진단 한 건 — 「내 진단」과 「진단 결과」가 같은 줄을 읽는다.
 *
 * 두 자리 모두 목록 → 상세다. 목록은 접수한 진단을 최근 것부터 한 줄씩 세우고, 줄을 누르면
 * 그 진단의 주소(/student/exams/2026-3/e4 · /student/results/2026-3/e4)로 들어간다.
 * 단계와 진행을 두 곳이 따로 세면 같은 진단이 목록마다 다르게 읽히므로 여기 한곳에서 센다.
 */

/** 학생에게 부르는 진단의 자리 — 과목 상태(lib/progress.ts의 Phase)보다 한 겹 넓다 */
export type Stage = "upcoming" | "ready" | "doing" | "submitted" | "reviewing" | "published" | "closed";

const stageView: Record<Stage, { label: string; tone: string; dot: string }> = {
  upcoming: { label: "응시 시작 전", tone: "text-slate-500", dot: "bg-slate-300" },
  ready: { label: "시작 전", tone: "text-slate-600", dot: "bg-slate-400" },
  doing: { label: "진행 중", tone: "text-amber-700", dot: "bg-amber-500" },
  submitted: { label: "최종 제출 전", tone: "text-soft-primary", dot: "bg-soft-primary" },
  reviewing: { label: "전문가 확인 중", tone: "text-soft-primary", dot: "bg-soft-primary" },
  published: { label: "결과 발행", tone: "text-emerald-700", dot: "bg-emerald-500" },
  closed: { label: "기간 종료", tone: "text-slate-500", dot: "bg-slate-300" },
};

/** 아직 응시할 수 있는 자리 — 마감까지 남은 날을 이때만 말한다 */
export const openStages: Stage[] = ["doing", "submitted", "ready"];

export type Diag = {
  reg: Registration;
  ref: RegRef;
  id: string;
  /** 「2026 3분기 초4 진단」 */
  name: string;
  record: ExamRecord;
  report: ReportDoc | null;
  stage: Stage;
};

function stageOf(record: ExamRecord, round: CatalogRound | undefined, published: boolean): Stage {
  if (record.finalized) return published ? "published" : "reviewing";
  if (round?.availability === "soon") return "upcoming";
  if (round?.availability === "ended") return "closed";
  if (allSubmitted(record)) return "submitted";
  const started = SUBJECT_IDS.some((id) => record.subjects[id].status !== "ready");
  return started ? "doing" : "ready";
}

/** 접수한 진단 — 응시 기간이 늦은 것부터. 같은 회차면 나중에 접수한 것이 위로 */
export function useDiags(studentId: string): Diag[] {
  const regs = useRegistrations(studentId);
  const reports = useReports();
  /* 줄마다 getRecord로 읽는다 — 기록이 바뀌면 다시 그리도록 구독만 건다 */
  useExamVersion();

  return regs
    .map((r) => {
      const ref = { round: r.round, track: r.track };
      const record = getRecord(studentId, ref);
      const report = reportFor(reports, studentId, ref) ?? null;
      return {
        reg: r,
        ref,
        id: regId(ref),
        name: evalName(r.round, r.track, r.info?.label),
        record,
        report,
        stage: stageOf(record, r.info, record.finalized && report?.state === "published"),
      };
    })
    .sort(
      (a, b) =>
        (b.reg.info?.opensOn ?? "").localeCompare(a.reg.info?.opensOn ?? "") ||
        b.reg.at.localeCompare(a.reg.at),
    );
}

export const findDiag = (diags: Diag[], round: string, track: string) =>
  diags.find((d) => d.ref.round === round && d.ref.track === track) ?? null;

/** 진단 한 건의 자리 — 과목을 응시하는 판이 선다 */
export const examPath = (r: RegRef) => `/student/exams/${r.round}/${r.track}`;
/** 진단 한 건의 결과지 */
export const resultPath = (r: RegRef) => `/student/results/${r.round}/${r.track}`;

/** 얼마나 했나 — 유료는 과목, 무료는 한 판이라 문항으로 센다 */
export function amountOf(record: ExamRecord) {
  if (record.tier === "free") {
    const qs = freeOrder();
    const answered = allSubmitted(record)
      ? qs.length
      : qs.filter((q) => isAnswered(q, record.subjects[q.subject].answers[q.id])).length;
    return { done: answered, total: qs.length, unit: "문항" };
  }
  return { done: submittedCount(record), total: SUBJECT_IDS.length, unit: "과목" };
}

/** 마감까지 남은 날 — 오늘이 마감이면 0. 날짜가 지났으면 null(말하지 않는다) */
export function daysLeft(closesOn: string | undefined) {
  if (!closesOn) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const n = Math.round((new Date(`${closesOn}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  return n >= 0 ? n : null;
}

export const dayText = (n: number | null) =>
  n === null ? "" : n === 0 ? "오늘 마감" : `마감까지 ${n}일`;

/** 「2026-08-01」 → 「08.01」 */
export const md = (d: string) => dotDate(d).slice(5);

/** 「응시 기간 2026.08.01 ~ 2026.08.31」 — 회차가 목록에서 사라졌으면 빈 글 */
export const periodOf = (info: CatalogRound | undefined) =>
  info ? `응시 기간 ${dotDate(info.opensOn)} ~ ${dotDate(info.closesOn)}` : "";

/* ───────────────────────── 조각 ───────────────────────── */

/** 점 하나와 말 한마디 — 단계를 목록과 상세가 같은 모양으로 적는다 */
export function StageTag({ stage, label }: { stage: Stage; label?: string }) {
  const v = stageView[stage];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${v.tone}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${v.dot}`} />
      {label ?? v.label}
    </span>
  );
}

export function TierChip({ tier }: { tier: Registration["tier"] }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
        tier === "free" ? "bg-slate-100 text-slate-500" : "bg-soft-primary-soft text-soft-primary"
      }`}
    >
      {tierOf(tier).label}
    </span>
  );
}

/**
 * 목록의 한 줄 — 왼쪽에 진단 이름과 날짜, 오른쪽에 지금 자리.
 *
 * 줄 전체가 눌리는 자리다(이름만 링크로 두면 오른쪽을 누른 아이는 아무 일도 겪지 않는다).
 * 갈 곳이 없는 줄(결과가 아직 없는 진단)은 링크를 걸지 않고 화살표도 달지 않는다.
 */
export function DiagRow({
  diag,
  href,
  when,
  state,
  note,
}: {
  diag: Diag;
  href?: string;
  /** 이름 아래 한 줄 — 응시 기간 · 발행일 */
  when: string;
  state: React.ReactNode;
  note: string;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold text-soft-ink">
            {diag.name}
            <TierChip tier={diag.reg.tier} />
          </span>
          {when && (
            <span className="mt-1 block text-[13px] tabular-nums text-soft-muted">{when}</span>
          )}
        </span>
        <span className="flex flex-col gap-0.5 sm:w-52 sm:shrink-0 sm:items-end sm:text-right">
          {state}
          {note && <span className="text-[12.5px] leading-snug text-soft-muted">{note}</span>}
        </span>
      </span>
      <span aria-hidden className="text-[20px] leading-none text-slate-300">
        {href ? "›" : ""}
      </span>
    </>
  );

  const row = "grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 px-5 py-4 sm:px-6";
  return href ? (
    <Link href={href} className={`${row} transition-colors hover:bg-slate-50`}>
      {body}
    </Link>
  ) : (
    <div className={row}>{body}</div>
  );
}

/** 목록이 비었을 때 — 접수하는 길 하나 */
export function EmptyList({ body }: { body: string }) {
  return (
    <div className={`${cardBox} mt-7 p-10 text-center`}>
      <p className="text-[15px] font-bold text-soft-ink">아직 접수한 진단이 없습니다</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.75] text-soft-muted">{body}</p>
      <Link href="/exam/apply" className={`${btnGo} mt-5`}>
        진단 접수하기 →
      </Link>
    </div>
  );
}

/** 주소가 가리키는 진단이 이 학생의 접수에 없을 때 */
export function MissingDiag({ back }: { back: { href: string; label: string } }) {
  return (
    <>
      <Head back={back} title="진단을 찾을 수 없습니다" />
      <div className={`${cardBox} mt-7 p-10 text-center`}>
        <p className="mx-auto max-w-md text-[13.5px] leading-[1.75] text-soft-muted">
          접수하지 않은 진단이거나 주소가 바뀌었습니다. 목록에서 다시 골라 주세요.
        </p>
        <Link href={back.href} className={`${btnGo} mt-5`}>
          {back.label} 목록으로
        </Link>
      </div>
    </>
  );
}
