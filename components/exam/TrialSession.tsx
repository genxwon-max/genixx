"use client";

import { useState, type ReactNode } from "react";
import { useCatalogRounds } from "@/lib/catalogRounds";
import { levelOf, schoolLevels, type SchoolLevel } from "@/lib/childOptions";
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
  evalName,
  quarterLabel,
  seasonName,
  seasonOf,
  trackFromGrade,
  trackOf,
  trackRangeText,
  type TrackId,
} from "@/lib/examCatalog";
import { clearSetTrial, setSetAnswer } from "@/lib/setStore";
import { closeExamWindow } from "@/lib/popup";
import { ArrowRight } from "@/components/Icons";
import ExamCover from "./ExamCover";
import { enterFullscreen, leaveFullscreen, useExamExitRequest } from "@/lib/fullscreen";
import {
  BriefPanel,
  ChoiceList,
  QuestionBody,
  QuestionPad,
  ScreenColumn,
  isAnswered,
  setRange,
} from "./ExamSession";
import { useTrialHead } from "./ExamStatusBar";
import { btnGhost, btnPrimary, eyebrow, panel } from "./ui";

/**
 * 셋트 창 (/exam/session/trial/[회차]/[학년]) — 가입하지 않고 **1셋트**를 풀어 보는 자리.
 *
 * 진단평가 절차의 둘째 단계다. 1셋트(4문항)를 주고, 교과는 **수 · 과 · 국 중 하나만** 고른다.
 * 다 풀면 회원가입을 권하고, 가입하면 무료 진단(모두 20문항)으로 넘어간다.
 *
 * 평가 목록의 「무료로 풀어보기」가 **실제 응시와 같은 별도 창**(examWindow)으로 연다.
 * 주소가 /exam/session 아래라 응시 존 레이아웃이 메뉴·오른쪽 리모컨·하단 안내를 감추고,
 * 화면도 응시 화면과 같은 틀(자료 | 문항 | 문항 이동판 + 하단 바)이다. 가입한 뒤 처음
 * 응시할 때 낯선 화면을 만나지 않게 하려는 것이다.
 *
 *   표지        시작 단추만 있다 — 여기서는 아무것도 고르지 않는다
 *   1번 · 2번   학교와 학년, 흥미 있는 과목을 차례로 묻는다
 *   셋트        고른 과목의 문제 1~SET_QUESTIONS 까지 풀고, 그 뒤 번호는 잠겨 있다
 *   끝 화면     회원가입을 권한다 — 가입·로그인은 이 창을 띄운 원래 창에서 연다
 *
 * ── 학년과 과목은 시작한 뒤에 묻는다 ──
 * 예전에는 표지의 표가 고르개였다 — 학년 칸과 응시 교과 칸을 채워야 시작 단추가 켜졌다.
 * 문제를 하나도 보기 전에 채울 칸부터 만나면 그것은 검사가 아니라 접수 서류로 읽힌다.
 * 이제 표지는 넘기기만 하고, 넘기면 **1번이 학교와 학년, 2번이 흥미 있는 과목**이다. 둘 다
 * 문항과 같은 모양으로 물어, 고르고 「다음」을 누르는 손짓을 셋트에 닿기 전에 먼저 해 본다.
 *
 * ── 과목을 하나만 고른다 ──
 * 예전에는 과목을 갈아타며 셋을 다 풀어 볼 수 있었다. 절차가 「1개 교과」로 정한 까닭은
 * 셋트가 맛보기가 아니라 **무료 진단의 앞 4문항**이라서다 — 셋을 다 풀게 하면 무료 진단에
 * 물려받을 것이 셋이 되어 「모두 20문항」이라는 셈이 깨진다.
 *
 * ── 학년은 주소가 아니라 1번의 답이다 ──
 * 주소의 학년은 평가 목록에서 누른 줄이고, 1번은 그 학년이 골라진 채로 열린다. 로그인하지
 * 않은 사람은 명부가 없어 우리가 그 아이의 학년을 모른다 — 목록에서 잘못 눌렀더라도 뒤로
 * 갔다 다시 들어오지 않고 여기서 바꾼다. 바꿔도 주소는 그대로 둔다. 1번은 초 · 중 · 고를 다
 * 받는데 주소의 학년 칸은 차림표가 여는 학년(초3~6)만 담을 수 있어, 따라 바꾸면 담기는
 * 답과 못 담기는 답이 갈린다. 머리의 진단 이름은 이 창이 건넨다(useTrialHead).
 *
 * ── 답은 남긴다 ──
 * 답을 셋트 저장소(lib/setStore.ts)에 적어 둔다. 가입한 뒤 무료 진단이 그 네 문항을
 * 물려받으므로, 아이는 같은 문제를 두 번 풀지 않는다. 시간은 재지 않는다.
 *
 * 차림표에 없는 학년(초1 · 2, 중 · 고)은 셋트는 풀어 보되 답을 남기지 않는다 — 접수할
 * 진단이 없어 물려줄 곳이 없다. 가까운 학년에 붙여 남기면 가입한 아이가 제 학년이 아닌
 * 진단을 접수한 것으로 뜬다. 1번과 끝 화면이 그 사정을 그대로 말한다.
 */
export default function TrialSession({ roundId, trackId }: { roundId: string; trackId: TrackId }) {
  const rounds = useCatalogRounds();
  const round = rounds.find((r) => r.id === roundId);
  /* 편성에서 과목을 못 받았으면 검사 기본 과목으로 보여 준다 — 체험은 문항 모양을 보는 자리다 */
  const subjectIds: SubjectId[] =
    round && round.subjects.length > 0
      ? round.subjects.map((s) => s.id)
      : subjects.map((s) => s.id);

  /** 어디까지 왔나 — 표지 · 묻는 두 문항 · 셋트 */
  const [phase, setPhase] = useState<"cover" | "ask" | "run">("cover");
  /** 묻는 두 문항 가운데 지금 선 것 — 0이 1번(학교와 학년), 1이 2번(흥미 있는 과목) */
  const [step, setStep] = useState<0 | 1>(0);
  const [grade, setGrade] = useState<GradePick>(() => gradeOfTrack(trackId));
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  /** 지금 든 답이 어느 학년 · 과목의 셋트 것인가 */
  const [answersOf, setAnswersOf] = useState<string | null>(null);
  const [askExit, setAskExit] = useState(false);

  /** 고른 학년에 열린 진단 — 차림표에 없는 학년이면 없다 */
  const track = trackOfPick(grade);
  const meta = subjects.find((s) => s.id === subject) ?? null;

  /* 머리는 응시 존 레이아웃이 한 줄로 세운다(ExamStatusBar) — 진단 이름과 과목만 건네준다.
     차림표에 없는 학년은 붙일 학년 칸이 없어 「2026 3분기 셋트 문항」까지만 적는다 */
  useTrialHead(
    track
      ? evalName(roundId, track, round?.label)
      : `${seasonName(roundId, round?.label)} 셋트 문항`,
    phase === "run" && meta ? meta.name : null,
  );
  /* ESC · 헤더의 「셋트 그만하기」 · 전체화면 해제 — 그만할지 묻는다. 1번 · 2번도 전체화면
     안이라 브라우저의 닫기 단추가 보이지 않는다 */
  useExamExitRequest(phase !== "cover", () => setAskExit(true));

  /** 표지 첫 줄 — 「2026학년도 3분기」. 회차 목록을 못 읽었으면 회차 번호에서 뽑는다 */
  const { year, quarter } = seasonOf(round ?? { id: roundId, opensOn: "" });
  const season = `${year}학년도 ${quarterLabel(quarter)}`;

  if (phase === "cover") {
    return (
      <TrialStart
        season={season}
        onStart={async () => {
          /* 실제 응시처럼 전체화면으로 들어간다 — 클릭 안에서 불러야 브라우저가 허용한다 */
          await enterFullscreen();
          setStep(0);
          setPhase("ask");
        }}
      />
    );
  }

  const startSet = () => {
    /* 학년이나 과목이 달라졌으면 다른 셋트다 — 앞 셋트의 답을 들고 들어가지 않는다.
       셋트 저장소도 그렇게 센다(setSetAnswer) */
    const key = `${grade.level} ${grade.no} ${subject}`;
    if (key !== answersOf) {
      setAnswers({});
      setAnswersOf(key);
    }
    setPhase("run");
  };

  return (
    <>
      {phase === "ask" || !subject || !meta ? (
        <TrialAsk
          step={step}
          grade={grade}
          onGrade={setGrade}
          subject={subject}
          onSubject={setSubject}
          subjectIds={subjectIds}
          onPrev={() => setStep(0)}
          onNext={() => (step === 0 ? setStep(1) : startSet())}
        />
      ) : (
        <TrialRun
          key={answersOf}
          subject={subject}
          /* 물려줄 진단이 없는 학년은 「가입하면 이어진다」고 말하지 않는다 */
          offGrade={track ? null : gradeText(grade)}
          answers={answers}
          onAnswer={(id, v) => {
            setAnswers((a) => ({ ...a, [id]: v }));
            /* 창을 닫아도 남아야 한다 — 가입한 뒤 무료 진단이 이 답을 물려받는다.
               물려줄 진단이 없는 학년이면 앞서 남긴 셋트도 비운다. 저장소는 가입 전에 **마지막으로
               푼** 한 건이라, 다른 학년으로 풀던 답이 남아 있으면 그것이 대신 물려진다 */
            if (track) setSetAnswer({ round: roundId, track, subject }, id, v);
            else clearSetTrial();
          }}
          /* 첫 문제의 「이전」은 2번으로 돌아간다 — 과목을 잘못 골랐을 때 되돌릴 길 */
          onBack={() => {
            setStep(1);
            setPhase("ask");
          }}
        />
      )}

      {askExit && (
        <ExitDialog
          subjectName={phase === "run" ? (meta?.name ?? null) : null}
          onStay={() => {
            /* 전체화면이 꺼진 채 물었으면 이 클릭 안에서 다시 들어간다 */
            enterFullscreen();
            setAskExit(false);
          }}
          onLeave={() => {
            setAskExit(false);
            setPhase("cover");
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── 1번의 답 ───────────────────────── */

/** 학교와 학년. 학교를 바꾸면 학년은 다시 고른다 — 6학년이 중학교에는 없다 */
type GradePick = { level: SchoolLevel; no: number | null };

/** 평가 목록에서 누른 줄의 학년 — 1번이 이것을 고른 채로 열린다 */
function gradeOfTrack(id: TrackId): GradePick {
  const t = trackOf(id);
  return {
    level: schoolLevels.find((l) => l.label === t.level)?.id ?? "초등",
    no: Number(t.grades.match(/\d+/)?.[0]) || null,
  };
}

/** 고른 학년에 열린 진단. 명부의 학년 글자(「초등 4학년」)와 같은 꼴로 맞춰 찾는다 */
const trackOfPick = (g: GradePick) => (g.no ? trackFromGrade(`${g.level} ${g.no}학년`) : null);

/** 「중학교 2학년」 */
const gradeText = (g: GradePick) => `${levelOf(g.level)!.label} ${g.no}학년`;

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

/* ───────────────────────── 시작 화면(표지) ───────────────────────── */

/**
 * 셋트 시작 화면 — 시험지 표지(components/exam/ExamCover.tsx)를 쓴다.
 *
 * 인적사항 표를 세우지 않는다. 학년과 과목은 넘긴 뒤 1번 · 2번이 묻고, 이름과 ID는 가입해야
 * 생기는 값이라 무엇을 적어도 거짓이 된다 — 비워 두면 채우라는 말로 읽히고, 「가입 후」라고
 * 적으면 가입하라는 재촉이 표 한가운데에 선다. 아직 없는 것은 묻지 않는 편이 낫다. 가입한
 * 뒤 받는 시험지(ExamSession의 StartGate)에서는 그 자리에 학년 · 이름 · 접속코드가 실제로
 * 채워진다.
 *
 * 시작하는 단추는 응시 화면과 같은 자리에 둔다 — 종이 안, 「넘기지 마시오」 줄 바로 아래
 * 오른쪽.
 */
function TrialStart({
  season,
  onStart,
}: {
  /** 「2026학년도 3분기」 */
  season: string;
  onStart: () => void;
}) {
  return (
    <div className="container-x flex min-h-full items-start justify-center py-8">
      <div className="w-full max-w-[900px]">
        {/* 창을 닫는 길은 머리 오른쪽 끝에 있다(ExamStatusBar) — 종이 위에 두면 시험지
            한 장 안에 종이 밖의 단추가 얹힌다 */}
        <ExamCover
          badge="제1교시"
          headline={`${season} GENIXX 재능 진단 셋트 문항지`}
          title={assessment.name}
          watermark={`GENIXX${season.slice(0, 4)}`}
          notice={`(아래 버튼을 눌러 시작해 주세요. 학년과 흥미 있는 과목을 먼저 묻고, 이어서 1셋트 ${SET_QUESTIONS}문항이 나옵니다. 시작하면 전체화면으로 바뀝니다.)`}
          groups={[]}
          action={
            <button
              type="button"
              onClick={onStart}
              className={`${btnPrimary} px-7 py-3.5 text-[15px]`}
            >
              진단 시작
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </div>
  );
}

/* ───────────────────────── 1번 · 2번 ───────────────────────── */

/**
 * 셋트 앞에 묻는 두 문항 — **1번 학교와 학년, 2번 흥미 있는 과목**.
 *
 * 한 화면에 하나씩 세우고 「다음」으로 넘긴다. 문항과 같은 글꼴 · 같은 번호 · 같은 보기
 * 모양을 써서, 아이에게는 접수 칸이 아니라 검사의 첫 두 문제로 읽힌다. 자료도 문항 이동판도
 * 없으므로(과목을 고르기 전이라 늘어놓을 번호가 없다) 세 칸 틀 대신 종이 한 장만 가운데 둔다.
 *
 * 둘 다 답해야 넘어간다. 실제 문항은 비워 두고 넘길 수 있지만, 이 둘은 다음에 나올 셋트를
 * 정하는 답이라 비면 보여 줄 것이 없다.
 *
 * ── 1번은 초 · 중 · 고를 다 받는다 ──
 * 학생 등록 칸과 같은 값이다(lib/childOptions.ts). 진단이 열리는 학년은 초3~6뿐이지만,
 * 그 밖의 학년을 고르지도 못하게 하면 「우리 아이 학년이 없다」에서 창을 닫는다. 고르게
 * 두고, 그 학년은 접수할 진단이 없다는 것을 고른 자리에서 바로 말한다 — 네 문제를 다 푼
 * 뒤에야 알게 하지 않는다.
 */
function TrialAsk({
  step,
  grade,
  onGrade,
  subject,
  onSubject,
  subjectIds,
  onPrev,
  onNext,
}: {
  step: 0 | 1;
  grade: GradePick;
  onGrade: (g: GradePick) => void;
  subject: SubjectId | null;
  onSubject: (id: SubjectId) => void;
  /** 이 회차가 여는 과목 — 편성 차례 그대로 */
  subjectIds: SubjectId[];
  onPrev: () => void;
  onNext: () => void;
}) {
  const answered = step === 0 ? grade.no !== null : subject !== null;
  const offCatalog = grade.no !== null && !trackOfPick(grade);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="container-x flex justify-center py-8 lg:py-14">
          {/* key — 문항이 바뀌면 칸을 새로 세워 초점이 앞 문항의 보기에 남지 않는다 */}
          <section
            key={step}
            className={`font-myeongjo w-full max-w-[720px] px-6 py-8 md:px-10 md:py-10 ${panel}`}
          >
            {step === 0 ? (
              <>
                <AskStem num={1}>지금 다니는 학교와 학년을 고르세요.</AskStem>
                <div className="mt-7 space-y-6">
                  <PickRow
                    legend="학교"
                    name="trial-level"
                    options={schoolLevels.map((l) => ({ value: l.id, label: l.label }))}
                    value={grade.level}
                    onPick={(level) => onGrade({ level, no: null })}
                  />
                  <PickRow
                    legend="학년"
                    name="trial-grade"
                    options={levelOf(grade.level)!.grades.map((n) => ({
                      value: n,
                      label: `${n}학년`,
                    }))}
                    value={grade.no}
                    onPick={(no) => onGrade({ ...grade, no })}
                  />
                </div>
                {offCatalog && (
                  <AskNote>
                    지금 접수할 수 있는 진단은 {trackRangeText}입니다. {gradeText(grade)}은 1셋트{" "}
                    {SET_QUESTIONS}문항만 풀어 볼 수 있습니다.
                  </AskNote>
                )}
              </>
            ) : (
              <>
                <AskStem num={2}>가장 흥미 있는 과목은 무엇인가요?</AskStem>
                <ChoiceList
                  name="trial-subject"
                  legend="흥미 있는 과목 선택"
                  choices={subjectIds.map((id) => subjects.find((s) => s.id === id)!.short)}
                  value={subject ? subjectIds.indexOf(subject) : undefined}
                  onPick={(i) => onSubject(subjectIds[i])}
                />
                <AskNote>고른 과목의 문항 {SET_QUESTIONS}개가 1셋트로 이어집니다.</AskNote>
              </>
            )}
          </section>
        </div>
      </div>

      {/* 하단 바 — 셋트와 같은 자리, 같은 단추 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          {/* 셋트 그만하기는 헤더 오른쪽 위에 있다(ExamStatusBar) */}
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              질문 {step + 1}/2
            </span>
            <button
              type="button"
              onClick={onPrev}
              disabled={step === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!answered}
              className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              다음
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 발문 — 문항(QuestionBody)과 같이 번호를 왼쪽에 붙이고 굵은 글씨는 번호에만 둔다 */
function AskStem({ num, children }: { num: number; children: ReactNode }) {
  return (
    <h1 className="flex gap-2.5 text-[15px] leading-[1.7] text-exam-text">
      <span className="shrink-0 font-bold tabular-nums">{num}.</span>
      <span>{children}</span>
    </h1>
  );
}

/** 보기 아래 한 줄 — 답이 다음 화면을 어떻게 바꾸는지. 발문이 아니라 안내라 고딕으로 둔다 */
function AskNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-7 border-t border-exam-line pt-4 font-sans text-[12px] leading-relaxed text-exam-muted">
      {children}
    </p>
  );
}

/**
 * 한 줄에서 하나를 고르는 칸 — 문항의 고르는 칸(「○ ⓐ - ( ㄱ~ㄹ )」)과 같은 모양이다.
 *
 * 1번은 한 문항에 두 가지(학교 · 학년)를 답한다. 번호 동그라미 보기를 두 벌 세우면 아홉 줄이
 * 되어 무엇이 한 묶음인지 읽히지 않으므로, 묶음마다 이름을 달고 가로로 늘어놓는다.
 */
function PickRow<T extends string | number>({
  legend,
  name,
  options,
  value,
  onPick,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onPick: (value: T) => void;
}) {
  return (
    <fieldset className="relative">
      <legend className="flex items-center gap-2 text-[14px] font-bold text-exam-text">
        <span aria-hidden className="text-[13px]">
          ○
        </span>
        {legend}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label
              key={o.value}
              className={`relative cursor-pointer rounded-[2px] border px-4 py-2.5 text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-exam-text ${
                on
                  ? "border-exam-text font-bold text-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
                  : "border-exam-line text-exam-text hover:border-exam-muted"
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={on}
                onChange={() => onPick(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ───────────────────────── 셋트 ───────────────────────── */

function TrialRun({
  subject,
  offGrade,
  answers,
  onAnswer,
  onBack,
}: {
  subject: SubjectId;
  /** 접수할 진단이 없는 학년이면 그 이름(「중학교 2학년」) — 가입을 권하는 말이 달라진다 */
  offGrade: string | null;
  answers: Record<string, number | string>;
  onAnswer: (id: string, v: number | string) => void;
  /** 첫 문제에서 「이전」 — 2번으로 돌아간다 */
  onBack: () => void;
}) {
  /** 지금 화면의 차례 — 열린 화면 수(screens.length)에 이르면 끝 화면이다 */
  const [index, setIndex] = useState(0);

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
    /* 머리는 응시 존 레이아웃이 한 줄로 세운다(ExamStatusBar) — 여기서 또 그리지 않는다.
       실제 응시와 셋트가 띠 수부터 다르면, 가입 전에 본 화면과 가입한 뒤 받는 화면이
       같은 시험으로 읽히지 않는다 */
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
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
          <Wall subjectName={meta.name} offGrade={offGrade} />
        )}

        <QuestionPad
          /* 잠긴 번호는 「가입하면 열린다」는 말이다 — 접수할 진단이 없는 학년에는 세우지 않는다 */
          list={offGrade ? free : order}
          isHere={(q) => !!question && q.setId === question.setId && isFree(q)}
          isCurrent={(q) => !!screen && screen.includes(q)}
          isDone={(q) => isFree(q) && isAnswered(q, answers[q.id])}
          isLocked={(q) => !isFree(q)}
          /* 잠긴 번호를 누르면 가입을 권하는 끝 화면으로 간다 */
          onPick={goTo}
          doneLabel="답한 문항"
          doneVerb="응답함"
          footnote={
            offGrade
              ? undefined
              : `점선 번호(문항 ${free.length + 1}~)는 회원가입 후 무료 진단에서 풀 수 있습니다.`
          }
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          {/* 셋트 그만하기는 헤더 오른쪽 위에 있다(ExamStatusBar) */}
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{free.length}
            </span>
            <button
              type="button"
              onClick={() => (index === 0 ? onBack() : setIndex(index - 1))}
              className={btnGhost}
            >
              이전
            </button>
            {!atWall ? (
              <button type="button" onClick={() => setIndex(index + 1)} className={btnPrimary}>
                {index === screens.length - 1 ? "셋트 마치기" : "다음"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : offGrade ? (
              <button type="button" onClick={() => closeExamWindow()} className={btnPrimary}>
                창 닫기
              </button>
            ) : (
              <button type="button" onClick={() => openInMain("/signup")} className={btnPrimary}>
                회원가입
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 그만할지 묻는 창 — 1번 · 2번과 셋트가 같이 쓴다.
 *
 * 그만하면 표지로 돌아간다. 고른 것과 쓴 답은 창이 들고 있어, 다시 시작하면 1번부터 그대로
 * 골라진 채로 지나온다.
 */
function ExitDialog({
  subjectName,
  onStay,
  onLeave,
}: {
  /** 셋트에 들어선 뒤에만 있다 — 「수학 셋트를 그만할까요?」 */
  subjectName: string | null;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-exit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-[2px] border border-exam-line bg-exam-panel p-7">
        <h2 id="trial-exit-title" className="text-[20px] font-black text-exam-text">
          {subjectName ? `${subjectName} 셋트를` : "셋트를"} 그만할까요?
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
          처음 화면으로 돌아갑니다. 고른 학년과 과목, 지금까지 쓴 답은 이 창을 닫기 전까지 남아
          있어, 다시 시작하면 그대로 보입니다.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onStay} className={btnPrimary}>
            계속 풀기
          </button>
          <button type="button" onClick={onLeave} className={btnGhost}>
            그만하기
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 셋트를 다 푼 뒤 — 가입을 권한다.
 *
 * 다른 과목으로 갈 길은 두지 않는다. 절차가 한 과목만 고르게 했고, 여기서 과목을 갈아타게
 * 두면 무료 진단이 물려받을 것이 여럿이 된다.
 *
 * 접수할 진단이 없는 학년에게는 「가입하면 이어진다」고 말하지 않는다. 가입해도 그 학년에
 * 열린 진단이 없어 방금 푼 네 문항이 갈 곳이 없다 — 지킬 수 없는 말로 가입을 권하게 된다.
 */
function Wall({ subjectName, offGrade }: { subjectName: string; offGrade: string | null }) {
  return (
    <div className="order-2 flex items-center px-6 py-10 lg:order-1 lg:col-span-2 lg:overflow-y-auto">
      <div className={`mx-auto w-full max-w-xl p-8 text-center md:p-10 ${panel}`}>
        <p className={eyebrow}>1셋트 끝</p>
        {offGrade ? (
          <>
            <h2 className="mt-3 text-[22px] font-bold tracking-tight text-exam-text md:text-[26px]">
              1셋트를 모두 풀었습니다
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
              지금 접수할 수 있는 진단은{" "}
              <b className="text-exam-text">{trackRangeText}</b>입니다. {offGrade}은 아직 열린
              진단이 없어, 가입한 뒤에도 무료 진단으로 이어지지 않습니다.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-[22px] font-bold tracking-tight text-exam-text md:text-[26px]">
              회원가입하면 무료 진단으로 이어집니다
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
              가입하면 {subjectName}의 나머지 문항과 다른 두 과목을 더해{" "}
              <b className="text-exam-text">모두 {FREE_TOTAL}문항</b>을 결제 없이 풀 수 있습니다.
              지금 푼 {SET_QUESTIONS}문항은 그대로 이어지니 다시 풀지 않아도 됩니다.
            </p>
          </>
        )}
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
          onClick={() => closeExamWindow()}
          className="mt-6 text-[12px] text-exam-muted hover:underline"
        >
          창 닫기
        </button>
      </div>
    </div>
  );
}
