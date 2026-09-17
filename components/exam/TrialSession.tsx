"use client";

import { useState } from "react";
import { useCatalogRounds } from "@/lib/catalogRounds";
import {
  FREE_QUESTIONS,
  assessment,
  examOrderOf,
  screensOf,
  subjects,
  type Question,
  type SubjectId,
} from "@/lib/exam";
import { evalName, trackLabel, type TrackId } from "@/lib/examCatalog";
import { ArrowRight } from "@/components/Icons";
import { enterFullscreen, leaveFullscreen, useExamExitRequest } from "@/lib/fullscreen";
import {
  BriefPanel,
  QuestionBody,
  QuestionPad,
  ScreenColumn,
  isAnswered,
  numbersText,
  setRange,
} from "./ExamSession";
import { btnGhost, btnPrimary, eyebrow, panel } from "./ui";

/**
 * 무료 체험 창 (/exam/session/trial/[회차]/[학년]) — 가입하지 않고 평가를 풀어 보는 자리.
 *
 * 평가 목록의 「무료로 풀어보기」가 **실제 응시와 같은 별도 창**(examWindow)으로 연다.
 * 주소가 /exam/session 아래라 응시 존 레이아웃이 메뉴·오른쪽 리모컨·하단 안내를 감추고,
 * 화면도 응시 화면과 같은 틀(자료 | 문항 | 문항 이동판 + 하단 바)이다. 가입한 뒤 처음
 * 응시할 때 낯선 화면을 만나지 않게 하려는 것이다.
 *
 *   시작 화면  과목을 고른다(실제 응시도 과목마다 따로 들어간다)
 *   응시 화면  문제 1~FREE_QUESTIONS 까지 풀고, 그 뒤 번호는 잠겨 있다
 *   끝 화면    회원가입을 권한다 — 가입·로그인은 이 창을 띄운 원래 창에서 연다
 *
 * 답은 이 창 안에만 둔다 — 응시 기록(lib/examStore.ts)에 적으면 가입한 뒤 첫 응시가
 * 체험 답을 물려받는다. 시간도 재지 않는다.
 */
export default function TrialSession({ roundId, trackId }: { roundId: string; trackId: TrackId }) {
  const rounds = useCatalogRounds();
  const round = rounds.find((r) => r.id === roundId);
  /* 편성에서 과목을 못 받았으면 검사 기본 과목으로 보여 준다 — 체험은 문항 모양을 보는 자리다 */
  const subjectIds: SubjectId[] =
    round && round.subjects.length > 0
      ? round.subjects.map((s) => s.id)
      : subjects.map((s) => s.id);

  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  const name = `${assessment.name} ${evalName(roundId, trackId, round?.label)}`;

  if (!subject) {
    return (
      <TrialStart
        name={name}
        trackText={trackLabel(trackId)}
        subjectIds={subjectIds}
        onStart={async (id) => {
          /* 실제 응시처럼 전체화면으로 들어간다 — 클릭 안에서 불러야 브라우저가 허용한다 */
          await enterFullscreen();
          setSubject(id);
        }}
      />
    );
  }

  return (
    <TrialRun
      key={subject}
      subject={subject}
      answers={answers}
      onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
      onExit={() => setSubject(null)}
      others={subjectIds.filter((id) => id !== subject)}
      onSwitch={setSubject}
    />
  );
}

/**
 * 가입·로그인은 이 창을 띄운 원래 창에서 연다.
 *
 * 체험 창은 크기가 고정된 작은 창이라 가입 화면을 여기서 열면 좁고, 가입을 마친 뒤에도
 * 사용자는 체험 창 안에 갇힌다. 원래 창이 없으면(주소를 직접 연 경우) 이 창에서 연다.
 */
async function openInMain(href: string) {
  await leaveFullscreen();
  const opener = window.opener as Window | null;
  if (opener && !opener.closed) {
    opener.location.href = href;
    opener.focus();
    window.close();
    return;
  }
  window.location.href = href;
}

/** 창을 닫는다 — 원래 창이 없으면 평가 목록으로 보낸다 */
async function closeTrial() {
  await leaveFullscreen();
  if (window.opener) {
    window.close();
    return;
  }
  window.location.href = "/exam/apply";
}

/* ───────────────────────── 시작 화면 ───────────────────────── */

function TrialStart({
  name,
  trackText,
  subjectIds,
  onStart,
}: {
  name: string;
  trackText: string;
  subjectIds: SubjectId[];
  onStart: (id: SubjectId) => void;
}) {
  return (
    <div className="container-x flex min-h-full items-center py-10">
      <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
        <p className={eyebrow}>무료 체험 · {trackText}</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">{name}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          회원가입 없이 실제 응시 화면에서 과목마다{" "}
          <b className="text-exam-text">문항 1~{FREE_QUESTIONS}</b>을 풀어 볼 수 있습니다.
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-exam-line pt-6 text-[13px] leading-relaxed text-exam-muted">
          <li>· 문항 {FREE_QUESTIONS + 1}부터는 회원가입 후 풀 수 있습니다.</li>
          <li>· 과목을 고르면 실제 응시처럼 전체화면으로 바뀝니다.</li>
          <li>· 체험에서는 시간을 재지 않고, 답도 저장되지 않습니다.</li>
          <li>· 채점과 결과 리포트는 회원가입 후 응시하면 받을 수 있습니다.</li>
        </ul>

        <p className="mt-7 text-[13px] font-semibold text-exam-text">풀어 볼 과목을 고르세요</p>
        <ul className="mt-3 grid gap-2">
          {subjectIds.map((id) => {
            const s = subjects.find((x) => x.id === id)!;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onStart(id)}
                  className="group flex w-full items-center justify-between gap-4 rounded-[10px] border border-exam-line bg-white px-5 py-4 text-left transition-colors hover:border-soft-primary"
                >
                  <span>
                    <span className="block text-[16px] font-bold text-exam-text">{s.name}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-exam-muted">
                      {s.hint}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-soft-primary">
                    체험 시작
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-exam-line pt-6">
          <button type="button" onClick={closeTrial} className={btnGhost}>
            창 닫기
          </button>
          <button type="button" onClick={() => openInMain("/signup")} className={btnPrimary}>
            회원가입하고 전체 응시
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 응시 화면 ───────────────────────── */

function TrialRun({
  subject,
  answers,
  onAnswer,
  onExit,
  others,
  onSwitch,
}: {
  subject: SubjectId;
  answers: Record<string, number | string>;
  onAnswer: (id: string, v: number | string) => void;
  onExit: () => void;
  others: SubjectId[];
  onSwitch: (id: SubjectId) => void;
}) {
  /** 지금 화면의 차례 — 열린 화면 수(screens.length)에 이르면 끝 화면이다 */
  const [index, setIndex] = useState(0);
  const [askExit, setAskExit] = useState(false);
  /* ESC · 헤더의 「체험 그만하기」 · 전체화면 해제 — 그만할지 묻는다 */
  useExamExitRequest(true, () => setAskExit(true));

  const meta = subjects.find((s) => s.id === subject)!;
  const order = examOrderOf(subject);
  /* 앞에서부터 FREE_QUESTIONS개만 연다 — 번호는 푸는 차례 그대로다 */
  const free = order.slice(0, FREE_QUESTIONS);
  const isFree = (q: Question) => free.includes(q);
  /* 화면 단위로 넘긴다 — 묶음이 한도에 걸치면 열린 문제만 남긴다 */
  const screens = screensOf(subject)
    .map((sc) => sc.filter(isFree))
    .filter((sc) => sc.length > 0);
  const atWall = index >= screens.length;
  const screen = atWall ? null : screens[index];
  const question = screen?.[0] ?? null;
  const goTo = (q: Question) =>
    setIndex(isFree(q) ? screens.findIndex((sc) => sc.includes(q)) : screens.length);
  const doneCount = free.filter((q) => isAnswered(q, answers[q.id])).length;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* 문항 머리 */}
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{meta.name}</p>
            <span className="rounded-[4px] bg-soft-primary-soft px-2 py-0.5 text-[11px] font-bold text-soft-primary">
              무료 체험
            </span>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              총 {order.length}문항 중 1~{free.length} 공개
            </span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {screen ? `${numbersText(order, screen)} / ${order.length}` : "무료 체험 끝"}
          </p>
        </div>
      </div>

      {/* 본문 — 좌: 자료(보기) / 가운데: 문제 / 우: 문항 이동판 */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_14rem] lg:overflow-hidden">
        {question ? (
          <>
            <BriefPanel brief={question.brief} range={setRange(order, question)} />
            <ScreenColumn
              order={order}
              screen={screen!}
              renderQuestion={(q) => (
                <QuestionBody
                  key={q.id}
                  q={q}
                  num={order.indexOf(q) + 1}
                  value={answers[q.id]}
                  onAnswer={(v) => onAnswer(q.id, v)}
                />
              )}
            />
          </>
        ) : (
          <Wall
            subjectName={meta.name}
            locked={order.length - free.length}
            others={others}
            onSwitch={onSwitch}
          />
        )}

        <QuestionPad
          subject={subject}
          isHere={(q) => !!question && q.setId === question.setId && isFree(q)}
          isCurrent={(q) => !!screen && screen.includes(q)}
          isDone={(q) => isFree(q) && isAnswered(q, answers[q.id])}
          isLocked={(q) => !isFree(q)}
          /* 잠긴 번호를 누르면 가입을 권하는 끝 화면으로 간다 */
          onPick={goTo}
          doneLabel="답한 문항"
          doneVerb="응답함"
          footnote={`점선 번호(문항 ${free.length + 1}~)는 회원가입 후 풀 수 있습니다.`}
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          {/* 체험 그만하기는 헤더 오른쪽 위에 있다(ExamStatusBar) */}
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{free.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>
            {atWall ? (
              <button type="button" onClick={() => openInMain("/signup")} className={btnPrimary}>
                회원가입
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setIndex(index + 1)} className={btnPrimary}>
                {index === screens.length - 1 ? "체험 마치기" : "다음"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {askExit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trial-exit-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
        >
          <div className="w-full max-w-md rounded-md border border-exam-line bg-exam-panel p-7">
            <h2 id="trial-exit-title" className="text-[20px] font-black text-exam-text">
              {meta.name} 체험을 그만할까요?
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
              과목 고르기 화면으로 돌아갑니다. 체험 답은 저장되지 않습니다.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  /* 전체화면이 꺼진 채 물었으면 이 클릭 안에서 다시 들어간다 */
                  enterFullscreen();
                  setAskExit(false);
                }}
                className={btnPrimary}
              >
                계속 풀기
              </button>
              <button type="button" onClick={onExit} className={btnGhost}>
                그만하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 무료 문항을 다 푼 뒤 — 가입을 권하고, 아직 안 본 과목으로 갈 길도 둔다 */
function Wall({
  subjectName,
  locked,
  others,
  onSwitch,
}: {
  subjectName: string;
  locked: number;
  others: SubjectId[];
  onSwitch: (id: SubjectId) => void;
}) {
  return (
    <div className="order-2 flex items-center px-6 py-10 lg:order-1 lg:col-span-2 lg:overflow-y-auto">
      <div className={`mx-auto w-full max-w-xl p-8 text-center md:p-10 ${panel}`}>
        <p className={eyebrow}>무료 체험 끝</p>
        <h2 className="mt-3 text-[22px] font-bold tracking-tight text-exam-text md:text-[26px]">
          더 풀어 보려면 회원가입해 주세요
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          {subjectName}의 나머지 <b className="text-exam-text">{locked}문항</b>과 채점 · 결과
          리포트는 회원가입 후 응시하면 볼 수 있습니다.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => openInMain("/signup")} className={btnPrimary}>
            회원가입
          </button>
          <button type="button" onClick={() => openInMain("/login")} className={btnGhost}>
            이미 계정이 있어요 · 로그인
          </button>
        </div>
        {others.length > 0 && (
          <div className="mt-8 border-t border-exam-line pt-6">
            <p className="text-[13px] text-exam-muted">
              다른 과목도 문항 1~{FREE_QUESTIONS}을 무료로 풀 수 있습니다
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {others.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSwitch(id)}
                  className="rounded-full border border-exam-line bg-white px-4 py-2 text-[13px] text-exam-text transition-colors hover:bg-exam-raised"
                >
                  {subjects.find((s) => s.id === id)?.name} 풀어 보기
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={closeTrial}
          className="mt-6 text-[12px] text-exam-muted hover:underline"
        >
          창 닫기
        </button>
      </div>
    </div>
  );
}
