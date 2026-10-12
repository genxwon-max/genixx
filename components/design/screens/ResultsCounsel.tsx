"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { editions } from "@/lib/diagReport";
import { assessment } from "@/lib/exam";
import { phaseTone } from "@/lib/progress";
import { axes, decideType, type AxisId, type AxisScore } from "@/lib/result";
import { topRule } from "@/components/account/ui";
import OctagonChart from "@/components/exam/OctagonChart";
import SectionTitle from "@/components/exam/SectionTitle";
import { btnGhost, btnPrimary, eyebrow, govTable, panel, td, tdStrong, th } from "@/components/exam/ui";
import { StageTag, TierChip, type Stage } from "@/components/student/diag";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import DashFrame from "../DashFrame";

/**
 * 결과 화면의 「면담 신청」 버튼 (WBS M.2.11) — 디자인.
 *
 * 결과를 받은 사람이 그 결과지를 놓고 상담 전문가와 이야기하려면 지금은 「면담」 메뉴를 찾아
 * 들어가야 한다. 결과를 보는 화면에서 바로 신청하도록 버튼을 놓는다. 화면은 지금의 결과 화면을
 * 예시 값으로 옮긴 것이고, 새로 정한 것은 면담 버튼과 그 곁의 한 줄뿐이다.
 *
 *   보호자  /exam/result             결과지 머리 아래의 면담 칸. 발행 전에는 결과지가 열리지 않고
 *                                    목록이 뜨므로, 그 상태는 목록 아래에 한 줄로 적는다
 *   학생    /student/results         목록에서 결과가 발행된 진단마다 「면담 신청」
 *           /student/results/[진단]  결과지 머리 아래의 면담 칸 (보호자 결과지와 같다)
 *
 * 면담은 발행된 결과가 있어야 신청할 수 있어, 버튼은 결과가 발행된 곳에만 있다. 이미 신청한
 * 결과에는 신청 버튼 자리에 「면담 일정 보기」가 놓인다.
 *
 * 만 14세 미만 학생은 면담을 직접 신청할 수 없다(보호자가 신청하고 결제한다). 그 학생의
 * 목록에는 버튼 자리에 「면담은 보호자가 신청합니다」를 적는다.
 *
 * 결과지 본문은 실제 결과지(components/exam/ResultView.tsx)와 같은 차례로 줄여 옮겼다.
 */

const myInterview = designLinks("my-interview");
const studentInterview = designLinks("student-interview");

/* ───────────────────────── 결과지 예시 값 ───────────────────────── */

/** 측정한 세 축의 점수 — 나머지 다섯 축은 아직 측정하지 않는다 */
const marks: Partial<Record<AxisId, number>> = { language: 78, logic: 71, nature: 64 };
const scores: AxisScore[] = axes.map((axis) => ({
  axis,
  score: marks[axis.id] ?? null,
  measured: axis.id in marks,
}));
const type = decideType(scores)!;

const reports = [
  {
    ...editions.summary,
    desc: "종합 유형 · 과목별 위치 · 여섯 가지 사고 능력 · 강점 셋",
    cta: "요약본 열기",
    btn: btnGhost,
  },
  {
    label: editions.full.label,
    price: `${editions.full.price} → 파일럿 무료`,
    desc: "영역별 근거 · 대표 문항 답안 리뷰 · 학습 성향 · 학생용 성장 지도 · 3개월 로드맵 · 전문가 총평",
    cta: "정밀본 받기",
    btn: btnPrimary,
  },
];

const papers = [
  { name: "국어 (언어)", correct: "6 / 8", score: marks.language },
  { name: "수학", correct: "12 / 17", score: marks.logic },
  { name: "과학", correct: "10 / 17", score: marks.nature },
];

/** 전문가 진단 — 실제 결과지에는 네댓 칸이 들어간다. 여기서는 두 칸만 옮겼다 */
const comments = [
  ["언어 축", "서술형 답에서 답만 쓰지 않고 그렇게 생각한 이유를 함께 적었습니다. 자료에서 찾은 표현을 자기 말로 바꾸어 쓰는 모습이 반복해서 나타납니다."],
  ["자연·탐구 축", "자연·탐구 영역은 이번 회차에서 낮게 측정되었습니다. 다만 이는 능력이 없다는 뜻이 아니라, 이 영역을 보여줄 기회가 적었을 가능성을 함께 봅니다."],
];

/* ───────────────────────── 면담 칸 ───────────────────────── */

/**
 * 결과지 머리 아래의 면담 칸 — 이번에 더한 것.
 *
 * 신청하기 전에는 면담이 무엇인지 한 줄과 「면담 신청」을, 신청한 뒤에는 잡힌 일정과
 * 「면담 일정 보기」를 보여 준다. 결과가 발행된 결과지에만 있다.
 */
function CounselBar({ href, booked = false }: { href: string; booked?: boolean }) {
  return (
    <section
      className={`mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-6 ${
        booked ? panel : topRule
      }`}
    >
      <div className="min-w-[15rem] flex-1">
        <h2 className="text-[15px] font-bold text-soft-ink">
          {booked ? "이 결과로 면담을 신청했습니다" : "이 결과로 면담을 신청할 수 있습니다"}
        </h2>
        {booked ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-soft-muted">
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              예약 확정
            </span>
            <span className="font-semibold tabular-nums text-soft-ink">2026.10.15(목) 14:00 – 15:00</span>
            <span>화상 · 상담 전문가 김지원</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[13px] leading-[1.7] text-soft-ink">
            결과지를 놓고 상담 전문가와 30분 또는 60분 동안 이야기합니다.
          </p>
        )}
      </div>
      <Link href={href} className={booked ? btnGhost : btnPrimary}>
        {booked ? "면담 일정 보기" : "면담 신청"}
      </Link>
    </section>
  );
}

/* ───────────────────────── 결과지 ───────────────────────── */

/** 결과지 한 장 — components/exam/ResultView.tsx를 예시 값으로 옮긴 것. 머리 아래에 면담 칸이 든다 */
function Sheet({
  name,
  diag,
  code,
  back,
  bar,
}: {
  name: string;
  /** 「2026 3분기 초4 진단」 */
  diag: string;
  code: string;
  /** 목록에서 들어온 결과지(학생)에만 있다 */
  back?: { href: string; label: string };
  bar: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          {back && (
            <Link
              href={back.href}
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-soft-muted hover:text-soft-ink"
            >
              ← {back.label}
            </Link>
          )}
          <h1 className="text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">{name} 학생 진단 결과</h1>
          <p className="mt-2 text-[12px] text-soft-muted">
            {assessment.name} {diag} · 접속코드 {code} · 발행 2026. 9. 12.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnGhost}>
            PDF로 저장
          </button>
          <button type="button" className={btnGhost}>
            이미지 저장
          </button>
        </div>
      </div>

      {bar}

      <section className="mt-7">
        <SectionTitle note="A4 지면 그대로 새 창에서 열립니다. 그 창에서 인쇄하거나 PDF로 저장할 수 있습니다.">
          진단 보고서
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => (
            <div key={r.label} className={`flex flex-col p-6 ${panel}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[17px] font-bold text-soft-ink">{r.label}</p>
                <span className="text-[12px] font-bold text-soft-primary-dark">{r.price}</span>
              </div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-soft-muted">{r.desc}</p>
              <button type="button" className={`mt-5 self-start ${r.btn}`}>
                {r.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className={`grid gap-6 p-7 md:grid-cols-[300px_1fr] md:p-9 ${panel}`}>
          <div className="border-b border-soft-line pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
            <p className={eyebrow}>재능 유형</p>
            <p className="mt-3 text-[40px] font-bold leading-none tracking-tight text-soft-primary-dark">{type.code}</p>
            <p className="mt-3 text-[22px] font-bold text-soft-ink">{type.name}</p>
            <p className="mt-1.5 text-[13px] text-soft-muted">{type.tagline}</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded border border-soft-line bg-slate-50 px-3 py-1.5 text-[12px]">
              리포트 신뢰도
              <b className="text-soft-ink">높음</b>
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-soft-muted">
              학생 응답 + 관찰 설문 2건 이상으로 교차 검증됨
            </p>
          </div>
          <div>
            <p className="text-[15px] leading-[1.9] text-soft-ink">{type.summary}</p>
            <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-800">
              이 유형 표기는 아이를 규정하는 이름이 아니라, <b>이번 회차에 관찰된 행동의 요약</b>입니다. 회차가
              바뀌면 유형도 바뀔 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle note="2026 파일럿은 8축 가운데 3축을 측정합니다. 나머지 5축은 2027 심화진단에서 측정 예정이며, 빈 축은 '없음'이 아니라 '아직 측정하지 않음'입니다.">
          8재능 프로파일
        </SectionTitle>
        <div className={`grid gap-6 p-6 lg:grid-cols-[420px_1fr] lg:p-8 ${panel}`}>
          <div className="mx-auto w-full max-w-[440px]">
            <OctagonChart scores={scores} />
          </div>
          <div className="overflow-x-auto">
            <table className={govTable}>
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[90px]" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  {["재능 축", "점수", "설명"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map((s) => (
                  <tr key={s.axis.id}>
                    <td className={`${tdStrong} text-left`}>{s.axis.label}</td>
                    <td className={`${td} tabular-nums`}>
                      {s.measured ? <b className="text-soft-ink">{s.score}</b> : "미측정"}
                    </td>
                    <td className={`${td} text-left`}>
                      {s.measured ? s.axis.desc : `${s.axis.desc} · 2027 심화진단에서 측정`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle note="객관식 정답률 70% + 서술형 30%로 환산했습니다. 서술형은 전문가 채점으로 확정됩니다.">
          과목별 응시 결과
        </SectionTitle>
        <div className="overflow-x-auto">
          <table className={govTable}>
            <thead>
              <tr>
                {["과목", "객관식 정답", "서술형", "환산 점수"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.name}>
                  <td className={`${tdStrong} text-left`}>{p.name}</td>
                  <td className={`${td} tabular-nums`}>{p.correct}</td>
                  <td className={td}>제출 (전문가 검토 예정)</td>
                  <td className={`${td} tabular-nums`}>
                    <b className="text-soft-ink">{p.score}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle note="지금 강하게 나타난 축을 더 키우는 방향으로 제안합니다.">앞으로의 방향</SectionTitle>
        <ol className="grid gap-3 sm:grid-cols-2">
          {type.directions.slice(0, 2).map((d, i) => (
            <li key={d.t} className={`flex gap-4 p-5 ${panel}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-soft-primary bg-soft-primary text-[12px] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-bold text-soft-ink">{d.t}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-soft-muted">{d.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <SectionTitle
          note="AI 1차 분석 결과를 교육전문가가 검토해 확정한 코멘트입니다."
          right={
            <span className="rounded border border-soft-line bg-slate-50 px-3 py-1.5 text-[12px] text-soft-muted">
              반영 자료 4종
            </span>
          }
        >
          전문가 진단
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {comments.map(([title, text]) => (
            <div key={title} className={`p-5 ${panel}`}>
              <p className="text-[14px] font-bold text-soft-ink">{title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">{text}</p>
            </div>
          ))}
        </div>
        <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 p-5 ${panel}`}>
          <p className="text-[12px] leading-relaxed text-soft-muted">
            참여 설문: 학생 본인 · 보호자 · 담당 교사·교수 · 측정 축 3 / 8
          </p>
          <span className="text-[12px] font-bold text-soft-ink">
            판정 확정 · GENIXX 진단운영팀 · 2026-09-12 14:30
          </span>
        </div>
      </section>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-soft-line pt-6">
        <p className="text-[12px] leading-relaxed text-soft-muted">
          결과지는 브라우저 인쇄 기능으로 PDF 저장할 수 있고, 팔각형 차트는 이미지로 내려받을 수 있습니다.
        </p>
        <div className="flex gap-2">
          <Link href={back?.href ?? "/exam"} className={btnGhost}>
            {back ? `${back.label} 목록으로` : "응시 현황으로"}
          </Link>
          <button type="button" className={btnPrimary}>
            결과지 다운로드 (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 보호자 ───────────────────────── */

/** 결과 발행 전의 목록 — 김도현은 최종 제출을 마쳤고 전문가가 확인하는 중이다 */
const waiting = [
  { student: "김서아", diag: "2026 4분기 초3 진단 · 초등 3학년", at: "2026.10.05", phase: "응시중" as const, result: "응시 완료 후 공개" },
  { student: "김도현", diag: "2026 3분기 초4 진단 · 초등 4학년", at: "2026.07.28", phase: "최종제출" as const, result: "전문가 확인 중" },
];

export function ExamResultCounsel({ state }: { state: string }) {
  return (
    <DashFrame who="parent" at="/exam/result" unread={3} bellHref="/design/my/alerts">
      {state === "pending" ? (
        <ResultList />
      ) : (
        <Sheet
          name="김도현"
          diag="2026 3분기 초4 진단"
          code="H7KM-2QXP"
          bar={
            state === "booked" ? <CounselBar href={myInterview()} booked /> : <CounselBar href="/my/interviews" />
          }
        />
      )}
    </DashFrame>
  );
}

/**
 * 결과 리포트 목록 — components/exam/ResultIndex.tsx를 예시 값으로 옮긴 것.
 *
 * 발행된 결과가 없으면 /exam/result는 결과지 대신 이 목록을 보여 준다. 면담 버튼은 결과지에
 * 있으므로 여기에는 없고, 언제 신청할 수 있는지만 표 아래에 적는다.
 */
function ResultList() {
  return (
    <div>
      <header className="border-b border-soft-line pb-5">
        <h1 className="text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">결과 리포트</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          누가 어떤 진단을 받았는지와 그 결과가 지금 어디까지 왔는지를 모아 둔 자리입니다.
        </p>
      </header>

      <div className={`mt-6 overflow-x-auto ${panel}`}>
        <table className={`${govTable} min-w-[720px]`}>
          <caption className="sr-only">응시한 진단과 결과 발행 상태</caption>
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
              {["번호", "학생", "진단", "접수일", "진행", "결과"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {waiting.map((r, i) => {
              const tone = phaseTone[r.phase];
              return (
                <tr key={r.student}>
                  <td className={`${td} tabular-nums`}>{waiting.length - i}</td>
                  <td className={tdStrong}>{r.student}</td>
                  <td className={`${td} text-left text-soft-ink`}>
                    {assessment.name} {r.diag}
                  </td>
                  <td className={`${td} tabular-nums`}>{r.at}</td>
                  <td className={td}>
                    <span className={`inline-flex items-center gap-1.5 ${tone.text}`}>
                      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {r.phase}
                    </span>
                  </td>
                  <td className={td}>{r.result}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[13px] leading-[1.7] text-soft-muted">
        면담은 결과가 발행된 뒤에 신청할 수 있습니다. 결과가 발행되면 결과 화면에 「면담 신청」 버튼이 표시됩니다.
      </p>
    </div>
  );
}

/* ───────────────────────── 학생 ───────────────────────── */

type Row = {
  name: string;
  tier: "free" | "paid";
  /** 이름 아래 한 줄 — 응시 기간 · 발행일 */
  when: string;
  stage: Stage;
  label?: string;
  note: string;
  /** 결과지 주소 — 결과가 발행된 진단에만 있다 */
  href?: string;
  /** 면담 칸 — 결과가 발행된 진단에만 있다 */
  counsel?: React.ReactNode;
};

/** 응시하고 있는 진단 — 결과가 아직 없어 눌리지 않고 면담 칸도 비어 있다 */
const ongoing = (name: string): Row => ({
  name,
  tier: "paid",
  when: "응시 기간 2026.10.06 ~ 2026.10.31",
  stage: "ready",
  label: "최종 제출 전",
  note: "최종 제출하면 결과가 나옵니다",
});

/**
 * 목록의 한 줄 — components/student/diag.tsx의 DiagRow에 면담 칸을 더한 것.
 *
 * 줄 전체가 결과지로 가는 자리이고 그 안에 면담 버튼이 따로 눌려야 해서, 링크는 진단 이름에
 * 걸고 눌리는 넓이만 줄 전체로 넓혔다(after). 면담 버튼은 그 위에 올라와 있다.
 */
function DiagLine({ r }: { r: Row }) {
  return (
    <li
      className={`relative grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-3 px-5 py-4 sm:px-6 ${
        r.href ? "transition-colors hover:bg-slate-50" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 md:flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15.5px] font-bold text-soft-ink">
            {r.href ? (
              <Link href={r.href} className="after:absolute after:inset-0">
                {r.name}
              </Link>
            ) : (
              r.name
            )}
            <TierChip tier={r.tier} />
          </p>
          <p className="mt-1 text-[13px] tabular-nums text-soft-muted">{r.when}</p>
        </div>
        <div className="flex flex-col gap-0.5 md:w-52 md:shrink-0 md:items-end md:text-right">
          <StageTag stage={r.stage} label={r.label} />
          <span className="text-[12.5px] leading-snug text-soft-muted">{r.note}</span>
        </div>
        <div
          className={`flex-col items-start gap-1 md:w-[9.5rem] md:shrink-0 md:items-end md:text-right ${
            r.counsel ? "flex" : "hidden md:flex"
          }`}
        >
          {r.counsel}
        </div>
      </div>
      <span aria-hidden className="text-[20px] leading-none text-slate-300">
        {r.href ? "›" : ""}
      </span>
    </li>
  );
}

export function StudentResultsCounsel({ state }: { state: string }) {
  const to = designLinks("student-results-counsel");
  const child = state === "child";
  const frame = child
    ? ({ who: "student", bellHref: "/design/student/alerts" } as const)
    : ({ who: "teen", bellHref: "/design/student/teen/alerts" } as const);

  if (state === "detail") {
    return (
      <DashFrame {...frame} at="/student/results" unread={2}>
        <Sheet
          name="이하윤"
          diag="2026 3분기 중2 진단"
          code="D3VB-7KQM"
          back={{ href: to(), label: "진단 결과" }}
          bar={<CounselBar href="/student/interviews" />}
        />
      </DashFrame>
    );
  }

  const apply = (
    <Link href="/student/interviews" className={`${btnGo} relative z-10 whitespace-nowrap`}>
      면담 신청
    </Link>
  );
  const rows: Row[] = child
    ? [
        ongoing("2026 4분기 초4 진단"),
        {
          name: "2026 3분기 초4 진단",
          tier: "paid",
          when: "발행 2026.10.02",
          stage: "published",
          note: "NLM형 · 관찰 탐구가형",
          href: "/student/results/2026-3/e4",
          counsel: <span className="text-[12.5px] leading-snug text-soft-muted">면담은 보호자가 신청합니다</span>,
        },
        /* 아래 두 줄은 학생 대시보드의 다른 디자인(진단 접수 · 내 진단 · 정답과 해설)과 같은
           학생의 같은 진단이다 — ./studentFlow.ts */
        {
          name: "2026 2분기 초4 진단",
          tier: "free",
          when: "발행 2026.06.13",
          stage: "published",
          note: "NML형 · 관찰 탐구가형",
          href: "/student/results/2026-2/e4",
          counsel: <span className="text-[12.5px] leading-snug text-soft-muted">면담은 보호자가 신청합니다</span>,
        },
        {
          name: "2026 1분기 초4 진단",
          tier: "free",
          when: "응시 기간 2026.02.01 ~ 2026.02.28",
          stage: "closed",
          label: "결과 없음",
          note: "기간 안에 최종 제출하지 않았습니다",
        },
      ]
    : [
        ongoing("2026 4분기 중2 진단"),
        {
          name: "2026 3분기 중2 진단",
          tier: "paid",
          when: "발행 2026.09.12",
          stage: "published",
          note: `${type.code} · ${type.name}`,
          href: to("detail"),
          counsel:
            state === "booked" ? (
              <>
                <Link href={studentInterview()} className={`${btnQuiet} relative z-10 whitespace-nowrap`}>
                  면담 일정 보기
                </Link>
                <span className="text-[12.5px] tabular-nums text-soft-muted">10.15(목) 14:00 · 화상</span>
              </>
            ) : (
              apply
            ),
        },
        {
          name: "2026 2분기 중2 진단",
          tier: "free",
          when: "발행 2026.06.13",
          stage: "published",
          note: "MLN형 · 규칙 발견가형",
          href: to("detail"),
          counsel: apply,
        },
      ];

  return (
    <DashFrame {...frame} at="/student/results" unread={2}>
      <Head title="진단 결과" lead="결과가 나온 진단을 누르면 결과지를 봅니다." />

      <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
        {rows.map((r) => (
          <DiagLine key={r.name} r={r} />
        ))}
      </ul>

      <p className="mt-4 text-[13px] leading-[1.8] text-soft-muted">
        {child
          ? "결과지를 상담 전문가와 함께 읽고 싶으면 보호자에게 말해 주세요. 만 14세 미만은 면담을 직접 신청할 수 없어 보호자 화면에서 신청합니다."
          : "면담은 결과지를 놓고 상담 전문가와 30분 또는 60분 동안 이야기하는 자리입니다. 결과가 발행된 진단에서 신청할 수 있습니다."}
      </p>
    </DashFrame>
  );
}
