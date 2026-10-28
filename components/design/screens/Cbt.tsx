"use client";

import { useRouter } from "next/navigation";
import { FREE_LIMIT_MIN, subjectOf, subjects, tierQuestions, type Question } from "@/lib/exam";
import { flowStudent } from "./studentFlow";
import { designLinks } from "@/lib/designScreens";
import {
  ExamSettings,
  ForfeitDialog,
  ForfeitedPanel,
  ReflectAskDialog,
  ReflectionStep,
  StartCover,
  SubmitDialog,
  Submitted,
  isAnswered,
  navPrimary,
  type ExamView,
  type ReflectionSheet,
} from "@/components/exam/ExamSession";
import { ExitDialog, TrialStart, Wall } from "@/components/exam/TrialSession";
import ExamPrecheck, { PRECHECK_SENTENCE, type PrecheckState } from "@/components/exam/ExamPrecheck";
import ExamFrame from "../ExamFrame";
import {
  FREE_REMAIN,
  FREE_TITLE,
  NAME,
  PAID_REMAIN,
  SEASON,
  Sheet,
  TRIAL_SUBJECT,
  answered,
  freeList,
  freeScreens,
  paidFull,
  paidList,
  paidMeta,
  paidScreens,
  trialOpen,
  trialOrder,
  trialScreens,
} from "./ExamSessions";
import { watermarkOf } from "@/components/exam/ExamWatermark";

/**
 * CBT 응시 화면 — 비회원 셋트 · 회원 무료 진단 · 회원 유료 진단 (실제 주소 /exam/session/trial · free ·
 * paid) — 디자인 (2026-10-28 요청, /design2).
 *
 * 세 갈래가 같은 틀이고 같은 것이 바뀌었다 —
 *
 *   문항 체크     문항 번호 바로 위의 작은 「체크」 단추. 다시 볼 문항에 표시해 둔다. 답과는 상관없다
 *   문항 이동판   푼 문항은 검정으로 칠하고, 안 푼 문항은 옅은 회색, 체크한 문항은 칸 귀퉁이에
 *                 체크 표시. 지금 문항은 칸 바깥 테두리. 판 아래에 푼 · 안 푼 · 체크한 문항 수.
 *                 「점선 번호는 …」 같은 판 아래 안내는 걷었다
 *   보기 번호     동그라미를 28px에서 22px로
 *   하단 바       왼쪽 끝에 톱니바퀴(화면 설정 — 글자 크기 · 바탕색, 맨 아래 「나가기」), 가운데에 작게
 *                 줄인 「이전 · 다음」, 오른쪽 끝(문항 이동판 칸 아래)에 「제출하기」 — 셋트도 같은 이름
 *   머리          응시 중의 「나가기」를 걷었다 — 화면 설정 안으로
 *
 * 갈래마다 다른 것은 나간 뒤와 낸 뒤다. 셋트는 나가면 표지로 돌아가고, 내면 가입을 권하는 끝 화면이
 * 선다. 회원은 나가면 응시 기회를 하나 쓰고, 내기 전에 제출 확인 창이 뜬다.
 *
 * 화면은 실제 응시 화면의 조각(components/exam/ExamSession.tsx · TrialSession.tsx)이고, 답 · 체크 ·
 * 설정만 주소마다 적어 두었다. 지금 문항의 체크 단추, 톱니바퀴, 설정 창의 고르기 · 「나가기」,
 * 「제출하기」, 확인 창의 단추가 다음 상태로 간다.
 */

type Kind = "trial" | "free" | "paid";

/** 갈래마다 굳힌 예시 — 몇 번째 화면에서, 앞의 고르는 문항 몇 개를 답했고, 무엇을 체크했나 */
type Plan = {
  id: string;
  subject: string;
  order: Question[];
  open: Question[];
  padList: Question[];
  screens: Question[][];
  at: number;
  answers: Record<string, number | string>;
  marks: string[];
  grouped: boolean;
  clock?: { remain: number; limitMin: number };
  /** 확인 창 · 나간 뒤 화면에 적는 이름 — 「수학」 · 「무료 진단」 */
  title: string;
};

/** 체크한 뒤 — 푼 문항 하나 · 건너뛴 문항 하나 · 지금 문항 */
function marksOf(open: Question[], answers: Plan["answers"], current: Question) {
  const done = open.filter((q) => isAnswered(q, answers[q.id]));
  const skipped = open
    .slice(0, open.indexOf(current))
    .filter((q) => !isAnswered(q, answers[q.id]));
  return [done[1], skipped[0], current].filter((q): q is Question => !!q).map((q) => q.id);
}

function plan(
  kind: Kind,
  base: Omit<Plan, "id" | "answers" | "marks"> & { answeredCount: number },
): Plan {
  const answers = answered(base.open, base.answeredCount);
  const current = base.screens[base.at][0];
  return { ...base, id: `cbt-${kind}`, answers, marks: marksOf(base.open, answers, current) };
}

/* /design의 응시 화면과 같은 자리에 선다 — 셋트 2번째 화면 · 무료 6번째 · 유료 8번째 */
const plans: Record<Kind, Plan> = {
  trial: plan("trial", {
    subject: subjectOf(TRIAL_SUBJECT)!.name,
    order: trialOrder,
    open: trialOpen,
    padList: trialOrder,
    screens: trialScreens,
    at: Math.min(1, trialScreens.length - 1),
    answeredCount: 1,
    grouped: false,
    title: subjectOf(TRIAL_SUBJECT)!.name,
  }),
  free: plan("free", {
    subject: subjects.map((x) => x.short).join(" · "),
    order: freeList,
    open: freeList,
    padList: freeList,
    screens: freeScreens,
    at: Math.min(5, freeScreens.length - 1),
    answeredCount: 6,
    grouped: true,
    clock: { remain: FREE_REMAIN, limitMin: FREE_LIMIT_MIN },
    title: FREE_TITLE,
  }),
  paid: plan("paid", {
    subject: paidMeta.name,
    order: paidList,
    open: paidList,
    padList: paidFull,
    screens: paidScreens,
    at: Math.min(7, paidScreens.length - 1),
    answeredCount: 8,
    grouped: false,
    clock: { remain: PAID_REMAIN, limitMin: paidMeta.limitMin },
    title: paidMeta.name,
  }),
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const clockText = (sec: number) => `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;

function Cbt({ kind, state }: { kind: Kind; state: string }) {
  const router = useRouter();
  const p = plans[kind];
  const to = designLinks(p.id);
  const go = (slug: string) => router.push(to(slug));
  const current = p.screens[p.at][0];

  /* ── 나간 뒤 ── */
  if (state === "left" && kind === "trial") {
    /* 셋트는 표지로 돌아온다 — 머리의 나가는 길은 「창 닫기」다 */
    return (
      <ExamFrame name={NAME} subject={null} closable>
        <TrialStart season={SEASON} watermark={watermarkOf(SEASON)} onStart={() => go("")} />
      </ExamFrame>
    );
  }
  if (state === "left" || state === "left/none") {
    return (
      <ExamFrame name={NAME} subject={p.subject}>
        <ForfeitedPanel
          title={p.title}
          attemptsLeft={state === "left" ? 1 : 0}
          onRestart={() => go("")}
          onClose={() => {}}
        />
      </ExamFrame>
    );
  }

  /* ── 응시 중 — 체크 없음 · 체크한 뒤 · 설정 창 · 크게와 미색 · 확인 창 · (셋트) 낸 뒤 ── */
  const marked = state !== "";
  const large = state === "large";
  const done = kind === "trial" && state === "done";

  return (
    <ExamFrame name={NAME} subject={p.subject} clock={p.clock}>
      <Sheet
        order={p.order}
        open={p.open}
        padList={p.padList}
        screens={p.screens}
        at={done ? p.screens.length : p.at}
        answers={p.answers}
        grouped={p.grouped}
        lastLabel={done ? undefined : "제출하기"}
        onSubmit={() => go(kind === "trial" ? "done" : "submit")}
        marks={marked ? p.marks : []}
        /* 지금 문항의 체크 단추가 두 상태를 오간다 */
        onMark={(q) => {
          if (q.id === current.id) go(marked ? "" : "marked");
        }}
        textScale={large ? "large" : "base"}
        paper={large ? "cream" : "white"}
        settings={
          <ExamSettings
            open={state === "settings"}
            onOpenChange={(open) => go(open ? "settings" : "marked")}
            scale={large ? "large" : "base"}
            onScale={(s) => s === "large" && go("large")}
            paper={large ? "cream" : "white"}
            onPaper={(v) => v === "cream" && go("large")}
            onExit={() => go("exit")}
          />
        }
        wall={done ? <Wall subjectName={p.title} offGrade={null} /> : undefined}
        next={
          done ? (
            <button type="button" className={navPrimary}>
              회원가입
            </button>
          ) : undefined
        }
      />

      {state === "submit" && (
        <SubmitDialog
          subjectName={p.title}
          unanswered={p.open.filter((q) => !isAnswered(q, p.answers[q.id])).length}
          onCancel={() => go("marked")}
          onConfirm={() => router.push(designLinks("cbt-reflect")())}
        />
      )}
      {state === "exit" &&
        (kind === "trial" ? (
          <ExitDialog subjectName={p.title} onStay={() => go("marked")} onLeave={() => go("left")} />
        ) : (
          <ForfeitDialog
            subjectName={p.title}
            remain={clockText(p.clock!.remain)}
            onCancel={() => go("marked")}
            onConfirm={() => go("left")}
          />
        ))}
    </ExamFrame>
  );
}

export function CbtTrial({ state }: { state: string }) {
  return <Cbt kind="trial" state={state} />;
}

export function CbtFree({ state }: { state: string }) {
  return <Cbt kind="free" state={state} />;
}

export function CbtPaid({ state }: { state: string }) {
  return <Cbt kind="paid" state={state} />;
}

/* ───────────────────────── 제출한 뒤 · 해석 작성 ───────────────────────── */

/**
 * 제출한 뒤의 해석 작성(자가성찰) — 회원 무료 · 유료 진단이 같다. 여기서는 유료 진단 수학으로 굳혔다
 * (위 「CBT · 회원 유료 진단」의 제출 확인 창에서 「제출하기」를 누른 뒤).
 *
 *   ""              제출 직후 · 해석을 쓸지 묻는 창
 *   again           「안 하기」를 누른 뒤 · 한 번 더 권함
 *   later           나중에 하기로 한 뒤
 *   write           해석 작성 · 고른 문항(1번) — 응시 화면과 같은 틀
 *   write/picked    이유를 고른 뒤 — 1번은 고르고 2 · 3번은 글로 남김
 *   write/blank     답하지 않은 문항 — 묻는 말과 고를 이유가 달라진다
 *   write/settings  화면 설정 창 — 맨 아래가 「나중에 이어서 하기」
 *   done            해석까지 낸 뒤
 */
const reflectPlan = plans.paid;
const reflectMarks = reflectPlan.marks;
const firstBlank = reflectPlan.open.find((q) => !isAnswered(q, reflectPlan.answers[q.id]));
const blankAt = Math.max(
  0,
  reflectPlan.screens.findIndex((sc) => !!firstBlank && sc.includes(firstBlank)),
);
const firstThree = reflectPlan.open.slice(0, 3);

export function CbtReflect({ state }: { state: string }) {
  const router = useRouter();
  const to = designLinks("cbt-reflect");
  const go = (slug: string) => router.push(to(slug));
  const p = reflectPlan;

  /* ── 해석 작성 전후 — 마친 자리와 묻는 창 ── */
  if (state === "" || state === "again" || state === "later" || state === "done") {
    return (
      <ExamFrame name={NAME} subject={p.subject}>
        <Submitted
          title={p.title}
          pending={state !== "done"}
          onReflect={state === "done" ? undefined : () => go("write")}
        />
        {(state === "" || state === "again") && (
          <ReflectAskDialog
            /* 주소가 바뀌면 창을 새로 연다 — 「한 번 더」는 주소가 정한다 */
            key={state}
            again={state === "again"}
            onDo={() => go("write")}
            onLater={() => go("later")}
          />
        )}
      </ExamFrame>
    );
  }

  /* ── 해석 작성 ── */
  const picked = state === "write/picked";
  const sheet: ReflectionSheet = {
    title: p.title,
    list: p.order,
    screens: p.screens,
    grouped: p.grouped,
    answers: p.answers,
    marks: reflectMarks,
    reflectionPicks: picked ? { [firstThree[0].id]: "c1" } : {},
    reflections: picked
      ? Object.fromEntries(
          firstThree.slice(1).map((q) => [q.id, "표에서 수가 두 배씩 늘어나는 것을 보고 썼어요."]),
        )
      : {},
    reflect: () => {},
    /* 고르면 「이유를 고른 뒤」로 */
    pick: () => {
      if (state === "write") go("write/picked");
    },
    finish: () => go("done"),
  };
  const view: ExamView = {
    scale: "base",
    setScale: () => {},
    paper: "white",
    setPaper: () => {},
    open: state === "write/settings",
    setOpen: (open) => go(open ? "write/settings" : "write"),
  };

  return (
    <ExamFrame name={NAME} subject={p.subject}>
      <ReflectionStep
        key={state}
        sheet={sheet}
        watermark={watermarkOf(SEASON)}
        onLater={() => go("later")}
        view={view}
        initialIndex={state === "write/blank" ? blankAt : 0}
      />
    </ExamFrame>
  );
}

/* ───────────────────────── 응시 전 점검 ───────────────────────── */

/**
 * 응시 전 점검 — 응시 창을 열면 표지(문항지 첫 장)보다 먼저 서는 다섯 단계(components/exam/ExamPrecheck.tsx).
 * 회원 무료 · 유료 진단이 같고, 셋트(비회원)는 제한 시간 · 응시 기회가 없어 안내 한 줄과 마지막 확인
 * 두 줄이 다르다(trial · trial/confirm). 상태마다 단계와 점검 결과를 적어 두었고, 그 뒤로는 실제처럼
 * 눌러 볼 수 있다(저장되지 않는다).
 */
const precheckStates: Record<string, Partial<PrecheckState>> = {
  "": { step: 0 },
  listen: { step: 1 },
  "listen/ok": { step: 1, listen: "ok" },
  "listen/no": { step: 1, listen: "no" },
  speak: { step: 2, listen: "ok" },
  "speak/listening": { step: 2, listen: "ok", speak: "listening" },
  "speak/ok": { step: 2, listen: "ok", speak: "ok", heard: PRECHECK_SENTENCE.replace(".", "") },
  "speak/error": {
    step: 2,
    listen: "ok",
    speak: "error",
    error: "마이크 사용이 차단되어 있습니다. 주소창 왼쪽의 마이크 권한을 허용한 뒤 다시 눌러 주세요.",
  },
  "speak/unsupported": { step: 2, listen: "ok", speak: "unsupported" },
  guide: { step: 3, listen: "ok", speak: "ok" },
  confirm: { step: 4, listen: "ok", speak: "ok", checks: [true, true, false, false, false] },
  "confirm/done": { step: 4, listen: "ok", speak: "ok", checks: [true, true, true, true, true] },
  trial: { step: 0 },
  "trial/confirm": { step: 4, listen: "ok", speak: "ok", checks: [true, true, false, false, false] },
};

export function CbtPrecheck({ state }: { state: string }) {
  const router = useRouter();
  const trial = state.startsWith("trial");
  const p = plans[trial ? "trial" : "paid"];
  /* 마치거나 건너뛰면 표지(문항지 첫 장)로 간다 */
  const next = () =>
    router.push(trial ? designLinks("cbt-trial")("left") : designLinks("cbt-cover")());
  return (
    <ExamFrame name={NAME} subject={trial ? null : p.subject} closable>
      <ExamPrecheck
        key={state}
        limitText={trial ? null : `${paidMeta.limitMin}분`}
        initial={precheckStates[state] ?? {}}
        onDone={next}
        onSkip={next}
      />
    </ExamFrame>
  );
}

/* ───────────────────────── 회원 표지 ───────────────────────── */

/**
 * 회원 응시의 표지(문항지 첫 장) — 응시 전 점검을 마치거나 건너뛰면 선다. 「진단 시작」을 눌러야 전체화면으로
 * 바뀌고 시간이 흐른다. 유료 진단은 과목 차례가 교시(수학 제2교시), 무료 진단은 늘 제1교시이고 과목 칸 대신
 * 「무료 응시」 한 칸이다. 학생은 학생 대시보드 디자인의 예시(이서준 · 초등 4학년)와 같다.
 */
export function CbtCover({ state }: { state: string }) {
  const router = useRouter();
  const free = state === "free";
  const p = plans[free ? "free" : "paid"];
  return (
    <ExamFrame name={NAME} subject={p.subject} closable>
      <StartCover
        subject={free ? null : "math"}
        title={p.title}
        season={SEASON}
        grade={flowStudent.grade}
        student={{ name: flowStudent.name, code: flowStudent.code }}
        note={
          free
            ? subjects.map((x) => x.short + " " + tierQuestions("free", x.id).length).join(" · ") +
              "문항을 한 번에 이어서 풉니다. 과목을 따로 고르지 않습니다."
            : null
        }
        onStart={() => router.push(designLinks(free ? "cbt-free" : "cbt-paid")())}
      />
    </ExamFrame>
  );
}
