"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import {
  answerText,
  blankFilled,
  FREE_LIMIT_MIN,
  SUBJECT_IDS,
  examOrderOf,
  freeOrder,
  joinBlanks,
  screensOf,
  subjects,
  tierQuestions,
  SLOT,
  slotValues,
  splitBlanks,
  subjectOf,
  type Blank,
  type Block,
  type Brief,
  type Figure,
  type Question,
  type SubjectId,
  type Table,
} from "@/lib/exam";
import {
  finishFreeReflection,
  finishReflection,
  forfeitFree,
  forfeitSubject,
  restartFree,
  restartSubject,
  reflectionReasons,
  setAnswer,
  setReflection,
  setReflectionPick,
  startFree,
  startSubject,
  submitFree,
  submitSubject,
  useExamRecord,
  useHydrated,
  type ExamRecord,
  type ExamStatus,
} from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { renderDetail } from "@/lib/richText";
import { useExamConfig } from "@/lib/roundStore";
import { enterFullscreen, leaveFullscreen, useExamExitRequest } from "@/lib/fullscreen";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { btnDanger, btnDisabled, btnGhost, btnPrimary, eyebrow, panel } from "./ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 응답으로 인정되는지 — 객관식은 선택, 괄호 칸은 모든 칸, 서술형은 최소 글자 수 */
export function isAnswered(q: Question, value: number | string | undefined) {
  if (value === undefined) return false;
  if (q.type === "choice") return typeof value === "number";
  if (q.blanks) {
    const values = splitBlanks(value, q.blanks.length);
    return q.blanks.every((b, i) => blankFilled(b, values[i]));
  }
  return typeof value === "string" && value.trim().length >= (q.minLength ?? 1);
}

/**
 * 응시 한 판이 보는 범위 — **과목 하나**이거나 **무료시험 전체**다.
 *
 * 유료시험은 과목마다 따로 들어간다(과목당 40분이 과목을 갈라 놓는 근거다). 무료시험은
 * 과목을 고르지 않고 20문항을 한 번에 이어서 푼다 — 절차가 그것을 시험 하나로 적고 있다.
 *
 * 둘이 화면을 나눠 쓰는 까닭은 아이가 보는 것이 같아서다. 왼쪽 자료 · 가운데 문제 ·
 * 오른쪽 문항 이동판 · 시계 · 제출 · 해석 작성이 모두 그대로다. 다른 것은 **무엇을 한 판으로
 * 세는가**뿐이라, 그 셈만 아래 Sheet로 모으고 화면은 하나로 둔다.
 */
export type ExamScope = { kind: "subject"; subject: SubjectId } | { kind: "free" };

/**
 * 한 판의 상태와 손잡이.
 *
 * 저장은 그대로 과목마다 나뉘어 있다(lib/examStore.ts). 무료시험은 그 셋을 하나로 합쳐
 * 읽고, 고칠 때는 셋을 한 번에 움직인다 — 국어만 제출되고 수학은 미시작으로 남는 상태가
 * 생기면 아이는 한 번 낸 시험이 왜 반만 끝났는지 알 수 없다.
 */
type Sheet = {
  /** 화면 머리에 적는 이름 — 「수학」 · 「무료시험」 */
  title: string;
  /** 지금 열린 문항 — 푸는 차례대로 */
  list: Question[];
  /** 갈래를 올리면 열릴 문항까지 — 문항 이동판이 점선으로 세운다 */
  full: Question[];
  /** 한 화면에 함께 서는 문항 묶음 */
  screens: Question[][];
  /** 문항 이동판을 과목으로 갈라 세울까 — 과목이 섞인 판(무료시험)만 그렇다 */
  grouped: boolean;
  answers: Record<string, number | string>;
  reflections: Record<string, string>;
  reflectionPicks: Record<string, string>;
  status: ExamStatus;
  startedAt: string | null;
  reflectionAt: string | null;
  attemptsLeft: number;
  limitMin: number;
  /** 이번 회차에서 빠진 판인가 — 무료시험은 과목을 통째로 보므로 늘 false다 */
  disabled: boolean;
  start: () => void;
  submit: () => void;
  forfeit: () => void;
  restart: () => void;
  answer: (q: Question, v: number | string) => void;
  reflect: (q: Question, text: string) => void;
  pick: (q: Question, reasonId: string | null) => void;
  finish: () => void;
};

/** 여럿을 하나로 접을 때 — 하나라도 있으면 그것, 없으면 기본값 */
function foldStatus(list: ExamStatus[]): ExamStatus {
  if (list.every((s) => s === "submitted")) return "submitted";
  if (list.some((s) => s === "forfeited")) return "forfeited";
  if (list.some((s) => s === "in-progress")) return "in-progress";
  return "ready";
}

function useSheet(studentId: string, scope: ExamScope, record: ExamRecord): Sheet {
  const config = useExamConfig();

  if (scope.kind === "free") {
    const list = freeOrder();
    const recs = SUBJECT_IDS.map((id) => record.subjects[id]);
    const merge = <T,>(pick: (r: (typeof recs)[number]) => Record<string, T>) =>
      Object.assign({}, ...recs.map(pick)) as Record<string, T>;
    /* 과목 차례대로 화면을 잇는다 — 번호는 1부터 20까지 죽 이어진다 */
    const screens = SUBJECT_IDS.flatMap((id) =>
      screensOf(id)
        .map((sc) => sc.filter((q) => list.includes(q)))
        .filter((sc) => sc.length > 0),
    );
    return {
      title: "무료시험",
      list,
      grouped: true,
      /* 무료시험에서 잠긴 문항은 유료시험이 여는 것이다 — 세 과목을 모두 늘어놓는다 */
      full: SUBJECT_IDS.flatMap((id) => examOrderOf(id)),
      screens,
      answers: merge((r) => r.answers),
      reflections: merge((r) => r.reflections),
      reflectionPicks: merge((r) => r.reflectionPicks),
      status: foldStatus(recs.map((r) => r.status)),
      startedAt: recs.map((r) => r.startedAt).find(Boolean) ?? null,
      /* 셋이 다 끝나야 해석이 끝난 것이다 */
      reflectionAt: recs.every((r) => r.reflectionAt) ? recs[0].reflectionAt : null,
      attemptsLeft: Math.min(...recs.map((r) => r.attemptsLeft)),
      limitMin: recs[0].limitMin ?? FREE_LIMIT_MIN,
      disabled: false,
      start: () => startFree(studentId, FREE_LIMIT_MIN),
      submit: () => submitFree(studentId),
      forfeit: () => forfeitFree(studentId),
      restart: () => restartFree(studentId),
      answer: (q, v) => setAnswer(studentId, q.subject, q.id, v),
      reflect: (q, text) => setReflection(studentId, q.subject, q.id, text),
      pick: (q, reasonId) => setReflectionPick(studentId, q.subject, q.id, reasonId),
      finish: () => finishFreeReflection(studentId),
    };
  }

  const subject = scope.subject;
  const rec = record.subjects[subject];
  const list = tierQuestions(record.tier, subject, record.setSubject);
  return {
    title: subjectOf(subject)!.name,
    list,
    grouped: false,
    full: examOrderOf(subject),
    screens: screensOf(subject)
      .map((sc) => sc.filter((q) => list.includes(q)))
      .filter((sc) => sc.length > 0),
    answers: rec.answers,
    reflections: rec.reflections,
    reflectionPicks: rec.reflectionPicks,
    status: rec.status,
    startedAt: rec.startedAt,
    reflectionAt: rec.reflectionAt,
    attemptsLeft: rec.attemptsLeft,
    limitMin: rec.limitMin ?? config.limits[subject],
    disabled: !config.enabled[subject],
    start: () => startSubject(studentId, subject),
    submit: () => submitSubject(studentId, subject),
    forfeit: () => forfeitSubject(studentId, subject),
    restart: () => restartSubject(studentId, subject),
    answer: (q, v) => setAnswer(studentId, subject, q.id, v),
    reflect: (q, text) => setReflection(studentId, subject, q.id, text),
    pick: (q, reasonId) => setReflectionPick(studentId, subject, q.id, reasonId),
    finish: () => finishReflection(studentId, subject),
  };
}

export default function ExamSession({ scope }: { scope: ExamScope }) {
  const hydrated = useHydrated();
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const config = useExamConfig();
  /** 지금 푸는 문제의 차례(0부터) — 한 화면에 문제 하나 */
  const [index, setIndex] = useState(0);
  const [askForfeit, setAskForfeit] = useState(false);
  const [askSubmit, setAskSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** 안내 화면을 지나 실제 응시를 시작했는지 */
  const [entered, setEntered] = useState(false);

  /**
   * 이 판이 여는 문항과 손잡이 — 과목 하나이거나 무료시험 스물이다.
   *
   * 문항 은행 전체를 세지 않는다. 무료시험을 보는 아이에게 「총 50문항」이라 적고 20문항만
   * 열면 시험이 끊긴 것으로 읽히고, 제출도 영원히 막힌다 — 아래 셈이 모두 이 목록을 센다.
   */
  const sheet = useSheet(studentId, scope, record);
  const { list, full } = sheet;
  const running = sheet.status === "ready" || sheet.status === "in-progress";

  /**
   * 제한 시간은 **시작할 때의 값**을 쓴다.
   *
   * 회차 설정(ADM-05)에서 관리자가 도중에 시간을 줄여도 지금 풀고 있는 아이의 시계는
   * 줄지 않는다. 아직 시작하지 않았으면 지금 설정을 그대로 보여 준다.
   */
  const limitMin = sheet.limitMin;
  const startedAt = sheet.startedAt;

  useEffect(() => {
    if (!running || !entered) return;
    const tick = () => {
      const started = startedAt ? new Date(startedAt).getTime() : Date.now();
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, entered, startedAt]);

  /**
   * 시간이 다 되면 자동 제출.
   *
   * 마무리 시간을 함께 두는 까닭은 서술형 때문이다. 문장 한가운데서 잘린 답은
   * 채점자가 무슨 말인지 읽을 수 없고, 그러면 그 아이는 쓸 줄 몰라서가 아니라
   * 시계 때문에 낮은 값을 받는다.
   */
  const autoSubmit = sheet.submit;
  useEffect(() => {
    if (!running || !entered || !config.autoSubmit) return;
    if (elapsed < (limitMin + config.graceMin) * 60) return;
    autoSubmit();
  }, [running, entered, elapsed, limitMin, config.autoSubmit, config.graceMin, autoSubmit]);

  /* ESC · 헤더의 「포기하기」 · 전체화면 해제 — 모두 포기할지 묻는다 */
  useExamExitRequest(running && entered, () => setAskForfeit(true));

  if (!hydrated) {
    return (
      <div className="container-x py-20 text-center text-[13px] text-exam-muted">
        응시 정보를 불러오는 중입니다…
      </div>
    );
  }

  // 제출 후 → 문항별 해석 작성 → 완료
  if (sheet.status === "submitted") {
    return sheet.reflectionAt ? <Submitted title={sheet.title} /> : <ReflectionStep sheet={sheet} />;
  }
  if (sheet.status === "forfeited") return <Forfeited sheet={sheet} />;

  /* 이번 회차에서 뺀 과목 — 주소를 직접 쳐서 들어오는 길도 막는다. 다만 이미 시작한
     아이는 그대로 마치게 둔다. 중간에 문이 닫히면 그 아이의 답은 갈 곳이 없다. */
  if (sheet.disabled && !sheet.startedAt) {
    return (
      <div className="container-x flex min-h-full items-center py-10">
        <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
          <p className={eyebrow}>응시 안내</p>
          <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
            {sheet.title}은 이번 회차에 보지 않습니다
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
            이번 회차의 응시 과목에서 빠져 있습니다. 지금까지 본 과목의 기록은 그대로 남아 있습니다.
          </p>
          <Link href="/exam" className={`mt-8 ${btnPrimary}`}>
            응시 현황으로 돌아가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 응시 전 안내 화면 (전체화면 진입 지점)
  if (!entered) {
    return (
      <StartGate
        title={sheet.title}
        count={list.length}
        limitMin={limitMin}
        note={
          scope.kind === "free"
            ? subjects.map((x) => x.short + " " + tierQuestions("free", x.id).length).join(" · ") +
              "문항을 한 번에 이어서 풉니다. 과목을 따로 고르지 않습니다."
            : null
        }
        onStart={async () => {
          await enterFullscreen();
          sheet.start();
          setEntered(true);
        }}
      />
    );
  }

  /* 넘기는 단위는 **화면**이다 — 기본은 문제 하나, 세트 안의 작은 묶음(group)이면 그
     문제들이 함께 선다. 세트면 왼쪽 자료는 그대로 둔 채 오른쪽만 바뀐다 */
  const order = list;
  const screens = sheet.screens;
  const screen = screens[Math.min(index, screens.length - 1)];
  const question = screen[0];
  const doneCount = list.filter((q) => isAnswered(q, sheet.answers[q.id])).length;
  const remain = Math.max(0, limitMin * 60 - elapsed);
  const isLast = index === screens.length - 1;
  const unanswered = list.length - doneCount;
  const goTo = (q: Question) => setIndex(screens.findIndex((sc) => sc.includes(q)));

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* 문항 머리 — 과목과 지금 문제 번호. S위계는 보이지 않는다 */}
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{sheet.title}</p>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              {/* 무료시험은 과목이 섞여 있어, 지금 푸는 문항의 과목을 함께 적는다 */}
              {scope.kind === "free" && subjectOf(question.subject)!.short + " · "}총 {order.length}
              문항 · 제한 {limitMin}분
            </span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {numbersText(order, screen)} / {order.length}
          </p>
        </div>
      </div>

      {/* 본문 — 좌: 자료(보기) / 가운데: 문제 / 우: 문항 이동판 */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_14rem] lg:overflow-hidden">
        <BriefPanel brief={question.brief} range={setRange(order, question)} />

        <ScreenColumn
          order={order}
          screen={screen}
          renderQuestion={(q) => (
            <QuestionBody
              key={q.id}
              q={q}
              num={order.indexOf(q) + 1}
              value={sheet.answers[q.id]}
              onAnswer={(v) => sheet.answer(q, v)}
            />
          )}
        />

        <QuestionPad
          /**
           * 번호판에 무엇을 늘어놓을까.
           *
           * 과목 하나를 볼 때는 잠긴 문항까지 세운다 — 열린 것이 앞에서부터라 번호가 1부터
           * 죽 이어지고, 점선 번호가 「더 있다」를 말해 준다.
           *
           * 무료시험은 열린 것만 세운다. 국어 앞 4 · 수학 앞 8 · 과학 앞 8이라 잠긴 문항이
           * 사이사이에 끼고, 그것까지 늘어놓으면 스무 문항을 푸는 아이가 40번까지 붙은
           * 번호판을 보게 된다 — 머리의 「문항 3 / 20」과 번호판이 서로 다른 말을 한다.
           */
          list={scope.kind === "free" ? order : full}
          /* 무료시험은 과목이 섞여 있어 번호판을 과목으로 갈라 세운다 */
          grouped={sheet.grouped}
          /* 세트면 같은 자료를 읽는 문제들이 「함께 서 있는 것」이다 — 지금 오른쪽에 선
             문제는 isCurrent가 따로 말한다 */
          isHere={(q) => q.setId === question.setId && order.includes(q)}
          isCurrent={(q) => screen.includes(q)}
          isDone={(q) => order.includes(q) && isAnswered(q, sheet.answers[q.id])}
          isLocked={(q) => !order.includes(q)}
          onPick={(q) => {
            if (order.includes(q)) goTo(q);
          }}
          doneLabel="답한 문항"
          doneVerb="응답함"
          footnote={
            /* 무료시험을 보는 아이에게 남은 문항을 숨기지 않는다. 다만 지금 풀 수 없다는
               것을 점선과 이 줄로 함께 말한다 */
            record.tier === "paid" || full.length === order.length
              ? undefined
              : scope.kind === "free"
                ? "유료시험으로 접수하면 과목마다 문항이 더 열립니다."
                : "점선 번호는 유료시험으로 접수하면 풀 수 있습니다."
          }
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          {/* 포기하기는 헤더 오른쪽 위에 있다(ExamStatusBar) — ESC도 같은 물음을 연다 */}
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>

            {isLast ? (
              <button type="button" onClick={() => setAskSubmit(true)} className={btnPrimary}>
                제출하기
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(screens.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {askForfeit && (
        <ForfeitDialog
          subjectName={sheet.title}
          remain={`${pad(Math.floor(remain / 60))}:${pad(remain % 60)}`}
          onCancel={() => {
            /* 전체화면이 꺼진 채 물었으면 이 클릭 안에서 다시 들어간다 */
            enterFullscreen();
            setAskForfeit(false);
          }}
          onConfirm={() => sheet.forfeit()}
        />
      )}

      {askSubmit && (
        <SubmitDialog
          subjectName={sheet.title}
          unanswered={unanswered}
          onCancel={() => setAskSubmit(false)}
          onConfirm={() => {
            sheet.submit();
            setAskSubmit(false);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── 문항 이동판 ───────────────────────── */

/**
 * 오른쪽에 붙는 문항 이동판.
 *
 * 문항이 열 개가 되면 「이전·다음」만으로는 6번에서 2번으로 돌아갈 수가 없다. 번호를
 * 늘어놓아 아무 데나 바로 갈 수 있게 했다. S위계로 묶지 않는다 — 위계는 채점과 리포트가
 * 읽는 축이지 학생에게 보일 이름이 아니다.
 *
 * 응답 여부를 색으로만 알리지 않는다. 채운 문항은 번호가 진해지고 밑에 짧은 줄이
 * 그어진다. 색을 못 보는 아이도 같은 정보를 얻어야 한다.
 */
export function QuestionPad({
  list,
  grouped = false,
  isHere,
  isCurrent,
  isDone,
  isLocked = () => false,
  onPick,
  doneLabel,
  doneVerb,
  footnote,
}: {
  /** 판에 늘어놓을 문항 — 잠긴 것까지 모두. 푸는 차례 그대로다 */
  list: Question[];
  /**
   * 번호를 과목으로 갈라 세울까.
   *
   * 무료시험은 국어 4 · 수학 8 · 과학 8이 한 판에 섞여 있다. 번호만 스물을 늘어놓으면
   * 13번이 어느 과목인지 알 수 없어, 「과학은 아직 손도 안 댔다」를 눈으로 셀 수 없다.
   * 번호는 1부터 끝까지 이어 붙이고 머리글만 갈라 둔다.
   */
  grouped?: boolean;
  /**
   * 지금 화면에 서 있는 문항인가.
   *
   * 번호(index)를 받던 것을 바꿨다. 응시 화면은 **쪽** 단위로 넘어가고(세트면 한 쪽에
   * 문항이 여럿) 해석 화면은 여전히 문항 단위라, 같은 번호가 두 화면에서 다른 것을
   * 가리키게 되었다. 「이 문항이 지금 보이는가」만 물으면 두 화면이 같은 판을 쓴다.
   */
  isHere: (q: Question) => boolean;
  /** 그중에서도 지금 짚고 있는 하나 — 낭독기에 「현재 단계」로 읽히는 자리 */
  isCurrent: (q: Question) => boolean;
  /** 이 문항을 채웠는가 — 응시 때는 「답했는가」, 해석 때는 「해석을 적었는가」 */
  isDone: (q: Question) => boolean;
  /** 지금 갈래에서 아직 열리지 않은 문항 — 점선 테두리로 세운다 */
  isLocked?: (q: Question) => boolean;
  onPick: (q: Question) => void;
  doneLabel: string;
  doneVerb: string;
  /** 판 맨 아래 안내 — 없으면 두지 않는다 */
  footnote?: string;
}) {
  /**
   * 셈은 **열린 문항만** 센다.
   *
   * 번호판에는 잠긴 문항까지 늘어놓는다 — 지금 풀 수 없는 것도 있다는 사실을 숨기지 않기
   * 위해서다. 그런데 「답한 문항 0 / 20」이라 적으면 셋트 4문항을 다 푼 아이도 한참 남은
   * 것으로 읽는다. 세는 것과 보이는 것은 다른 층이다.
   */
  const open = list.filter((q) => !isLocked(q));
  const doneCount = open.filter(isDone).length;

  return (
    <aside
      aria-label="문항 이동"
      className="order-1 border-b border-exam-line bg-exam-panel px-6 py-5 lg:order-3 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:px-5 lg:py-7"
    >
      <p className="text-[12px] font-semibold tracking-[0.06em] text-exam-muted">문항 이동</p>

      <div className="mt-4 space-y-4">
        {/* 과목으로 가르지 않으면 묶음 하나에 전부 담긴다 — 아래 그리는 코드는 하나다 */}
        {(grouped
          ? subjects.flatMap((sub) => {
              const items = list.filter((q) => q.subject === sub.id);
              return items.length > 0 ? [{ label: sub.short, items }] : [];
            })
          : [{ label: null as string | null, items: list }]
        ).map((group) => (
          <div key={group.label ?? "all"}>
            {group.label && (
              <p className="mb-2 text-[11px] font-bold tracking-[0.06em] text-exam-muted">
                {group.label}
              </p>
            )}
            <ol className="flex flex-wrap gap-1.5">
              {group.items.map((q) => {
            const i = list.indexOf(q);
            const ok = isDone(q);
            const here = isHere(q);
            const current = isCurrent(q);
            const lockedHere = isLocked(q);
            const state = lockedHere
              ? "회원가입 후 열림"
              : ok
                ? doneVerb
                : "아직 " + doneVerb.replace("함", "하지 않음");
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onPick(q)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`문항 ${i + 1} ${state}`}
                  title={`문항 ${i + 1} · ${kindLabel(q)} · ${state}`}
                  className={`flex h-9 w-9 flex-col items-center justify-center rounded-[6px] border text-[13px] tabular-nums transition-colors ${
                    current
                      ? "border-exam-text bg-exam-text font-bold text-white"
                      : lockedHere
                        ? "border-dashed border-exam-line font-medium text-exam-muted/60 hover:bg-exam-raised"
                        : here
                          ? /* 같은 쪽에 함께 서 있는 문항 — 지금 보이지만 짚은 것은 아니다 */
                            "border-exam-text font-bold text-exam-text hover:bg-exam-raised"
                          : ok
                            ? "border-exam-muted font-bold text-exam-text hover:bg-exam-raised"
                            : "border-exam-line font-medium text-exam-muted hover:bg-exam-raised"
                  }`}
                >
                  {i + 1}
                  {/* 응답 표시 — 색이 아니라 형태로도 남긴다 */}
                  <span
                    aria-hidden
                    className={`mt-0.5 h-px w-3.5 ${
                      ok ? (current ? "bg-white" : "bg-exam-text") : "bg-transparent"
                    }`}
                  />
                </button>
              </li>
            );
              })}
            </ol>
          </div>
        ))}
      </div>

      <dl className="mt-6 border-t border-exam-line pt-4 text-[12px]">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">{doneLabel}</dt>
          <dd className="font-semibold tabular-nums text-exam-text">
            {doneCount} / {open.length}
          </dd>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">남은 문항</dt>
          <dd className="font-semibold tabular-nums text-exam-text">{open.length - doneCount}</dd>
        </div>
      </dl>

      {footnote && <p className="mt-4 text-[11px] leading-relaxed text-exam-muted">{footnote}</p>}
    </aside>
  );
}

/* ───────────────────────── 응시 전 안내 ───────────────────────── */

/** 응시 전 안내 — 문항 수는 **이 판에 열린 수**를 적는다(갈래가 정한다) */
function StartGate({
  title,
  count,
  limitMin,
  note,
  onStart,
}: {
  title: string;
  count: number;
  limitMin: number;
  /** 무료시험처럼 과목이 섞인 판에서 무엇을 어떻게 푸는지 한 줄 더 적는다 */
  note?: string | null;
  onStart: () => void;
}) {
  const config = useExamConfig();
  return (
    <div className="container-x flex min-h-full items-center py-10">
      <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
        <p className={eyebrow}>응시 안내</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
          {title} 평가를 시작합니다
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          시작 버튼을 누르면 <b className="text-exam-text">전체화면</b>으로 전환되고 제한 시간이
          흐르기 시작합니다.
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-exam-line pt-6 text-[13px] leading-relaxed text-exam-muted">
          {note && <li>· {note}</li>}
          <li>
            · 문항 <b className="text-exam-text">{count}개</b> · 제한 시간{" "}
            <b className="text-exam-text">{limitMin}분</b> (남은 시간은 오른쪽 위에 표시됩니다)
          </li>
          <li>
            {config.autoSubmit
              ? `· 시간이 다 되면 ${config.graceMin > 0 ? `${config.graceMin}분 뒤에 ` : ""}쓰던 답 그대로 자동으로 제출됩니다.`
              : "· 시간이 다 되어도 답을 계속 쓸 수 있습니다. 다만 걸린 시간은 기록에 남습니다."}
          </li>
          <li>· 답을 고르지 않아도 다음 문항으로 넘어갈 수 있습니다.</li>
          <li>· 제출 후에는 문항마다 왜 그렇게 답했는지 적는 단계가 이어집니다.</li>
          <li>· 중간에 포기하면 이 과목의 응시 기회가 사라집니다.</li>
          <li>· 보호자는 문제 풀이에 개입할 수 없습니다.</li>
        </ul>

        <button
          type="button"
          onClick={onStart}
          className={`mt-8 w-full py-4 text-[16px] ${btnPrimary}`}
        >
          전체화면으로 평가 시작
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-2.5 text-center text-[11px] text-exam-muted">
          브라우저가 전체화면을 막는 경우에는 일반 창으로 진행됩니다.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── 제출 후 해석 작성 ───────────────────────── */

/**
 * 제출 후 해석 작성.
 *
 * 응시 화면과 같은 틀을 쓴다 — 왼쪽에 자료, 가운데에 문항, 오른쪽에 이동판. 다른
 * 화면으로 옮겨 가면 아이는 시험이 한 번 더 시작되는 줄 알고, 방금 무엇을 보고 답했는지
 * 다시 찾아야 한다. 지문이 그대로 옆에 있어야 "그때 무엇을 보고 그렇게 생각했는지"를
 * 쓸 수 있다.
 *
 * 답안은 이미 제출되어 고칠 수 없다. 고른 보기는 그대로 보여 주되 입력은 잠그고,
 * 그 아래에 칸 하나가 새로 열린다 — 왜 그 답을 골랐는지.
 *
 * 정답은 알려 주지 않는다. 맞았는지 틀렸는지를 먼저 알려 주면 아이는 자기 생각을 적는
 * 대신 오답 노트를 쓴다. 여기서 받고 싶은 것은 채점 결과가 아니라 그때의 생각이다.
 */
function ReflectionStep({ sheet }: { sheet: Sheet }) {
  /* 응시 때와 같은 차례·같은 번호로 되짚는다 — 판이 열지 않은 문항은 풀지 않았으므로 없다 */
  const list = sheet.list;
  const [index, setIndex] = useState(0);
  const [warn, setWarn] = useState(false);

  const question = list[index];
  /* 고르기만 해도, 쓰기만 해도, 둘 다 해도 된다. 쓰기가 어려운 것과 할 말이 없는
     것은 다른데, 글만 받으면 둘이 똑같이 빈칸으로 남는다. */
  const written = (q: Question) =>
    Boolean(sheet.reflectionPicks[q.id]) || (sheet.reflections[q.id] ?? "").trim().length >= 5;
  const writtenCount = list.filter(written).length;
  const complete = writtenCount === list.length;
  const isLast = index === list.length - 1;

  const value = sheet.answers[question.id];
  const picked = question.type === "choice" && typeof value === "number" ? value : null;
  const essayText = question.type === "essay" ? answerText(question, value) : "";
  const blank = question.type === "choice" ? picked === null : essayText.length === 0;
  const text = sheet.reflections[question.id] ?? "";
  /* 물음이 셋으로 갈린다 — 못 낸 답 / 고른 답 / 쓴 답 */
  const kind = blank ? "blank" : question.type === "choice" ? "choice" : "essay";
  const reasons = reflectionReasons[kind];
  const pick = sheet.reflectionPicks[question.id];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{sheet.title}</p>
            <span className="text-[12px] text-exam-muted">제출 완료 · 해석 작성</span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            문항 {index + 1} / {list.length}
          </p>
        </div>
      </div>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_14rem] lg:overflow-hidden">
        {/* 왼쪽 — 응시 때 보던 자료를 그대로 둔다 */}
        <BriefPanel brief={question.brief} range={setRange(list, question)} />

        {/* 가운데 — 문항과 내가 낸 답, 그 아래 새로 열리는 칸 하나 */}
        <section className="order-3 px-6 py-7 lg:order-2 lg:overflow-y-auto lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
            <p className="font-myeongjo text-[15px] font-bold text-exam-text">
              문항 <span className="tabular-nums">{index + 1}</span>
              <span className="ml-1.5 font-medium text-exam-muted">({kindLabel(question)})</span>
            </p>
            <p className="text-[12px] font-medium text-exam-muted">제출완료 · 수정 불가</p>
          </div>

          <h1 className="font-myeongjo mt-4 whitespace-pre-line text-[16px] font-semibold leading-[1.8] text-exam-text">
            <WithBlanks text={question.stem} />
          </h1>

          {/* 낸 답 — 응시 때와 같은 모양으로 두되 잠근다. 상자 없이 고른 번호만 검게 남는다 */}
          {question.type === "choice" ? (
            <ul className="-mx-3 mt-6">
              {question.choices?.map((c, i) => {
                const on = picked === i;
                return (
                  <li
                    key={c}
                    className={`flex items-start gap-3.5 px-3 py-3 ${on ? "" : "opacity-60"}`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                        on
                          ? "border-exam-text bg-exam-text text-white"
                          : "border-exam-line text-exam-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[15px] leading-[1.7] ${
                        on ? "font-semibold text-exam-text" : "text-exam-muted"
                      }`}
                    >
                      {c}
                    </span>
                    {on && (
                      <span className="ml-auto shrink-0 self-center text-[12px] font-semibold text-exam-text">
                        내가 고른 답
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-7">
              <p className="text-[12px] font-semibold text-exam-muted">내가 쓴 답</p>
              <p className="mt-2 min-h-[6rem] whitespace-pre-line rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text">
                {essayText || <span className="text-exam-muted">답을 작성하지 않았습니다.</span>}
              </p>
            </div>
          )}

          {blank && question.type === "choice" && (
            <p className="mt-3 text-[13px] font-semibold text-exam-text">
              이 문항은 답을 고르지 않으셨습니다.
            </p>
          )}

          {/* 새로 열리는 칸 — 고르기가 먼저, 쓰기가 그다음 */}
          <div className="mt-8 border-t border-exam-line pt-6">
            <p className="text-[15px] font-bold text-exam-text">
              {blank
                ? "왜 풀지 못했는지 알려 주세요"
                : picked !== null
                  ? `${picked + 1}번을 고른 까닭을 알려 주세요`
                  : "왜 그렇게 썼는지 알려 주세요"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-exam-muted">
              가까운 것을 하나 고르거나, 아래에 직접 써도 됩니다. 둘 다 해도 좋습니다.
            </p>

            {/* 답 고르기와 같은 모양 — 상자 없이 고른 번호만 칠한다 */}
            <ul className="mt-3 -mx-3">
              {reasons.map((r, n) => {
                const on = pick === r.id;
                return (
                  <li key={r.id}>
                    <label className="group relative flex cursor-pointer items-center gap-3.5 rounded-[6px] px-3 py-3 transition-colors hover:bg-exam-raised has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                      <input
                        type="radio"
                        name={`reason-${question.id}`}
                        checked={on}
                        /* 같은 것을 다시 누르면 지워진다 — 잘못 골랐을 때
                           되돌릴 길이 없으면 아이는 거기서 멈춘다 */
                        onClick={() =>
                          sheet.pick(question, on ? null : r.id)
                        }
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums transition-colors ${
                          on
                            ? "border-exam-text bg-exam-text text-white"
                            : "border-exam-line text-exam-muted group-hover:border-exam-muted"
                        }`}
                      >
                        {n + 1}
                      </span>
                      <span
                        className={`text-[15px] leading-[1.7] ${
                          on ? "font-semibold text-exam-text" : "text-exam-text/90"
                        }`}
                      >
                        {r.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <label
              htmlFor={`ref-${question.id}`}
              className="mt-6 block text-[13px] font-bold text-exam-text"
            >
              더 하고 싶은 말이 있으면 써 주세요{" "}
              <span className="font-medium text-exam-muted">(안 써도 괜찮아요)</span>
            </label>
            <textarea
              id={`ref-${question.id}`}
              rows={4}
              value={text}
              onChange={(e) => {
                setWarn(false);
                sheet.reflect(question, e.target.value);
              }}
              placeholder={
                blank
                  ? "예) 표에서 무엇을 빼야 하는지 몰라서 못 풀었습니다."
                  : "예) 지문에 '씨앗이 자랐는지 보려고'라는 말이 있어서 2번을 골랐습니다."
              }
              className="mt-3 w-full rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-exam-text"
            />
            <p className="mt-2 flex items-center justify-between gap-3 text-[12px] tabular-nums text-exam-muted">
              <span>맞고 틀리고를 보는 칸이 아닙니다. 점수에 반영되지 않습니다.</span>
              <span>
                {written(question)
                  ? "다 되었습니다"
                  : `${text.trim().length}자 · 고르거나 5자 이상`}
              </span>
            </p>
          </div>
        </section>

        <QuestionPad
          list={list}
          grouped={sheet.grouped}
          isHere={(q) => q.id === question.id}
          isCurrent={(q) => q.id === question.id}
          isDone={written}
          onPick={(q) => setIndex(list.indexOf(q))}
          doneLabel="해석을 남긴 문항"
          doneVerb="작성함"
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <p className="hidden text-[12px] leading-tight text-exam-muted sm:block">
            {warn
              ? "아직 답하지 않은 문항이 있습니다. 번호판에서 줄이 없는 번호를 확인하세요."
              : "고르거나 쓰는 대로 저장됩니다. 모든 문항에 답하면 끝납니다."}
          </p>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              작성 {writtenCount}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={async () => {
                  if (!complete) {
                    setWarn(true);
                    return;
                  }
                  await leaveFullscreen();
                  sheet.finish();
                }}
                aria-disabled={!complete}
                className={complete ? btnPrimary : btnDisabled}
              >
                해석 제출하고 마치기
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 다이얼로그 ───────────────────────── */

function SubmitDialog({
  subjectName,
  unanswered,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-exam-line bg-exam-panel p-7">
        <p className={eyebrow}>제출 확인</p>
        <h2 id="submit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 답안을 제출할까요?
        </h2>

        {/* 색면을 깔지 않는다. 아이가 제출을 앞두고 보는 마지막 화면이라,
            노란 상자가 서면 「잘못했다」로 읽힌다. 답을 비운 것은 잘못이 아니다. */}
        {unanswered > 0 ? (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            아직 <b className="text-exam-text">{unanswered}문항</b>에 답하지 않았습니다. 그대로
            제출해도 되며, 제출 후 <b className="text-exam-text">왜 풀지 못했는지</b>를 적는 단계가
            이어집니다.
          </p>
        ) : (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            모든 문항에 답했습니다. 제출 후에는 답안을 수정할 수 없습니다.
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            더 풀기
          </button>
          <button type="button" onClick={onConfirm} className={btnPrimary}>
            제출하기
          </button>
        </div>
      </div>
    </div>
  );
}

function ForfeitDialog({
  subjectName,
  remain,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  remain: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forfeit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-rose-300 bg-exam-panel p-7">
        <p className={eyebrow}>경고 · 되돌릴 수 없음</p>
        <h2 id="forfeit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 응시를 포기할까요?
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
          아직 <b className="tabular-nums text-exam-text">{remain}</b> 남았습니다. 지금 나가지 않고
          계속 풀 수 있습니다.
        </p>
        <ul className="mt-5 space-y-2 border-t border-exam-line pt-5 text-[13px] leading-relaxed text-exam-muted">
          <li>
            · 이 과목의 응시 기회가 <b className="text-rose-600">사라집니다.</b>
          </li>
          <li>· 지금까지 선택하거나 작성한 답안은 저장되지 않습니다.</li>
          <li>· 세 과목을 모두 제출해야 결과 리포트가 발행됩니다.</li>
        </ul>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnPrimary}>
            계속 응시하기
          </button>
          <button type="button" onClick={onConfirm} className={btnDanger}>
            포기하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 결과 화면 ───────────────────────── */

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x py-16 md:py-24">
      <div className={`mx-auto max-w-xl p-8 text-center md:p-12 ${panel}`}>{children}</div>
    </div>
  );
}

/**
 * 응시 창을 닫는다.
 *
 * 응시는 따로 띄운 창에서 본다(lib/popup.ts examWindow). 다 보았거나 포기한 뒤에 할 일은
 * 이 창을 닫는 것이지 여기서 다른 화면으로 옮겨 가는 것이 아니다 — 원래 창의 응시 현황이
 * 그 결과를 이미 받아 두었다. 주소를 직접 열어 본 경우에는 창이 닫히지 않으므로 그때만
 * 응시 현황으로 보낸다.
 */
function useCloseExam() {
  const router = useRouter();
  return async () => {
    await leaveFullscreen();
    window.close();
    window.setTimeout(() => {
      if (!window.closed) router.push("/exam");
    }, 200);
  };
}

function Submitted({ title }: { title: string }) {
  const close = useCloseExam();
  return (
    <Result>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-exam-line text-exam-text">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-6 text-[24px] font-black text-exam-text">{title} 응시가 끝났습니다</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        답안과 해석이 모두 저장되었습니다. 이 창을 닫으면 진단 현황 화면에서 제출 상태가 갱신됩니다.
      </p>
      <div className="mt-8 flex justify-center">
        <button type="button" onClick={close} className={btnPrimary}>
          창 닫기
        </button>
      </div>
    </Result>
  );
}

function Forfeited({ sheet }: { sheet: Sheet }) {
  const attemptsLeft = sheet.attemptsLeft;
  const close = useCloseExam();
  return (
    <Result>
      <p className={eyebrow}>응시 중단</p>
      <h1 className="mt-3 text-[24px] font-black text-exam-text">
        {sheet.title} 응시를 포기했습니다
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        이 시험의 응시 기회가 소모되었습니다. 남은 기회는{" "}
        <b className="tabular-nums text-rose-600">{attemptsLeft}회</b>입니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {attemptsLeft > 0 && (
          <button type="button" onClick={() => sheet.restart()} className={btnGhost}>
            남은 기회로 다시 응시
          </button>
        )}
        {/* 포기한 뒤에 할 일은 이 창을 닫는 것이다 — 원래 창의 응시 현황이 이미 갱신되어 있다 */}
        <button type="button" onClick={close} className={btnPrimary}>
          창 닫기
        </button>
      </div>
    </Result>
  );
}

/* ───────────────────────── 함께 읽는 자료 ───────────────────────── */

/**
 * 「( ㄱ )」 같은 빈칸 표지를 칸 모양으로 세운다.
 *
 * 자료와 발문이 같은 표지로 서로를 가리킨다 — 자료의 빈칸이 문제에서 「( ㄱ )에 들어갈
 * 말」로 불린다. 두 곳이 같은 모양이어야 아이가 어느 칸을 묻는지 바로 짚는다.
 */
export function WithBlanks({ text, compact = false }: { text: string; compact?: boolean }) {
  const parts = text.split(/\(\s*([ㄱ-ㅎ])\s*\)/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            className={`inline-flex items-center justify-center whitespace-nowrap font-bold text-exam-text ${
              /* 표 칸 안에서는 폭을 늘리지 않는다 — 좁은 칸에서 표가 옆으로 넘친다 */
              compact ? "" : "mx-0.5 min-w-[4.5em] border-b border-exam-text px-2"
            }`}
          >
            ( {part} )
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * 왼쪽에 붙는 자료(보기) 칸.
 *
 * 응시와 해석 두 화면이 같은 것을 그리고, 세트면 문제 여럿이 이 하나를 나눠 읽는다.
 * 시험지처럼 지시문을 위에 두고 본문과 사진을 테두리 상자 안에 담는다 — 문제를
 * 넘겨도 이 상자는 그대로 있다.
 */
export function BriefPanel({ brief, range }: { brief: Brief; range?: string | null }) {
  return (
    <section className="font-myeongjo order-2 border-b border-exam-line bg-exam-panel px-6 py-7 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
      {/* 시험지처럼 「[1~4] 다음 … 답하시오.」 한 줄로 연다 — 자료 이름표 · 제목 · 안내 문구는 두지 않는다 */}
      <p className="text-[15px] font-bold leading-[1.7] text-exam-text">
        {range && <span className="mr-1.5 tabular-nums">[{range}]</span>}
        {brief.lead ?? "다음을 읽고 물음에 답하시오."}
      </p>

      <div className="mt-3 border border-exam-text/70 px-5 py-5 md:px-6">
        <BriefBody brief={brief} />
      </div>
    </section>
  );
}

/**
 * 세트가 차지하는 문항 번호 — 「1~4」. 문항 하나뿐인 자료면 null(머리에 번호를 달지 않는다).
 */
export function setRange(order: Question[], q: Question) {
  const nums = order.flatMap((x, i) => (x.setId === q.setId ? [i + 1] : []));
  return nums.length > 1 ? `${nums[0]}~${nums[nums.length - 1]}` : null;
}

/** 자료 상자 안 — 왼쪽 자료와 묶음 머리 자료가 같이 쓴다 */
function BriefBody({ brief }: { brief: Brief }) {
  return <BlockList blocks={brief.blocks} />;
}

/**
 * 자료 블록을 적힌 차례대로 그린다(lib/content.ts Block).
 *
 * 출제 화면이 쌓은 차례가 곧 시험지의 차례다 — 문단 사이는 좁게, 갈래가 바뀌면 넓게 띄운다.
 * 왼쪽 자료 · 묶음 머리 자료 · 발문 아래 자료가 모두 이것을 쓴다.
 */
export function BlockList({ blocks, className = "" }: { blocks: Block[]; className?: string }) {
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const prev = blocks[i - 1];
        const gap = !prev ? "" : prev.kind === "text" && b.kind === "text" ? "mt-3" : "mt-5";
        return (
          <div key={i} className={gap}>
            <BlockView block={b} />
          </div>
        );
      })}
    </div>
  );
}

function BlockView({ block: b }: { block: Block }) {
  switch (b.kind) {
    case "text":
      return (
        <p className="whitespace-pre-line text-[14px] leading-[1.9] text-exam-text">
          <WithBlanks text={b.text} />
        </p>
      );
    case "list":
      return (
        <ul className="space-y-1.5">
          {b.items.map((l, i) => (
            <li
              key={i}
              className={`text-[14px] leading-[1.8] text-exam-text ${
                /* 「[측정 방법]」 같은 소제목은 굵게, 「○ …」 항목은 둘째 줄부터 들여 쓴다 */
                l.startsWith("[") ? "font-bold" : l.startsWith("○") ? "pl-4 -indent-4" : ""
              }`}
            >
              {l}
            </li>
          ))}
        </ul>
      );
    case "images":
      return <FigureRow figures={b.images} sequence={b.layout === "sequence"} />;
    case "table":
      return <ExamTable table={b.table} />;
    case "video":
      return (
        <figure className="mx-auto w-full max-w-[28rem]">
          {/* 대본은 영상 아래 접어 둔다 — 소리를 못 듣는 학생이 같은 내용을 읽을 길 */}
          <video
            src={b.src}
            poster={b.poster}
            controls
            preload="metadata"
            className="w-full rounded-[6px] border border-exam-line bg-black"
          />
          {b.caption && (
            <figcaption className="mt-2 text-center text-[14px] text-exam-text">
              {b.caption}
            </figcaption>
          )}
          {b.transcript && (
            <details className="mt-2 font-sans text-[12px] text-exam-muted">
              <summary className="cursor-pointer">영상 내용 글로 보기</summary>
              <p className="mt-1.5 whitespace-pre-line leading-relaxed">{b.transcript}</p>
            </details>
          )}
        </figure>
      );
    case "audio":
      /* 듣기 문항이라 대본은 학생에게 내보이지 않는다 — 채점 · 검수가 읽는다 */
      return (
        <figure>
          <audio src={b.src} controls preload="metadata" className="w-full" />
          {b.caption && (
            <figcaption className="mt-1.5 text-[13px] text-exam-text">{b.caption}</figcaption>
          )}
        </figure>
      );
    case "animation":
      return <PendulumClip periodSec={b.periodSec} caption={b.caption} />;
    case "rich":
      return <RichBlock format={b.format} body={b.body} />;
    case "note":
      return <p className="whitespace-pre-line text-[13px] text-exam-text">{b.text}</p>;
    case "box":
      /* 시험지의 〈보기〉 — 이름을 윗선 가운데에 얹는다. 줄바꿈은 그대로 줄을 바꾼다 */
      return (
        <div className="relative mt-2.5 border border-exam-text/70 px-4 pb-3.5 pt-5">
          {b.title && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-exam-panel px-2 text-[13px] font-bold leading-5 text-exam-text">
              〈{b.title}〉
            </span>
          )}
          <p className="whitespace-pre-line text-[14px] leading-[1.8] text-exam-text">
            <WithBlanks text={b.text} />
          </p>
        </div>
      );
  }
}

/** 마크다운 · HTML로 적힌 옛 지문 — 소독(lib/richText.ts)을 거친 뒤 그린다 */
function RichBlock({ format, body }: { format: "markdown" | "html"; body: string }) {
  return (
    <div
      className="text-[14px] leading-[1.9] text-exam-text"
      dangerouslySetInnerHTML={{ __html: renderDetail(format, body, []) }}
    />
  );
}

/* ───────────────────────── 표 ───────────────────────── */

/**
 * 시험지 표 — 칸마다 선을 긋고 가운데 맞춘다.
 *
 * 묶음 머리(groups)가 있으면 두 줄 머리가 된다. 묶음 이름이 빈 자리는 아래 머리 칸을
 * 위로 올려 두 줄을 차지하게 한다(「평균」 · 「주기」처럼 묶이지 않는 칸).
 * 첫 머리가 비어 있으면 첫 열은 줄 이름(「학생 A」)으로 보고 굵게 쓴다.
 */
export function ExamTable({ table }: { table: Table }) {
  const cell = "border border-exam-text/60 px-1.5 py-1.5 2xl:px-2.5";
  const rowLabels = table.head[0] === "";
  /* 묶음 이름이 빈 자리의 열 — 위 줄에서 두 줄짜리로 그리고 아래 줄에서는 건너뛴다 */
  const lifted = new Set<number>();
  if (table.groups) {
    let col = 0;
    for (const g of table.groups) {
      if (!g.label) for (let k = 0; k < g.span; k++) lifted.add(col + k);
      col += g.span;
    }
  }

  return (
    <figure>
      {table.caption && (
        <figcaption className="mb-2 text-[15px] font-bold text-exam-text">
          {table.caption}
        </figcaption>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-[13px] text-exam-text">
          <thead>
            {table.groups && (
              <tr>
                {(() => {
                  let col = 0;
                  return table.groups.flatMap((g) => {
                    const start = col;
                    col += g.span;
                    if (g.label) {
                      return [
                        <th key={`g${start}`} colSpan={g.span} className={`${cell} font-semibold`}>
                          {g.label}
                        </th>,
                      ];
                    }
                    return Array.from({ length: g.span }, (_, k) => (
                      <th key={`h${start + k}`} rowSpan={2} className={`${cell} font-semibold`}>
                        {table.head[start + k]}
                      </th>
                    ));
                  });
                })()}
              </tr>
            )}
            <tr>
              {table.head.map((h, i) =>
                lifted.has(i) ? null : (
                  <th key={i} className={`${cell} font-semibold`}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={`${cell} tabular-nums ${
                      rowLabels && c === 0
                        ? "whitespace-nowrap font-semibold"
                        : "whitespace-pre-line"
                    }`}
                  >
                    <WithBlanks text={v} compact />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/* ───────────────────────── 사진 ───────────────────────── */

/**
 * 사진 여러 장을 한 줄에 세운다.
 *
 * `sequence`면 시간 순서로 읽는 사진이라 사이에 ⇨를 두고 줄을 바꾸지 않는다 — 세 장이
 * 두 줄로 갈리면 (다)가 (가) 밑으로 내려가 흐름이 끊긴다.
 */
export function FigureRow({
  figures,
  sequence = false,
  className = "",
}: {
  figures: Figure[];
  sequence?: boolean;
  className?: string;
}) {
  if (sequence) {
    return (
      <div className={`flex items-center justify-center gap-1.5 sm:gap-2.5 ${className}`}>
        {figures.map((f, i) => (
          <Fragment key={f.src}>
            {i > 0 && (
              <span aria-hidden className="shrink-0 pb-7 text-[20px] text-exam-text">
                ⇨
              </span>
            )}
            <FigureView figure={f} className="min-w-0 flex-1" />
          </Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-end justify-center gap-4 ${className}`}>
      {figures.map((f) => (
        <FigureView
          key={f.src}
          figure={f}
          className={
            figures.length > 1 ? "w-[calc(50%-0.5rem)] max-w-[16rem]" : "w-full max-w-[13rem]"
          }
        />
      ))}
    </div>
  );
}

/**
 * 사진 한 장.
 *
 * 사진은 자르지 않는다 — 이름표(marks)와 점선 타원(rings)의 좌표가 사진 전체에 대한 %라서,
 * 잘라 내면 표시가 엉뚱한 곳을 가리킨다.
 */
function FigureView({ figure: f, className }: { figure: Figure; className: string }) {
  const arrows = f.marks?.filter((m) => m.toX !== undefined && m.toY !== undefined) ?? [];
  return (
    <figure className={className}>
      <div className="relative">
        {/* 시험지 사진은 원본을 그대로 싣는다 — 크기는 미리 줄여 두었다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.src} alt={f.alt} className="h-auto w-full" draggable={false} />
        {(arrows.length > 0 || f.rings) && (
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <marker
                id="fig-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="#111" />
              </marker>
            </defs>
            {arrows.map((m) => (
              <line
                key={m.label}
                x1={m.x}
                y1={m.y + 4}
                x2={m.toX}
                y2={m.toY}
                stroke="#111"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                markerEnd="url(#fig-arrow)"
              />
            ))}
            {f.rings?.map((r) => (
              <ellipse
                key={`${r.x}-${r.y}`}
                cx={r.x}
                cy={r.y}
                rx={r.rx}
                ry={r.ry}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}
        {f.marks?.map((m) => (
          <span
            key={m.label}
            aria-hidden
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-sans text-[12px] font-bold leading-none ${
              /* 화살표 이름표는 검은 글씨, 사진 속에 바로 찍는 이름표는 흰 글씨 */
              m.toX === undefined
                ? "text-white [text-shadow:0_0_3px_#000,0_0_2px_#000]"
                : "text-black [text-shadow:0_0_3px_#fff,0_0_3px_#fff]"
            }`}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      {f.caption && (
        <figcaption className="mt-2 text-center text-[14px] text-exam-text">{f.caption}</figcaption>
      )}
    </figure>
  );
}

/* ───────────────────────── 움직이는 자료 ───────────────────────── */

/**
 * 진자 — 「아래 동영상을 보고 주기를 재시오」의 동영상 자리.
 *
 * 정해진 주기(periodSec)로 한 번 왕복한다. 재생 단추를 눌러야 움직인다 — 아이가 초시계를
 * 먼저 준비하게 하려는 것이다. 주기를 재는 문제라 움직임 줄이기 설정과 상관없이 흔든다.
 */
function PendulumClip({ periodSec, caption }: { periodSec: number; caption: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="mx-auto w-full max-w-[18rem]">
      <div className="relative overflow-hidden rounded-[6px] border border-exam-line bg-[#f4f1ea]">
        <svg viewBox="0 0 200 180" className="block w-full" aria-hidden>
          <rect x="60" y="8" width="80" height="8" rx="2" fill="#b58a57" />
          <g
            style={{
              transformOrigin: "100px 16px",
              animation: playing ? `exam-pendulum ${periodSec}s ease-in-out infinite` : "none",
              transform: playing ? undefined : "rotate(22deg)",
            }}
          >
            <line x1="100" y1="16" x2="100" y2="140" stroke="#6b5a45" strokeWidth="2" />
            <circle cx="100" cy="148" r="14" fill="#b8913f" stroke="#7a5e24" strokeWidth="2" />
          </g>
        </svg>
        {!playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/10 font-sans"
            aria-label="진자 움직임 재생"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-exam-text text-white">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15l12-7.5z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-2 font-sans text-[12px] text-exam-muted">
        <span>{caption}</span>
        {playing && (
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="rounded-[4px] border border-exam-line px-2 py-0.5 text-exam-text hover:bg-exam-raised"
          >
            멈추기
          </button>
        )}
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── 오른쪽 문제 칸 ───────────────────────── */

/** 「문항 3」 또는 묶음이면 「문항 2~3」 */
export function numbersText(order: Question[], screen: Question[]) {
  const first = order.indexOf(screen[0]) + 1;
  const last = order.indexOf(screen[screen.length - 1]) + 1;
  return first === last ? `문항 ${first}` : `문항 ${first}~${last}`;
}

/**
 * 가운데 칸 — 세트 차례 줄 아래에 이 화면의 문제(보통 하나, 묶음이면 여럿)를 세운다.
 * 묶음 머리 자료(groupBrief)가 있으면 문제들 위에 먼저 둔다.
 * 응시와 셋트가 같은 틀을 쓰고, 문제를 어떻게 그릴지는 부르는 쪽이 정한다.
 */
export function ScreenColumn({
  order,
  screen,
  renderQuestion,
}: {
  order: Question[];
  screen: Question[];
  renderQuestion: (q: Question) => ReactNode;
}) {
  const groupBrief = screen[0].groupBrief;
  return (
    /* key — 화면이 바뀌면 칸을 새로 세워 스크롤이 맨 위에서 시작한다 */
    <div key={screen[0].id} className="order-3 lg:order-2 lg:overflow-y-auto">
      {groupBrief && (
        <section className="font-myeongjo border-b border-exam-line px-6 pt-7 pb-6 lg:px-10">
          <p className="text-[15px] font-bold leading-[1.7] text-exam-text">
            <span className="mr-1.5 tabular-nums">
              {numbersText(order, screen).replace("문항 ", "[")}]
            </span>
            {groupBrief.lead ?? "다음을 읽고 물음에 답하시오."}
          </p>
          <div className="mt-4 border border-exam-text/70 px-3 py-4 xl:px-5 xl:py-5">
            <BriefBody brief={groupBrief} />
          </div>
        </section>
      )}
      <div className="divide-y divide-exam-line">{screen.map(renderQuestion)}</div>
    </div>
  );
}

/* ───────────────────────── 문항 한 덩이 ───────────────────────── */

/**
 * 발문 · 보기 · 답 쓰는 칸.
 *
 * 답 쓰는 칸은 셋 중 하나다 — 객관식 보기, 괄호 칸(시험지의 「○ 차이점 : (    )」),
 * 긴 글 칸.
 */
export function QuestionBody({
  q,
  num,
  value,
  onAnswer,
}: {
  q: Question;
  /** 학생에게 보이는 문제 번호 — 푸는 차례로 매긴다 */
  num: number;
  value: number | string | undefined;
  /** 답을 어디에 적을지는 부르는 쪽이 정한다 — 응시는 응시 기록에, 셋트는 셋트 저장소에 */
  onAnswer: (value: number | string) => void;
}) {
  return (
    <section className="font-myeongjo px-6 py-7 lg:px-10 lg:py-9">
      {/* 시험지처럼 「문항 1 (서술형)」 아래에 발문을 둔다 */}
      <p className="text-[15px] font-bold text-exam-text">
        문항 <span className="tabular-nums">{num}</span>
        <span className="ml-1.5 font-medium text-exam-muted">({kindLabel(q)})</span>
      </p>

      <h1 className="mt-2.5 whitespace-pre-line text-[15px] font-semibold leading-[1.7] text-exam-text">
        <WithBlanks text={q.stem} />
      </h1>

      {q.blocks && q.blocks.length > 0 && <BlockList blocks={q.blocks} className="mt-6" />}

      {q.type === "choice" ? (
        <fieldset className="relative mt-6">
          <legend className="sr-only">보기 선택</legend>
          {/* 보기마다 상자를 두르지 않는다 — 큐넷 CBT·맞춤형 학업성취도 자율평가·ETS가
                모두 번호 표시만 칠한다. 종이 시험지에서 번호에 동그라미를 치던 손짓 그대로다.
                상자를 걷으면 화면이 조용해지고, 고른 답 하나만 검게 남는다.
                -mx-3: 누르는 자리는 좌우로 넓히되 글줄은 발문과 같은 선에서 시작한다. */}
          <ul className="-mx-3">
            {q.choices?.map((c, i) => {
              const on = value === i;
              return (
                <li key={c}>
                  {/* relative는 숨긴 라디오(sr-only)를 이 칸에 붙잡아 둔다 — 없으면 문서 맨
                        위를 기준으로 놓여 응시 화면 바깥에 스크롤이 생긴다. */}
                  <label className="group relative flex cursor-pointer items-start gap-3.5 rounded-[6px] px-3 py-3 transition-colors hover:bg-exam-raised has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500">
                    <input
                      type="radio"
                      name={q.id}
                      value={i}
                      checked={on}
                      onChange={() => onAnswer(i)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums transition-colors ${
                        on
                          ? "border-exam-text bg-exam-text text-white"
                          : "border-exam-line text-exam-muted group-hover:border-exam-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[14px] leading-[1.7] ${
                        on ? "font-semibold text-exam-text" : "text-exam-text"
                      }`}
                    >
                      {c}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : q.blanks ? (
        <BlankFields q={q} blanks={q.blanks} value={value} onAnswer={onAnswer} />
      ) : (
        <div className="mt-7">
          {q.guide && (
            <ol className={`mb-4 space-y-2 p-5 ${panel}`}>
              <li className={eyebrow}>이렇게 써 보세요</li>
              {q.guide.map((g, i) => (
                <li key={g} className="flex gap-2.5 text-[14px] leading-relaxed text-exam-text">
                  <span className="font-bold tabular-nums text-exam-muted">{i + 1}.</span>
                  {g}
                </li>
              ))}
            </ol>
          )}
          <textarea
            rows={9}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder={q.placeholder}
            aria-label="서술형 답안"
            className="w-full rounded-md border border-exam-line bg-exam-panel px-4 py-3.5 text-[14px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-brand-500"
          />
          <p className="mt-2 text-right font-sans text-[12px] tabular-nums text-exam-muted">
            {(typeof value === "string" ? value : "").trim().length}자
          </p>
        </div>
      )}
    </section>
  );
}

/** 문제 머리의 유형 이름 */
function kindLabel(q: Question) {
  if (q.type === "choice") return "객관식";
  if (q.blanks?.every((b) => b.options)) return "연결형";
  return "서술형";
}

/**
 * 괄호 칸 — 시험지의 「○ 차이점 : (        )」.
 *
 * 칸 이름을 앞에 세우고 괄호 안에 답하게 한다. 칸은 다섯 가지다 —
 *   고르는 칸  보기(options)를 단추로 늘어놓고 하나를 고른다. 고른 것이 괄호 안에 들어간다
 *   문장 칸    「강물은 ( )보다 ( )에서 …」처럼 문장 속 괄호마다 짧게 쓴다(template)
 *   짧은 칸    값 하나(방위각)와 단위(°)
 *   그림 칸    밑그림 위에 그린다(draw)
 *   쓰는 칸    답이 길어지면 따라 늘어난다. 줄바꿈은 받지 않는다(한 칸에 한 답)
 */
function BlankFields({
  q,
  blanks,
  value,
  onAnswer,
}: {
  q: Question;
  blanks: Blank[];
  value: number | string | undefined;
  onAnswer: (value: string) => void;
}) {
  const values = splitBlanks(value, blanks.length);
  const put = (i: number, v: string) => {
    const next = values.slice();
    next[i] = v;
    onAnswer(joinBlanks(next));
  };
  return (
    <ul className="mt-7 space-y-5">
      {blanks.map((b, i) => {
        const id = `${q.id}-blank-${i}`;
        const label = (sep: string) => (
          <>
            <span aria-hidden className="text-[13px]">
              ○
            </span>
            {b.label && (
              <>
                <WithBlanks text={b.label} />
                <span aria-hidden>{sep}</span>
              </>
            )}
          </>
        );

        if (b.options) {
          return (
            <li key={i}>
              <fieldset className="relative">
                <legend className="flex items-center gap-2 text-[14px] font-bold text-exam-text">
                  {label("-")}
                  <span className="inline-flex min-w-[8em] items-center gap-1.5 text-[14px] font-bold">
                    <span aria-hidden>(</span>
                    <span className={values[i] ? "" : "font-normal text-exam-muted/60"}>
                      {values[i] ? (values[i].match(/^\(\S\)/)?.[0] ?? values[i]) : "고르세요"}
                    </span>
                    <span aria-hidden>)</span>
                  </span>
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
                  {b.options.map((o) => {
                    const on = values[i] === o;
                    return (
                      <label
                        key={o}
                        className={`relative cursor-pointer rounded-[6px] border px-3.5 py-2 text-[14px] transition-colors ${
                          on
                            ? "border-exam-text font-bold text-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
                            : "border-exam-line text-exam-text hover:border-exam-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name={id}
                          checked={on}
                          /* 같은 것을 다시 누르면 지운다 — 잘못 고른 것을 되돌릴 길 */
                          onClick={() => put(i, on ? "" : o)}
                          onChange={() => {}}
                          className="sr-only"
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        }

        if (b.template) {
          const slots = slotValues(b.template, values[i]);
          const pieces = b.template.split("{}");
          return (
            <li key={i}>
              <div
                role="group"
                aria-label={b.label || "문장 속 칸"}
                className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[14px] font-bold text-exam-text"
              >
                {label(":")}
                {pieces.map((piece, k) => (
                  <Fragment key={k}>
                    {piece && <span className="font-normal">{piece}</span>}
                    {k < pieces.length - 1 && (
                      <span className="inline-flex items-center gap-1 font-normal">
                        <span aria-hidden>(</span>
                        <input
                          aria-label={`${k + 1}번째 괄호`}
                          value={slots[k]}
                          onChange={(e) => {
                            const next = slots.slice();
                            next[k] = e.target.value.replaceAll(SLOT, "");
                            put(i, next.join(SLOT));
                          }}
                          className="h-10 w-20 border-b border-exam-line bg-transparent px-1 text-center text-[14px] font-bold text-exam-text outline-none transition-colors focus:border-exam-text"
                        />
                        <span aria-hidden>)</span>
                      </span>
                    )}
                  </Fragment>
                ))}
              </div>
            </li>
          );
        }

        if (b.draw !== undefined) {
          return (
            <li key={i}>
              <p className="flex items-center gap-2 text-[14px] font-bold text-exam-text">
                {label("")}
              </p>
              <DrawPad
                background={b.draw}
                value={values[i]}
                onChange={(v) => put(i, v)}
                label={b.label}
              />
            </li>
          );
        }

        return (
          <li key={i} className="flex items-start gap-3">
            <label
              htmlFor={id}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap pt-2.5 text-[14px] font-bold text-exam-text"
            >
              {label(":")}
            </label>
            <div
              className={`flex min-w-0 items-start gap-1.5 text-[14px] text-exam-text ${
                b.short ? "" : "flex-1"
              }`}
            >
              <span aria-hidden className="pt-2">
                (
              </span>
              {b.short ? (
                <input
                  id={id}
                  value={values[i]}
                  onChange={(e) => put(i, e.target.value)}
                  placeholder={b.placeholder}
                  className="h-11 w-24 border-b border-exam-line bg-transparent px-2 text-center text-[14px] tabular-nums text-exam-text outline-none transition-colors placeholder:text-exam-muted/50 focus:border-exam-text"
                />
              ) : (
                <textarea
                  id={id}
                  rows={1}
                  value={values[i]}
                  onChange={(e) => put(i, e.target.value.replace(/\n/g, " "))}
                  placeholder={b.placeholder ?? "여기에 쓰세요"}
                  className="field-sizing-content min-h-11 w-full resize-none border-b border-exam-line bg-transparent px-2 py-2 text-[14px] leading-[1.7] text-exam-text outline-none transition-colors placeholder:text-exam-muted/50 focus:border-exam-text"
                />
              )}
              {b.suffix && <span className="pt-2 text-[14px]">{b.suffix}</span>}
              <span aria-hidden className="pt-2">
                )
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 그림 칸 — 밑그림 위에 손으로 그린다.
 *
 * 밑그림은 캔버스 뒤 배경으로만 깔고 캔버스에는 그은 선만 담는다. 그래서 저장되는 그림이
 * 가볍고(투명 PNG), 다시 열면 같은 밑그림 위에 그 선이 돌아온다. 마우스 · 펜 · 손가락을
 * 모두 받는다.
 */
function DrawPad({
  background,
  value,
  onChange,
  label,
}: {
  background: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [eraser, setEraser] = useState(false);
  const SIZE = 640;

  /* 저장된 그림을 한 번 되살린다 — 이후에는 캔버스가 원본이다 */
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !value) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, SIZE, SIZE);
    img.src = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 열 때만 되살린다
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * SIZE, ((e.clientY - r.top) / r.height) * SIZE];
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d")!;
    /* 캔버스 밖으로 나가도 선이 이어지게 붙잡는다 — 붙잡지 못해도 그리기는 된다 */
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    drawing.current = true;
    const [x, y] = point(e);
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = eraser ? 28 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const [x, y] = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current || !canvas.current) return;
    drawing.current = false;
    onChange(canvas.current.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvas.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, SIZE, SIZE);
    onChange("");
  };

  return (
    <div className="mt-2.5 pl-6">
      <div
        className="relative aspect-square w-full max-w-[20rem] overflow-hidden rounded-[4px] border border-exam-text/60 bg-white bg-cover bg-center"
        style={background ? { backgroundImage: `url(${background})` } : undefined}
      >
        <canvas
          ref={canvas}
          width={SIZE}
          height={SIZE}
          aria-label={`${label} 그림 칸 — 누른 채로 움직여 그립니다`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          className={`absolute inset-0 h-full w-full touch-none ${eraser ? "cursor-cell" : "cursor-crosshair"}`}
        />
      </div>
      <div className="mt-2 flex max-w-[20rem] items-center gap-1.5 font-sans text-[12px]">
        <button
          type="button"
          onClick={() => setEraser(false)}
          aria-pressed={!eraser}
          className={`rounded-[4px] border px-2.5 py-1 ${!eraser ? "border-exam-text font-bold text-exam-text" : "border-exam-line text-exam-muted"}`}
        >
          펜
        </button>
        <button
          type="button"
          onClick={() => setEraser(true)}
          aria-pressed={eraser}
          className={`rounded-[4px] border px-2.5 py-1 ${eraser ? "border-exam-text font-bold text-exam-text" : "border-exam-line text-exam-muted"}`}
        >
          지우개
        </button>
        <button
          type="button"
          onClick={clear}
          className="ml-auto rounded-[4px] border border-exam-line px-2.5 py-1 text-exam-muted hover:text-exam-text"
        >
          모두 지우기
        </button>
      </div>
    </div>
  );
}
