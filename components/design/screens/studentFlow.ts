import type { CatalogRound, CatalogSubject } from "@/lib/catalogRounds";
import {
  SLOT,
  SUBJECT_IDS,
  assessment,
  autoGraded,
  joinBlanks,
  joinPairs,
  joinUpload,
  markOf,
  pointsOf,
  subjects,
  tierQuestions,
  unanswered,
  type Bank,
  type ExamTier,
  type Pair,
  type SubjectId,
} from "@/lib/exam";
import { evalName, trackOf, type Availability, type TrackId } from "@/lib/examCatalog";
import { matchBank, matchQuestion, slotBank, slotQuestion } from "@/lib/examDesign";
import type { ExamRecord, SubjectRecord } from "@/lib/examStore";
import { gradesOf, type GradeLine, type GradeMarks, type GradeSubject } from "@/lib/gradeSheet";
import type { TicketUse, UseTier, Wallet } from "@/lib/ticketStore";
import type { Registration } from "@/components/exam/Registrations";

/**
 * 학생 대시보드 디자인이 함께 쓰는 예시 값 — 진단 접수 · 내 진단 · 정답과 해설 · 진단 결과.
 *
 * 운영 콘솔의 「회원 채점」 디자인도 이 학생의 3분기 답안지를 채점한다(파일 끝의 flowSheet).
 *
 * 네 화면이 같은 학생의 같은 진단을 말해야 한다. 화면마다 예시를 따로 지으면 접수한 진단이
 * 「내 진단」에는 없고, 정답을 본 진단의 결과가 목록에 없는 일이 생긴다. 그래서 학생 한 명과
 * 그 학생의 진단 넷을 여기 한곳에 적어 두고, 화면은 이 값을 읽어 그린다.
 *
 * 저장소를 읽지 않는다. 회차 · 접수 기록 · 답안이 모두 이 파일에 적힌 값이다. 문항만은 실제
 * 문항 은행(lib/examQuestions.ts)을 그대로 쓴다 — 코드에 적힌 값이라 누가 열어도 같다.
 *
 *   학생     이서준 · 초등 4학년(만 14세 미만)
 *   오늘     2026년 10월 12일
 *
 *   2026 4분기 초4 진단   응시 기간 10.06 ~ 10.31   지금 접수 · 응시하는 진단
 *   2026 3분기 초4 진단   유료 · 최종 제출 08.24 · 결과 발행 10.02
 *   2026 2분기 초4 진단   무료 · 최종 제출 05.20 · 결과 발행 06.13
 *   2026 1분기 초4 진단   무료 · 기간 안에 최종 제출하지 않음
 */

export const flowStudent = {
  name: "이서준",
  grade: "초등 4학년",
  track: "e4" as TrackId,
  /** 접속코드 — 결과지 머리에 적는다 */
  code: "S8QN-4TKD",
};

/* ───────────────────────── 회차 ───────────────────────── */

const SUBJECTS: CatalogSubject[] = subjects.map((s) => ({
  id: s.id,
  name: s.short,
  minutes: s.limitMin,
}));

const round = (
  id: string,
  availability: Availability,
  opensOn: string,
  closesOn: string,
): CatalogRound => ({
  id,
  label: id,
  availability,
  opensOn,
  closesOn,
  price: 39_000,
  salePrice: null,
  subjects: SUBJECTS,
});

/** 진단 목록에 세우는 회차 — 접수 중 하나 · 접수 예정 하나 · 지난 것 다섯 */
export const flowRounds: CatalogRound[] = [
  round("2027-1", "soon", "2027-02-01", "2027-02-28"),
  round("2026-4", "open", "2026-10-06", "2026-10-31"),
  round("2026-3", "ended", "2026-08-01", "2026-08-31"),
  round("2026-2", "ended", "2026-05-01", "2026-05-31"),
  round("2026-1", "ended", "2026-02-01", "2026-02-28"),
  round("2025-4", "ended", "2025-11-01", "2025-11-30"),
  round("2025-3", "ended", "2025-08-01", "2025-08-31"),
];

export const flowRound = (id: string) => flowRounds.find((r) => r.id === id)!;

/* ───────────────────────── 접수 기록 ───────────────────────── */

const reg = (roundId: string, tier: UseTier, at: string): Registration => ({
  round: roundId,
  track: flowStudent.track,
  tier,
  at,
  info: flowRound(roundId),
  title: `${assessment.name} ${evalName(roundId, flowStudent.track)} · ${trackOf(flowStudent.track).short}`,
});

/** 이서준이 접수한 진단 — 열쇠는 분기다 */
export const flowRegs = {
  /** 지금 응시하는 진단 — 응시권으로 접수했다 */
  q4: reg("2026-4", "paid", "2026-10-06T01:10:00.000Z"),
  /** 같은 진단을 응시권 없이 접수했을 때 */
  q4free: reg("2026-4", "free", "2026-10-06T01:10:00.000Z"),
  q3: reg("2026-3", "paid", "2026-08-03T02:00:00.000Z"),
  q2: reg("2026-2", "free", "2026-05-11T02:00:00.000Z"),
  q1: reg("2026-1", "free", "2026-02-09T02:00:00.000Z"),
};

/** 진단마다 화면에 적는 날짜와 결과 — 실제 화면은 기록과 리포트에서 읽는 값이다 */
export const flowFacts = {
  q4: { name: evalName("2026-4", "e4"), period: "응시 기간 2026.10.06 ~ 2026.10.31", daysLeft: 19 },
  q3: {
    name: evalName("2026-3", "e4"),
    period: "응시 기간 2026.08.01 ~ 2026.08.31",
    finalized: "2026.08.24",
    published: "2026.10.02",
    type: "NLM형 · 관찰 탐구가형",
  },
  q2: {
    name: evalName("2026-2", "e4"),
    period: "응시 기간 2026.05.01 ~ 2026.05.31",
    finalized: "2026.05.20",
    published: "2026.06.13",
    type: "NML형 · 관찰 탐구가형",
  },
  q1: { name: evalName("2026-1", "e4"), period: "응시 기간 2026.02.01 ~ 2026.02.28" },
};

const ticketOf = (r: Registration): TicketUse => ({ round: r.round, track: r.track, tier: r.tier, at: r.at });
const past: TicketUse[] = [ticketOf(flowRegs.q1), ticketOf(flowRegs.q2), ticketOf(flowRegs.q3)];

/**
 * 응시권과 접수 기록 — 「진단 접수」의 줄 끝 단추와 접수 창이 이것을 보고 갈린다.
 *
 * 응시권이 한 매라도 남아 있으면 유료 진단으로, 없으면 무료 진단으로 접수된다
 * (components/exam/ApplyFlow.tsx). 지난 3분기에 한 매를 썼다.
 */
export const flowWallets = {
  /** 접수 전 · 응시권 1매 남음 */
  ticket: { owned: 2, used: past },
  /** 접수 전 · 응시권 없음 */
  noTicket: { owned: 1, used: past },
  /** 4분기를 유료 진단으로 접수한 뒤 */
  appliedPaid: { owned: 2, used: [...past, ticketOf(flowRegs.q4)] },
  /** 4분기를 무료 진단으로 접수한 뒤 */
  appliedFree: { owned: 1, used: [...past, ticketOf(flowRegs.q4free)] },
} satisfies Record<string, Wallet>;

/* ───────────────────────── 답안 ───────────────────────── */

/** 오답으로 적은 단답 — 문항 ID → 칸마다 쓴 글. 여기 없는 오답 문항은 객관식이다 */
const wrongBlanks: Record<string, string[]> = {
  "sci-1": ["기체", "고체"],
  "sci-18": ["2.4"],
};

/** 문장 속 괄호가 여럿인 칸(「강물은 ( )보다 ( )에서 …」)에 적은 값 */
const slots = (...values: string[]) => values.join(SLOT);

/**
 * 서술형 · 논술형에 적은 글 — 문항 ID → 쓴 글. 여기 없는 문항은 쓰지 않은 것이다.
 *
 * 긴 글 칸 하나뿐인 문항(논술형)은 글 하나, 칸이 여럿인 문항(서술형)은 칸 차례대로 적는다.
 * 정오표가 쓴 글을 줄이지 않고 모두 보여 주는 것이 보이도록 「kor-8」은 길게 썼다. 그림 칸은
 * 사이트에 실어 둔 그림(선만 그은 것)의 주소를 적는다.
 */
const essays: Record<string, string | string[]> = {
  "kor-7":
    "민서가 화단에 심은 씨앗이 자랐는지 보려고 날마다 아침에 창문을 여는 이야기야. 싹이 늦게 나도 기다리는 마음을 배우게 돼.",
  "kor-8":
    "민서는 씨앗을 심고 첫날에도 둘째 날에도 흙이 그대로여서 많이 걱정했을 것 같다. 혹시 씨앗이 잘못된 것은 아닐까, 내가 물을 잘못 준 것은 아닐까 하고 속으로 여러 번 생각했을 것이다. 그래도 물 주는 일을 거르지 않은 것을 보면 민서는 싹이 날 거라고 믿는 마음이 더 컸던 것 같다. 사흘째 아침에 초록빛이 보였을 때는 소리를 지를 뻔할 만큼 기뻤을 것이다.\n\n싹이 나지 않아 속상해하는 친구에게는 이렇게 말해 주고 싶다. “씨앗은 흙 속에서 우리가 못 보는 동안에도 조금씩 자라고 있어. 민서도 사흘이나 기다렸더니 싹이 났대. 물을 잊지 말고 주면서 며칠만 더 기다려 보자. 나도 같이 지켜봐 줄게.”",
  "kor-10": "제목: 기다리는 아침. 민서가 날마다 아침에 창문을 열고 싹을 기다렸기 때문이다.",
  "kor-9":
    "“도서관은 2층 계단 옆에 있어요.”를 맨 위에 넣고 싶다. 1학년은 도서관이 어디에 있는지 모를 수 있기 때문이다.",
  "math-9": "사탕 84개를 7명이 똑같이 나누어 가지면 한 명이 몇 개씩 가질까요?",
  "math-10": "3씩 커지는 규칙으로 정했다. 2, 5, 8, 11, 14",
  "math-7": "가로와 세로를 더한 다음 2를 곱하면 둘레가 된다.",
  "math-8": "가로를 두 번 더하고 세로를 두 번 더한 다음 모두 합친다. 앞에서 구한 답과 같았다.",
  "sci-2": [
    "등잔은 기름을 그릇에 담아서 쓰고, 초는 굳은 것을 그대로 쓴다.",
    "둘 다 심지에 불을 붙여서 어두운 곳을 밝힌다.",
  ],
  "sci-3": [
    "기름은 깨나 생선에서 쉽게 얻을 수 있지만 밀랍은 구하기 어려웠다.",
    "초는 굳힌 것 가운데에 심지를 넣어야 해서 만들기가 더 어려웠다.",
  ],
  "sci-4": [
    "불 때문에 뜨거워진 공기가 위로 올라가기 때문이다.",
    "촛불 옆에서 부채질을 해서 불꽃이 옆으로 눕는지 본다.",
  ],
  "sci-7": [
    "(ㄴ) 동의하지 않음",
    "구름 A가 더 멀리 있으면 같은 빠르기로 움직여도 사진에서는 조금만 움직인 것처럼 보이기 때문이다.",
  ],
  "sci-8": ["270", "구름의 왼쪽이 더 밝게 빛나고 있어서 해가 왼쪽인 서쪽에 있다고 생각했다."],
  "sci-10": ["연잎 B가 연잎 A 아래에 가려져 있어서 햇빛을 덜 받기 때문이다."],
  "sci-11": [
    "연잎이 물을 밖으로 내보내면서 스스로 시원해진다.",
    "연못의 물이 공기보다 차가워서 연잎도 시원해진다.",
  ],
  "sci-12": ["Sp1과 Sp4는 잎과 줄기가 이어진 곳이라 물이 덜 빠져나가서 더 뜨거운 것 같다.", ""],
  "sci-13": [slots("A", "B"), "A 쪽에는 모래가 쌓여 있어서 물이 천천히 흐르는 것 같다."],
  "sci-14": [
    slots("D", "C"),
    "선암마을 앞에 모래가 쌓여 있어서 그쪽 물이 느리게 흐른다고 생각했다.",
  ],
  "sci-15": ["강물이 마을 반대쪽으로 세게 부딪치면서 흘러서 마을 쪽에는 물이 덜 온다.", ""],
  "sci-16": ["/images/answers/answer-sci-16-past.svg", "/images/answers/answer-sci-16-future.svg"],
  "sci-19": [
    slots("B"),
    "학생 B는 열 번 왔다 갔다 한 시간을 재서 10으로 나누었기 때문에 한 번만 잰 것보다 값이 덜 흔들린다.",
  ],
  "sci-20": ["공전", slots("칫솔 교체")],
};

/**
 * 사진으로 낸 답 — 문항 ID → 사이트에 실어 둔 예시 사진.
 * 실제 화면은 올린 사진을 브라우저의 파일 저장소에서 읽는다(lib/answerMedia.ts). 디자인은
 * 누가 열어도 같아야 하므로 주소가 곧 열쇠인 답을 적는다.
 */
const photos: Record<string, string> = {
  "math-12": "/images/answers/answer-math-12.svg",
};

/**
 * 한 과목의 답 — 오답 문항과 비운 문항만 짚고, 기계로 채점하는 나머지는 정답으로 적는다.
 * 서술형 · 논술형 · 사진은 위에 적어 둔 것(essays · photos)을 낸 답으로 싣고, 없으면 비워 둔다.
 */
function answersOf(
  tier: ExamTier,
  subject: SubjectId,
  wrong: string[],
  empty: string[],
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const q of tierQuestions(tier, subject)) {
    if (empty.includes(q.id)) continue;
    if (q.upload) {
      if (photos[q.id]) out[q.id] = joinUpload({ media: "image", key: photos[q.id] });
    } else if (q.type === "choice") {
      const n = q.choices?.length ?? 1;
      out[q.id] = wrong.includes(q.id) ? (q.answer! + 1) % n : q.answer!;
    } else if (autoGraded(q)) {
      out[q.id] = joinBlanks(
        wrong.includes(q.id)
          ? (wrongBlanks[q.id] ?? q.blanks!.map(() => ""))
          : q.blanks!.map((b) => (b.optional ? "" : (b.accept?.[0] ?? ""))),
      );
    } else if (essays[q.id]) {
      const written = essays[q.id];
      out[q.id] = Array.isArray(written) ? joinBlanks(written) : written;
    }
  }
  return out;
}

const submitted = (answers: Record<string, number | string>, at: string): SubjectRecord => ({
  answers,
  marks: [],
  status: "submitted",
  startedAt: at,
  submittedAt: at,
  limitMin: 40,
  attemptsLeft: 1,
  reflections: {},
  reflectionPicks: {},
  reflectionAt: at,
});

function finalizedRecord(
  tier: ExamTier,
  at: string,
  wrong: string[],
  empty: string[],
): ExamRecord {
  return {
    tier,
    setSubject: null,
    subjects: Object.fromEntries(
      SUBJECT_IDS.map((id) => [id, submitted(answersOf(tier, id, wrong, empty), at)]),
    ) as Record<SubjectId, SubjectRecord>,
    surveys: { student: "done", guardian: "done", teacher: "none" },
    surveyAnswers: {},
    surveyAt: {},
    surveyVersion: {},
    finalized: true,
    finalizedAt: at,
  };
}

/** 정답과 해설이 펴는 응시 기록 — 3분기는 유료 진단(편성 문항 전부), 2분기는 무료 진단(20문항) */
export const flowRecords = {
  q3: finalizedRecord(
    "paid",
    "2026-08-24T05:20:00.000Z",
    ["kor-3", "math-4", "math-3", "sci-9", "sci-18"],
    ["kor-6", "math-6"],
  ),
  q2: finalizedRecord("free", "2026-05-20T05:20:00.000Z", ["math-2", "sci-1", "sci-5"], []),
};

/* ───────────────────────── 채점 ───────────────────────── */

/**
 * 3분기 진단의 채점 — 운영 콘솔의 「회원 채점」 디자인과 학생의 정오표 디자인이 함께 쓴다.
 *
 * 콘솔의 채점자는 이 답안지(응시번호 0412)를 채점하고, 학생은 그 결과를 정오표에서 본다. 두
 * 화면이 같은 답 · 같은 점수를 말하도록 여기 한곳에 적는다. 채점자에게는 이름이 보이지 않는다.
 *
 *   flowSheet   채점할 답안지 — 문항 · 낸 답 · AI가 먼저 매긴 점수와 이유 · 자아성찰
 *   flowMarks   채점자가 확인하거나 고친 것 — 채점 전 · 채점 중 · 채점 완료 세 때
 *   flowGrades  채점이 끝난 뒤 학생의 정오표가 읽는 점수와 해설
 */
export const flowSeat = { key: "2026-3-0412", seat: "0412", grade: "초4" };

/** 전문가가 채점하는 문항에 AI가 먼저 매긴 점수와 이유 — 여기 없는 문항은 만점이다 */
const aiScores: Record<string, { points: number | null; why: string }> = {
  "kor-10": { points: 1, why: "새 제목은 지었으나 그 제목을 떠올린 장면을 적지 않았습니다." },
  "math-12": {
    points: null,
    why: "사진으로 낸 답은 AI가 채점하지 않습니다. 사진을 보고 점수를 매겨 주세요.",
  },
  "math-7": { points: 1, why: "구하는 방법은 적었으나 답을 단위와 함께 쓰지 않았습니다." },
  "math-8": { points: 1, why: "다른 방법은 적었으나 두 방법의 답을 견준 과정이 없습니다." },
  "sci-4": { points: 2, why: "이유는 타당합니다. 방법은 방향을 바꾸는 것까지만 적고 무엇을 볼지가 흐립니다." },
  "sci-11": { points: 1, why: "연못 물의 온도는 짚었으나 증산작용을 알맞게 설명하지 못했습니다." },
  "sci-12": { points: 1, why: "추론은 적었으나 실험 내용을 쓰지 않았습니다." },
  "sci-15": { points: 1, why: "강물이 부딪치는 쪽은 짚었으나 그렇게 되는 이유가 없습니다." },
  "sci-16": {
    points: 1,
    why: "그림은 선의 모양만 읽었습니다. 물길이 곧아지는 것은 그렸으나 옛 모습의 근거가 흐립니다.",
  },
};

const AI_FULL = "묻는 것에 답했고, 그렇게 본 이유를 자료에서 끌어왔습니다.";
const AI_RIGHT = "정답과 같습니다.";
const AI_WRONG = "정답과 다릅니다.";
const AI_EMPTY = "답을 내지 않았습니다.";

/** 제출한 뒤 아이가 적은 것 — 채점자가 답 옆에서 함께 읽는다. 여기 없는 문항은 적지 않았다 */
const reflects: Record<string, { pick: string; text: string }> = {
  "kor-1": { pick: "자료에서 그렇게 쓰인 곳을 찾아서 골랐어요", text: "" },
  "kor-3": { pick: "두 개 사이에서 고민하다가 하나를 골랐어요", text: "2번이랑 3번 중에 고민했어요." },
  "kor-6": { pick: "시간이 모자랐어요", text: "" },
  "kor-7": { pick: "생각나는 대로 일단 썼어요", text: "" },
  "kor-8": { pick: "내 생각을 먼저 정하고 이유를 붙였어요", text: "민서 마음을 생각하면서 썼어요." },
  "math-1": { pick: "잘 모르겠어서 하나를 골랐어요", text: "" },
  "math-6": { pick: "풀다가 헷갈려서 그만뒀어요", text: "" },
  "math-12": { pick: "배운 것을 떠올려 내 말로 썼어요", text: "봉지를 하나씩 그려서 세어 봤어요." },
  "sci-4": { pick: "무슨 말인지는 알겠는데 쓰기가 어려웠어요", text: "" },
  "sci-16": { pick: "내 생각을 먼저 정하고 이유를 붙였어요", text: "" },
  "sci-18": { pick: "풀다가 헷갈려서 그만뒀어요", text: "나누는 걸 잘못한 것 같아요." },
  [matchQuestion.id]: {
    pick: "두 개 사이에서 고민하다가 하나를 골랐어요",
    text: "캔도 쇠붙이라서 붙는다고 생각했어요.",
  },
};

/** 응시 기록을 채점할 답안지로 — 문항 · 낸 답 · AI가 먼저 매긴 점수. bank를 넘기면 그 시험지로 편다 */
const sheetOf = (record: ExamRecord, bank?: Bank): GradeSubject[] =>
  subjects.map((s) => ({
    id: s.id,
    short: s.short,
    lines: tierQuestions("paid", s.id, null, bank).map((q, i): GradeLine => {
      const value = record.subjects[s.id].answers[q.id];
      const max = pointsOf(q);
      const base = { q, no: i + 1, value, max, reflect: reflects[q.id] };
      if (unanswered(q, value)) return { ...base, ai: 0, aiWhy: AI_EMPTY };
      if (autoGraded(q)) {
        const right = markOf(q, value) === "right";
        return { ...base, ai: right ? max : 0, aiWhy: right ? AI_RIGHT : AI_WRONG };
      }
      const ai = aiScores[q.id];
      return { ...base, ai: ai ? ai.points : max, aiWhy: ai?.why ?? AI_FULL };
    }),
  }));

/** 채점할 답안지 — 3분기 유료 진단, 세 과목 41문항 */
export const flowSheet: GradeSubject[] = sheetOf(flowRecords.q3);

const everyLine = flowSheet.flatMap((s) => s.lines);
/** 이 문항들을 AI의 점수 그대로 확인한 것 */
const checked = (lines: GradeLine[]): GradeMarks =>
  Object.fromEntries(lines.flatMap((l) => (l.ai === null ? [] : [[l.q.id, { points: l.ai }]])));

/** 채점자가 AI와 다르게 본 문항 — 점수와, 아이와 보호자가 읽는 해설 */
const edits: GradeMarks = {
  /* 2점 만점에 2점이던 답을 1점으로 낮췄다 */
  "kor-7": {
    points: 1,
    comment: "누가 무엇을 했는지는 잘 간추렸어요. 그래서 어떻게 되었는지(싹이 났다)를 한 문장 더 쓰면 좋겠습니다.",
  },
  "kor-10": {
    points: 1,
    comment: "제목을 잘 지었어요. 이야기의 어느 장면에서 그 제목을 떠올렸는지도 함께 써 보세요.",
  },
  /* 기계가 정답으로 본 객관식 — 자아성찰을 보고 절반만 인정했다 */
  "math-1": { points: 0.5, comment: "답은 맞았어요. 왜 그 보기인지 식으로 한 번 확인해 보세요." },
  /* AI가 채점하지 않는 사진 답안 — 채점자가 사진을 보고 매겼다 */
  "math-12": { points: 2, comment: "7개씩 묶은 봉지 12개와 식이 모두 맞습니다." },
  "sci-4": { points: 2, comment: "이유는 맞았어요. 부채질을 했을 때 불꽃이 어떻게 되면 증명이 되는지도 써 보세요." },
  "sci-16": { points: 2 },
};

/** 채점자가 확인하거나 고친 것 — 세 때 */
export const flowMarks = {
  /** 채점 전 — AI의 점수만 있다 */
  none: {} as GradeMarks,
  /** 채점 중 — 국어를 다 보고 수학을 세 문항까지 봤다 */
  some: {
    ...checked([...flowSheet[0].lines, ...flowSheet[1].lines.slice(0, 3)]),
    "kor-7": edits["kor-7"],
    "kor-10": edits["kor-10"],
    "math-1": edits["math-1"],
    "math-12": edits["math-12"],
  } as GradeMarks,
  /** 채점 완료 — 41문항을 모두 확인했다 */
  done: { ...checked(everyLine), ...edits } as GradeMarks,
};

/** 채점이 끝난 뒤 학생의 정오표가 읽는 점수와 해설 */
export const flowGrades = gradesOf(flowSheet, flowMarks.done);

/* ───────────────────────── 선 잇기 문항이 든 답안지 ───────────────────────── */

/**
 * 선 잇기 문항에 낸 답 — [왼쪽, 오른쪽] 차례(0부터).
 * 알루미늄 캔을 「자석에 붙는다」에 이었다. 금속이면 모두 자석에 붙는다고 본 답이라 다섯 가운데
 * 넷은 바르게 이었고 하나가 틀렸다 — 답안 풀이에 바르게 이은 선 · 잘못 이은 선 · 잇지 않은 정답이
 * 모두 나온다.
 */
const matchAnswer: Pair[] = [
  [0, 0],
  [0, 2],
  [0, 4],
  [1, 1],
  [1, 3],
];

const matchRecord: ExamRecord = {
  ...flowRecords.q3,
  subjects: {
    ...flowRecords.q3.subjects,
    science: {
      ...flowRecords.q3.subjects.science,
      answers: {
        ...flowRecords.q3.subjects.science.answers,
        [matchQuestion.id]: joinPairs(matchAnswer),
      },
    },
  },
};

/**
 * 선 잇기 문항이 든 3분기 답안지 — 정답과 해설 · 회원 채점 디자인의 선 잇기 화면이 쓴다.
 *
 * 기본 문항에는 선 잇기가 아직 없어, 과학 5번에 독립 문항 하나를 넣은 시험지(lib/examDesign.ts의
 * matchBank)로 같은 학생의 같은 답안을 다시 편 것이다. 나머지 문항의 답은 위의 3분기 기록과 같다.
 */
export const flowMatch = {
  bank: matchBank,
  record: matchRecord,
  sheet: sheetOf(matchRecord, matchBank),
  /** 그 문항의 과목과 번호 */
  at: {
    subject: "science" as SubjectId,
    no: tierQuestions("paid", "science", null, matchBank).indexOf(matchQuestion) + 1,
  },
};

/* ───────────────────────── 답 칸 표지 문항이 든 답안지 ───────────────────────── */

/**
 * 답 칸 표지로 쓴 문항(lib/examDesign.ts의 slotQuestion)에 낸 답 — 칸 차례대로(정답 1 · 서술형 1).
 * 짧은 칸은 맞혔고, 이유는 수증기가 모여 거품이 된다는 것까지 썼다. 서술 칸이 있어 문항은 통째로
 * 전문가가 채점한다(채점 중).
 */
const slotAnswer = [
  "수증기",
  "물이 끓으면 물이 수증기로 변하는데, 그 수증기가 모여서 거품이 되어 위로 올라오기 때문이다.",
];

const slotRecord: ExamRecord = {
  ...flowRecords.q3,
  subjects: {
    ...flowRecords.q3.subjects,
    science: {
      ...flowRecords.q3.subjects.science,
      answers: {
        ...flowRecords.q3.subjects.science.answers,
        [slotQuestion.id]: joinBlanks(slotAnswer),
      },
    },
  },
};

/**
 * 답 칸 표지 문항이 든 3분기 답안지 — 정답과 해설 · 회원 채점 디자인의 표지 문항 화면이 쓴다.
 * 선 잇기 답안지(flowMatch)와 같은 자리, 과학 5번에 그 문항을 넣은 시험지(slotBank)로 편 것이다.
 */
export const flowSlots = {
  bank: slotBank,
  record: slotRecord,
  sheet: sheetOf(slotRecord, slotBank),
  /** 그 문항의 과목과 번호 */
  at: {
    subject: "science" as SubjectId,
    no: tierQuestions("paid", "science", null, slotBank).indexOf(slotQuestion) + 1,
  },
};

/* ───────────────────────── 사진이 흐린 답안지 ───────────────────────── */

/** 사진으로 답하는 수학 문항 */
const PHOTO_ID = "math-12";

const blurRecord: ExamRecord = {
  ...flowRecords.q3,
  subjects: {
    ...flowRecords.q3.subjects,
    math: {
      ...flowRecords.q3.subjects.math,
      answers: {
        ...flowRecords.q3.subjects.math.answers,
        [PHOTO_ID]: joinUpload({ media: "image", key: "/images/answers/answer-math-12-blur.svg" }),
      },
    },
  },
};

/** 채점 상태에서 사진 문항만 「알아볼 수 없음」으로 바꾼다 — 점수와 함께 둘 수 없어 점수를 걷는다 */
function heldOf(marks: GradeMarks): GradeMarks {
  return {
    ...marks,
    [PHOTO_ID]: {
      unreadable: { reason: "사진이 흐립니다", memo: "글씨가 전혀 보이지 않습니다. 그림의 봉지 수도 셀 수 없습니다." },
    },
  };
}

/**
 * 수학 3번 사진이 흐린 3분기 답안지 — 회원 채점 디자인의 「알아볼 수 없음」 화면이 쓴다(2026-10-21).
 *
 * 같은 학생의 같은 답안지를, 수학 3번(사진으로 답하는 문항)에 흐린 사진을 낸 것으로 다시 편 것이다.
 * 채점자는 그 문항에 「알아볼 수 없음」을 골라 운영자 확인으로 넘겼다. 나머지 문항의 답과 점수는
 * 위의 3분기 기록 · flowMarks와 같다.
 */
export const flowBlur = {
  sheet: sheetOf(blurRecord),
  /** 채점 중(국어를 다 보고 수학 3번에서 넘김) · 나머지를 모두 확인한 뒤 */
  marks: { some: heldOf(flowMarks.some), done: heldOf(flowMarks.done) },
  /** 그 문항의 과목과 번호 */
  at: {
    subject: "math" as SubjectId,
    no: tierQuestions("paid", "math").findIndex((q) => q.id === PHOTO_ID) + 1,
  },
};
