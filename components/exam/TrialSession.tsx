"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCatalogRounds } from "@/lib/catalogRounds";
import {
  FREE_TOTAL,
  SET_QUESTIONS,
  assessment,
  examOrderOf,
  screensOf,
  subjects,
  tierCount,
  type Question,
  type SubjectId,
} from "@/lib/exam";
import {
  quarterLabel,
  seasonOf,
  trackLabel,
  trackOf,
  tracks,
  type TrackId,
} from "@/lib/examCatalog";
import { setSetAnswer } from "@/lib/setStore";
import { ArrowRight } from "@/components/Icons";
import ExamCover from "./ExamCover";
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
 * 셋트 창 (/exam/session/trial/[회차]/[학년]) — 가입하지 않고 **1셋트**를 풀어 보는 자리.
 *
 * 진단평가 절차의 둘째 단계다. 학년마다 1셋트(4문항)를 주고, 교과는 **수 · 과 · 국 중
 * 하나만** 고른다. 다 풀면 회원가입을 권하고, 가입하면 무료시험(모두 20문항)으로 넘어간다.
 *
 * 평가 목록의 「무료로 풀어보기」가 **실제 응시와 같은 별도 창**(examWindow)으로 연다.
 * 주소가 /exam/session 아래라 응시 존 레이아웃이 메뉴·오른쪽 리모컨·하단 안내를 감추고,
 * 화면도 응시 화면과 같은 틀(자료 | 문항 | 문항 이동판 + 하단 바)이다. 가입한 뒤 처음
 * 응시할 때 낯선 화면을 만나지 않게 하려는 것이다.
 *
 *   시작 화면  학년과 교과 하나를 고른다
 *   응시 화면  문제 1~SET_QUESTIONS 까지 풀고, 그 뒤 번호는 잠겨 있다
 *   끝 화면    회원가입을 권한다 — 가입·로그인은 이 창을 띄운 원래 창에서 연다
 *
 * ── 교과를 하나만 고른다 ──
 * 예전에는 과목을 갈아타며 셋을 다 풀어 볼 수 있었다. 절차가 「1개 교과」로 정한 까닭은
 * 셋트가 맛보기가 아니라 **무료시험의 앞 4문항**이라서다 — 셋을 다 풀게 하면 무료시험에
 * 물려받을 것이 셋이 되어 「모두 20문항」이라는 셈이 깨진다.
 *
 * ── 학년도 여기서 고른다 ──
 * 평가 목록에서 누른 학년으로 열리지만, 시작 화면에서 바꿀 수 있다. 로그인하지 않은 사람은
 * 명부가 없어 우리가 그 아이의 학년을 모른다 — 목록에서 잘못 눌렀을 때 뒤로 갔다 다시
 * 들어오게 하면, 아이 학년을 찾으러 온 사람이 예순네 줄을 두 번 훑는다.
 *
 * 학년을 바꾸면 주소도 함께 바꾼다(router.replace). 주소와 화면이 갈리면 새로 고쳤을 때
 * 고른 학년이 사라진다.
 *
 * ── 답은 남긴다 ──
 * 답을 셋트 저장소(lib/setStore.ts)에 적어 둔다. 가입한 뒤 무료시험이 그 네 문항을
 * 물려받으므로, 아이는 같은 문제를 두 번 풀지 않는다. 시간은 재지 않는다.
 */
export default function TrialSession({ roundId, trackId }: { roundId: string; trackId: TrackId }) {
  const router = useRouter();
  const rounds = useCatalogRounds();
  const round = rounds.find((r) => r.id === roundId);
  /* 편성에서 과목을 못 받았으면 검사 기본 과목으로 보여 준다 — 체험은 문항 모양을 보는 자리다 */
  const subjectIds: SubjectId[] =
    round && round.subjects.length > 0
      ? round.subjects.map((s) => s.id)
      : subjects.map((s) => s.id);

  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  /** 표지 첫 줄 — 「2026학년도 3분기」. 회차 목록을 못 읽었으면 회차 번호에서 뽑는다 */
  const { year, quarter } = seasonOf(round ?? { id: roundId, opensOn: "" });
  const season = `${year}학년도 ${quarterLabel(quarter)}`;

  if (!subject) {
    return (
      <TrialStart
        season={season}
        track={trackId}
        onTrack={(id) => router.replace(`/exam/session/trial/${roundId}/${id}`)}
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
      onAnswer={(id, v) => {
        setAnswers((a) => ({ ...a, [id]: v }));
        /* 창을 닫아도 남아야 한다 — 가입한 뒤 무료시험이 이 답을 물려받는다 */
        setSetAnswer({ round: roundId, track: trackId, subject }, id, v);
      }}
      onExit={() => setSubject(null)}
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

/* ───────────────────────── 시작 화면(표지) ───────────────────────── */

/**
 * 셋트 시작 화면 — 시험지 표지(components/exam/ExamCover.tsx)를 쓴다.
 *
 * 표에 적히는 것만 여기서 정한다. 학년 넷과 교과 셋은 누를 수 있는 칸이고, 이름과 ID는
 * 가입해야 생기는 값이라 비워 둔다 — 그 칸이 비어 있다는 것 자체가 「가입하면 이 자리가
 * 채워진다」를 말한다.
 *
 * 고르는 일과 시작하는 일을 가른다. 종이에서 칸을 채우는 일과 첫 장을 넘기는 일이 다르듯,
 * 교과를 누르는 것만으로는 시작되지 않는다.
 */
function TrialStart({
  season,
  track,
  onTrack,
  subjectIds,
  onStart,
}: {
  /** 「2026학년도 3분기」 */
  season: string;
  /** 지금 고른 학년 */
  track: TrackId;
  onTrack: (id: TrackId) => void;
  subjectIds: SubjectId[];
  onStart: (id: SubjectId) => void;
}) {
  const [pick, setPick] = useState<SubjectId | null>(null);

  return (
    <div className="container-x flex min-h-full items-start justify-center py-8">
      <div className="w-full max-w-[820px]">
        <ExamCover
          badge="제1교시"
          headline={`${season} GENIXX 진단평가 셋트 문항지`}
          title={assessment.name}
          watermark={`GENIXX${season.slice(0, 4)}`}
          notice="(학년과 응시 교과를 빠짐없이 고른 뒤 아래 버튼을 눌러 시작해 주세요. 시작하면 전체화면으로 바뀝니다.)"
          groups={[
            {
              id: "grade",
              ariaLabel: "학년 선택",
              cells: [
                { kind: "label", text: "학년" },
                ...tracks.map((t) => ({
                  kind: "value" as const,
                  key: t.id,
                  text: trackOf(t.id).grades.replace("학년", ""),
                  on: t.id === track,
                  onPick: () => onTrack(t.id),
                })),
              ],
            },
            {
              id: "who",
              cells: [
                { kind: "label", text: "이름" },
                { kind: "value", key: "name", text: "가입 후", muted: true, width: "w-[4rem]" },
                { kind: "label", text: "ID" },
                { kind: "value", key: "id", text: "가입 후", muted: true, width: "w-[4rem]" },
              ],
            },
            {
              id: "subject",
              ariaLabel: "응시 교과 선택",
              cells: [
                { kind: "label", text: "응시 교과" },
                ...subjectIds.map((id) => ({
                  kind: "value" as const,
                  key: id,
                  text: subjects.find((x) => x.id === id)!.short,
                  on: pick === id,
                  onPick: () => setPick(id),
                })),
              ],
            },
          ]}
        />

        {/* ── 종이 바깥 ── */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => pick && onStart(pick)}
            aria-disabled={!pick}
            disabled={!pick}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {pick ? `${subjects.find((x) => x.id === pick)!.short} 셋트 시작` : "응시 교과를 고르세요"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-6 space-y-2 text-center text-[13px] leading-relaxed text-exam-muted">
          <li>
            · {trackLabel(track)} · 1셋트 <b className="text-exam-text">{SET_QUESTIONS}문항</b>을
            회원가입 없이 풀어 볼 수 있습니다. 학년마다 문항이 다릅니다.
          </li>
          <li>
            · 셋트를 풀고 회원가입하면 <b className="text-exam-text">무료시험 {FREE_TOTAL}문항</b>
            으로 이어집니다. 여기서 푼 {SET_QUESTIONS}문항은 그대로 이어지니 다시 풀지 않아도
            됩니다.
          </li>
          <li>· 교과는 하나만 고릅니다. 나머지 과목은 무료시험에서 함께 풀게 됩니다.</li>
          <li>· 셋트에서는 시간을 재지 않고, 채점도 하지 않습니다.</li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={closeTrial}
            className="text-[13px] text-exam-muted hover:underline"
          >
            창 닫기
          </button>
          <button
            type="button"
            onClick={() => openInMain("/signup")}
            className="text-[13px] font-semibold text-soft-primary hover:underline"
          >
            회원가입하고 무료시험 응시
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
}: {
  subject: SubjectId;
  answers: Record<string, number | string>;
  onAnswer: (id: string, v: number | string) => void;
  onExit: () => void;
}) {
  /** 지금 화면의 차례 — 열린 화면 수(screens.length)에 이르면 끝 화면이다 */
  const [index, setIndex] = useState(0);
  const [askExit, setAskExit] = useState(false);
  /* ESC · 헤더의 「체험 그만하기」 · 전체화면 해제 — 그만할지 묻는다 */
  useExamExitRequest(true, () => setAskExit(true));

  const meta = subjects.find((s) => s.id === subject)!;
  const order = examOrderOf(subject);
  /* 셋트가 여는 만큼만 앞에서부터 — 번호는 푸는 차례 그대로다 */
  const free = order.slice(0, tierCount("set", subject, subject));
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
            <span className="rounded-[2px] bg-soft-primary-soft px-2 py-0.5 text-[11px] font-bold text-soft-primary">
              셋트 문항
            </span>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              1셋트 {free.length}문항 · 무료시험에서 {FREE_TOTAL}문항으로 이어집니다
            </span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {screen ? `${numbersText(order, screen)} / ${free.length}` : "셋트 끝"}
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
          <Wall subjectName={meta.name} />
        )}

        <QuestionPad
          list={order}
          isHere={(q) => !!question && q.setId === question.setId && isFree(q)}
          isCurrent={(q) => !!screen && screen.includes(q)}
          isDone={(q) => isFree(q) && isAnswered(q, answers[q.id])}
          isLocked={(q) => !isFree(q)}
          /* 잠긴 번호를 누르면 가입을 권하는 끝 화면으로 간다 */
          onPick={goTo}
          doneLabel="답한 문항"
          doneVerb="응답함"
          footnote={`점선 번호(문항 ${free.length + 1}~)는 회원가입 후 무료시험에서 풀 수 있습니다.`}
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
                {index === screens.length - 1 ? "셋트 마치기" : "다음"}
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
          <div className="w-full max-w-md rounded-[2px] border border-exam-line bg-exam-panel p-7">
            <h2 id="trial-exit-title" className="text-[20px] font-black text-exam-text">
              {meta.name} 셋트를 그만할까요?
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
              교과 고르기 화면으로 돌아갑니다. 지금까지 쓴 답은 이 브라우저에 남아 있어, 같은
              교과로 다시 들어오면 그대로 보입니다.
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

/**
 * 셋트를 다 푼 뒤 — 가입을 권한다.
 *
 * 다른 과목으로 갈 길은 두지 않는다. 절차가 한 교과만 고르게 했고, 여기서 과목을 갈아타게
 * 두면 무료시험이 물려받을 것이 여럿이 된다.
 */
function Wall({ subjectName }: { subjectName: string }) {
  return (
    <div className="order-2 flex items-center px-6 py-10 lg:order-1 lg:col-span-2 lg:overflow-y-auto">
      <div className={`mx-auto w-full max-w-xl p-8 text-center md:p-10 ${panel}`}>
        <p className={eyebrow}>1셋트 끝</p>
        <h2 className="mt-3 text-[22px] font-bold tracking-tight text-exam-text md:text-[26px]">
          회원가입하면 무료시험으로 이어집니다
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          가입하면 {subjectName}의 나머지 문항과 다른 두 과목을 더해{" "}
          <b className="text-exam-text">모두 {FREE_TOTAL}문항</b>을 결제 없이 풀 수 있습니다.
          지금 푼 {SET_QUESTIONS}문항은 그대로 이어지니 다시 풀지 않아도 됩니다.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => openInMain("/signup")} className={btnPrimary}>
            회원가입
          </button>
          <button type="button" onClick={() => openInMain("/login")} className={btnGhost}>
            이미 계정이 있어요 · 로그인
          </button>
        </div>
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
