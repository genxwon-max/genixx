"use client";

import Link from "next/link";
import { via2 } from "@/lib/designScreens";
import type { Registration } from "@/components/exam/Registrations";
import { EmptyList, StageTag, TierChip, type Stage } from "@/components/student/diag";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import DashFrame from "../DashFrame";
import { flowFacts, flowRegs } from "./studentFlow";

/**
 * 학생 홈 (실제 주소 /student) — 대시보드로 다시 짠 시안 (/design3, 2026-11-09 사용자 요청 「상단에는 평가를
 * 몇 번 봤는지, 아래쪽은 지금까지 봤던 평가들을 리스트로」).
 *
 * 지금 홈(components/student/StudentHome.tsx)은 「지금 할 일」 한 칸과 지금 진단의 과목 칸만 세운다.
 * 진단을 여러 번 본 아이에게는 지난 진단이 홈에서 보이지 않는다. 이 시안은 두 덩이로 둔다.
 *
 *   위    숫자 칸 셋 — 지금까지 본 진단(몇 번 · 유료/무료 · 단계별 막대) · 결과 받은 진단 · 응시 중인 진단
 *   아래  지금까지 본 진단 — 응시 기간이 늦은 것부터 한 줄씩. 줄마다 단계 · 날짜 · 결과 유형 · 갈 곳 단추
 *
 * 화면에서는 「평가」가 아니라 서비스 전체가 쓰는 「진단」으로 적는다. 학생 · 진단 · 날짜는 학생 대시보드
 * 디자인이 함께 쓰는 예시(./studentFlow.ts — 이서준 · 초4 · 오늘 2026-10-12)다. 단추가 가는 곳은
 * /design2에 같은 화면이 있으면 그쪽, 없으면 /design의 학생 화면이다(via2).
 */

const frame = {
  who: "student",
  at: "/student",
  unread: 2,
  bellHref: via2("/design/student/alerts"),
} as const;

const applyHref = via2("/design/student/apply");

/* ───────────────────────── 지금까지 본 진단 ───────────────────────── */

type Row = {
  diag: { name: string; reg: Registration };
  period: string;
  stage: Stage;
  /** 단계 아래 한 줄 — 「3과목 중 1과목 제출」 · 「최종 제출 2026.08.24」 */
  progress: string;
  /** 결과가 발행된 진단의 재능 유형 */
  type?: string;
  published?: string;
  actions: { label: string; href: string; primary?: boolean }[];
};

/** 응시 기간 꼬리만 — 「2026.10.06 ~ 2026.10.31」 */
const span = (period: string) => period.replace("응시 기간 ", "");

const rows: Row[] = [
  {
    diag: { name: flowFacts.q4.name, reg: flowRegs.q4 },
    period: span(flowFacts.q4.period),
    stage: "doing",
    progress: `3과목 중 1과목 제출 · 마감까지 ${flowFacts.q4.daysLeft}일`,
    actions: [{ label: "이어서 응시", href: via2("/design/student/exams/2026-4/e4/doing"), primary: true }],
  },
  {
    diag: { name: flowFacts.q3.name, reg: flowRegs.q3 },
    period: span(flowFacts.q3.period),
    stage: "published",
    progress: `최종 제출 ${flowFacts.q3.finalized}`,
    type: flowFacts.q3.type,
    published: flowFacts.q3.published,
    actions: [
      { label: "정답과 해설", href: via2("/design/student/answers/2026-3/e4/graded") },
      { label: "결과 보기", href: via2("/design/student/results/2026-3/e4"), primary: true },
    ],
  },
  /* 2분기 결과지는 디자인에 따로 두지 않았다 — 같은 「결과 발행」인 3분기 결과지로 간다 */
  {
    diag: { name: flowFacts.q2.name, reg: flowRegs.q2 },
    period: span(flowFacts.q2.period),
    stage: "published",
    progress: `최종 제출 ${flowFacts.q2.finalized}`,
    type: flowFacts.q2.type,
    published: flowFacts.q2.published,
    actions: [
      { label: "정답과 해설", href: via2("/design/student/answers/2026-2/e4") },
      { label: "결과 보기", href: via2("/design/student/results/2026-3/e4"), primary: true },
    ],
  },
  {
    diag: { name: flowFacts.q1.name, reg: flowRegs.q1 },
    period: span(flowFacts.q1.period),
    stage: "closed",
    progress: "기간 안에 최종 제출하지 않음",
    actions: [{ label: "진단 보기", href: via2("/design/student/exams/2026-1/e4") }],
  },
];

/* ───────────────────────── 위 · 숫자 칸 ───────────────────────── */

/** 막대 한 토막 — 단계별로 몇 번인가. 색은 StageTag의 점과 같다 */
const bars: { stage: Stage; label: string; tone: string }[] = [
  { stage: "published", label: "결과 발행", tone: "bg-emerald-500" },
  { stage: "doing", label: "응시 중", tone: "bg-amber-500" },
  { stage: "closed", label: "기간 종료", tone: "bg-slate-300" },
];

const tile = `${cardBox} flex flex-col p-5 sm:p-6`;
const tileLabel = "text-[13px] font-semibold text-soft-muted";
const bigNum = "text-[34px] font-extrabold leading-none tracking-tight text-soft-ink tabular-nums";

function Summary({ list }: { list: Row[] }) {
  const total = list.length;
  const paid = list.filter((r) => r.diag.reg.tier === "paid").length;
  const count = (s: Stage) => list.filter((r) => r.stage === s).length;
  const results = list.filter((r) => r.stage === "published");
  const latest = results[0];
  const now = list.find((r) => r.stage === "doing" || r.stage === "ready" || r.stage === "submitted");

  return (
    <section aria-label="내 진단 요약" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 지금까지 본 진단 — 두 칸을 차지한다 */}
      <div className={`${tile} sm:col-span-2`}>
        <p className={tileLabel}>지금까지 본 진단</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
          <p className={bigNum}>
            {total}
            <span className="ml-1 text-[18px] font-bold text-soft-muted">회</span>
          </p>
          {total > 0 && (
            <p className="pb-0.5 text-[13px] tabular-nums text-soft-muted">
              유료 {paid} · 무료 {total - paid}
            </p>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            {total > 0 &&
              bars.map((b) => (
                <span
                  key={b.stage}
                  className={`${b.tone} h-full first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(count(b.stage) / total) * 100}%` }}
                />
              ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] tabular-nums text-soft-muted">
            {bars.map((b) => (
              <li key={b.stage} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`h-2 w-2 rounded-full ${b.tone}`} />
                {b.label}
                <span className="font-bold text-soft-ink">{count(b.stage)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 결과 받은 진단 */}
      <div className={tile}>
        <p className={tileLabel}>결과 받은 진단</p>
        <p className={`${bigNum} mt-3`}>
          {results.length}
          <span className="ml-1 text-[18px] font-bold text-soft-muted">건</span>
        </p>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-soft-muted">
          {latest ? (
            <>
              최근 결과 {latest.published}
              <br />
              <span className="font-semibold text-soft-ink">{latest.type}</span>
            </>
          ) : (
            "최종 제출한 진단의 결과가 발행되면 여기에 표시됩니다."
          )}
        </p>
        {latest && (
          <Link
            href={latest.actions.find((a) => a.primary)!.href}
            className="mt-auto pt-3 text-[13px] font-semibold text-soft-primary hover:underline"
          >
            최근 결과 보기 →
          </Link>
        )}
      </div>

      {/* 응시 중인 진단 */}
      <div className={`${tile} ${now ? "border-soft-primary/40 bg-soft-primary-soft/40" : ""}`}>
        <p className={tileLabel}>응시 중인 진단</p>
        {now ? (
          <>
            <p className="mt-3 text-[16px] font-bold leading-snug text-soft-ink">{now.diag.name}</p>
            <p className="mt-1.5 text-[12.5px] tabular-nums text-soft-muted">
              {now.progress.split(" · ").map((part) => (
                <span key={part} className="block">
                  {part}
                </span>
              ))}
            </p>
            <div className="mt-auto pt-4">
              <Link href={now.actions[0].href} className={`${btnGo} w-full`}>
                {now.actions[0].label} →
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className={`${bigNum} mt-3`}>
              0<span className="ml-1 text-[18px] font-bold text-soft-muted">건</span>
            </p>
            <p className="mt-3 text-[12.5px] leading-[1.6] text-soft-muted">
              진단을 접수하면 여기에서 바로 응시할 수 있습니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── 아래 · 목록 ───────────────────────── */

/**
 * md 이상에서 표처럼 칸을 맞추는 줄 — 진단 · 진행 · 결과 유형 · 단추. 줄마다 따로 그리드라 단추 칸을 auto로
 * 두면 줄마다 칸이 어긋난다 — 단추 둘(정답과 해설 · 결과 보기)이 한 줄에 드는 너비로 굳혔다
 */
const cols = "md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_12.5rem] md:items-center md:gap-6";

function DiagList({ list }: { list: Row[] }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-tight text-soft-ink">
          지금까지 본 진단
          <span className="ml-2 text-[14px] font-semibold text-soft-muted tabular-nums">{list.length}건</span>
        </h2>
        <Link
          href={via2("/design/student/exams")}
          className="text-[13px] font-semibold text-soft-muted hover:text-soft-ink"
        >
          내 진단에서 모두 보기 ›
        </Link>
      </div>

      <div className={`${cardBox} overflow-hidden`}>
        <div
          className={`hidden border-b border-soft-line bg-slate-50 px-6 py-2.5 text-[12px] font-semibold text-soft-muted ${cols}`}
        >
          <span>진단</span>
          <span>진행</span>
          <span>결과 유형</span>
          <span className="text-right">바로 가기</span>
        </div>

        <ul className="divide-y divide-slate-100">
          {list.map((r) => (
            <li key={r.diag.name} className={`flex flex-col gap-3 px-5 py-4 sm:px-6 ${cols}`}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-soft-ink">
                  {r.diag.name}
                  <TierChip tier={r.diag.reg.tier} />
                </p>
                <p className="mt-1 text-[12.5px] tabular-nums text-soft-muted">응시 기간 {r.period}</p>
              </div>

              <div className="min-w-0">
                <StageTag stage={r.stage} />
                <p className="mt-0.5 text-[12.5px] tabular-nums text-soft-muted">
                  {r.progress}
                  {r.published && <span className="block">결과 발행 {r.published}</span>}
                </p>
              </div>

              <div className="min-w-0 text-[13px]">
                {r.type ? (
                  <span className="font-semibold text-soft-ink">{r.type}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 md:flex-nowrap md:justify-end">
                {r.actions.map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={`${a.primary ? btnGo : btnQuiet} whitespace-nowrap px-4 py-2 text-[13px]`}
                  >
                    {a.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── 화면 ───────────────────────── */

/**
 * 인사 아래 한 줄 — 가장 최근에 발행된 결과의 유형(「NLM형 · 관찰 탐구가형」에서 뒤쪽 이름).
 * 2026-11-09 사용자 요청 「이서준님, 안녕하세요 / 관찰형입니다」. 결과가 없으면 언제 생기는지 적는다.
 */
function TypeLine({ list }: { list: Row[] }) {
  const latest = list.find((r) => r.stage === "published" && r.type);
  if (!latest?.type) {
    return <>첫 진단의 결과가 나오면 나의 재능 유형이 여기에 표시됩니다.</>;
  }
  const name = latest.type.split(" · ").at(-1);
  return (
    <>
      <span className="text-[17px] font-bold text-soft-ink">
        <span className="text-soft-primary">{name}</span>입니다.
      </span>
      <span className="ml-2 tabular-nums">{latest.diag.name} 결과</span>
    </>
  );
}

export default function StudentDashboard({ state }: { state: string }) {
  const empty = state === "empty";
  const list = empty ? [] : rows;

  return (
    <DashFrame {...frame}>
      <Head
        title="이서준님, 안녕하세요"
        lead={<TypeLine list={list} />}
        right={
          empty ? undefined : (
            <Link href={applyHref} className={btnQuiet}>
              진단 접수하기
            </Link>
          )
        }
      />

      <Summary list={list} />

      {empty ? (
        <EmptyList
          body="진단을 접수해 응시하면 지금까지 본 진단이 여기에 한 줄씩 쌓입니다. 무료 진단은 20문항을 한 번에 바로 응시할 수 있습니다."
          applyHref={applyHref}
        />
      ) : (
        <DiagList list={list} />
      )}
    </DashFrame>
  );
}
