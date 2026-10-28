"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, GearIcon } from "@/components/Icons";
import { ListenClip, MicIcon, StopIcon, useDictation } from "./AnswerMedia";
import { navGhost, navPrimary } from "./ExamSession";

/**
 * 응시 전 점검 — 진단을 시작하기 전에 소리 · 마이크 · 화면 사용법을 한 단계씩 확인한다
 * (2026-10-28 요청). 응시 창을 열면 표지(문항지 첫 장)보다 먼저 선다.
 *
 *   1 시작 전 안내   준비할 것과 제한 시간
 *   2 듣기 점검      안내 음성을 틀고 「잘 들려요 / 안 들려요」를 고른다. 문항의 듣기와 같은 재생기다
 *   3 말하기 점검    문장을 소리 내어 읽으면 받아 적은 글이 보인다 — 응시 화면의 음성 입력과 같은 방식
 *   4 화면 사용법    응시 화면의 생김새 — 자료 · 문항 · 문항 이동, 체크, 톱니바퀴, 이전 · 다음, 제출하기
 *   5 마지막 확인    점검 결과와 응시 규칙을 짚는 체크 목록 — 모두 짚어야 「확인 완료」가 켜진다
 *
 * 아래 바는 응시 화면과 같다 — 가운데 「이전 · 다음」, 오른쪽 끝 「건너뛰기」. 건너뛰면 점검 없이
 * 표지로 간다. 점검은 필수가 아니다 — 듣기 · 말하기가 안 되어도 「다음」으로 넘어갈 수 있다.
 * 위쪽 단계 목록을 눌러 아무 단계로나 갈 수 있다.
 *
 * 디자인 보기(/design2/exam/session/check)는 initial로 단계와 점검 결과를 적어 넘긴다.
 */

export type ListenResult = "idle" | "ok" | "no";
export type SpeakResult = "idle" | "listening" | "ok" | "error" | "unsupported";

export type PrecheckState = {
  /** 지금 단계(0부터) */
  step: number;
  listen: ListenResult;
  speak: SpeakResult;
  /** 받아 적은 글 */
  heard: string;
  /** 말하기 점검이 안 될 때의 안내 */
  error: string;
  /** 마지막 확인의 체크 — checklist 차례대로 */
  checks: boolean[];
};

const steps = ["시작 전 안내", "듣기 점검", "말하기 점검", "화면 사용법", "마지막 확인"];

/** 말하기 점검에서 읽는 문장 */
export const PRECHECK_SENTENCE = "나는 오늘 재능 진단을 봅니다.";

/** 듣기 점검의 안내 음성 — 「안녕하세요. 소리 점검입니다. 이 목소리가 잘 들리면 …」 */
const SOUND_CHECK = "/audio/check/sound-check.wav";

/** 마지막 확인 — 셋트(비회원)는 시간도 응시 기회도 없어 뒤 두 줄이 다르다 */
const checklistOf = (timed: boolean) => [
  "소리가 잘 들렸습니다.",
  "말하기 점검을 마쳤습니다. (음성 입력은 쓰지 않아도 됩니다.)",
  "조용한 곳에서 혼자 풉니다.",
  timed
    ? "시작하면 제한 시간이 흐르고, 중간에 나가면 응시 기회가 사라지는 것을 압니다."
    : "중간에 나가면 처음 화면으로 돌아가는 것을 압니다.",
  timed
    ? "다 풀면 「제출하기」를 누릅니다. 시간이 끝나면 쓴 답까지 자동으로 제출됩니다."
    : "다 풀면 「제출하기」를 누릅니다.",
];

const choice = (on: boolean) =>
  `inline-flex h-10 items-center justify-center gap-1.5 rounded-[2px] border px-4 text-[13px] font-bold transition-colors ${
    on
      ? "border-exam-text bg-exam-text text-white"
      : "border-exam-line bg-exam-panel text-exam-text hover:border-exam-muted hover:bg-exam-raised"
  }`;

export default function ExamPrecheck({
  limitText,
  initial,
  onDone,
  onSkip,
}: {
  /** 제한 시간 — 「60분」 · 「40분」. 셋트(비회원)처럼 시간이 없으면 null */
  limitText: string | null;
  /** 처음 모습 — 디자인 보기가 상태마다 적어 넘긴다 */
  initial?: Partial<PrecheckState>;
  /** 마지막 확인을 마쳤을 때 */
  onDone: () => void;
  /** 「건너뛰기」 — 점검 없이 표지로 */
  onSkip: () => void;
}) {
  const [step, setStep] = useState(initial?.step ?? 0);
  const [listen, setListen] = useState<ListenResult>(initial?.listen ?? "idle");
  const [speak, setSpeak] = useState<SpeakResult>(initial?.speak ?? "idle");
  const checklist = checklistOf(limitText !== null);
  const [checks, setChecks] = useState<boolean[]>(
    initial?.checks ?? checklist.map(() => false),
  );

  /* 점검 결과는 마지막 확인의 첫 두 줄에 미리 짚어 둔다 — 같은 것을 두 번 묻지 않는다 */
  const go = (next: number) => {
    if (next === steps.length - 1) {
      setChecks((c) =>
        c.map((v, i) => (i === 0 && listen === "ok") || (i === 1 && speak === "ok") || v),
      );
    }
    setStep(next);
  };
  const last = step === steps.length - 1;
  const allChecked = checks.every(Boolean);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-exam-bg">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:py-10">
          {/* 단계 목록 — 눌러서 아무 단계로나 간다 */}
          <ol className="grid grid-cols-5 gap-1.5" aria-label="응시 전 점검 단계">
            {steps.map((label, i) => {
              const here = i === step;
              const passed = i < step;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={here ? "step" : undefined}
                    className="group flex w-full flex-col gap-1.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`h-1 w-full rounded-full ${
                        here || passed ? "bg-exam-text" : "bg-exam-line group-hover:bg-exam-muted/50"
                      }`}
                    />
                    <span
                      className={`text-[12px] tabular-nums ${
                        here ? "font-bold text-exam-text" : "text-exam-muted"
                      }`}
                    >
                      {i + 1}. {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-8">
            {step === 0 && <IntroStep limitText={limitText} />}
            {step === 1 && <ListenStep result={listen} onResult={setListen} />}
            {step === 2 && (
              <SpeakStep
                result={speak}
                heard={initial?.heard ?? ""}
                error={initial?.error ?? ""}
                onResult={setSpeak}
              />
            )}
            {step === 3 && <GuideStep />}
            {step === 4 && (
              <ConfirmStep
                checklist={checklist}
                checks={checks}
                onToggle={(i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
              />
            )}
          </div>
        </div>
      </div>

      {/* 아래 바 — 응시 화면과 같은 높이 · 같은 단추. 「건너뛰기」는 오른쪽 끝 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="relative mx-auto flex h-14 w-full max-w-[1600px] items-center justify-center gap-2 px-6 lg:px-10">
          <p className="mr-auto text-[12px] tabular-nums text-exam-muted lg:absolute lg:inset-y-0 lg:left-0 lg:mr-0 lg:flex lg:items-center lg:px-6">
            {step + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className={navGhost}
          >
            이전
          </button>
          {last ? (
            <button type="button" onClick={onDone} disabled={!allChecked} className={navPrimary}>
              확인 완료
            </button>
          ) : (
            <button type="button" onClick={() => go(step + 1)} className={navPrimary}>
              다음
            </button>
          )}
          <div className="ml-2 lg:absolute lg:inset-y-0 lg:right-0 lg:ml-0 lg:flex lg:items-center lg:px-6">
            <button
              type="button"
              onClick={onSkip}
              className="h-9 rounded-[2px] px-2 text-[13px] font-semibold text-exam-muted underline-offset-4 transition-colors hover:text-exam-text hover:underline"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 단계 머리 ───────────────────────── */

function StepHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="text-[22px] font-black tracking-tight text-exam-text md:text-[26px]">{title}</h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-exam-muted">{children}</p>
    </>
  );
}

/* ───────────────────────── 1 시작 전 안내 ───────────────────────── */

function IntroStep({ limitText }: { limitText: string | null }) {
  const items = [
    { t: "이어폰 또는 스피커", d: "듣기 문항이 있습니다. 소리가 나는지 다음 단계에서 확인합니다." },
    { t: "마이크", d: "말로 답하려면 필요합니다. 쓰지 않고 글로만 답해도 됩니다." },
    { t: "조용한 곳", d: "혼자 집중할 수 있는 곳에서 풀어 주세요." },
    { t: "충전과 인터넷", d: "푸는 중에 꺼지거나 끊기지 않게 미리 확인해 주세요." },
    ...(limitText
      ? [{ t: `제한 시간 ${limitText}`, d: "시작하면 시간이 흐르고, 끝나면 쓴 답까지 자동으로 제출됩니다." }]
      : []),
  ];
  return (
    <>
      <StepHead title="진단을 시작하기 전에 확인해 주세요">
        소리 · 마이크 · 화면 사용법을 다섯 단계로 확인합니다. 3분쯤 걸립니다. 확인할 것이 없으면
        오른쪽 아래 「건너뛰기」를 눌러 바로 시작해도 됩니다.
      </StepHead>
      <ul className="mt-7 divide-y divide-exam-line border-y border-exam-line">
        {items.map((it, i) => (
          <li key={it.t} className="flex gap-4 py-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-exam-line text-[12px] font-bold tabular-nums text-exam-muted">
              {i + 1}
            </span>
            <div>
              <p className="text-[15px] font-bold text-exam-text">{it.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-exam-muted">{it.d}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ───────────────────────── 2 듣기 점검 ───────────────────────── */

function ListenStep({
  result,
  onResult,
}: {
  result: ListenResult;
  onResult: (r: ListenResult) => void;
}) {
  return (
    <>
      <StepHead title="소리가 잘 들리는지 확인해 주세요">
        「소리 듣기」를 누르면 짧은 안내 음성이 나옵니다. 문항의 듣기와 같은 방식으로 재생됩니다.
        다 듣고 들렸는지 골라 주세요.
      </StepHead>

      <div className="mt-7">
        <ListenClip src={SOUND_CHECK} label="소리 듣기" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[14px] font-bold text-exam-text">소리가 들렸나요?</span>
        <button
          type="button"
          aria-pressed={result === "ok"}
          onClick={() => onResult("ok")}
          className={choice(result === "ok")}
        >
          잘 들려요
        </button>
        <button
          type="button"
          aria-pressed={result === "no"}
          onClick={() => onResult("no")}
          className={choice(result === "no")}
        >
          안 들려요
        </button>
      </div>

      {result === "ok" && <Pass>소리가 잘 들립니다. 듣기 문항을 풀 준비가 되었습니다.</Pass>}
      {result === "no" && (
        <Trouble
          title="이렇게 해 보세요"
          lines={[
            "기기의 소리가 꺼져 있지 않은지(음소거) 확인해 주세요.",
            "이어폰을 쓴다면 끝까지 꽂혀 있는지, 블루투스가 연결되어 있는지 확인해 주세요.",
            "소리를 키운 뒤 「소리 듣기」를 다시 눌러 주세요.",
            "그래도 들리지 않으면 보호자에게 알려 주세요. 듣기 문항은 소리를 들어야 풀 수 있습니다.",
          ]}
        />
      )}
    </>
  );
}

/* ───────────────────────── 3 말하기 점검 ───────────────────────── */

function SpeakStep({
  result,
  heard,
  error,
  onResult,
}: {
  result: SpeakResult;
  /** 처음에 보일 받아 적은 글 — 디자인 보기가 적어 넘긴다 */
  heard: string;
  /** 디자인 보기가 적어 넘긴 안내 — 실제로는 음성 입력이 돌려준 것을 쓴다 */
  error: string;
  onResult: (r: SpeakResult) => void;
}) {
  const [text, setText] = useState(heard);
  const d = useDictation((t) => setText((prev) => (prev ? `${prev} ${t}` : t)));

  /* 음성 입력의 상태를 점검 결과로 옮긴다. 한 번도 듣기 시작하지 않았으면 손대지 않는다 —
     디자인 보기가 적어 넘긴 처음 모습(듣는 중 · 입력됨 …)이 그대로 남아야 한다 */
  const started = useRef(false);
  useEffect(() => {
    if (d.error) {
      onResult("error");
      return;
    }
    if (d.listening) {
      started.current = true;
      onResult("listening");
      return;
    }
    if (started.current) onResult(text ? "ok" : "idle");
  }, [d.listening, d.error, text, onResult]);

  /* 음성 인식이 없는 브라우저(파이어폭스 등) — 아직 아무것도 하지 않았을 때만 그렇게 말한다 */
  const unsupported = result === "unsupported" || (!d.supported && result === "idle");
  const listening = result === "listening";
  const message = d.error || error;

  return (
    <>
      <StepHead title="말한 것이 글로 입력되는지 확인해 주세요">
        단답형 · 서술형 문항은 글을 쓰는 대신 말로 답할 수 있습니다(음성 입력). 「말하기 시작」을
        누르고 아래 문장을 소리 내어 읽어 주세요. 음성 입력은 쓰지 않아도 됩니다.
      </StepHead>

      <p className="font-myeongjo mt-7 rounded-[2px] border border-exam-line bg-exam-panel px-5 py-4 text-center text-[18px] text-exam-text">
        {PRECHECK_SENTENCE}
      </p>

      {unsupported ? (
        <Trouble
          title="이 브라우저에서는 음성 입력을 쓸 수 없습니다"
          lines={[
            "크롬이나 엣지에서 열면 쓸 수 있습니다.",
            "지금 그대로 진단을 봐도 됩니다. 답은 글로 쓰면 됩니다.",
          ]}
        />
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!listening) setText("");
                d.toggle();
              }}
              aria-pressed={listening}
              className={choice(listening)}
            >
              {listening ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
              {listening ? "끝내기" : result === "ok" ? "다시 해 보기" : "말하기 시작"}
            </button>
            {listening && (
              <p role="status" className="flex items-center gap-2 text-[13px] text-exam-muted">
                <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
                듣고 있습니다. 문장을 읽은 뒤 「끝내기」를 눌러 주세요.
              </p>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[12px] text-exam-muted">받아 적은 글</p>
            <p
              className={`mt-1.5 min-h-[3.25rem] rounded-[2px] border px-4 py-3 text-[15px] leading-relaxed ${
                text || d.interim
                  ? "border-exam-text bg-exam-panel text-exam-text"
                  : "border-dashed border-exam-line text-exam-muted"
              }`}
            >
              {text || d.interim || "말하면 여기에 글로 나옵니다."}
            </p>
          </div>

          {result === "ok" && (
            <Pass>
              말한 것이 글로 입력되었습니다. 문항에서도 「음성 입력」을 누르면 같은 방법으로 답할 수
              있습니다.
            </Pass>
          )}
          {result === "error" && message && (
            <Trouble
              title="마이크를 쓰지 못했습니다"
              lines={[
                message,
                "고친 뒤 「말하기 시작」을 다시 눌러 주세요.",
                "음성 입력 없이 글로만 답해도 진단을 볼 수 있습니다.",
              ]}
            />
          )}
        </>
      )}
    </>
  );
}

/* ───────────────────────── 4 화면 사용법 ───────────────────────── */

function GuideStep() {
  const notes = [
    { n: 1, t: "자료", d: "문항을 풀 때 읽는 글 · 표 · 그림입니다. 자료가 없는 문항은 가운데 칸만 섭니다." },
    { n: 2, t: "문항과 「체크」", d: "답을 고르거나 씁니다. 번호 위 「체크」를 누르면 다시 볼 문항으로 표시됩니다." },
    {
      n: 3,
      t: "문항 이동",
      d: "번호를 누르면 그 문항으로 갑니다. 검정은 푼 문항, 흰 칸은 안 푼 문항, ✓는 체크한 문항입니다.",
    },
    { n: 4, t: "화면 설정", d: "톱니바퀴를 누르면 글자 크기와 바탕색을 바꿀 수 있고, 맨 아래에 「나가기」가 있습니다." },
    { n: 5, t: "이전 · 다음", d: "앞뒤 문항으로 넘깁니다." },
    { n: 6, t: "제출하기", d: "어느 문항에서든 누를 수 있습니다. 안 푼 문항이 있으면 몇 개인지 알려 줍니다." },
  ];
  return (
    <>
      <StepHead title="응시 화면은 이렇게 생겼습니다">
        그림의 번호와 아래 설명을 맞춰 보세요. 시간이 정해진 진단은 화면 위 오른쪽에 남은 시간이
        나옵니다.
      </StepHead>

      {/* 응시 화면 축소 그림 — 번호는 아래 설명과 짝이다 */}
      <div
        aria-hidden
        className="mt-7 overflow-hidden rounded-[2px] border border-exam-text/60 bg-white font-sans text-[11px] text-exam-muted"
      >
        <div className="flex h-8 items-center justify-between border-b border-exam-line px-3">
          <span className="font-bold text-exam-text">진단 이름 · 과목</span>
          <span className="rounded-[2px] border border-exam-line px-1.5 py-0.5 tabular-nums">남은 시간 39:12</span>
        </div>
        <div className="grid h-40 grid-cols-[1.15fr_1fr_6.5rem] sm:h-44">
          <div className="relative border-r border-exam-line p-3">
            <Badge n={1} />
            <div className="mt-6 space-y-1.5">
              <div className="h-1.5 w-5/6 rounded bg-exam-line" />
              <div className="h-1.5 w-4/6 rounded bg-exam-line" />
              <div className="h-8 w-full rounded-[2px] border border-exam-line" />
            </div>
          </div>
          <div className="relative border-r border-exam-line p-3">
            <Badge n={2} />
            <span className="ml-7 inline-flex items-center gap-0.5 rounded-[2px] border border-exam-line px-1 text-[9px]">
              <span className="h-1.5 w-1.5 rounded-[1px] border border-exam-muted/60" />
              체크
            </span>
            <div className="mt-2 space-y-1.5">
              <div className="h-1.5 w-11/12 rounded bg-exam-line" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full border ${i === 1 ? "border-exam-text bg-exam-text" : "border-exam-line"}`} />
                  <span className="h-1.5 w-3/5 rounded bg-exam-line" />
                </div>
              ))}
            </div>
          </div>
          <div className="relative p-2.5">
            <Badge n={3} />
            <div className="mt-6 grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className={`relative flex h-4 items-center justify-center rounded-[1px] border text-[8px] ${
                    i <= 2 ? "border-exam-text bg-exam-text text-white" : "border-exam-line"
                  } ${i === 3 ? "ring-1 ring-exam-text ring-offset-1" : ""}`}
                >
                  {i}
                  {i === 2 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full border border-exam-text bg-white" />
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="relative flex h-9 items-center justify-center gap-1.5 border-t border-exam-line">
          <span className="absolute left-2 flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-exam-line">
              <GearIcon className="h-3 w-3" />
            </span>
            <Badge n={4} inline />
          </span>
          <Badge n={5} inline />
          <span className="rounded-[2px] border border-exam-line px-2 py-0.5">이전</span>
          <span className="rounded-[2px] bg-soft-primary px-2 py-0.5 text-white">다음</span>
          <span className="absolute right-2 flex items-center gap-1">
            <Badge n={6} inline />
            <span className="rounded-[2px] bg-soft-primary px-2 py-0.5 text-white">제출하기</span>
          </span>
        </div>
      </div>

      <ol className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {notes.map((it) => (
          <li key={it.n} className="flex gap-3">
            <Badge n={it.n} inline />
            <div>
              <p className="text-[14px] font-bold text-exam-text">{it.t}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-exam-muted">{it.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function Badge({ n, inline = false }: { n: number; inline?: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-exam-text text-[11px] font-bold text-white ${
        inline ? "" : "absolute top-2 left-2"
      }`}
    >
      {n}
    </span>
  );
}

/* ───────────────────────── 5 마지막 확인 ───────────────────────── */

function ConfirmStep({
  checklist,
  checks,
  onToggle,
}: {
  checklist: string[];
  checks: boolean[];
  onToggle: (i: number) => void;
}) {
  const count = checks.filter(Boolean).length;
  return (
    <>
      <StepHead title="마지막으로 확인해 주세요">
        모두 확인하면 「확인 완료」가 켜집니다. 누르면 문항지 첫 장이 나오고, 그 장의 「진단 시작」을
        눌러야 시간이 흐르기 시작합니다.
      </StepHead>

      <ul className="mt-7 divide-y divide-exam-line border-y border-exam-line">
        {checklist.map((text, i) => {
          const on = checks[i];
          return (
            <li key={text}>
              <label className="flex cursor-pointer items-start gap-3 py-3.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(i)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border ${
                    on ? "border-exam-text bg-exam-text text-white" : "border-exam-muted/60 bg-exam-panel"
                  }`}
                >
                  {on && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className={`text-[14px] leading-relaxed ${on ? "text-exam-text" : "text-exam-muted"}`}>
                  {text}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-right text-[12px] tabular-nums text-exam-muted">
        {checklist.length}개 중 {count}개 확인
      </p>
    </>
  );
}

/* ───────────────────────── 결과 안내 ───────────────────────── */

function Pass({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 flex items-start gap-2 rounded-[2px] border border-exam-text px-4 py-3 text-[14px] leading-relaxed text-exam-text">
      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
      {children}
    </p>
  );
}

function Trouble({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="mt-5 rounded-[2px] border border-exam-line bg-exam-raised px-4 py-3.5">
      <p className="text-[14px] font-bold text-exam-text">{title}</p>
      <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-exam-muted">
        {lines.map((l) => (
          <li key={l}>· {l}</li>
        ))}
      </ul>
    </div>
  );
}
