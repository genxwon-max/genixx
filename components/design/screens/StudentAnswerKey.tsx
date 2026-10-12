"use client";

import { useRouter } from "next/navigation";
import { linesOf } from "@/lib/answerKey";
import { designLinks } from "@/lib/designScreens";
import type { SubjectId } from "@/lib/exam";
import type { ExamRecord, RegRef } from "@/lib/examStore";
import { AnswerSheet, answerSubjects, type ReviewAt } from "@/components/exam/AnswerKey";
import type { Registration } from "@/components/exam/Registrations";
import { AnswerLocked, answerOf } from "@/components/student/StudentAnswers";
import { ResultPending } from "@/components/student/StudentResults";
import { DiagRow, EmptyList, StageTag, type Diag, type Stage } from "@/components/student/diag";
import { Head, cardBox } from "@/components/student/self";
import DashFrame from "../DashFrame";
import { PublishedResult } from "./ResultsCounsel";
import {
  flowFacts,
  flowGrades,
  flowMatch,
  flowRecords,
  flowRegs,
  flowStudent,
} from "./studentFlow";

/**
 * 정답과 해설 (실제 주소 /student/answers · /student/answers/[회차]/[학년]) — 디자인.
 *
 * 예전에는 응시 존의 「정답과 해설」 탭(/exam/answers)이었다. 접수 · 응시 · 결과와 함께 학생
 * 대시보드로 옮기면서(2026-10-12) 「내 진단」 · 「진단 결과」와 같은 목록 → 진단 한 건으로
 * 바꿨다. 정답은 **최종 제출한 날부터** 열린다 — 결과 발행을 기다리지 않는다.
 *
 *   목록        접수한 진단마다 한 줄. 최종 제출을 마친 줄만 눌린다
 *   진단 한 건   과목 단추 · 「답안 풀이 보기」 · 정오표 · 내려받기(PDF · CSV · 인쇄) · 맞춤 학습
 *   답안 풀이    응시 화면과 같은 틀의 창 — 문항마다 정답 · 오답 · 미응답 · 채점 중
 *
 * 진단 한 건의 화면에는 **정오표만** 있다. 문제를 다시 보는 일은 「답안 풀이 보기」 창이
 * 맡는다. 정오표와 창은 실제 화면의 조각(components/exam/AnswerKey.tsx · AnswerReview.tsx)
 * 이고, 문항도 실제 문항 은행의 것이다. 학생의 답만 예시로 적어 넘긴다(./studentFlow.ts) —
 * 정답 · 오답 · 미응답과, 전문가가 채점하는 긴 글 · 사진 · 그림 답이 모두 보이게 골랐다.
 * 과목 단추는 실제처럼 눌리고, 「답안 풀이 보기」 창과 「맞춤 학습」 창은 주소로 여닫는다.
 *
 * 정오표는 두 때를 보인다.
 *   채점 중         최종 제출한 직후. 서술형 · 논술형 · 사진은 「채점 중」이다
 *   채점이 끝난 뒤  전문가의 점수가 들어와 정답 · **부분 정답 △** · 오답으로 바뀌고, 답안 풀이
 *                  창에 채점자가 적은 해설이 보인다(…/graded). 점수와 해설은 운영 콘솔의 회원
 *                  채점 디자인(/design/admin2/grading/members)이 매긴 것과 같은 값이다
 *
 * 선 잇기 문항은 기본 문항에 아직 없다. 그 문항이 든 시험지로 같은 답안을 다시 편 화면을 따로
 * 두었다(…/match) — 과학 5번이 선 잇기 독립 문항이고, 정오표의 그 줄에는 정답과 내 답이 글로
 * 적힌다. 답안 풀이 창에서는 바르게 이은 선 · 잘못 이은 선 · 잇지 않은 정답이 선으로 보인다.
 */

const to = designLinks("student-answers");
const frame = { who: "student", unread: 2, bellHref: "/design/student/alerts" } as const;
const back = { href: to(), label: "정답과 해설" };

/** 목록의 줄이 읽을 값 — 실제 화면이 접수 기록과 응시 기록에서 짓는 것(Diag)을 손으로 짓는다 */
const diag = (reg: Registration, name: string, record: ExamRecord, stage: Stage): Diag => {
  const ref: RegRef = { round: reg.round, track: reg.track };
  return { reg, ref, id: `${reg.round}/${reg.track}`, name, record, report: null, stage };
};

/** 아직 최종 제출하지 않은 진단의 기록 — 목록의 줄은 최종 제출 여부만 본다 */
const open = (tier: ExamRecord["tier"]): ExamRecord => ({
  ...flowRecords.q3,
  tier,
  finalized: false,
  finalizedAt: null,
});

const diags = {
  q4: diag(flowRegs.q4, flowFacts.q4.name, open("paid"), "doing"),
  q3: diag(flowRegs.q3, flowFacts.q3.name, flowRecords.q3, "published"),
  q2: diag(flowRegs.q2, flowFacts.q2.name, flowRecords.q2, "published"),
  q1: diag(flowRegs.q1, flowFacts.q1.name, open("free"), "closed"),
};

/** 줄을 누르면 가는 디자인 주소 — 최종 제출을 마친 진단만 */
const sheetHref: Partial<Record<keyof typeof diags, string>> = {
  q3: to("2026-3/e4"),
  q2: to("2026-2/e4"),
};

/** 3분기 진단 한 건의 주소 — 창이 열린 상태의 꼬리가 여기에 붙는다 */
const here = to("2026-3/e4");

/** 예시 답안에서 그 문항이 몇 번인지 — 문항 은행의 차례가 바뀌어도 같은 문항을 편다 */
const at = (subject: SubjectId, id: string): ReviewAt => ({
  subject,
  no: linesOf(subject, flowRecords.q3).find((l) => l.q.id === id)?.no ?? 1,
});

/**
 * 「답안 풀이 보기」 창이 열린 상태 — 주소의 꼬리 → 창이 펴 둘 문항.
 * 정오마다 한 건씩 골랐다. 창 안의 이전 · 다음 · 번호 · 과목은 실제처럼 눌린다.
 */
const reviews: Record<string, ReviewAt> = {
  /* 객관식 · 정답 */
  review: at("korean", "kor-1"),
  /* 객관식 · 오답 — 정답 보기와 내 답이 함께 짚인다 */
  "review/wrong": at("korean", "kor-3"),
  /* 객관식 · 미응답 */
  "review/empty": at("korean", "kor-6"),
  /* 논술형 · 채점 중 — 긴 글이 스크롤 없이 모두 보인다 */
  "review/essay": at("korean", "kor-8"),
  /* 사진 · 채점 중 — 올린 사진이 보인다 */
  "review/photo": at("math", "math-12"),
  /* 단답형 · 오답과 서술형 · 채점 중 — 함께 묶인 두 문항이 한 화면에 선다 */
  "review/short": at("science", "sci-18"),
};

/** 채점이 끝난 뒤의 창이 펴 둘 문항 — 채점자가 2점을 1점으로 낮추고 해설을 적은 문항 */
const gradedAt = at("korean", "kor-7");

/** 정오표에서 누른 문항에 맞는 「답안 풀이 보기」 주소 — 그 문항과 정오가 같은 예시로 간다 */
function reviewHref(want: ReviewAt) {
  const line = linesOf(want.subject, flowRecords.q3).find((l) => l.no === want.no);
  if (!line) return `${here}/review`;
  if (line.q.upload) return `${here}/review/photo`;
  if (line.mark === "wrong") return `${here}/review/${line.q.type === "choice" ? "wrong" : "short"}`;
  if (line.mark === "empty") return `${here}/review/empty`;
  if (line.mark === "pending") return `${here}/review/essay`;
  return `${here}/review`;
}

export function StudentAnswersScreen({ state }: { state: string }) {
  if (state === "") return <List />;
  if (state === "empty") return <List empty />;
  if (state === "2026-4/e4") return <Locked />;
  if (state.startsWith("2026-2/e4")) return <FreeSheet />;

  const tail = state.replace(/^2026-3\/e4\/?/, "");
  if (tail.startsWith("match")) {
    /* 선 잇기 문항이 든 시험지 — 과학을 편 정오표와, 그 문항을 편 답안 풀이 창 */
    return <PaidSheet key={state} match reviewAt={tail === "match/review" ? flowMatch.at : null} />;
  }
  if (tail.startsWith("graded")) {
    /* 채점이 끝난 뒤 — 2점 만점에 1점을 받아 부분 정답이 된 문항(국어 3번)을 창이 편다 */
    return <PaidSheet key={state} graded reviewAt={tail === "graded/review" ? gradedAt : null} />;
  }
  return (
    <PaidSheet
      key={state}
      subject={tail === "math" ? "math" : undefined}
      coachOpen={tail === "coach"}
      reviewAt={reviews[tail] ?? null}
    />
  );
}

/* ───────────────────────── 목록 ───────────────────────── */

function List({ empty = false }: { empty?: boolean }) {
  const keys = ["q4", "q3", "q2", "q1"] as const;

  return (
    <DashFrame {...frame} at="/student/answers">
      <Head
        title="정답과 해설"
        lead="최종 제출을 마친 진단을 누르면 정오표가 열립니다. 정답과 내 답을 문항마다 비교해 봅니다."
      />

      {empty ? (
        <EmptyList
          body="진단을 접수해 응시하고 최종 제출하면, 이 목록에서 정답과 해설을 볼 수 있습니다."
          applyHref="/design/student/apply"
        />
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {keys.map((k) => {
            const d = diags[k];
            /* 줄에 적는 글은 실제 화면과 같은 셈으로 짓는다 */
            const a = answerOf(d);
            return (
              <li key={d.id}>
                <DiagRow
                  diag={d}
                  href={sheetHref[k]}
                  when={a.when}
                  state={<StageTag stage={a.tag} label={a.label} />}
                  note={a.note}
                />
              </li>
            );
          })}
        </ul>
      )}
    </DashFrame>
  );
}

/* ───────────────────────── 진단 한 건 ───────────────────────── */

/** 3분기 · 유료 진단 — 창 둘(답안 풀이 보기 · 맞춤 학습)을 주소로 여닫는다 */
function PaidSheet({
  subject,
  coachOpen = false,
  reviewAt,
  graded = false,
  match = false,
}: {
  /** 처음 펴 둘 과목 — 사진 답안과 긴 글이 있는 수학을 바로 여는 주소가 따로 있다 */
  subject?: SubjectId;
  coachOpen?: boolean;
  reviewAt: ReviewAt | null;
  /** 전문가의 채점이 끝난 뒤인가 — 점수가 들어와 「채점 중」이 정답 · 부분 정답 · 오답으로 바뀐다 */
  graded?: boolean;
  /** 선 잇기 문항이 든 시험지로 편다 — 과학 5번이 그 문항이다 */
  match?: boolean;
}) {
  const router = useRouter();
  const reg = flowRegs.q3;
  const fact = flowFacts.q3;
  /* 채점이 끝난 뒤의 화면과 선 잇기 화면은 제 주소(…/graded · …/match) 아래에서 창을 여닫는다 */
  const base = graded ? `${here}/graded` : match ? `${here}/match` : here;

  return (
    <DashFrame {...frame} at="/student/answers">
      <Head
        back={back}
        title={`${fact.name} 정답과 해설`}
        lead={`최종 제출 ${fact.finalized} · 과목 ${answerSubjects(reg).length}개`}
      />
      <AnswerSheet
        row={reg}
        record={match ? flowMatch.record : flowRecords.q3}
        bank={match ? flowMatch.bank : undefined}
        grades={graded ? flowGrades : undefined}
        student={flowStudent.name}
        submitted={fact.finalized}
        initialSubject={match ? flowMatch.at.subject : subject}
        coach={
          graded || match
            ? undefined
            : {
                open: coachOpen,
                onOpen: () => router.push(`${here}/coach`),
                onClose: () => router.push(here),
              }
        }
        review={{
          at: reviewAt,
          onOpen: (want) => router.push(graded || match ? `${base}/review` : reviewHref(want)),
          onClose: () => router.push(base),
        }}
      />
    </DashFrame>
  );
}

/** 2분기 · 무료 진단(20문항) — 창은 주소로 가르지 않고 이 화면 안에서 여닫는다 */
function FreeSheet() {
  const reg = flowRegs.q2;
  const fact = flowFacts.q2;

  return (
    <DashFrame {...frame} at="/student/answers">
      <Head
        back={back}
        title={`${fact.name} 정답과 해설`}
        lead={`최종 제출 ${fact.finalized} · 과목 ${answerSubjects(reg).length}개`}
      />
      <AnswerSheet
        row={reg}
        record={flowRecords.q2}
        student={flowStudent.name}
        submitted={fact.finalized}
      />
    </DashFrame>
  );
}

/** 최종 제출 전 — 목록에서는 눌리지 않지만 주소는 남는다 */
function Locked() {
  return (
    <DashFrame {...frame} at="/student/answers">
      <Head back={back} title={`${flowFacts.q4.name} 정답과 해설`} />
      <AnswerLocked stage="doing" examHref="/design/student/exams/2026-4/e4/doing" />
    </DashFrame>
  );
}

/* ───────────────────────── 진단 결과 · 결과를 기다리는 화면 ───────────────────────── */

/**
 * 결과를 기다리는 화면 (실제 주소 /student/results/[회차]/[학년]) — 디자인.
 *
 * 최종 제출을 누르면 이 화면으로 온다. 결과지는 채점이 끝나고 스케줄러가 정한 날에 발행된 뒤에
 * 뜨고, 그때까지 할 수 있는 일은 정답과 해설을 보는 것이다 — 그 길을 단추 하나로 단다. 판은 실제
 * 화면의 조각(components/student/StudentResults.tsx의 ResultPending)이다.
 *
 * 발행된 뒤의 결과지는 3분기 진단으로 그렸다(…/2026-3/e4 — ./ResultsCounsel.tsx의 PublishedResult).
 */
export function StudentResultWait({ state }: { state: string }) {
  /* 3분기 진단은 10월 2일 아침에 자동으로 발행됐다 — 조립 규칙이 넣은 문단이 든 결과지가 뜬다 */
  if (state === "2026-3/e4") return <PublishedResult />;
  /* 그 밖의 주소는 지금 응시하는 4분기 진단이다 — 전문가 확인 중 */
  return (
    <DashFrame {...frame} at="/student/results">
      <Head
        back={{ href: "/design/student/results/child", label: "진단 결과" }}
        title={`${flowFacts.q4.name} 결과`}
      />
      <ResultPending
        stage="reviewing"
        /* 정답과 해설 디자인은 예시 한 건(3분기)으로 굳혀 두었다 */
        answerHref={to("2026-3/e4")}
        examHref="/design/student/exams/2026-4/e4/reviewing"
      />
    </DashFrame>
  );
}
