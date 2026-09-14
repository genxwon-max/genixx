import { questionsOf, subjects, type Question, type SubjectId } from "./exam";
import { reflectionReasons } from "./examStore";

/**
 * 한 아이가 낸 응시 원본 (EXP-04-1).
 *
 * 회원 채점 상세가 「이 아이가 본 평가」를 그대로 펴려면 답안지가 아니라 **시험지**가
 * 있어야 한다. 문항이 몇 번이었고, 무엇을 골랐고, 제출한 뒤 왜 그렇게 답했는지까지가
 * 한 화면에 서야 전문가가 「이 아이가 어디서 막혔나」를 읽는다.
 *
 * ── 어디서 오는 값인가 ──
 * 문항은 응시 화면이 쓰는 것 그대로다(lib/exam.ts). 아이가 실제로 본 시험지가 그것이고,
 * 여기서 문항을 따로 지어내면 관리자 화면과 응시 화면이 다른 시험을 말하게 된다.
 *
 * 답과 자아성찰은 응시 기록(lib/examStore.ts)에 쌓이는 값이지만, 그 기록은 **아이의
 * 브라우저**에만 있다. 콘솔에서는 볼 길이 없으므로 응시번호를 씨앗으로 지어낸다 —
 * 같은 응시번호는 언제 열어도 같은 답안이 나오고, 다른 응시번호는 다른 답안이 나온다.
 *
 * ⚠ 지어낸 값이다. 붙일 때는 응시 API가 실제 기록을 돌려주고 이 파일은 통째로 빠진다.
 *   그 사실을 화면에도 적어 둔다 — 적어 두지 않으면 시연에서 실제 답안으로 읽힌다.
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
 * 서술형에 아이가 쓴 답.
 *
 * 세 벌로 둔다 — 까닭까지 쓴 답 · 답만 쓴 답 · 무슨 말인지 못 잡은 답. 길이만 다르게
 * 두면 「짧아서 오답」이 되어, 이 화면에서 전문가가 가리려는 것(분량 아니라 내용)이
 * 자료에서부터 흐려진다.
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
   짐작하는 문장을 섞어 두면, 낱말 뜻을 묻는 문항에 표를 읽은 해설이 붙는다 */
const WHY_RIGHT = [
  "자료에 적힌 것을 그대로 짚었습니다. 고른 보기와 자료의 표현이 같은 뜻입니다.",
  "묻는 것과 고른 보기가 맞물립니다. 나머지 보기는 자료에 근거가 없습니다.",
  "자료를 끝까지 읽고 고른 것으로 보입니다. 앞부분만 보면 다른 보기도 그럴듯합니다.",
];

const WHY_WRONG = [
  "고른 보기는 자료에 나오는 말이지만 묻는 것과는 다릅니다. 발문이 무엇을 묻는지 다시 짚어야 합니다.",
  "흔한 오개념을 담은 보기를 골랐습니다. 배운 것을 반대로 적용한 것으로 보입니다.",
  "자료의 앞부분만 읽고 고른 것으로 보입니다. 뒤에 조건이 하나 더 붙어 있습니다.",
];

/** 서술형에 붙는 AI 채점 해설 — 지어낸 답의 결에 맞춘다 */
const ESSAY_WHY = {
  full: "묻는 것에 답했고, 그렇게 본 까닭을 자료에서 끌어왔습니다.",
  partial: "답은 바르게 짚었으나 까닭이 없거나 자료와 이어지지 않습니다.",
  none: "묻는 것과 다른 것을 적었거나 판단할 만한 내용이 적습니다.",
} as const;

/* ───────────────────────── 한 문항 ───────────────────────── */

export type SheetAnswer = {
  q: Question;
  /** 객관식에서 고른 보기 번호. 안 냈으면 null */
  picked: number | null;
  /** 서술형에 쓴 글. 안 냈으면 빈 문자열 */
  written: string;
  /** 답을 냈는가 */
  answered: boolean;
  /** 객관식 정오. 서술형은 null — 정오로 가를 수 없다 */
  correct: boolean | null;
  /** 자아성찰에서 고른 까닭 — 못 냄·고름·씀 세 벌 가운데 하나 */
  reflectKind: "blank" | "choice" | "essay";
  reflectPick: string;
  reflectPickText: string;
  /** 자아성찰에 덧붙여 쓴 글. 안 썼으면 빈 문자열 */
  reflectText: string;
  /** AI 채점 해설 */
  aiWhy: string;
  /** AI가 매긴 점수 — 객관식은 정오, 서술형은 판정을 만점으로 옮긴 값 */
  aiPoints: number | null;
  /** 이 문항의 만점 */
  max: number;
};

/**
 * 시험지 한 문항의 만점.
 *
 * 응시 화면이 문항마다 배점을 들고 있지 않아 여기서 못 박는다. 객관식과 서술형을 같은
 * 만점으로 두는 까닭은, 이 화면에서 배점이 「이 문항을 얼마나 해냈나」 하나만 뜻하기
 * 때문이다 — 유형마다 만점이 다르면 같은 5점이 문항마다 다른 무게가 된다.
 *
 * ⚠ 서술형 **응답 큐**(lib/expertStore.ts의 ScoreTask)는 이 값을 쓰지 않는다. 저쪽은 루브릭
 *   세 칸(완전 2 · 부분 1 · 오답 0)이 만점을 정하고, 그 값이 평가 채점 목록과 리포트에
 *   그대로 실린다. 두 자리는 재는 것이 달라 만점도 다르고, 화면은 줄마다 「/ N점」으로
 *   그 만점을 함께 적는다.
 */
export const QUESTION_POINT = 5;

/**
 * 서술형 응답 큐의 AI 판정을 시험지 만점으로 옮긴다.
 *
 * 채점 큐(EXP-04)는 루브릭 세 칸으로 판정하지만, 답안지에서 전문가가 보는 것은 점수 하나다 —
 * 「부분정답」이라는 말보다 「3점」이 이 화면에서 할 일을 바로 말한다. 판정을 그대로 옮겨
 * 시작값으로 깔아 두고, 전문가는 그 위에 숫자를 친다.
 *
 * ⚠ 이 표는 시작값을 정할 뿐이다. 저쪽 루브릭 점수(0·1·2)를 고치지 않는다 — 그 값은 평가
 *   채점 목록과 리포트가 그대로 읽는다.
 */
export const AI_POINT_OF: Record<"full" | "partial" | "none", number> = {
  full: 5,
  partial: 3,
  none: 0,
};

const pickOne = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)];

/**
 * 한 과목의 응시 원본을 짓는다.
 *
 * 문항 차례는 응시 화면과 같다(questionsOf). 아이가 1번부터 본 것을 전문가도 1번부터
 * 읽어야, 「3번에서 막혀 4번을 못 갔다」 같은 것이 보인다.
 */
export function answersOf(seat: string, subject: SubjectId): SheetAnswer[] {
  const r = rngOf(`${seat}:${subject}`);

  return questionsOf(subject).map((q): SheetAnswer => {
    /* 뒤로 갈수록 층이 올라가 못 내는 문항이 늘어난다 — S4에서 빈칸이 가장 잦다 */
    const hard = q.level === "S4" ? 0.3 : q.level === "S3" ? 0.16 : 0.06;
    const answered = r() > hard;

    if (q.type === "choice") {
      const right = answered && r() < 0.62;
      const picked = !answered
        ? null
        : right
          ? (q.answer ?? 0)
          : /* 틀린 보기 하나를 고른다 — 정답을 빼고 고른다 */
            (() => {
              const wrong = (q.choices ?? []).map((_, i) => i).filter((i) => i !== (q.answer ?? 0));
              return wrong[Math.floor(r() * wrong.length)] ?? 0;
            })();

      const kind = answered ? "choice" : "blank";
      const reason = pickOne(reflectionReasons[kind], r);
      return {
        q,
        picked,
        written: "",
        answered,
        correct: answered ? right : false,
        reflectKind: kind,
        reflectPick: reason.id,
        reflectPickText: reason.text,
        reflectText: r() < 0.45 ? pickOne(REFLECT_TEXTS[kind], r) : "",
        aiWhy: !answered
          ? "답을 내지 않았습니다. 자아성찰에 적은 까닭을 함께 보아 주세요."
          : right
            ? pickOne(WHY_RIGHT, r)
            : pickOne(WHY_WRONG, r),
        aiPoints: right ? QUESTION_POINT : 0,
        max: QUESTION_POINT,
      };
    }

    /* 서술형 — AI가 시작값을 깔고 전문가가 그 위에 숫자를 친다. 판정 이름(완전·부분·오답)은
       내지 않는다. 답안지에서 정하는 것은 점수 하나이고, 그 말은 평가 채점(EXP-04)의 말이다 */
    const roll = r();
    const grade: keyof typeof ESSAY_ANSWERS = roll < 0.34 ? "full" : roll < 0.72 ? "partial" : "none";
    const written = answered ? pickOne(ESSAY_ANSWERS[grade], r) : "";
    const kind = answered ? "essay" : "blank";
    const reason = pickOne(reflectionReasons[kind], r);

    return {
      q,
      picked: null,
      written,
      answered,
      correct: null,
      reflectKind: kind,
      reflectPick: reason.id,
      reflectPickText: reason.text,
      reflectText: r() < 0.5 ? pickOne(REFLECT_TEXTS[kind], r) : "",
      aiWhy: answered
        ? ESSAY_WHY[grade]
        : "답을 내지 않았습니다. 자아성찰에 적은 까닭을 함께 보아 주세요.",
      aiPoints: answered ? AI_POINT_OF[grade] : 0,
      max: QUESTION_POINT,
    };
  });
}

/** 과목 이름(국어)을 응시 화면의 열쇠(korean)로 — 채점 자료와 응시 자료가 쓰는 말이 다르다 */
export const subjectIdOf = (name: string): SubjectId | null =>
  subjects.find((s) => s.name === name || s.short === name)?.id ?? null;

export const subjectNameOf = (id: SubjectId) => subjects.find((s) => s.id === id)?.name ?? id;

/** 이 아이가 본 과목들의 응시 원본을 한 벌로 */
export function sheetAnswersOf(seat: string, subjectNames: string[]): SheetAnswer[] {
  const out: SheetAnswer[] = [];
  for (const name of subjectNames) {
    const id = subjectIdOf(name);
    if (id) out.push(...answersOf(seat, id));
  }
  return out;
}
