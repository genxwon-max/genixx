"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { designLinks } from "@/lib/designScreens";
import { answerKind, answerParts, pointText, type SubjectId } from "@/lib/exam";
import { gradeStat, type GradeEdit, type GradeMarks } from "@/lib/gradeSheet";
import GradeSheet from "@/components/admin2/GradeSheet";
import type { GradeAt } from "@/components/exam/GradeDialog";
import { Body, PageHead, Panel, Tab } from "@/components/admin2/ui";
import ConsoleFrame, { type ConsoleMe } from "../ConsoleFrame";
import { flowFacts, flowMarks, flowMatch, flowSeat, flowSheet } from "./studentFlow";

/**
 * 회원 채점 (실제 주소 /admin2/grading/members · /admin2/grading/members/[답안지]) — 디자인.
 *
 * 채점자가 한 아이의 시험지를 1번부터 끝까지 채점하는 길이다.
 *
 *   목록       채점할 답안지. 줄을 누르면 그 답안지로 들어간다
 *   답안지     **정오표** — 문항마다 정답 · 제출한 답 · AI 점수 · 지금 점수 · 정오 · 채점 상태.
 *              「채점하기」나 표의 줄을 누르면 채점 창이 열린다
 *   채점 창    응시 화면과 같은 틀. 아이가 본 시험지 그대로를 넘기며 **오른쪽 아래의 점수 칸**
 *              에서 AI가 먼저 매긴 점수를 확인하거나 고친다. 모든 문항을 고칠 수 있다
 *
 * 마지막 문항까지 확인하면 이 답안지의 리포트가 만들어져 리포트 승인 목록에 오른다
 * (./ReportApproval.tsx). 채점이 끝나지 않은 답안지에는 리포트가 없다.
 *
 * 화면은 실제 조각(components/admin2/GradeSheet.tsx · components/exam/GradeDialog.tsx)이고,
 * 답안지는 학생 대시보드 디자인의 3분기 진단과 **같은 답안**이다(./studentFlow.ts의 flowSheet —
 * 응시번호 0412). 채점자에게는 이름이 보이지 않는다. 창은 주소로 여닫고, 창 안의 점수 단추 ·
 * 이전 · 다음 · 번호는 실제처럼 눌린다(이 화면 안에서만 바뀌고 저장되지 않는다).
 *
 * 선 잇기 문항은 기본 문항에 아직 없어, 그 문항이 든 시험지로 같은 답안지를 다시 편 채점 창을
 * 따로 두었다(…/grade/match — ./studentFlow.ts의 flowMatch). 기계가 채점하는 문항이라 AI 점수가
 * 바로 나오고, 채점자는 선의 색으로 무엇을 잘못 이었는지 보고 점수를 고칠 수 있다.
 */

const to = designLinks("grading-members");

/** 채점은 진단 위원 권한을 받은 전문가가 한다 */
const grader: ConsoleMe = { name: "서민정", role: "전문가 · 진단 위원", loginId: "ex.expert_grader" };
const graderMenu = ["/admin2/grading", "/admin2/grading/members"];

const here = to(flowSeat.key);
const roundName = flowFacts.q3.name;

/** 예시 답안에서 그 문항이 몇 번인지 */
const at = (subject: SubjectId, id: string): GradeAt => ({
  subject,
  no: flowSheet.find((s) => s.id === subject)?.lines.find((l) => l.q.id === id)?.no ?? 1,
});

type Phase = keyof typeof flowMarks;

/** 답안지 화면의 세 때 — 주소의 꼬리 → 채점이 어디까지 갔는가 */
const phases: Record<string, Phase> = { "": "none", grading: "some", done: "done" };
const phasePath: Record<Phase, string> = { none: here, some: `${here}/grading`, done: `${here}/done` };

/**
 * 채점 창이 열린 상태 — 주소의 꼬리 → 창이 펴 둘 문항과, 그때 채점이 어디까지 갔는가.
 * 문항 유형마다 한 건씩 골랐다.
 */
const benches: Record<string, { at: GradeAt; phase: Phase; match?: boolean }> = {
  /* 객관식 — AI가 정답으로 채점했다. 확인만 하면 된다 */
  grade: { at: at("korean", "kor-1"), phase: "none" },
  /* 2점 만점에 2점이던 답을 1점으로 낮췄다 — 부분 정답 */
  "grade/lowered": { at: at("korean", "kor-7"), phase: "some" },
  /* 논술형 — 긴 글 */
  "grade/essay": { at: at("korean", "kor-8"), phase: "some" },
  /* 사진 — AI는 채점하지 않는다. 채점자가 사진을 보고 매긴다 */
  "grade/photo": { at: at("math", "math-12"), phase: "none" },
  /* 서술형 — 칸이 둘, 3점 만점에 AI가 2점을 줬다 */
  "grade/written": { at: at("science", "sci-4"), phase: "some" },
  /* 그리기 — 밑그림 위에 그린 답 */
  "grade/drawing": { at: at("science", "sci-16"), phase: "some" },
  /* 단답형 오답과 서술형 — 묶인 두 문항의 점수 칸이 함께 선다 */
  "grade/short": { at: at("science", "sci-18"), phase: "some" },
  /* 마지막 문항 — 「확인하고 마치기」 */
  "grade/last": { at: at("science", "sci-20"), phase: "done" },
  /* 선 잇기 — 그 문항이 든 시험지의 과학 5번. 다섯 가운데 하나를 잘못 이어 AI가 0점을 줬다 */
  "grade/match": { at: flowMatch.at, phase: "some", match: true },
};

/** 정오표에서 누른 문항에 맞는 채점 창 주소 — 그 문항과 유형이 같은 예시로 간다 */
function benchHref(want: GradeAt) {
  const line = flowSheet.find((s) => s.id === want.subject)?.lines.find((l) => l.no === want.no);
  if (!line) return `${here}/grade`;
  if (line.q.upload) return `${here}/grade/photo`;
  if (answerParts(line.q, line.value).some((p) => p.drawing)) return `${here}/grade/drawing`;
  switch (answerKind(line.q)) {
    case "논술형":
      return `${here}/grade/essay`;
    case "서술형":
      return `${here}/grade/written`;
    case "단답형":
      return `${here}/grade/short`;
    default:
      return `${here}/grade`;
  }
}

export default function GradingMembers({ state }: { state: string }) {
  const tail = state === flowSeat.key ? "" : state.replace(`${flowSeat.key}/`, "");
  return (
    <ConsoleFrame at="/admin2/grading/members" me={grader} meHref="/design/admin2/me/grader" only={graderMenu}>
      {state === "" ? (
        <List />
      ) : (
        <Sheet
          key={state}
          phase={benches[tail]?.phase ?? phases[tail] ?? "none"}
          gradeAt={benches[tail]?.at ?? null}
          match={!!benches[tail]?.match}
        />
      )}
    </ConsoleFrame>
  );
}

/* ───────────────────────── 답안지 — 정오표와 채점 창 ───────────────────────── */

function Sheet({
  phase,
  gradeAt,
  match = false,
}: {
  phase: Phase;
  gradeAt: GradeAt | null;
  /** 선 잇기 문항이 든 시험지로 편다 */
  match?: boolean;
}) {
  const router = useRouter();
  /* 점수 단추가 눌리는 모습을 보이려고 이 화면 안에서만 들고 있다 — 저장하지 않는다 */
  const [marks, setMarks] = useState<GradeMarks>(flowMarks[phase]);

  const onMark = (edits: GradeEdit[]) =>
    setMarks((cur) => {
      const next = { ...cur };
      for (const e of edits) {
        const comment = e.comment.trim();
        if (e.points === null && !comment) delete next[e.id];
        else next[e.id] = { points: e.points ?? undefined, comment: comment || undefined };
      }
      return next;
    });

  return (
    <GradeSheet
      seat={flowSeat.seat}
      grade={flowSeat.grade}
      roundName={roundName}
      subjects={match ? flowMatch.sheet : flowSheet}
      marks={marks}
      back={
        <Link href={to()} className="a2-btn">
          ← 회원 채점
        </Link>
      }
      gradeAt={gradeAt}
      /* 채점이 끝나면 이 답안지의 리포트가 만들어진다 — 9월 25일에 끝났고 스케줄러는 7일이다
         (리포트 승인 디자인의 맨 아래 줄이 이 답안지다) */
      doneNote="이 답안지의 리포트가 「리포트 승인」 목록에 있습니다. 발행 예정일은 2026-10-02입니다."
      onOpen={(want) => router.push(benchHref(want))}
      onClose={() => router.push(phasePath[phase])}
      onMark={onMark}
    />
  );
}

/* ───────────────────────── 목록 ───────────────────────── */

/**
 * 채점할 답안지 목록. 첫 줄이 이 디자인의 답안지(0412)이고 나머지는 목록이 찬 모습을 보이려고
 * 적어 둔 줄이다 — 실제 목록(MembersView)은 채점 자료에서 읽어 센다.
 *
 * 답안지는 세 과목(국어 · 수학 · 과학)을 모두 편다. 그래서 어느 줄이나 41문항 · 67점 만점이다.
 */
const others = [
  { seat: "0418", grade: "초4", done: 26, total: 41, got: "38.5", max: 67 },
  { seat: "0421", grade: "초4", done: 0, total: 41, got: "41.5", max: 67 },
  { seat: "0423", grade: "초4", done: 10, total: 41, got: "33", max: 67 },
  { seat: "0426", grade: "초4", done: 0, total: 41, got: "47", max: 67 },
  { seat: "0430", grade: "초4", done: 0, total: 41, got: "29.5", max: 67 },
];

function List() {
  const mine = gradeStat(flowSheet, flowMarks.none);
  const rows = [
    {
      seat: flowSeat.seat,
      grade: flowSeat.grade,
      done: mine.done,
      total: mine.total,
      got: pointText(mine.got),
      max: mine.max,
      href: here,
    },
    ...others.map((r) => ({ ...r, href: here })),
  ];

  return (
    <>
      <PageHead
        title="회원 채점"
        tabs={
          <>
            <Tab label="채점 중" count={rows.length} active onClick={() => {}} />
            <Tab label="채점 완료" count={9} active={false} onClick={() => {}} />
            <Tab label="전체" count={rows.length + 9} active={false} onClick={() => {}} />
          </>
        }
      />
      <Body>
        <Panel flush>
          <div className="a2-table-wrap">
            <table className="a2-table">
              <thead>
                <tr>
                  <th style={{ width: "8rem" }}>응시번호</th>
                  <th>진단명</th>
                  <th style={{ width: "8rem" }}>채점</th>
                  <th style={{ width: "8rem" }}>점수</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.seat}>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {/* 이름을 적지 않는다 — 채점하는 사람이 누구 답인지 알면 안 된다 */}
                        <Link href={r.href} className="a2-mono font-semibold text-(--a2-ink)">
                          {r.seat}
                        </Link>
                        <span className="a2-t-xs text-(--a2-ink-4)">{r.grade}</span>
                      </span>
                    </td>
                    <td>
                      <Link href={r.href} className="a2-t-sm text-(--a2-ink)">
                        {roundName}
                      </Link>
                    </td>
                    <td>
                      <span className="inline-flex flex-col">
                        <span className="a2-num a2-t-sm text-(--a2-ink)">
                          {r.done} / {r.total}
                        </span>
                        <span className="a2-t-xs font-semibold" style={{ color: "var(--a2-warn)" }}>
                          {r.total - r.done}문항 남음
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex flex-col">
                        <span className="a2-num a2-t-sm font-semibold text-(--a2-ink)">
                          {r.got} / {r.max}
                        </span>
                        <span className="a2-t-xs text-(--a2-ink-4)">채점 중</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Body>
    </>
  );
}
