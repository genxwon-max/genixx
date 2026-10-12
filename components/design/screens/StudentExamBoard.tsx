"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { designLinks } from "@/lib/designScreens";
import {
  FREE_LIMIT_MIN,
  freeOrder,
  markOf,
  subjects,
  tierOf,
  tierQuestions,
  type SubjectId,
} from "@/lib/exam";
import { isSelfSurvey, surveyKeys, surveyMeta, type SurveyKey } from "@/lib/examStore";
import { examWindow } from "@/lib/popup";
import { primaryTypes } from "@/lib/result";
import { ArrowRight } from "@/components/Icons";
import type { Registration } from "@/components/exam/Registrations";
import SectionTitle from "@/components/exam/SectionTitle";
import SmsDialog from "@/components/exam/SmsDialog";
import { FinalDialog } from "@/components/exam/StatusTable";
import { btnPrimary, btnSm, btnSmMuted, govTable, td, tdStrong, th } from "@/components/exam/ui";
import {
  DiagRow,
  EmptyList,
  StageTag,
  dayText,
  openStages,
  type Stage,
} from "@/components/student/diag";
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import DashFrame from "../DashFrame";
import { flowFacts, flowRecords, flowRegs } from "./studentFlow";

/**
 * 내 진단 (실제 주소 /student/exams · /student/exams/[회차]/[학년]) — 디자인.
 *
 * 예전에는 응시 존의 「응시하기」 탭이었다. 접수 · 정답과 해설 · 결과와 함께 학생 대시보드로
 * 옮기면서(2026-10-12) 목록과 진단 한 건으로 나뉘었다.
 *
 *   목록        접수한 진단마다 한 줄. 줄 전체가 그 진단으로 들어가는 링크다
 *   진단 한 건   머리(이름 · 유형 · 응시 기간 · 단계) · 지금 상태 한 칸 · 응시 현황 판
 *
 * 목록의 줄 · 머리 · 단계 표시 · 설문 문자 창 · 최종 제출 확인 창은 실제 화면의 조각을 그대로
 * 쓴다. 응시 현황 판(components/exam/StatusTable.tsx)은 로그인한 학생과 응시 기록을 저장소에서
 * 읽으므로, 다른 화면 안에 넣었을 때의 모양만 값을 적은 사본으로 옮겼다. 문항 수와 제한
 * 시간은 실제 판과 같은 값(lib/exam.ts)이고, 학생 · 진단 · 날짜는 네 화면이 함께 쓰는 예시
 * (./studentFlow.ts)다. 판 안의 문장은 실제 판과 같은 규칙으로 고른다.
 *
 * 실제 화면과 다른 점
 *   · 판 아래의 「시연용 초기화」 단추는 옮기지 않았다 — 시연할 때만 쓰는 단추다.
 *   · 기간이 끝난 진단(…/2026-1/e4)은 응시 칸에 단추 대신 「응시 기간 종료」를 적고, 최종 제출
 *     줄의 문장을 기간이 끝났다는 말로 바꿨다. 실제 판은 기간이 끝난 것을 알지 못해 「이어서」
 *     단추가 그대로 눌린다.
 *
 * 응시 단추(진단 시작 · 이어서)는 실제처럼 응시 화면을 새 창으로 연다 — 여는 것은 디자인의
 * 응시 화면이다. 그 밖의 단추는 창을 여닫는 것과 다음 상태로 가는 것만 눌린다.
 */

const to = designLinks("student-exams");

/* 다른 디자인 화면의 주소 */
const applyHref = "/design/student/apply";
/** 정답과 해설 디자인은 예시 한 건(3분기)으로 정해 두었다 */
const answersHref = "/design/student/answers/2026-3/e4";
/** 최종 제출을 마치면 가는 화면 — 결과를 기다리는 화면 */
const waitHref = "/design/student/results/2026-4/e4";
/** 응시 단추가 여는 창 — 디자인의 응시 화면 */
const paidSession = "/design/exam/session/paid";
const freeSession = "/design/exam/session/free";

const frame = {
  who: "student",
  at: "/student/exams",
  unread: 2,
  bellHref: "/design/student/alerts",
} as const;
const back = { href: to(), label: "내 진단" };
const noop = () => {};

/** 이서준의 보호자 휴대전화 — 학부모 설문 문자 창에 미리 채워지는 번호. 함께 쓰는 예시에 없어 여기 적었다 */
const GUARDIAN_PHONE = "01026874530";

/* ───────────────────────── 판에 적는 값 ───────────────────────── */

type LineState = "ready" | "in-progress" | "reflecting" | "submitted";

/** 응시 표의 한 줄 — 유료 진단은 과목마다 한 줄, 무료 진단은 한 줄이다 */
type Line = {
  name: string;
  answered: number;
  total: number;
  /** 제한 시간(분) */
  limit: number;
  /** reflecting — 답안은 냈고 해석만 비어 있다 */
  state: LineState;
  /** 제출일시 — 「2026-10-08 16:42」 */
  at?: string;
};

type Mark = { state: LineState; answered?: number; at?: string };

const isDone = (l: { state: LineState }) => l.state === "submitted" || l.state === "reflecting";

/** 유료 진단 — 과목마다 한 줄. 문항 수와 제한 시간은 실제 판과 같은 값이다 */
const paidLines = (marks: Record<SubjectId, Mark>): Line[] =>
  subjects.map((s) => {
    const total = tierQuestions("paid", s.id).length;
    const m = marks[s.id];
    return {
      name: s.name,
      total,
      limit: s.limitMin,
      answered: m.answered ?? (isDone(m) ? total : 0),
      state: m.state,
      at: m.at,
    };
  });

/** 무료 진단이 한 번에 여는 문항 수 — 20 */
const freeCount = freeOrder().length;

/** 무료 진단 — 세 과목을 한 줄로 적는다 */
const freeLine = (m: Mark): Line[] => [
  {
    name: subjects.map((s) => s.short).join(" · "),
    total: freeCount,
    limit: FREE_LIMIT_MIN,
    answered: m.answered ?? (isDone(m) ? freeCount : 0),
    state: m.state,
    at: m.at,
  },
];

/** 설문 한 줄 — done은 제출일시, sent는 링크를 문자로 보낸 날(「10.10」) */
type SurveyLine = { done?: string; sent?: string };
type Surveys = Record<SurveyKey, SurveyLine>;

type BoardData = {
  free?: boolean;
  lines: Line[];
  surveys: Surveys;
  /** 최종 제출을 마친 판에만 있다 — 「결과 확인」 · 「결과 보기」가 가는 곳 */
  resultHref?: string;
  /** 「제출 완료」가 가는 곳 — 최종 제출 확인 창이 열린 상태 */
  finalHref?: string;
  /** 학부모 설문의 「문자 보내기」가 가는 곳 — 문자 창이 열린 상태 */
  smsHref?: string;
  /** 보호자가 학생 접속코드로 들어왔다 */
  guardian?: boolean;
  /** 응시 기간이 끝났다 */
  closed?: boolean;
};

type View = {
  diag: { name: string; reg: Registration };
  /** 「응시 기간 2026.10.06 ~ 2026.10.31」 */
  period: string;
  /** 마감까지 남은 날 — 응시할 수 있는 단계에서만 머리에 적는다 */
  daysLeft?: number;
  stage: Exclude<Stage, "upcoming">;
  /** 결과가 발행된 진단의 재능 유형(「NLM형 · 관찰 탐구가형」)과 한 줄 설명 */
  result?: { type: string; tagline: string };
  board: BoardData;
  popup?: "sms" | "final";
};

/* ── 2026 4분기 초4 진단 · 유료 — 지금 응시하는 진단 ── */

const KOREAN_AT = "2026-10-08 16:42";
const MATH_AT = "2026-10-10 11:26";
const SCIENCE_AT = "2026-10-11 15:08";

const marks = {
  ready: { korean: { state: "ready" }, math: { state: "ready" }, science: { state: "ready" } },
  /* 국어는 답안을 내고 해석을 나중으로 미뤘다. 수학은 풀다가 창을 닫았다 — 답한 문항 수는
     「이어서」가 여는 응시 화면 디자인(/design/exam/session/paid · 응답 5/11)과 같다 */
  doing: {
    korean: { state: "reflecting", at: KOREAN_AT },
    math: { state: "in-progress", answered: 5 },
    science: { state: "ready" },
  },
  /* 세 과목을 모두 냈다 — 국어의 해석은 아직 비어 있다 */
  submitted: {
    korean: { state: "reflecting", at: KOREAN_AT },
    math: { state: "submitted", at: MATH_AT },
    science: { state: "submitted", at: SCIENCE_AT },
  },
  /* 세 과목의 답안과 해석을 모두 냈다 */
  complete: {
    korean: { state: "submitted", at: KOREAN_AT },
    math: { state: "submitted", at: MATH_AT },
    science: { state: "submitted", at: SCIENCE_AT },
  },
} satisfies Record<string, Record<SubjectId, Mark>>;

const STUDENT_SURVEY_AT = "2026-10-08 17:03";

const surveys = {
  none: { student: {}, guardian: {}, teacher: {} },
  /* 학생 설문만 냈다 */
  student: { student: { done: STUDENT_SURVEY_AT }, guardian: {}, teacher: {} },
  /* 학생 설문만 냈고, 지도교사에게는 설문 링크를 문자로 보내 두었다 */
  studentSent: { student: { done: STUDENT_SURVEY_AT }, guardian: {}, teacher: { sent: "10.10" } },
  /* 셋을 모두 냈다 */
  complete: {
    student: { done: STUDENT_SURVEY_AT },
    guardian: { done: "2026-10-11 20:31" },
    teacher: { done: "2026-10-12 09:14" },
  },
} satisfies Record<string, Surveys>;

const q4 = {
  diag: { name: flowFacts.q4.name, reg: flowRegs.q4 },
  period: flowFacts.q4.period,
  daysLeft: flowFacts.q4.daysLeft,
};
const smsHref = to("2026-4/e4/sms");

const ready: View = {
  ...q4,
  stage: "ready",
  board: { lines: paidLines(marks.ready), surveys: surveys.none, smsHref },
};

const doing: View = {
  ...q4,
  stage: "doing",
  board: { lines: paidLines(marks.doing), surveys: surveys.student, smsHref },
};

const submitted: View = {
  ...q4,
  stage: "submitted",
  board: {
    lines: paidLines(marks.submitted),
    surveys: surveys.studentSent,
    smsHref,
    finalHref: to("2026-4/e4/final/missing"),
  },
};

/** 과목 · 해석 · 설문을 모두 낸 판 — 최종 제출 확인 창(설문을 모두 낸 경우) 뒤에 깔린다 */
const complete: View = {
  ...q4,
  stage: "submitted",
  board: {
    lines: paidLines(marks.complete),
    surveys: surveys.complete,
    finalHref: to("2026-4/e4/final"),
  },
};

/** 최종 제출 뒤 — 내지 않은 설문을 둔 채 제출한 판이다. 접어 둔 판을 펴면 보인다 */
const reviewing: View = {
  diag: q4.diag,
  period: q4.period,
  stage: "reviewing",
  board: { lines: submitted.board.lines, surveys: submitted.board.surveys, resultHref: waitHref },
};

/* ── 같은 진단을 응시권 없이 접수했을 때 — 무료 진단 ── */

const q4free = { ...q4, diag: { name: flowFacts.q4.name, reg: flowRegs.q4free } };

const freeReady: View = {
  ...q4free,
  stage: "ready",
  board: { free: true, lines: freeLine({ state: "ready" }), surveys: surveys.none },
};

const freeSubmitted: View = {
  ...q4free,
  stage: "submitted",
  board: {
    free: true,
    lines: freeLine({ state: "submitted", at: "2026-10-09 17:12" }),
    surveys: surveys.none,
  },
};

/* ── 2026 3분기 초4 진단 · 유료 — 결과 발행 ── */

/** 과목별 제출일시 — 최종 제출(2026.08.24)보다 앞이다 */
const Q3_AT: Record<SubjectId, string> = {
  korean: "2026-08-10 16:31",
  math: "2026-08-17 17:02",
  science: "2026-08-24 13:52",
};

/**
 * 답한 문항 수 — 정답과 해설 디자인이 펴는 답안(flowRecords.q3)에서 정오표가 「미응답」으로
 * 세는 문항만 뺀다(국어 1 · 수학 1문항). 그 답안은 서술형 · 논술형도 거의 모두 적어 둔
 * 예시라, 정오표의 「미응답」 수와 이 판의 답한 문항 수가 서로 맞는다.
 */
const q3Lines: Line[] = subjects.map((s) => {
  const opened = tierQuestions("paid", s.id);
  const rec = flowRecords.q3.subjects[s.id];
  return {
    name: s.name,
    total: opened.length,
    limit: rec.limitMin ?? s.limitMin,
    answered: opened.filter((q) => markOf(q, rec.answers[q.id]) !== "empty").length,
    state: rec.reflectionAt ? "submitted" : "reflecting",
    at: Q3_AT[s.id],
  };
});

const published: View = {
  diag: { name: flowFacts.q3.name, reg: flowRegs.q3 },
  period: flowFacts.q3.period,
  stage: "published",
  result: { type: flowFacts.q3.type, tagline: primaryTypes.nature.tagline },
  board: {
    lines: q3Lines,
    /* 학생 · 학부모 설문을 냈고 지도교사 설문은 내지 않았다 (flowRecords.q3과 같다) */
    surveys: {
      student: { done: "2026-08-10 17:05" },
      guardian: { done: "2026-08-12 21:14" },
      teacher: {},
    },
    /* 이 진단의 결과지 — 채점이 끝나고 스케줄러가 발행한 뒤의 모습이다(./ResultsCounsel.tsx의 PublishedResult) */
    resultHref: "/design/student/results/2026-3/e4",
  },
};

/* ── 2026 1분기 초4 진단 · 무료 — 20문항 가운데 12문항만 풀고 응시 기간이 끝났다 ── */

const closed: View = {
  diag: { name: flowFacts.q1.name, reg: flowRegs.q1 },
  period: flowFacts.q1.period,
  stage: "closed",
  board: {
    free: true,
    closed: true,
    lines: freeLine({ state: "in-progress", answered: 12 }),
    surveys: surveys.none,
  },
};

/** 주소 꼬리 → 진단 한 건의 상태 */
const views: Record<string, View> = {
  "2026-4/e4": ready,
  "2026-4/e4/doing": doing,
  "2026-4/e4/submitted": submitted,
  "2026-4/e4/sms": { ...doing, popup: "sms" },
  "2026-4/e4/final": { ...complete, popup: "final" },
  "2026-4/e4/final/missing": { ...submitted, popup: "final" },
  "2026-4/e4/reviewing": reviewing,
  "2026-4/e4/free": freeReady,
  "2026-4/e4/free/submitted": freeSubmitted,
  /* 보호자에게는 응시 칸이 「열람 불가」로 바뀐다. 과목과 설문의 진행은 「한 과목 제출」과 같다 */
  "2026-4/e4/guardian": { ...doing, board: { ...doing.board, guardian: true, smsHref: undefined } },
  "2026-3/e4": published,
  "2026-1/e4": closed,
};

/* ───────────────────────── 글 — 실제 화면과 같은 규칙 ───────────────────────── */

/** 얼마나 했나 — 유료는 과목, 무료는 문항으로 센다 (components/student/diag.tsx의 amountOf) */
function amount(v: View) {
  const { lines } = v.board;
  return v.board.free
    ? { done: lines[0].answered, total: lines[0].total, unit: "문항" }
    : { done: lines.filter(isDone).length, total: lines.length, unit: "과목" };
}

/** 목록의 줄에서 단계 아래에 적는 한 줄 (components/student/StudentExams.tsx의 noteOf) */
function noteOf(v: View) {
  const a = amount(v);
  switch (v.stage) {
    case "ready":
    case "doing":
      return [`${a.unit} ${a.done}/${a.total}`, dayText(v.daysLeft ?? null)].filter(Boolean).join(" · ");
    case "submitted":
      return "최종 제출하면 결과가 나옵니다";
    case "reviewing":
      return "결과를 준비하고 있습니다";
    case "published":
      return v.result?.type ?? "결과를 볼 수 있습니다";
    case "closed":
      return `${a.unit} ${a.done}/${a.total}에서 끝났습니다`;
  }
}

/** 진단 한 건의 「지금 상태」 칸 — 굵은 한 줄과 할 일 한 줄 (components/student/StudentExamDetail.tsx의 Now) */
function nowOf(v: View): [string, string] {
  const a = amount(v);
  const free = !!v.board.free;
  switch (v.stage) {
    case "ready":
      return [
        "아직 시작하지 않았습니다",
        free
          ? `아래 표에서 「진단 시작」을 누르면 응시 창이 열리고, ${a.total}문항이 한 창에서 이어집니다.`
          : "아래 표에서 과목의 「진단 시작」을 누르면 응시 창이 열립니다.",
      ];
    case "doing":
      return [
        `${a.total}${a.unit} 중 ${a.done}${a.unit}을 ${free ? "풀었습니다" : "냈습니다"}`,
        `남은 ${a.unit}을 마치고 최종 제출하면 결과가 나옵니다.`,
      ];
    case "submitted":
      return [
        free ? `${a.total}문항을 모두 냈습니다` : "과목을 모두 냈습니다",
        "아래 맨 끝에서 최종 제출하면 결과 분석이 시작됩니다.",
      ];
    case "reviewing":
      return [
        "최종 제출을 마쳤습니다",
        "전문가가 결과를 확인하고 있습니다. 발행되면 「진단 결과」에서 봅니다. 정답과 해설은 지금 볼 수 있습니다.",
      ];
    case "published":
      return v.result
        ? [`결과가 나왔습니다 · ${v.result.type.replace(" · ", " ")}`, v.result.tagline]
        : ["결과가 나왔습니다", "「결과 보기」에서 결과지를 봅니다."];
    case "closed":
      return ["응시 기간이 끝났습니다", "기간 안에 최종 제출하지 못해 결과가 나오지 않습니다."];
  }
}

/* ───────────────────────── 화면 ───────────────────────── */

export default function StudentExamBoard({ state }: { state: string }) {
  if (state === "empty") return <List empty />;
  const view = views[state];
  /* 상태가 바뀌면 문자 창에 적던 번호와 펴 둔 판도 그 상태의 처음 모양으로 돌아가야 한다 */
  return view ? <Detail key={state} view={view} /> : <List />;
}

/* ───────────────────────── 목록 ───────────────────────── */

const rowOf = (v: View) => ({ diag: v.diag, when: v.period, stage: v.stage, note: noteOf(v) });

/** 접수한 진단 — 응시 기간이 늦은 것부터 */
const listRows = [
  { ...rowOf(doing), href: to("2026-4/e4/doing") },
  { ...rowOf(published), href: to("2026-3/e4") },
  /* 2분기 진단은 디자인에 진단 한 건 화면을 따로 두지 않았다 — 같은 「결과 발행」 상태인
     3분기 진단의 화면으로 간다 */
  {
    diag: { name: flowFacts.q2.name, reg: flowRegs.q2 },
    when: flowFacts.q2.period,
    stage: "published" as const,
    note: flowFacts.q2.type,
    href: to("2026-3/e4"),
  },
  { ...rowOf(closed), href: to("2026-1/e4") },
];

function List({ empty = false }: { empty?: boolean }) {
  return (
    <DashFrame {...frame}>
      {/* 목록이 비었으면 접수 단추는 아래 빈 칸 안에 하나만 둔다 */}
      <Head
        title="내 진단"
        lead="접수한 진단입니다. 눌러서 들어가면 과목을 응시하고 진행 상황을 볼 수 있습니다."
        right={
          empty ? undefined : (
            <Link href={applyHref} className={btnQuiet}>
              진단 접수하기
            </Link>
          )
        }
      />

      {empty ? (
        <EmptyList
          body="진단을 접수하면 이 목록에 한 줄씩 표시됩니다. 무료 진단은 20문항을 한 번에 바로 응시할 수 있습니다."
          applyHref={applyHref}
        />
      ) : (
        <ul className={`${cardBox} mt-7 divide-y divide-slate-100 overflow-hidden`}>
          {listRows.map((r) => (
            <li key={r.diag.name}>
              <DiagRow
                diag={r.diag}
                href={r.href}
                when={r.when}
                state={<StageTag stage={r.stage} />}
                note={r.note}
              />
            </li>
          ))}
        </ul>
      )}
    </DashFrame>
  );
}

/* ───────────────────────── 진단 한 건 ───────────────────────── */

function Detail({ view }: { view: View }) {
  const router = useRouter();
  const { diag, stage, board } = view;
  const [head, body] = nowOf(view);
  const lead = [
    tierOf(diag.reg.tier).label,
    view.period,
    openStages.includes(stage) ? dayText(view.daysLeft ?? null) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashFrame {...frame}>
      <Head back={back} title={diag.name} lead={lead} right={<StageTag stage={stage} />} />

      {/* 지금 어디까지 했는가 — 굵은 한 줄과 할 일 한 줄 */}
      <section
        className={`${cardBox} mt-7 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
      >
        <div className="min-w-[15rem] flex-1">
          <p className="text-[16.5px] font-bold text-soft-ink">{head}</p>
          <p className="mt-1 text-[13.5px] leading-[1.7] text-soft-muted">{body}</p>
        </div>
        {stage === "reviewing" && (
          <Link href={answersHref} className={btnGo}>
            정답과 해설 보기 →
          </Link>
        )}
        {stage === "published" && (
          <div className="flex flex-wrap gap-2.5">
            <Link href={answersHref} className={btnQuiet}>
              정답과 해설
            </Link>
            <Link href={board.resultHref ?? "/design/student/results/child"} className={btnGo}>
              결과 보기 →
            </Link>
          </div>
        )}
      </section>

      {/* 판 — 응시하는 곳. 최종 제출을 마친 진단은 접어 둔다 */}
      {board.resultHref ? (
        <details className={`${cardBox} mt-4`}>
          <summary className="cursor-pointer px-5 py-4 text-[14px] font-semibold text-soft-ink sm:px-7">
            제출한 과목 · 설문 보기
          </summary>
          <div className="border-t border-soft-line px-5 py-6 sm:px-7">
            <Board b={board} />
          </div>
        </details>
      ) : (
        <div className={`${cardBox} mt-4 px-5 py-6 sm:px-7 sm:py-7`}>
          <Board b={board} />
        </div>
      )}

      {view.popup === "final" && (
        <FinalDialog
          /* 내지 않은 설문 — 실제 화면은 응시 기록에서 센다 */
          missing={surveyKeys.filter((k) => !board.surveys[k].done)}
          onCancel={() => router.push(to("2026-4/e4/submitted"))}
          onConfirm={() => router.push(waitHref)}
          onSurvey={noop}
        />
      )}

      {view.popup === "sms" && (
        <SmsDialog
          label={surveyMeta.guardian.label}
          /* 학부모 설문은 학생을 등록할 때 받은 보호자 번호가 미리 채워진다 */
          initial={GUARDIAN_PHONE}
          onCancel={() => router.push(to("2026-4/e4/doing"))}
          onSend={noop}
        />
      )}
    </DashFrame>
  );
}

/* ───────────────────────── 응시 현황 판 ───────────────────────── */

const stateText: Record<LineState | "done" | "none", { label: string; className: string }> = {
  submitted: { label: "제출완료", className: "font-bold text-emerald-700" },
  reflecting: { label: "해석 미작성", className: "font-bold text-amber-700" },
  "in-progress": { label: "진행중", className: "font-bold text-amber-700" },
  ready: { label: "미시작", className: "text-soft-muted" },
  done: { label: "제출완료", className: "font-bold text-emerald-700" },
  none: { label: "미제출", className: "font-bold text-rose-600" },
};

/** 표 안의 작은 글자 단추 — 「처음부터 다시」 · 「다시 보내기」 */
const textBtn = "text-[11px] text-soft-muted underline-offset-2 hover:text-soft-ink hover:underline";

/** 눌리지 않는 「제출 완료」 */
const finalOff =
  "inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-[2px] border border-soft-line bg-slate-50 px-6 py-3 text-sm font-bold text-soft-muted";

/**
 * 과목을 응시하는 판 — 실제 판(components/exam/StatusTable.tsx)을 다른 화면 안에 넣었을 때의
 * 모양이다. 과목별 응시 현황 표 · 설문 제출 현황 표 · 최종 제출 줄이 차례로 놓인다.
 */
function Board({ b }: { b: BoardData }) {
  const free = !!b.free;
  const finalized = !!b.resultHref;
  /* 최종 제출은 답안이 다 나왔으면 눌린다 — 해석은 선택이라 막지 않고, 빠진 것만 말한다 */
  const examDone = b.lines.every(isDone);
  const noReflection = b.lines.filter((l) => l.state === "reflecting").length;
  const session = free ? freeSession : paidSession;

  const message = finalized
    ? "최종 제출이 완료되었습니다."
    : b.closed
      ? "응시 기간이 끝나 최종 제출할 수 없습니다."
      : examDone
        ? noReflection > 0
          ? `답안이 모두 제출되었습니다. 해석을 남기지 않은 과목이 ${noReflection}개 있습니다.`
          : "답안과 해석이 모두 제출되었습니다. 최종 제출하면 결과 분석이 시작됩니다."
        : free
          ? `무료 진단 ${freeCount}문항을 제출해야 최종 제출할 수 있습니다.`
          : "세 과목을 모두 제출해야 최종 제출할 수 있습니다.";
  const sub = b.closed
    ? ""
    : !finalized && examDone && noReflection > 0
      ? "해석은 선택이지만, 적힌 만큼 진단이 정확해집니다. 위 표의 「해석 작성」에서 이어서 쓸 수 있습니다."
      : "최종 제출 후에는 답안을 수정할 수 없습니다.";

  return (
    <div>
      {b.guardian && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded border border-brand-300 bg-soft-primary-soft px-5 py-4">
          <p className="text-[13px] leading-relaxed text-soft-ink">
            <b>보호자로 접속하셨습니다.</b> 학생의 응시 답안은 열람할 수 없으며, 아래{" "}
            <b>학부모 설문</b>만 진행할 수 있습니다.
          </p>
          <button type="button" className={btnPrimary}>
            학부모 설문 진행
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 표 1 — 과목별 진단 */}
      <section className={b.guardian ? "mt-6" : undefined}>
        <SectionTitle
          note={
            free
              ? `무료 진단은 과목을 고르지 않고 ${freeCount}문항을 한 번에 이어서 풉니다. 응시 버튼을 누르면 별도 창이 열립니다.`
              : `지금 ${tierOf("paid").label}으로 응시하고 있습니다. 과목마다 따로 응시하며, 문항 수와 제한 시간은 아래 표에 적었습니다. 응시 버튼을 누르면 별도 창이 열립니다.`
          }
        >
          진단 응시 현황
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <caption className="sr-only">{free ? "무료 진단 응시 현황" : "과목별 응시 현황"}</caption>
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[80px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                {["구분", "진단 과목", "문항수", "제한시간", "진행상태", "제출일시", "응시"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.lines.map((l, i) => {
                const st = stateText[l.state];
                return (
                  <tr key={l.name}>
                    {/* 무료 진단은 한 번에 보는 진단 하나라 한 줄이다. 유료 진단은 과목마다 한 줄이다 */}
                    {free ? (
                      <td className={`${td} bg-slate-50/60 font-bold text-soft-ink`}>무료 진단</td>
                    ) : (
                      i === 0 && (
                        <td
                          className={`${td} bg-slate-50/60 font-bold text-soft-ink`}
                          rowSpan={b.lines.length}
                        >
                          필수 과목
                        </td>
                      )
                    )}
                    <td className={`${tdStrong} text-left`}>
                      {l.name}
                      {free && (
                        <span className="ml-2 text-[12px] font-medium text-soft-muted">
                          한 번에 이어서 응시
                        </span>
                      )}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {l.answered}/{l.total}
                    </td>
                    <td className={`${td} tabular-nums`}>{l.limit}분</td>
                    <td className={td}>
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{l.at ?? "-"}</td>
                    <td className={td}>
                      {b.guardian ? (
                        <span className={btnSmMuted}>열람 불가</span>
                      ) : l.state === "reflecting" ? (
                        <button type="button" className={btnSm}>
                          해석 작성
                        </button>
                      ) : l.state === "submitted" ? (
                        <span className={btnSmMuted}>완료</span>
                      ) : b.closed ? (
                        /* 실제 판에는 없는 표시 — 기간이 끝난 진단은 응시 단추를 두지 않는다 */
                        <span className="whitespace-nowrap text-[12px]">응시 기간 종료</span>
                      ) : (
                        <button type="button" onClick={() => examWindow(session)} className={btnSm}>
                          {l.answered > 0 ? "이어서" : "진단 시작"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 표 2 — 설문 */}
      <section className="mt-9">
        <SectionTitle note="학생 설문은 본인이 이 화면에서 바로 작성합니다. 학부모 설문은 1부이며 어머니·아버지 중 한 분이 대표로 답하셔도 됩니다. 설문 링크를 문자로 보내면 받은 분이 로그인 없이 자기 휴대전화에서 작성합니다. 낸 뒤에도 다시 열어 고칠 수 있습니다.">
          설문 제출 현황
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <caption className="sr-only">학생·보호자·교사 설문 제출 현황</caption>
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
              <col className="w-[170px]" />
            </colgroup>
            <thead>
              <tr>
                {["구분", "설문 종류", "대상", "진행상태", "제출일시", "작성 · 문자"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveyKeys.map((key, i) => {
                const meta = surveyMeta[key];
                const s = b.surveys[key];
                const st = stateText[s.done ? "done" : "none"];
                return (
                  <tr key={key}>
                    {i === 0 && (
                      <td
                        className={`${td} bg-slate-50/60 font-bold text-soft-ink`}
                        rowSpan={surveyKeys.length}
                      >
                        선택 설문
                      </td>
                    )}
                    <td className={`${tdStrong} text-left`}>{meta.label}</td>
                    <td className={td}>{meta.who}</td>
                    <td className={td}>
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{s.done ?? "-"}</td>
                    <td className={td}>
                      {s.done ? (
                        /* 낸 뒤에도 고치는 길과 처음부터 다시 하는 길이 있다 */
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <button type="button" className={btnSm}>
                            수정하기
                          </button>
                          <button type="button" className={textBtn}>
                            처음부터 다시
                          </button>
                        </span>
                      ) : isSelfSurvey(key) ? (
                        /* 학생 설문은 보낼 곳이 없다 — 본인이 여기서 바로 연다 */
                        <button type="button" className={btnSm}>
                          설문 작성
                        </button>
                      ) : s.sent ? (
                        /* 이미 보냈으면 보냈다는 표시와 다시 보내는 길만 작게 둔다 */
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="text-[12px] font-bold text-emerald-700">
                            발송완료 <span className="font-medium tabular-nums">{s.sent}</span>
                          </span>
                          <button type="button" className={textBtn}>
                            다시 보내기
                          </button>
                        </span>
                      ) : key === "guardian" && b.smsHref ? (
                        <Link href={b.smsHref} className={btnSm}>
                          문자 보내기
                        </Link>
                      ) : (
                        <button type="button" className={btnSm}>
                          문자 보내기
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-soft-muted">
          설문은 필수가 아닙니다. 다만 제출된 설문이 많을수록 결과 해석의 근거가 넓어지며, 리포트의
          &lsquo;발견의 순간&rsquo;과 발현 조건 항목은 보호자 설문이 있어야 제공됩니다.
        </p>
      </section>

      {/* 최종 제출 */}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-soft-line pt-6">
        <div>
          <p className="text-[13px] font-bold text-soft-ink">{message}</p>
          {sub && <p className="mt-1 text-[12px] text-soft-muted">{sub}</p>}
        </div>

        <div className="flex items-center gap-2">
          {b.resultHref ? (
            <Link href={b.resultHref} className={btnPrimary}>
              결과 확인
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : !examDone || b.closed ? (
            <button type="button" aria-disabled className={finalOff}>
              제출 완료
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : b.finalHref ? (
            <Link href={b.finalHref} className={btnPrimary}>
              제출 완료
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button type="button" className={btnPrimary}>
              제출 완료
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
