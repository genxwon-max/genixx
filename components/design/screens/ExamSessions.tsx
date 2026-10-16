"use client";

import { useRouter } from "next/navigation";
import {
  FREE_LIMIT_MIN,
  SUBJECT_IDS,
  examOrderOf,
  freeOrder,
  joinBlanks,
  joinPairs,
  screensOf,
  subjectOf,
  subjects,
  tierCount,
  tierQuestions,
  type Pair,
  type Question,
} from "@/lib/exam";
import { evalName } from "@/lib/examCatalog";
import { matchBank, matchQuestion, slotBank, slotQuestion } from "@/lib/examDesign";
import { designLinks } from "@/lib/designScreens";
import { ArrowRight } from "@/components/Icons";
import {
  BriefPanel,
  ForfeitDialog,
  ForfeitedPanel,
  QuestionBody,
  QuestionPad,
  ScreenColumn,
  isAnswered,
  setRange,
} from "@/components/exam/ExamSession";
import { ExitDialog, TrialStart } from "@/components/exam/TrialSession";
import type { MatchPick } from "@/components/exam/MatchAnswer";
import { watermarkOf } from "@/components/exam/ExamWatermark";
import { btnGhost, btnPrimary } from "@/components/exam/ui";
import ExamFrame from "../ExamFrame";

/**
 * 진단 응시 화면의 「나가기」 (실제 주소 /exam/session/trial · free · paid) — 디자인.
 *
 * 응시 화면은 보는 사람에 따라 셋으로 갈린다 — 비회원 셋트, 회원 무료 진단, 회원 유료 진단.
 * 셋 모두 머리 오른쪽 끝에 **「나가기」** 하나를 둔다(예전에는 회원 응시가 「포기하기」,
 * 비회원 셋트가 「셋트 그만하기」였다). 나가면 무슨 일이 생기는지는 갈래마다 달라, 눌렀을 때
 * 뜨는 창이 그것을 말한다 —
 *
 *   비회원 셋트   표지로 돌아간다. 고른 것과 쓴 답은 창을 닫기 전까지 남는다.
 *   회원 무료     세 과목의 답을 함께 버리고 응시 기회 하나를 쓴다.
 *   회원 유료     그 과목의 답을 버리고 응시 기회 하나를 쓴다.
 *
 * 자료 · 문항 · 문항 이동판과 확인 창, 나간 뒤의 화면은 모두 실제 응시 화면의 조각이다
 * (components/exam/ExamSession.tsx · TrialSession.tsx). 문항은 문항 은행의 것을 그대로 세우고,
 * 답과 남은 시간만 여기 적어 두었다.
 *
 * 파일 끝의 ExamMatch는 자료가 없는 **독립 문항**(선 잇기)의 응시 화면이다.
 */

/** 예시로 굳힌 진단 — 2026학년도 4분기 · 초등 4학년 (학생 대시보드 디자인의 「지금 응시 중인 진단」과 같다) */
const ROUND = "2026-4";
const TRACK = "e4";
const SEASON = "2026학년도 4분기";
const NAME = evalName(ROUND, TRACK);
const watermark = watermarkOf(SEASON);

const noop = () => {};
const pad2 = (n: number) => String(n).padStart(2, "0");
const clockText = (sec: number) => `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;

/** 앞에서부터 n문항을 답한 것으로 적는다 — 고르는 문항만. 쓰는 문항은 비워 둔다 */
const answered = (list: Question[], n: number): Record<string, number | string> =>
  Object.fromEntries(
    list
      .slice(0, n)
      .filter((q) => q.type === "choice")
      .map((q, i) => [q.id, i % (q.choices?.length ?? 1)]),
  );

/* ───────────────────────── 응시 화면 본문 ───────────────────────── */

/** 자료 | 문항 | 문항 이동판 + 하단 바 — 실제 응시 화면과 같은 틀이다 */
function Sheet({
  order,
  open,
  padList,
  screens,
  at,
  answers,
  grouped = false,
  footnote,
  lastLabel,
  matchPick = null,
}: {
  /** 번호를 매기는 차례 */
  order: Question[];
  /** 지금 갈래에서 열린 문항 */
  open: Question[];
  /** 문항 이동판에 늘어놓을 문항 — 잠긴 것까지 */
  padList: Question[];
  screens: Question[][];
  /** 지금 보고 있는 화면의 차례 */
  at: number;
  answers: Record<string, number | string>;
  grouped?: boolean;
  footnote?: string;
  /** 마지막 화면의 단추 이름 — 「제출하기」 · 「셋트 마치기」 */
  lastLabel: string;
  /** 선 잇기에서 고른 항목 — 주소가 정한다. 없으면 아무것도 고르지 않은 채로 둔다 */
  matchPick?: MatchPick | null;
}) {
  const screen = screens[at];
  const question = screen[0];
  const isOpen = (q: Question) => open.includes(q);
  const doneCount = open.filter((q) => isAnswered(q, answers[q.id])).length;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_14rem] lg:overflow-hidden">
        <BriefPanel brief={question.brief} range={setRange(order, question)} watermark={watermark} />
        <ScreenColumn
          order={order}
          screen={screen}
          watermark={watermark}
          renderQuestion={(q) => (
            <QuestionBody
              key={q.id}
              q={q}
              num={order.indexOf(q) + 1}
              value={answers[q.id]}
              onAnswer={noop}
              watermark={watermark}
              matchPick={matchPick}
            />
          )}
        />
        <QuestionPad
          list={padList}
          grouped={grouped}
          isHere={(q) => q.setId === question.setId && isOpen(q)}
          isCurrent={(q) => screen.includes(q)}
          isDone={(q) => isOpen(q) && isAnswered(q, answers[q.id])}
          isLocked={(q) => !isOpen(q)}
          onPick={noop}
          doneLabel="답한 문항"
          doneVerb="응답함"
          footnote={footnote}
        />
      </div>

      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{open.length}
            </span>
            <button type="button" className={btnGhost}>
              이전
            </button>
            <button type="button" className={btnPrimary}>
              {at === screens.length - 1 ? lastLabel : "다음"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 비회원 · 셋트 ───────────────────────── */

const TRIAL_SUBJECT = "math" as const;
const trialOrder = examOrderOf(TRIAL_SUBJECT);
const trialOpen = trialOrder.slice(0, tierCount("set", TRIAL_SUBJECT, TRIAL_SUBJECT));
const trialScreens = screensOf(TRIAL_SUBJECT)
  .map((sc) => sc.filter((q) => trialOpen.includes(q)))
  .filter((sc) => sc.length > 0);

export function ExamTrial({ state }: { state: string }) {
  const router = useRouter();
  const to = designLinks("exam-trial");
  const subjectName = subjectOf(TRIAL_SUBJECT)!.name;

  /* 나간 뒤 — 표지로 돌아온다. 머리의 나가는 길은 「창 닫기」다 */
  if (state === "left") {
    return (
      <ExamFrame name={NAME} subject={null} closable>
        <TrialStart season={SEASON} watermark={watermark} onStart={() => router.push(to())} />
      </ExamFrame>
    );
  }

  return (
    <ExamFrame name={NAME} subject={subjectName} exitHref={to("exit")}>
      <Sheet
        order={trialOrder}
        open={trialOpen}
        padList={trialOrder}
        screens={trialScreens}
        at={Math.min(1, trialScreens.length - 1)}
        answers={answered(trialOpen, 1)}
        footnote={`점선 번호(문항 ${trialOpen.length + 1}~)는 회원가입 후 무료 진단에서 풀 수 있습니다.`}
        lastLabel="셋트 마치기"
      />
      {state === "exit" && (
        <ExitDialog
          subjectName={subjectName}
          onStay={() => router.push(to())}
          onLeave={() => router.push(to("left"))}
        />
      )}
    </ExamFrame>
  );
}

/* ───────────────────────── 회원 · 무료 진단 ───────────────────────── */

const freeList = freeOrder();
const freeScreens = SUBJECT_IDS.flatMap((id) =>
  screensOf(id)
    .map((sc) => sc.filter((q) => freeList.includes(q)))
    .filter((sc) => sc.length > 0),
);
const FREE_TITLE = "무료 진단";
/** 60분 가운데 41분 27초가 남았다 */
const FREE_REMAIN = 41 * 60 + 27;

export function ExamFree({ state }: { state: string }) {
  const router = useRouter();
  const to = designLinks("exam-free");
  const subjectText = subjects.map((x) => x.short).join(" · ");

  if (state === "left" || state === "left/none") {
    return (
      <ExamFrame name={NAME} subject={subjectText}>
        <ForfeitedPanel
          title={FREE_TITLE}
          attemptsLeft={state === "left" ? 1 : 0}
          onRestart={noop}
          onClose={noop}
        />
      </ExamFrame>
    );
  }

  return (
    <ExamFrame
      name={NAME}
      subject={subjectText}
      clock={{ remain: FREE_REMAIN, limitMin: FREE_LIMIT_MIN }}
      exitHref={to("exit")}
    >
      <Sheet
        order={freeList}
        open={freeList}
        padList={freeList}
        screens={freeScreens}
        at={Math.min(5, freeScreens.length - 1)}
        answers={answered(freeList, 6)}
        grouped
        footnote="유료 진단으로 접수하면 과목마다 문항이 더 열립니다."
        lastLabel="제출하기"
      />
      {state === "exit" && (
        <ForfeitDialog
          subjectName={FREE_TITLE}
          remain={clockText(FREE_REMAIN)}
          onCancel={() => router.push(to())}
          onConfirm={() => router.push(to("left"))}
        />
      )}
    </ExamFrame>
  );
}

/* ───────────────────────── 회원 · 유료 진단 ───────────────────────── */

const PAID_SUBJECT = "math" as const;
const paidMeta = subjectOf(PAID_SUBJECT)!;
const paidList = tierQuestions("paid", PAID_SUBJECT);
const paidFull = examOrderOf(PAID_SUBJECT);
const paidScreens = screensOf(PAID_SUBJECT)
  .map((sc) => sc.filter((q) => paidList.includes(q)))
  .filter((sc) => sc.length > 0);
/** 23분 10초가 남았다 */
const PAID_REMAIN = 23 * 60 + 10;

export function ExamPaid({ state }: { state: string }) {
  const router = useRouter();
  const to = designLinks("exam-paid");

  if (state === "left" || state === "left/none") {
    return (
      <ExamFrame name={NAME} subject={paidMeta.name}>
        <ForfeitedPanel
          title={paidMeta.name}
          attemptsLeft={state === "left" ? 1 : 0}
          onRestart={noop}
          onClose={noop}
        />
      </ExamFrame>
    );
  }

  return (
    <ExamFrame
      name={NAME}
      subject={paidMeta.name}
      clock={{ remain: PAID_REMAIN, limitMin: paidMeta.limitMin }}
      exitHref={to("exit")}
    >
      <Sheet
        order={paidList}
        open={paidList}
        padList={paidFull}
        screens={paidScreens}
        at={Math.min(7, paidScreens.length - 1)}
        answers={answered(paidList, 8)}
        lastLabel="제출하기"
      />
      {state === "exit" && (
        <ForfeitDialog
          subjectName={paidMeta.name}
          remain={clockText(PAID_REMAIN)}
          onCancel={() => router.push(to())}
          onConfirm={() => router.push(to("left"))}
        />
      )}
    </ExamFrame>
  );
}

/* ───────────────────────── 독립 문항 · 선 잇기 ───────────────────────── */

/**
 * 독립 문항 (실제 주소 /exam/session/paid/[과목]) — 함께 읽는 자료가 없는 문항의 응시 화면.
 *
 * 세트 문항은 왼쪽에 자료, 가운데에 문제를 둔다. 자료가 없는 독립 문항은 왼쪽 칸이 없고 문항이
 * 그 자리까지 차지한다 — 오른쪽 문항 이동판과 머리, 하단 바는 그대로다. 여기서는 과학 시험지의
 * 첫 세트(문항 1~4) 다음에 독립 문항 하나를 5번으로 끼워 넣었다(lib/examDesign.ts의 matchBank —
 * 정답과 해설 · 회원 채점 디자인의 선 잇기 화면도 같은 시험지를 쓴다).
 *
 * 문항은 선 잇기다. 왼쪽 2개 · 오른쪽 5개이고, 오른쪽 다섯을 왼쪽 둘에 나누어 잇는다(왼쪽 한
 * 항목에 선 여럿 — 붙는 물체 둘, 붙지 않는 물체 셋). 화면의 조각은 실제 응시 화면의 것 그대로이고(components/exam/MatchAnswer.tsx),
 * 이은 선과 고른 항목만 주소마다 적어 두었다. 직접 이어 보는 화면은 /exam/session/design/match다.
 */

const MATCH_SUBJECT = "science" as const;
const matchMeta = subjectOf(MATCH_SUBJECT)!;
/** 선 잇기 문항이 든 과학 시험지 — 첫 세트(문항 1~4) 다음의 5번이 독립 문항이다 */
const matchOrder = tierQuestions("paid", MATCH_SUBJECT, null, matchBank);
const matchScreens = screensOf(MATCH_SUBJECT, matchBank)
  .map((sc) => sc.filter((q) => matchOrder.includes(q)))
  .filter((sc) => sc.length > 0);
/** 독립 문항이 선 화면의 차례 */
const matchAt = matchScreens.findIndex((sc) => sc.includes(matchQuestion));
/** 31분 42초가 남았다 */
const MATCH_REMAIN = 31 * 60 + 42;

/** 앞 세트의 네 문항은 이미 답했다 — 칸마다 쓰는 문항이라 예시 답을 적어 둔다 */
const matchBefore: Record<string, number | string> = Object.fromEntries(
  matchOrder
    .slice(0, matchOrder.indexOf(matchQuestion))
    .map((q) => [q.id, joinBlanks(q.sampleAnswer ?? [])]),
);

/** 상태마다 이어 둔 선과 고른 항목 — [왼쪽, 오른쪽] 차례(0부터) */
const matchStates: Record<string, { lines: Pair[]; pick: MatchPick | null }> = {
  "": { lines: [], pick: null },
  picked: { lines: [], pick: { side: "left", index: 0 } },
  doing: {
    lines: [
      [0, 0],
      [1, 1],
      [1, 3],
    ],
    pick: null,
  },
  done: {
    lines: [
      [0, 0],
      [0, 2],
      [1, 1],
      [1, 3],
      [1, 4],
    ],
    pick: null,
  },
};

export function ExamMatch({ state }: { state: string }) {
  const paid = designLinks("exam-paid");
  const { lines, pick } = matchStates[state] ?? matchStates[""];

  return (
    <ExamFrame
      name={NAME}
      subject={matchMeta.name}
      clock={{ remain: MATCH_REMAIN, limitMin: matchMeta.limitMin }}
      exitHref={paid("exit")}
    >
      <Sheet
        /* 고른 항목이 주소에 따라 달라진다 — 주소가 바뀌면 문항을 새로 그린다 */
        key={state}
        order={matchOrder}
        open={matchOrder}
        padList={matchOrder}
        screens={matchScreens}
        at={matchAt}
        answers={{
          ...matchBefore,
          ...(lines.length > 0 ? { [matchQuestion.id]: joinPairs(lines) } : {}),
        }}
        lastLabel="제출하기"
        matchPick={pick}
      />
    </ExamFrame>
  );
}

/* ───────────────────────── 답 칸 표지로 쓴 독립 문항 ───────────────────────── */

/**
 * 출제할 때 문항 글에 「( [정답1] )」 · 「{서술형1}」을 적은 문항의 응시 화면(lib/answerSlots.ts).
 * 괄호 자리에 짧은 칸이, 「이유를 쓰시오.」 아래에 쓰는 칸이 선다. 선 잇기 화면과 같은 시험지 자리
 * (과학 5번 — lib/examDesign.ts의 slotBank)에 넣었다. 직접 써 보는 화면은 /exam/session/design/slots다.
 */
const slotOrder = tierQuestions("paid", MATCH_SUBJECT, null, slotBank);
const slotScreens = screensOf(MATCH_SUBJECT, slotBank)
  .map((sc) => sc.filter((q) => slotOrder.includes(q)))
  .filter((sc) => sc.length > 0);
const slotAt = slotScreens.findIndex((sc) => sc.includes(slotQuestion));
const slotBefore: Record<string, number | string> = Object.fromEntries(
  slotOrder
    .slice(0, slotOrder.indexOf(slotQuestion))
    .map((q) => [q.id, joinBlanks(q.sampleAnswer ?? [])]),
);

/** 상태마다 쓴 답 — 칸 차례대로(정답 1 · 서술형 1) */
const slotStates: Record<string, string[]> = {
  "": [],
  doing: ["수증기", ""],
  done: [
    "수증기",
    "물이 끓으면 물이 수증기로 변하는데, 그 수증기가 모여서 거품이 되어 위로 올라오기 때문이다.",
  ],
};

export function ExamSlots({ state }: { state: string }) {
  const paid = designLinks("exam-paid");
  const values = slotStates[state] ?? slotStates[""];
  return (
    <ExamFrame
      name={NAME}
      subject={matchMeta.name}
      clock={{ remain: MATCH_REMAIN, limitMin: matchMeta.limitMin }}
      exitHref={paid("exit")}
    >
      <Sheet
        key={state}
        order={slotOrder}
        open={slotOrder}
        padList={slotOrder}
        screens={slotScreens}
        at={slotAt}
        answers={{
          ...slotBefore,
          ...(values.length > 0 ? { [slotQuestion.id]: joinBlanks(values) } : {}),
        }}
        lastLabel="제출하기"
      />
    </ExamFrame>
  );
}
