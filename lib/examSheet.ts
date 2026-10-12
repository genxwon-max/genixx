import {
  SLOT,
  autoGraded,
  examOrderOf,
  joinBlanks,
  joinUpload,
  pointsOf,
  slotCount,
  subjects,
  type Blank,
  type Question,
  type SubjectId,
} from "./exam";
import { reflectionReasons } from "./examStore";
import type { GradeLine, GradeSubject } from "./gradeSheet";

/**
 * 한 아이가 낸 응시 원본 (EXP-04-1).
 *
 * 회원 채점 상세가 「이 아이가 본 진단」을 그대로 펴려면 답안지가 아니라 **시험지**가
 * 있어야 한다. 문항이 몇 번이었고, 무엇을 골랐고, 제출한 뒤 왜 그렇게 답했는지까지가
 * 한 화면에 있어야 전문가가 「이 아이가 어디서 막혔나」를 읽는다.
 *
 * ── 어디서 오는 값인가 ──
 * 문항은 응시 화면이 쓰는 것 그대로다(lib/exam.ts). 아이가 실제로 본 시험지가 그것이고,
 * 여기서 문항을 따로 지어내면 관리자 화면과 응시 화면이 다른 시험을 말하게 된다.
 *
 * 답과 자아성찰은 응시 기록(lib/examStore.ts)에 쌓이는 값이지만, 그 기록은 **아이의
 * 브라우저**에만 있다. 콘솔에서는 볼 길이 없으므로 응시번호를 씨앗으로 지어낸다 —
 * 같은 응시번호는 언제 열어도 같은 답안이 나오고, 다른 응시번호는 다른 답안이 나온다.
 *
 * ── 답은 응시 기록과 같은 꼴로 짓는다 ──
 * 채점 창은 응시 화면의 조각으로 시험지를 그대로 그린다(components/exam/GradeDialog.tsx).
 * 그래서 낸 답도 응시 기록에 적히는 꼴 — 고른 보기의 차례, 칸마다 쓴 글, 올린 사진의 열쇠,
 * 그림 칸에 그은 선 — 그대로 짓는다. 사진과 그림은 사이트에 실어 둔 예시 그림을 쓴다.
 *
 * ⚠ 지어낸 값이다. 붙일 때는 응시 API가 실제 기록을 돌려주고 이 파일은 통째로 빠진다.
 *
 * ⚠ 자아성찰의 고르개는 응시 화면이 쓰는 것과 **같은 목록**이다(lib/examStore.ts의
 *   reflectionReasons). 여기에 따로 적어 두면 아이가 고른 문장과 전문가가 읽는 문장이
 *   갈린다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 목록과 상세가 함께 읽는다.
 */

/* ───────────────────────── 씨앗 난수 ───────────────────────── */

/** 응시번호 한 글자씩 섞어 32비트 씨앗으로 — 같은 번호는 늘 같은 답안이 된다 */
function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngOf(text: string) {
  let s = seedOf(text) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/* ───────────────────────── 지어내는 값 ───────────────────────── */

/**
 * 서술형 · 논술형에 아이가 쓴 답.
 *
 * 세 벌로 둔다 — 이유까지 쓴 답 · 답만 쓴 답 · 무슨 말인지 못 잡은 답. 길이만 다르게
 * 두면 「짧아서 오답」이 되어, 전문가가 가리려는 것(분량 아니라 내용)이 자료에서부터 흐려진다.
 */
const ESSAY_ANSWERS = {
  full: [
    "글쓴이가 마지막 문단에서 그렇게 말했기 때문입니다. 앞에서 든 예와 이어져서 그렇게 봤어요.",
    "표에서 두 값이 함께 커지는 것을 보고 그렇게 생각했습니다. 그래서 관계가 있다고 봤어요.",
    "실험에서 조건을 하나만 바꿨기 때문에 그 조건 때문이라고 볼 수 있습니다.",
  ],
  partial: [
    "그렇게 하면 될 것 같아서요.",
    "표를 보니까 그런 것 같았습니다.",
    "앞에서 그렇게 나왔어요.",
  ],
  none: [
    "잘 모르겠습니다.",
    "시간이 부족해서 다 쓰지 못했어요.",
    "문제가 무슨 말인지 잘 모르겠어요.",
  ],
} as const;

type Grade = keyof typeof ESSAY_ANSWERS;

/** 사진으로 낸 답과 그림 칸에 그은 선 — 사이트에 실어 둔 예시 그림 */
const PHOTO = "/images/answers/answer-math-12.svg";
const DRAWINGS = ["/images/answers/answer-sci-16-past.svg", "/images/answers/answer-sci-16-future.svg"];

/** 자아성찰에 덧붙여 쓴 글 — 고르기만 하고 안 쓰는 아이가 많아 절반쯤은 비운다 */
const REFLECT_TEXTS = {
  blank: [
    "다시 읽어 봐도 어디를 봐야 하는지 모르겠었어요.",
    "앞 문제 푸느라 시간이 없었어요.",
  ],
  choice: [
    "2번이랑 3번 중에 고민했는데 3번이 더 맞는 것 같았어요.",
    "자료 두 번째 줄에 그렇게 써 있어서 골랐어요.",
    "나머지는 아닌 것 같아서 남은 걸 골랐어요.",
  ],
  essay: [
    "쓸 말은 생각났는데 문장으로 만들기가 어려웠어요.",
    "자료에서 찾은 말을 그대로 옮겨 적었어요.",
  ],
} as const;

/**
 * AI 채점 해설.
 *
 * 객관식은 정오가 이미 답을 말하므로 **왜 그 보기가 답인지**를 적는다. 「정답입니다」만
 * 적어 두면 전문가가 읽을 것이 없고, 그 줄은 점수 칸이 이미 말하고 있다.
 */
/* ⚠ 문항을 가리지 않는 말로만 쓴다. 「두 값이 함께 움직이는 것을 보고」처럼 자료의 꼴을
   짐작하는 문장을 섞어 두면, 단어 뜻을 묻는 문항에 표를 읽은 해설이 붙는다 */
const WHY_RIGHT = [
  "자료에 적힌 것을 그대로 짚었습니다. 낸 답과 자료의 표현이 같은 뜻입니다.",
  "묻는 것과 낸 답이 맞물립니다. 다른 답은 자료에 근거가 없습니다.",
  "자료를 끝까지 읽고 답한 것으로 보입니다. 앞부분만 보면 다른 답도 그럴듯합니다.",
];

const WHY_WRONG = [
  "낸 답은 자료에 나오는 말이지만 묻는 것과는 다릅니다. 발문이 무엇을 묻는지 다시 확인해야 합니다.",
  "흔한 오개념을 담은 답을 냈습니다. 배운 것을 반대로 적용한 것으로 보입니다.",
  "자료의 앞부분만 읽고 답한 것으로 보입니다. 뒤에 조건이 하나 더 붙어 있습니다.",
];

/** 서술형 · 논술형에 붙는 AI 채점 해설 — 지어낸 답의 결에 맞춘다 */
const ESSAY_WHY: Record<Grade, string> = {
  full: "묻는 것에 답했고, 그렇게 본 이유를 자료에서 끌어왔습니다.",
  partial: "답은 바르게 짚었으나 이유가 없거나 자료와 이어지지 않습니다.",
  none: "묻는 것과 다른 것을 적었거나 판단할 만한 내용이 적습니다.",
};

const NO_ANSWER_WHY = "답을 내지 않았습니다. 자아성찰에 적은 이유를 함께 보아 주세요.";
/* AI는 사진을 채점하지 않고 손글씨를 글로 바꾸지도 않는다 — 채점자가 사진을 직접 본다 */
const PHOTO_WHY = "사진으로 낸 답은 AI가 채점하지 않습니다. 사진을 보고 점수를 매겨 주세요.";

const pickOne = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)];

/** 예시 답의 괄호 속 글자들 — 「강물은 ( A )보다 ( B )에서 …」 → A, B */
const slotsIn = (text: string) => [...text.matchAll(/\(\s*([^()]+?)\s*\)/g)].map((m) => m[1]);

/** 단답형 칸에 적은 오답 */
function wrongBlank(b: Blank, all: Blank[], k: number) {
  if (b.options) return b.options.find((o) => o !== b.accept?.[0]) ?? "";
  const key = b.accept?.[0] ?? "";
  if (/^-?\d+(\.\d+)?$/.test(key)) return (Number(key) + 0.3).toFixed(key.includes(".") ? 1 : 0);
  /* 칸이 둘 이상이면 옆 칸의 답과 바꿔 적는다 — 흔한 오답이다 */
  return all[(k + 1) % all.length]?.accept?.[0] ?? "모르겠음";
}

/** 전문가가 채점하는 칸(서술형)에 적은 것 — 칸의 모양마다 */
function writtenBlank(q: Question, b: Blank, k: number, grade: Grade, r: () => number) {
  const sample = q.sampleAnswer?.[k] ?? "";
  if (b.options) {
    const fit = b.options.find((o) => o === sample);
    return grade === "none" ? (b.options.find((o) => o !== fit) ?? b.options[0]) : (fit ?? b.options[0]);
  }
  if (b.template) {
    const found = slotsIn(sample);
    const slots = Array.from({ length: slotCount(b.template) }, (_, i) => found[i] ?? "가");
    return (grade === "none" ? slots.slice().reverse() : slots).join(SLOT);
  }
  if (b.draw !== undefined) return grade === "none" ? "" : DRAWINGS[k % DRAWINGS.length];
  if (b.short) return grade === "none" ? "0" : sample || "1";
  return pickOne(ESSAY_ANSWERS[grade], r);
}

/** 서술형 · 논술형에서 AI가 매긴 점수 — 만점 · 절반쯤 · 0점 */
const aiPointOf = (max: number, grade: Grade) =>
  grade === "full" ? max : grade === "none" ? 0 : max >= 2 ? Math.ceil(max / 2) : 0.5;

/* ───────────────────────── 한 과목 ───────────────────────── */

/**
 * 한 과목의 응시 원본을 짓는다.
 *
 * 문항 차례는 응시 화면과 같다(examOrderOf). 아이가 1번부터 본 것을 전문가도 1번부터
 * 읽어야, 「3번에서 막혀 4번을 못 갔다」 같은 것이 보인다.
 */
export function answersOf(seat: string, subject: SubjectId): GradeLine[] {
  const r = rngOf(`${seat}:${subject}`);

  return examOrderOf(subject).map((q, i): GradeLine => {
    /* 뒤로 갈수록 층이 올라가 못 내는 문항이 늘어난다 — S4에서 빈칸이 가장 잦다 */
    const hard = q.level === "S4" ? 0.3 : q.level === "S3" ? 0.16 : 0.06;
    const answered = r() > hard;
    const max = pointsOf(q);
    const kind = !answered ? "blank" : q.type === "choice" ? "choice" : "essay";
    const reason = pickOne(reflectionReasons[kind], r);
    const reflect = {
      pick: reason.text,
      text: r() < (kind === "choice" ? 0.45 : 0.5) ? pickOne(REFLECT_TEXTS[kind], r) : "",
    };
    const base = { q, no: i + 1, max, reflect };

    /* 기계로 채점하는 문항 — 객관식과 단답형 */
    if (autoGraded(q)) {
      const right = answered && r() < 0.62;
      let value: number | string | undefined;
      if (!answered) value = undefined;
      else if (q.type === "choice") {
        const wrong = (q.choices ?? []).map((_, k) => k).filter((k) => k !== (q.answer ?? 0));
        value = right ? (q.answer ?? 0) : (wrong[Math.floor(r() * wrong.length)] ?? 0);
      } else {
        value = joinBlanks(
          q.blanks!.map((b, k) =>
            b.optional ? "" : right ? (b.accept?.[0] ?? "") : wrongBlank(b, q.blanks!, k),
          ),
        );
      }
      return {
        ...base,
        value,
        ai: right ? max : 0,
        aiWhy: !answered ? NO_ANSWER_WHY : right ? pickOne(WHY_RIGHT, r) : pickOne(WHY_WRONG, r),
      };
    }

    /* 전문가가 채점하는 문항 — AI가 시작값을 깔고 채점자가 그 위에서 고친다 */
    const roll = r();
    const grade: Grade = roll < 0.34 ? "full" : roll < 0.72 ? "partial" : "none";

    if (q.upload) {
      return {
        ...base,
        value: answered ? joinUpload({ media: "image", key: PHOTO }) : undefined,
        /* 올린 사진에는 AI가 점수를 매기지 않는다. 올리지 않았으면 0점이다 */
        ai: answered ? null : 0,
        aiWhy: answered ? PHOTO_WHY : NO_ANSWER_WHY,
      };
    }

    const value = !answered
      ? undefined
      : q.blanks
        ? joinBlanks(q.blanks.map((b, k) => writtenBlank(q, b, k, grade, r)))
        : pickOne(ESSAY_ANSWERS[grade], r);

    return {
      ...base,
      value,
      ai: answered ? aiPointOf(max, grade) : 0,
      aiWhy: answered ? ESSAY_WHY[grade] : NO_ANSWER_WHY,
    };
  });
}

/** 과목 이름(국어)을 응시 화면의 열쇠(korean)로 — 채점 자료와 응시 자료가 쓰는 말이 다르다 */
export const subjectIdOf = (name: string): SubjectId | null =>
  subjects.find((s) => s.name === name || s.short === name)?.id ?? null;

export const subjectNameOf = (id: SubjectId) => subjects.find((s) => s.id === id)?.name ?? id;

/**
 * 이 아이가 본 과목들의 응시 원본 — 과목마다 한 벌, 과목 목록의 차례(국어 · 수학 · 과학)대로.
 * 안 본 과목의 시험지는 짓지 않는다. 지어 두면 전부 빈칸으로 서서 「안 냈다」로 읽힌다.
 */
export function sheetSubjects(seat: string, subjectNames: string[]): GradeSubject[] {
  const taken = new Set(subjectNames.map(subjectIdOf));
  return subjects
    .filter((s) => taken.has(s.id))
    .map((s) => ({ id: s.id, short: s.short, lines: answersOf(seat, s.id) }));
}
