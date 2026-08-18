"use client";

import { useSyncExternalStore } from "react";
import { ro } from "./utils";

/**
 * 전문가 콘솔 (EXP-04 ~ EXP-07).
 *
 * 정의서 9장은 이 콘솔을 「7 워크벤치」로 잡아 두었다 — 출제·검수·채점·코딩·면담·
 * 판정·리포트승인. 그 가운데 채점(EXP-04)·개방형 코딩(EXP-05)·면담(EXP-06)·
 * 판정 협진(EXP-07) 네 자리가 이 파일에 든다.
 *
 * 넷을 한 곳에 두는 까닭 —
 *  판정 협진의 케이스 카드는 지필·설문·관찰·면담 네 정보원을 한 화면에 나란히 편다.
 *  채점에서 사람이 고친 점수와 면담에서 확정한 코드가 협진 화면에 그대로 올라오지
 *  않으면, 앞의 세 워크벤치는 각자 돌기만 하고 판정은 여전히 AI 제안값 하나만 보고
 *  내리게 된다. 그러면 워크벤치를 넷으로 나눈 뜻이 없다.
 *
 * 네 화면에 공통으로 깔린 원칙은 하나다 — **AI는 전수로 처리하고, 사람은 확정한다.**
 * 그래서 AI 산출값은 지우지 않고 사람의 값을 옆에 붙인다. 둘이 얼마나 어긋나는지가
 * 다음 회차에 표본을 얼마나 늘릴지를 정하는 근거이기 때문이다.
 *
 * ⚠ 아래 목록은 화면 설계를 위한 예시 데이터입니다.
 */

/* ───────────────────────── 기준값 ───────────────────────── */

/** 저신뢰 자동 라우팅 기준. 이 아래는 사람에게 자동으로 넘어간다. */
export const ROUTE_CUT = 0.75;

/** AI-인간 채점 일치도 목표 (ICC) */
export const ICC_TARGET = 0.8;

/** 개방형 코딩 사람 검증 표본 비율의 기본 범위 */
export const SAMPLE_MIN = 0.1;
export const SAMPLE_MAX = 0.2;

/** 판정 컷에서 이 안이면 경계선 — 확정하지 않고 다음 회차 재관찰로 넘긴다 */
export const BORDER = 0.25;

/* ───────────────────────── EXP-04 채점 ───────────────────────── */

export type RubricLevel = "full" | "partial" | "none";

export const rubric: Record<RubricLevel, { label: string; short: string; tone: string; point: number; guide: string }> = {
  full: {
    label: "완전정답",
    short: "완전",
    tone: "text-emerald-700",
    point: 2,
    guide: "묻는 것에 답했고, 그렇게 본 까닭을 자료에서 끌어와 적었습니다.",
  },
  partial: {
    label: "부분정답",
    short: "부분",
    tone: "text-amber-700",
    point: 1,
    guide: "답은 맞게 짚었으나 까닭이 없거나, 까닭은 있으나 자료와 이어지지 않습니다.",
  },
  none: {
    label: "오답",
    short: "오답",
    tone: "text-rose-700",
    point: 0,
    guide: "묻는 것과 다른 것을 적었거나, 판단할 만한 내용이 없습니다.",
  },
};

export type ScoreTask = {
  id: string;
  /** 목록에서는 이름 대신 회차 내 응시번호로 표기한다 */
  seat: string;
  grade: string;
  subject: "국어" | "수학" | "과학";
  axis: string;
  stem: string;
  /** 아이가 쓴 답 — 맞춤법을 고치지 않고 그대로 든다 */
  answer: string;
  aiLevel: RubricLevel;
  /** AI가 스스로 매긴 확신도 0~1 */
  confidence: number;
  aiWhy: string;
  assignee: string | null;
  human?: { level: RubricLevel; by: string; at: string; note: string };
  /** 이중 채점 표본 — 두 사람이 서로 모르게 매긴다 */
  double: boolean;
  second?: { level: RubricLevel; by: string; at: string };
};

/** 저신뢰라 사람에게 자동으로 넘어간 건인가 */
export const isRouted = (t: ScoreTask) => t.confidence < ROUTE_CUT;

/** 지금 이 응답에 붙어 있는 값 — 사람이 확정했으면 사람 값이다 */
export const levelOf = (t: ScoreTask) => t.human?.level ?? t.aiLevel;

export const scoreDone = (t: ScoreTask) => !!t.human;

/* ───────────────────────── EXP-05 개방형 코딩 ───────────────────────── */

/**
 * 코딩 부호.
 *
 * 개방형 응답에서 읽어 내는 것은 점수가 아니라 「무엇에 대해 말하고 있는가」다.
 * 그래서 부호는 재능 축 이름을 그대로 쓰고, 읽어 낼 수 없을 때 쓰는 「불명」을
 * 반드시 남겨 둔다 — 억지로 축에 밀어 넣은 코드가 판정까지 흘러가면 되돌릴 수 없다.
 */
export const openCodes = [
  "언어",
  "수리·논리",
  "자연·탐구",
  "공간",
  "청각·리듬",
  "신체·운동",
  "사회·관계",
  "자기이해",
  "불명",
] as const;

export type OpenCode = (typeof openCodes)[number];

export type CodingTask = {
  id: string;
  seat: string;
  grade: string;
  prompt: "소개" | "에피소드";
  question: string;
  text: string;
  /** AI 1차 코딩 — 전수에 붙는다 */
  aiCodes: OpenCode[];
  confidence: number;
  /** 사람 검증 표본으로 뽑혔는가 */
  sampled: boolean;
  human?: { codes: OpenCode[]; by: string; at: string; note: string };
};

/** ai_human_agree — 표본에서 AI 코드와 사람 코드가 같은가 */
export function agreeOf(t: CodingTask): boolean | null {
  if (!t.human) return null;
  const a = [...t.aiCodes].sort().join("|");
  const b = [...t.human.codes].sort().join("|");
  return a === b;
}

/* ───────────────────────── EXP-06 면담 ───────────────────────── */

/**
 * 면담 대상 선발 우선순위.
 *
 * 순서를 사람이 매번 정하게 두면 목소리 큰 신청이 먼저 올라간다. 자동 정렬의 뜻은
 * 「신청하지 않았지만 꼭 봐야 하는 아이」를 위로 올리는 데 있다.
 */
export const pickReasons = [
  { id: "excluded-high", rank: 1, label: "배제영역 고신호", why: "이번 회차에 재지 않은 축에서 강한 신호가 나왔습니다. 지필로는 확인할 길이 없습니다." },
  { id: "cross-mismatch", rank: 2, label: "크로스 불일치", why: "지필과 설문이 반대를 가리킵니다 (L×H 또는 H×L)." },
  { id: "gap", rank: 3, label: "학생-학부모 응답 괴리", why: "같은 항목을 아이와 보호자가 다르게 적었습니다." },
  { id: "coding-unclear", rank: 4, label: "AI 코딩 불명", why: "개방형 응답에서 읽어 낼 축이 잡히지 않았습니다." },
  { id: "request", rank: 5, label: "일반 신청", why: "보호자 또는 지도교사가 면담을 신청했습니다." },
] as const;

export type PickReason = (typeof pickReasons)[number]["id"];

export const reasonOf = (id: PickReason) => pickReasons.find((r) => r.id === id)!;

/** 걸린 사유 가운데 가장 앞선 것이 그 케이스의 우선순위가 된다 */
export const topReason = (list: PickReason[]) =>
  list.map(reasonOf).sort((a, b) => a.rank - b.rank)[0] ?? reasonOf("request");

export type InterviewState = "queued" | "scheduled" | "recorded" | "coded";

export const interviewStateLabel: Record<InterviewState, { label: string; tone: string }> = {
  queued: { label: "선발됨", tone: "text-brand-700" },
  scheduled: { label: "일정 잡힘", tone: "text-amber-700" },
  recorded: { label: "기록 완료", tone: "text-amber-700" },
  coded: { label: "코딩 확정", tone: "text-emerald-700" },
};

/**
 * 구조화 프로토콜.
 *
 * 질문을 고정하는 까닭은 면담원마다 다른 것을 묻고 다른 것을 듣기 때문이다. 아이가
 * 달라서 생긴 차이인지 묻는 사람이 달라서 생긴 차이인지 가릴 수 없으면, 면담 기록은
 * 판정 근거로 쓸 수 없다.
 */
export const protocol: { id: string; section: string; q: string; why: string }[] = [
  { id: "p1", section: "여는 말", q: "요즘 학교나 집에서 시간 가는 줄 모르고 하는 일이 있나요?", why: "재능 이름을 먼저 꺼내지 않고 아이 말로 시작합니다." },
  { id: "p2", section: "여는 말", q: "그걸 할 때 어떤 부분이 제일 재미있어요?", why: "능력이 아니라 몰입의 결이 무엇인지 봅니다." },
  { id: "p3", section: "배제영역", q: "손으로 만들거나 몸으로 하는 것 중에 잘한다는 말을 들어 본 게 있나요?", why: "지필로 재지 못한 축(공간·신체)의 단서를 직접 묻습니다." },
  { id: "p4", section: "배제영역", q: "친구들 사이에서 주로 어떤 역할을 맡게 되나요?", why: "사회·관계 축의 단서입니다." },
  { id: "p5", section: "불일치 확인", q: "검사에서 어려웠던 문제가 있었나요? 왜 어려웠어요?", why: "지필 점수가 낮은 까닭이 능력인지 상황인지 가릅니다." },
  { id: "p6", section: "불일치 확인", q: "집에서 하는 모습과 학교에서 하는 모습이 다르다고 느낀 적 있나요?", why: "학생-보호자 응답 괴리의 실마리입니다." },
  { id: "p7", section: "닫는 말", q: "오늘 이야기 중에 빠뜨린 게 있으면 편하게 말해 주세요.", why: "묻지 않아 놓친 것을 아이가 스스로 채울 자리를 둡니다." },
];

export type InterviewCase = {
  id: string;
  seat: string;
  grade: string;
  reasons: PickReason[];
  state: InterviewState;
  scheduledAt?: string;
  interviewer?: string;
  /** 프로토콜 질문 id → 면담원이 적은 기록 */
  notes: Record<string, string>;
  /** AI 전사 — 사람이 고칠 수 있다 */
  transcript?: string;
  aiCodes?: OpenCode[];
  coded?: { codes: OpenCode[]; by: string; at: string; summary: string };
};

/* ───────────────────────── EXP-07 판정 협진 ───────────────────────── */

/**
 * 크로스 판정 6셀.
 *
 * 학력(지필)과 재능(설문·관찰·면담)을 각각 축으로 놓고 만나는 칸을 여섯으로 나눈다.
 * 「잘함/못함」 한 줄로 눕히지 않는 까닭이 여기 있다 — 지필이 낮은데 관찰이 높은 아이와,
 * 둘 다 낮은 아이는 다음에 해야 할 일이 아주 다르다.
 */
export type CrossCell =
  | "confirm"
  | "gap"
  | "mismatch"
  | "later"
  | "excluded-high"
  | "excluded-none";

export const crossCells: { id: CrossCell; label: string; desc: string; next: string; tone: string }[] = [
  {
    id: "confirm",
    label: "강신호 확증",
    desc: "지필·설문·관찰이 같은 축을 가리킵니다.",
    next: "그 축의 심화 활동 모듈을 배정합니다.",
    tone: "text-emerald-700",
  },
  {
    id: "gap",
    label: "잠재-발현 갭",
    desc: "설문·관찰은 높은데 지필로는 나타나지 않았습니다.",
    next: "능력 부족으로 적지 않습니다. 보여줄 기회를 늘리는 모듈을 배정합니다.",
    tone: "text-brand-700",
  },
  {
    id: "mismatch",
    label: "능력-흥미 불일치",
    desc: "지필은 높은데 본인이 흥미를 두지 않는 축입니다.",
    next: "밀지 않습니다. 흥미 축과 잇는 활동을 먼저 제안합니다.",
    tone: "text-amber-700",
  },
  {
    id: "later",
    label: "현시점 비우선",
    desc: "어느 축도 뚜렷하지 않습니다.",
    next: "판정을 서두르지 않고 다음 회차의 관찰 범위를 넓힙니다.",
    tone: "text-exam-muted",
  },
  {
    id: "excluded-high",
    label: "배제영역 고신호",
    desc: "이번 회차에 재지 않은 다섯 축에서 강한 신호가 나왔습니다.",
    next: "면담으로 확인하고 2027 심화진단 대상으로 표시합니다.",
    tone: "text-rose-700",
  },
  {
    id: "excluded-none",
    label: "배제영역 무신호",
    desc: "재지 않은 축에서도 별다른 신호가 없습니다.",
    next: "미측정을 낮은 점수로 적지 않도록 리포트 문구를 고정합니다.",
    tone: "text-exam-muted",
  },
];

export const cellOf = (id: CrossCell) => crossCells.find((c) => c.id === id)!;

export type ConferenceComment = {
  id: string;
  by: string;
  field: string;
  text: string;
  at: string;
  /** 다른 의견 — 합의되지 않은 채로 남는다 */
  dissent: boolean;
};

export type ConferenceState = "open" | "held" | "signed";

export type ConferenceCase = {
  id: string;
  seat: string;
  grade: string;
  org: string;
  /** 지필 — 채점 워크벤치에서 확정된 값이 올라온다 */
  paper: { axis: string; score: number }[];
  /** 설문 */
  survey: { mother: boolean; father: boolean; teacher: boolean };
  /** 관찰 — 교사 설문의 서술 항목 */
  observation: string | null;
  /** 면담 — 없으면 아직 면담 대상이 아니다 */
  interviewId: string | null;
  aiCell: CrossCell;
  aiWhy: string;
  aiConfidence: number;
  /** 사람이 조정한 셀. 없으면 아직 AI 제안 그대로다. */
  cell?: CrossCell;
  cellBy?: string;
  cellWhy?: string;
  /** 판정 컷에서 얼마나 떨어져 있나 (θ). |값| ≤ 0.25 이면 경계선 */
  margin: number;
  comments: ConferenceComment[];
  state: ConferenceState;
  hold?: { by: string; at: string; reason: string; nextRound: string };
  sign?: { by: string; at: string; hash: string; basis: string };
};

/** 지금 이 케이스에 붙어 있는 셀 */
export const cellNow = (c: ConferenceCase) => c.cell ?? c.aiCell;

/** 컷 경계선인가 — 확정하지 않고 다음 회차로 넘기는 것이 원칙이다 */
export const isBorder = (c: ConferenceCase) => Math.abs(c.margin) <= BORDER;

/**
 * 근거 해시.
 *
 * 확정한 뒤에 근거가 조용히 바뀌면 「사람이 확정했다」는 기록만 남고 무엇을 보고
 * 확정했는지는 사라진다. 확정 시점의 근거를 한 줄로 굳혀 두면, 나중에 같은 값을 다시
 * 넣어 보는 것만으로 그때 본 것과 지금 것이 같은지 알 수 있다.
 */
export function basisHash(basis: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < basis.length; i += 1) {
    h ^= basis.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let g = 0x9e3779b9;
  for (let i = basis.length - 1; i >= 0; i -= 1) {
    g ^= basis.charCodeAt(i);
    g = Math.imul(g, 0x85ebca6b) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}${g.toString(16).padStart(8, "0")}`.toUpperCase();
}

/**
 * 서명에 굳혀 넣을 근거 한 줄.
 *
 * 서술형 채점값을 함께 넣는다. 판정을 확정한 뒤에 채점 워크벤치에서 점수를 고치면
 * 이 줄이 달라지므로, 「확정한 뒤에 근거가 움직였다」가 화면에 드러난다. 케이스
 * 자체는 확정되면 잠기지만 채점은 다른 화면에서 계속 돌기 때문에 필요한 고리다.
 */
export function basisOf(c: ConferenceCase, tasks: ScoreTask[] = []) {
  const paper = c.paper.map((p) => `${p.axis}=${p.score}`).join(",");
  const survey = `${c.survey.mother ? "M" : "-"}${c.survey.father ? "F" : "-"}${c.survey.teacher ? "T" : "-"}`;
  const scored = tasks
    .filter((t) => t.seat === c.seat)
    .map((t) => `${t.id}:${levelOf(t)}`)
    .sort()
    .join(",");
  return `${c.id}|cell=${cellNow(c)}|paper=${paper}|scored=${scored || "none"}|survey=${survey}|obs=${c.observation ? "y" : "n"}|itv=${c.interviewId ?? "none"}|margin=${c.margin.toFixed(2)}`;
}

/* ───────────────────────── 통계 ───────────────────────── */

/**
 * ICC(2,1) — 두 채점자를 임의효과로 본 급내상관.
 *
 * 단순 일치율만 보면 「셋 다 완전정답」 같은 쏠린 표본에서 90%가 넘게 나온다. 변량을
 * 함께 보는 지표가 있어야 「어려운 응답에서 갈리는지」가 드러난다. 표본이 적으면
 * 값이 크게 흔들리므로 화면에는 표본 수를 반드시 함께 적는다.
 */
export function icc(pairs: [number, number][]) {
  const n = pairs.length;
  if (n < 2) return null;
  const k = 2;
  const all = pairs.flat();
  const mean = all.reduce((s, v) => s + v, 0) / all.length;
  const rowMeans = pairs.map(([x, y]) => (x + y) / 2);
  const colMeans = [
    pairs.reduce((s, p) => s + p[0], 0) / n,
    pairs.reduce((s, p) => s + p[1], 0) / n,
  ];

  const ssR = k * rowMeans.reduce((s, m) => s + (m - mean) ** 2, 0);
  const ssC = n * colMeans.reduce((s, m) => s + (m - mean) ** 2, 0);
  const ssT = all.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssE = ssT - ssR - ssC;

  const msR = ssR / (n - 1);
  const msC = ssC / (k - 1);
  const msE = ssE / ((n - 1) * (k - 1));

  const denom = msR + (k - 1) * msE + (k * (msC - msE)) / n;
  if (denom === 0) return null;
  const v = (msR - msE) / denom;
  return Math.max(-1, Math.min(1, v));
}

/* ───────────────────────── 씨앗 ───────────────────────── */

const SEED_AT = "2026-08-16 10:20"; // 고정값 — SSR/CSR 불일치를 막는다

const st = (
  id: string,
  seat: string,
  grade: string,
  subject: ScoreTask["subject"],
  axis: string,
  stem: string,
  answer: string,
  aiLevel: RubricLevel,
  confidence: number,
  aiWhy: string,
  extra: Partial<ScoreTask> = {},
): ScoreTask => ({
  id,
  seat,
  grade,
  subject,
  axis,
  stem,
  answer,
  aiLevel,
  confidence,
  aiWhy,
  assignee: null,
  double: false,
  ...extra,
});

const SEED_SCORES: ScoreTask[] = [
  st(
    "SC-0412-K1",
    "0412",
    "초5",
    "국어",
    "언어",
    "두 글쓴이의 관점이 어떻게 다른지 근거를 들어 설명하시오",
    "앞의 글쓴이는 도시에 나무를 더 심어야 한다고 했고 뒤의 글쓴이는 나무보다 사람이 쉴 자리가 먼저라고 했다. 둘 다 도시가 답답하다고 본 것은 같은데 먼저 할 일이 다르다.",
    "full",
    0.92,
    "두 관점을 모두 짚고 공통 전제까지 적어 루브릭 완전정답 기준을 만족합니다.",
    { double: true },
  ),
  st(
    "SC-0412-M1",
    "0412",
    "초5",
    "수학",
    "수리·논리",
    "규칙을 찾아 열 번째 항의 값을 구하고, 그렇게 본 까닭을 쓰시오",
    "3씩 커진다 그래서 30이다",
    "partial",
    0.81,
    "값은 맞으나 규칙을 어디서 찾았는지가 없어 부분정답으로 봅니다.",
  ),
  st(
    "SC-0418-K1",
    "0418",
    "초6",
    "국어",
    "언어",
    "글쓴이의 주장에 반대하는 입장에서 반론을 쓰시오",
    "저는 반대합니다 왜냐하면 그건 아니라고 생각하기 때문입니다",
    "none",
    0.71,
    "반대 입장은 밝혔으나 근거가 없습니다. 다만 분량이 짧아 판단이 어렵습니다.",
    { double: true },
  ),
  st(
    "SC-0421-S1",
    "0421",
    "중1",
    "과학",
    "자연·탐구",
    "실험 결과가 예상과 다른 이유를 두 가지 쓰시오",
    "온도계를 물에 안 담그고 잰것 같고 물을 너무 조금 넣어서 빨리 식은거 같다",
    "full",
    0.88,
    "측정 오차와 조건 차이 두 가지를 각각 들어 완전정답 기준을 만족합니다.",
  ),
  st(
    "SC-0423-K1",
    "0423",
    "초4",
    "국어",
    "언어",
    "인물의 마음이 어떻게 바뀌었는지 까닭과 함께 쓰시오",
    "처음에는 시러했는데 나중에는 조아함 왜냐면 친구가 도와줘서",
    "partial",
    0.52,
    "변화와 까닭을 모두 적었으나 맞춤법이 흐트러져 뜻을 확신하기 어렵습니다.",
    { double: true },
  ),
  st(
    "SC-0426-M1",
    "0426",
    "초5",
    "수학",
    "수리·논리",
    "두 도형의 넓이를 비교하고 그렇게 본 까닭을 쓰시오",
    "왼쪽이 더 크다",
    "none",
    0.64,
    "판단만 있고 까닭이 없습니다. 다만 그림 문항이라 도형을 보고 답했을 가능성이 있습니다.",
  ),
  st(
    "SC-0426-S1",
    "0426",
    "초5",
    "과학",
    "자연·탐구",
    "관찰한 것에서 알 수 있는 점을 쓰시오",
    "물이 끓을때 김이 나는데 그게 물이 변한거다 근데 다시 차가워지면 물방울이 된다 그래서 없어진게 아니다",
    "full",
    0.69,
    "상태 변화와 보존을 모두 짚었으나 용어가 생활어라 자동 채점이 흔들립니다.",
    { double: true },
  ),
  st(
    "SC-0430-K1",
    "0430",
    "중2",
    "국어",
    "언어",
    "자료에서 근거를 골라 자기 주장을 뒷받침하시오",
    "표를 보면 2020년부터 계속 줄고 있다. 그러니까 앞으로도 줄 거라고 볼 수 있다. 다만 표에 나온 기간이 짧아서 확실하다고는 못 한다.",
    "full",
    0.94,
    "근거 인용과 한계 언급이 함께 있어 완전정답입니다.",
  ),
  st(
    "SC-0433-S1",
    "0433",
    "초6",
    "과학",
    "자연·탐구",
    "실험을 다시 한다면 무엇을 바꾸겠는지 쓰시오",
    "다음엔 더 잘하겠다",
    "none",
    0.83,
    "무엇을 바꿀지가 없습니다.",
  ),
];

const ct = (
  id: string,
  seat: string,
  grade: string,
  prompt: CodingTask["prompt"],
  question: string,
  text: string,
  aiCodes: OpenCode[],
  confidence: number,
  sampled: boolean,
  human?: CodingTask["human"],
): CodingTask => ({ id, seat, grade, prompt, question, text, aiCodes, confidence, sampled, human });

const SEED_CODING: CodingTask[] = [
  ct("CD-0412-1", "0412", "초5", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "저는 만화 그리는걸 좋아합니다. 이야기를 먼저 짜고 그림을 그립니다. 친구들한테 보여주면 다음편 언제 나오냐고 물어봅니다.", ["언어", "공간"], 0.86, true, {
    codes: ["언어", "공간"],
    by: "이서연",
    at: SEED_AT,
    note: "이야기 구성이 먼저라고 스스로 적어 언어를 앞에 둡니다.",
  }),
  ct("CD-0412-2", "0412", "초5", "에피소드", "최근에 스스로 뿌듯했던 일을 하나 적어 주세요", "동생한테 분수를 설명해줬는데 동생이 알아들었다. 피자로 설명하니까 바로 알았다.", ["수리·논리", "사회·관계"], 0.78, false),
  ct("CD-0418-1", "0418", "초6", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "그냥 평범해요 딱히 잘하는건 없는것같아요", ["불명"], 0.41, true, {
    codes: ["불명"],
    by: "이서연",
    at: SEED_AT,
    note: "읽어 낼 축이 없습니다. 면담 대상으로 넘깁니다.",
  }),
  ct("CD-0418-2", "0418", "초6", "에피소드", "최근에 스스로 뿌듯했던 일을 하나 적어 주세요", "체육대회때 우리반이 이겼는데 내가 순서를 정했다", ["사회·관계", "신체·운동"], 0.62, false),
  ct("CD-0421-1", "0421", "중1", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "곤충을 키웁니다. 사슴벌레 세 마리요. 습도랑 온도를 적어두고 언제 허물을 벗는지 비교합니다.", ["자연·탐구"], 0.93, true, {
    codes: ["자연·탐구", "수리·논리"],
    by: "정태호",
    at: SEED_AT,
    note: "관찰을 기록하고 비교하는 절차가 있어 수리·논리를 함께 답니다.",
  }),
  ct("CD-0421-2", "0421", "중1", "에피소드", "최근에 스스로 뿌듯했던 일을 하나 적어 주세요", "허물 벗는 순간을 처음으로 봤다. 3일 전부터 안먹길래 기다렸다.", ["자연·탐구"], 0.9, false),
  ct("CD-0423-1", "0423", "초4", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "저는 노래를 잘한다고 들어요 학교에서 노래 시키면 제가 해요", ["청각·리듬"], 0.74, true, {
    codes: ["청각·리듬", "사회·관계"],
    by: "정태호",
    at: SEED_AT,
    note: "「시키면 제가 한다」는 표현에 관계 축 신호가 함께 있습니다.",
  }),
  ct("CD-0423-2", "0423", "초4", "에피소드", "최근에 스스로 뿌듯했던 일을 하나 적어 주세요", "친구가 울었는데 내가 달래줬다", ["사회·관계"], 0.85, false),
  ct("CD-0426-1", "0426", "초5", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "블럭으로 큰거 만드는거 좋아해요 설명서 없이도 만들수있어요", ["공간"], 0.88, false),
  ct("CD-0426-2", "0426", "초5", "에피소드", "최근에 스스로 뿌듯했던 일을 하나 적어 주세요", "혼자서 자전거 체인을 고쳤다", ["공간", "신체·운동"], 0.71, false),
  ct("CD-0430-1", "0430", "중2", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "책을 많이 읽습니다. 읽고 나면 짧게 정리해서 블로그에 올립니다.", ["언어"], 0.95, false),
  ct("CD-0433-1", "0433", "초6", "소개", "나를 소개하는 글을 자유롭게 써 보세요", "제가 뭘 좋아하는지 잘 모르겠어요", ["불명"], 0.38, false),
];

const SEED_INTERVIEWS: InterviewCase[] = [
  {
    id: "IV-2603-0423",
    seat: "0423",
    grade: "초4",
    reasons: ["excluded-high", "cross-mismatch"],
    state: "coded",
    scheduledAt: "2026-08-14 15:00",
    interviewer: "이서연",
    notes: {
      p1: "학교 끝나고 노래 연습한다고 함. 하루 한 시간쯤.",
      p2: "「높은 음이 딱 맞을 때」가 제일 좋다고 답함.",
      p3: "손으로 만드는 것은 별로. 대신 박자 맞추는 건 자신 있다고 함.",
      p4: "노래를 시키면 자기가 하고, 친구들이 못 맞추면 다시 알려 준다고 함.",
      p5: "국어 지문이 길어서 끝까지 못 읽었다고 함.",
      p6: "집에서는 계속 부르는데 학교에서는 조용하다고 함.",
      p7: "합창단에 들어가고 싶다고 먼저 말함.",
    },
    transcript:
      "(AI 전사) 면담원: 요즘 시간 가는 줄 모르고 하는 일 있어요? / 학생: 노래요. 학교 끝나고 한 시간쯤 해요. / 면담원: 어떤 게 제일 재밌어요? / 학생: 높은 음이 딱 맞을 때요. …",
    aiCodes: ["청각·리듬", "사회·관계"],
    coded: {
      codes: ["청각·리듬", "사회·관계"],
      by: "이서연",
      at: "2026-08-14 16:10",
      summary:
        "청각 축 신호가 반복해서 나타납니다. 지필 국어가 낮게 나온 것은 지문 길이 때문일 가능성이 있어 능력 부족으로 적지 않습니다.",
    },
  },
  {
    id: "IV-2603-0418",
    seat: "0418",
    grade: "초6",
    reasons: ["coding-unclear", "gap"],
    state: "recorded",
    scheduledAt: "2026-08-16 11:00",
    interviewer: "정태호",
    notes: {
      p1: "특별히 없다고 함. 한참 뒤에 「친구들 순서 정하는 건 내가 한다」고 덧붙임.",
      p2: "「누가 뭘 잘하는지 아니까」라고 답함.",
      p3: "",
      p4: "반에서 조 나눌 때 항상 자기가 정한다고 함.",
      p5: "",
      p6: "",
      p7: "",
    },
    transcript:
      "(AI 전사) 면담원: 요즘 시간 가는 줄 모르고 하는 일 있어요? / 학생: 음… 딱히 없는데요. / (침묵 6초) / 학생: 아 근데 친구들 순서 정하는 건 제가 해요. …",
    aiCodes: ["사회·관계"],
  },
  {
    id: "IV-2603-0426",
    seat: "0426",
    grade: "초5",
    reasons: ["cross-mismatch"],
    state: "scheduled",
    scheduledAt: "2026-08-19 14:00",
    interviewer: "정태호",
    notes: {},
  },
  {
    id: "IV-2603-0433",
    seat: "0433",
    grade: "초6",
    reasons: ["coding-unclear"],
    state: "queued",
    notes: {},
  },
  {
    id: "IV-2603-0430",
    seat: "0430",
    grade: "중2",
    reasons: ["request"],
    state: "queued",
    notes: {},
  },
];

const SEED_CONFERENCE: ConferenceCase[] = [
  {
    id: "CF-2603-0412",
    seat: "0412",
    grade: "초5",
    org: "서울 강서 위드학원",
    paper: [
      { axis: "언어", score: 74 },
      { axis: "수리·논리", score: 88 },
      { axis: "자연·탐구", score: 71 },
    ],
    survey: { mother: true, father: false, teacher: true },
    observation: "수업 중 먼저 규칙을 찾아 말한다는 담임 기록이 있습니다.",
    interviewId: null,
    aiCell: "confirm",
    aiWhy: "지필 수리·논리 88, 어머니·교사 설문 모두 같은 축을 가리킵니다.",
    aiConfidence: 0.91,
    margin: 0.82,
    comments: [],
    state: "open",
  },
  {
    id: "CF-2603-0418",
    seat: "0418",
    grade: "초6",
    org: "경기 성남 한빛교육원",
    paper: [
      { axis: "언어", score: 61 },
      { axis: "수리·논리", score: 58 },
      { axis: "자연·탐구", score: 60 },
    ],
    survey: { mother: true, father: true, teacher: false },
    observation: null,
    interviewId: "IV-2603-0418",
    aiCell: "later",
    aiWhy: "세 축이 모두 60 안팎으로 뚜렷한 축이 없습니다.",
    aiConfidence: 0.63,
    margin: 0.11,
    comments: [
      {
        id: "cm-1",
        by: "정태호",
        field: "교육심리",
        text: "개방형에서 「친구들 순서를 정한다」가 두 번 나왔습니다. 지필로 재지 않은 사회·관계 축을 그냥 지나치기 어렵습니다.",
        at: "2026-08-16 09:40",
        dissent: true,
      },
    ],
    state: "open",
  },
  {
    id: "CF-2603-0421",
    seat: "0421",
    grade: "중1",
    org: "개인 신청",
    paper: [
      { axis: "언어", score: 66 },
      { axis: "수리·논리", score: 72 },
      { axis: "자연·탐구", score: 89 },
    ],
    survey: { mother: false, father: false, teacher: false },
    observation: null,
    interviewId: null,
    aiCell: "confirm",
    aiWhy: "지필 자연·탐구 89로 단독 최고. 다만 설문이 한 건도 없습니다.",
    aiConfidence: 0.72,
    margin: 0.64,
    comments: [
      {
        id: "cm-2",
        by: "한나래",
        field: "과학교육",
        text: "설문 없이 지필 하나로 확증까지 가는 것은 이르다고 봅니다. 개방형 응답의 관찰 기록을 근거로 함께 답시다.",
        at: "2026-08-16 09:52",
        dissent: false,
      },
    ],
    state: "open",
  },
  {
    id: "CF-2603-0423",
    seat: "0423",
    grade: "초4",
    org: "서울 강서 위드학원",
    paper: [
      { axis: "언어", score: 54 },
      { axis: "수리·논리", score: 63 },
      { axis: "자연·탐구", score: 59 },
    ],
    survey: { mother: true, father: false, teacher: true },
    observation: "쉬는 시간에 늘 노래를 부른다는 담임 기록이 있습니다.",
    interviewId: "IV-2603-0423",
    aiCell: "excluded-high",
    aiWhy: "지필 세 축은 낮으나 개방형·관찰·면담이 모두 청각·리듬을 가리킵니다.",
    aiConfidence: 0.58,
    margin: -0.19,
    comments: [],
    state: "open",
  },
  {
    id: "CF-2603-0426",
    seat: "0426",
    grade: "초5",
    org: "인천 미추홀 영재교육원",
    paper: [
      { axis: "언어", score: 57 },
      { axis: "수리·논리", score: 81 },
      { axis: "자연·탐구", score: 68 },
    ],
    survey: { mother: true, father: true, teacher: true },
    observation: "수학 시간에 손을 들지 않는다는 담임 기록이 있습니다.",
    interviewId: "IV-2603-0426",
    aiCell: "mismatch",
    aiWhy: "지필 수리·논리 81인데 세 설문 모두 흥미 문항에서 낮게 답했습니다.",
    aiConfidence: 0.77,
    margin: 0.23,
    comments: [],
    state: "open",
  },
  {
    id: "CF-2603-0430",
    seat: "0430",
    grade: "중2",
    org: "개인 신청",
    paper: [
      { axis: "언어", score: 91 },
      { axis: "수리·논리", score: 70 },
      { axis: "자연·탐구", score: 66 },
    ],
    survey: { mother: true, father: false, teacher: false },
    observation: null,
    interviewId: "IV-2603-0430",
    aiCell: "confirm",
    aiWhy: "지필 언어 91, 개방형 코딩도 언어 단독입니다.",
    aiConfidence: 0.94,
    margin: 1.12,
    comments: [],
    state: "signed",
    sign: {
      by: "한나래",
      at: "2026-08-16 10:05",
      hash: "",
      basis: "",
    },
  },
  {
    id: "CF-2603-0433",
    seat: "0433",
    grade: "초6",
    org: "경기 성남 한빛교육원",
    paper: [
      { axis: "언어", score: 64 },
      { axis: "수리·논리", score: 62 },
      { axis: "자연·탐구", score: 65 },
    ],
    survey: { mother: true, father: true, teacher: true },
    observation: "무엇을 좋아하는지 잘 말하지 않는다는 담임 기록이 있습니다.",
    interviewId: "IV-2603-0433",
    aiCell: "excluded-none",
    aiWhy: "세 축이 고르고, 개방형에서도 읽어 낼 축이 잡히지 않았습니다.",
    aiConfidence: 0.55,
    margin: 0.04,
    comments: [],
    state: "open",
  },
];

/* 확정된 씨앗 한 건은 해시까지 채워 둔다 — 화면에서 「무엇을 보고 확정했나」가
   빈칸이면 서명 자리가 장식처럼 보인다. */
{
  const done = SEED_CONFERENCE.find((c) => c.id === "CF-2603-0430");
  if (done?.sign) {
    done.sign.basis = basisOf(done, SEED_SCORES);
    done.sign.hash = basisHash(done.sign.basis);
  }
}

export type ExpertData = {
  scores: ScoreTask[];
  coding: CodingTask[];
  /** 개방형 코딩 사람 검증 표본 비율 */
  sampleRate: number;
  interviews: InterviewCase[];
  conference: ConferenceCase[];
  log: { at: string; by: string; text: string; where: string }[];
};

const SEED: ExpertData = {
  scores: SEED_SCORES,
  coding: SEED_CODING,
  sampleRate: 0.15,
  interviews: SEED_INTERVIEWS,
  conference: SEED_CONFERENCE,
  log: [],
};

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.expert";
const EVENT = "genixx:expert-change";

let cacheRaw: string | null = null;
let cacheValue: ExpertData = SEED;

function read(): ExpertData {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? ({ ...SEED, ...(JSON.parse(raw) as ExpertData) }) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ExpertData) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useExpert(): ExpertData {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function commit(change: Partial<ExpertData>, entry?: { by: string; text: string; where: string }) {
  const cur = read();
  write({
    ...cur,
    ...change,
    log: entry ? [{ ...entry, at: now() }, ...cur.log].slice(0, 60) : cur.log,
  });
}

/* ───────────────────────── EXP-04 동작 ───────────────────────── */

/** 사람이 루브릭으로 확정한다. AI 값은 지우지 않고 옆에 남는다. */
export function confirmScore(id: string, level: RubricLevel, by: string, note: string) {
  const cur = read();
  const task = cur.scores.find((t) => t.id === id);
  if (!task) return;
  commit(
    {
      scores: cur.scores.map((t) =>
        t.id === id ? { ...t, human: { level, by, at: now(), note } } : t,
      ),
    },
    {
      by,
      where: "채점",
      text: `${task.seat} ${task.subject} — ${rubric[level].label}${ro(rubric[level].label)} 확정${
        level === task.aiLevel ? "" : ` (AI 제안 ${rubric[task.aiLevel].label}에서 바꿈)`
      }`,
    },
  );
}

/** 이중 채점 표본에 두 번째 사람이 매긴다 — 앞사람 값을 보지 않고 넣는 자리다 */
export function secondScore(id: string, level: RubricLevel, by: string) {
  const cur = read();
  commit(
    { scores: cur.scores.map((t) => (t.id === id ? { ...t, second: { level, by, at: now() } } : t)) },
    { by, where: "채점", text: `${id} 이중 채점 — ${rubric[level].label}` },
  );
}

/** 저신뢰 건을 사람에게 배정한다 */
export function assignScore(id: string, to: string, by: string) {
  const cur = read();
  commit(
    { scores: cur.scores.map((t) => (t.id === id ? { ...t, assignee: to } : t)) },
    { by, where: "채점", text: `${id} → ${to} 배정` },
  );
}

/** 저신뢰 건을 한꺼번에 배정한다 — 규칙이 고른 것을 사람이 받는 자리 */
export function routeLowConfidence(to: string, by: string) {
  const cur = read();
  const hit = cur.scores.filter((t) => isRouted(t) && !t.human && !t.assignee);
  if (hit.length === 0) return 0;
  commit(
    {
      scores: cur.scores.map((t) =>
        hit.some((h) => h.id === t.id) ? { ...t, assignee: to } : t,
      ),
    },
    { by, where: "채점", text: `확신도 ${ROUTE_CUT} 미만 ${hit.length}건을 ${to}에게 자동 배정` },
  );
  return hit.length;
}

/* ───────────────────────── EXP-05 동작 ───────────────────────── */

/**
 * 표본을 다시 뽑는다.
 *
 * 무작위로 뽑지 않고 확신도가 낮은 쪽부터 채운다. 표본의 목적이 「AI가 어디서
 * 틀리는지 찾는 것」이라면, 잘 맞힌 응답을 골라 보는 것은 표본을 낭비하는 일이다.
 * 다만 확신도 높은 건도 일부 섞는다 — 낮은 것만 보면 전체 불일치율을 부풀린다.
 */
export function resample(rate: number, by: string) {
  const cur = read();
  const target = Math.max(1, Math.round(cur.coding.length * rate));

  /* 이미 사람이 확정한 건은 표본에서 뺄 수 없다 — 본 것을 안 본 것으로 되돌릴 수는
     없다. 그래서 목표 건수에서 먼저 빼고, 남은 자리만 새로 채운다. */
  const kept = cur.coding.filter((t) => t.human).map((t) => t.id);
  const need = Math.max(0, target - kept.length);
  const rest = [...cur.coding.filter((t) => !t.human)].sort((x, y) => x.confidence - y.confidence);
  const lowN = Math.ceil(need * 0.7);
  const highN = need - lowN;
  const picked = new Set([
    ...kept,
    ...rest.slice(0, lowN).map((t) => t.id),
    ...(highN > 0 ? rest.slice(-highN).map((t) => t.id) : []),
  ]);

  commit(
    {
      sampleRate: rate,
      coding: cur.coding.map((t) => ({ ...t, sampled: picked.has(t.id) })),
    },
    {
      by,
      where: "코딩",
      text: `표본 비율 ${Math.round(rate * 100)}% — ${picked.size}건${
        kept.length ? ` (이미 확정한 ${kept.length}건 포함)` : ""
      }`,
    },
  );
}

export function confirmCoding(id: string, codes: OpenCode[], by: string, note: string) {
  const cur = read();
  const task = cur.coding.find((t) => t.id === id);
  if (!task) return;
  const same = [...task.aiCodes].sort().join("|") === [...codes].sort().join("|");
  commit(
    {
      coding: cur.coding.map((t) =>
        t.id === id ? { ...t, sampled: true, human: { codes, by, at: now(), note } } : t,
      ),
    },
    {
      by,
      where: "코딩",
      text: `${task.seat} ${task.prompt} — ${codes.join("·")}${ro(codes[codes.length - 1] ?? "")} 확정${same ? " (AI와 같음)" : " (AI와 다름)"}`,
    },
  );
}

/* ───────────────────────── EXP-06 동작 ───────────────────────── */

export function scheduleInterview(id: string, at: string, interviewer: string, by: string) {
  const cur = read();
  commit(
    {
      interviews: cur.interviews.map((v) =>
        v.id === id ? { ...v, state: "scheduled", scheduledAt: at, interviewer } : v,
      ),
    },
    { by, where: "면담", text: `${id} 일정 ${at} · 면담원 ${interviewer}` },
  );
}

/** 프로토콜 질문 하나에 대한 기록 */
export function setInterviewNote(id: string, qid: string, text: string) {
  const cur = read();
  write({
    ...cur,
    interviews: cur.interviews.map((v) =>
      v.id === id ? { ...v, notes: { ...v.notes, [qid]: text } } : v,
    ),
  });
}

export function finishRecording(id: string, by: string) {
  const cur = read();
  const v = cur.interviews.find((x) => x.id === id);
  if (!v) return;
  const filled = protocol.filter((p) => (v.notes[p.id] ?? "").trim().length > 0).length;
  commit(
    { interviews: cur.interviews.map((x) => (x.id === id ? { ...x, state: "recorded" } : x)) },
    { by, where: "면담", text: `${id} 기록 완료 — 프로토콜 ${filled}/${protocol.length}문항` },
  );
}

/**
 * 코딩 확정 — interview.coded 이벤트가 여기서 적재된다.
 * 확정하기 전까지 면담 내용은 판정 협진 화면에 올라가지 않는다.
 */
export function confirmInterview(
  id: string,
  codes: OpenCode[],
  summary: string,
  by: string,
) {
  const cur = read();
  const v = cur.interviews.find((x) => x.id === id);
  if (!v) return;
  const same = [...(v.aiCodes ?? [])].sort().join("|") === [...codes].sort().join("|");
  commit(
    {
      interviews: cur.interviews.map((x) =>
        x.id === id ? { ...x, state: "coded", coded: { codes, by, at: now(), summary } } : x,
      ),
    },
    {
      by,
      where: "면담",
      text: `interview.coded — ${v.seat} ${codes.join("·")}${same ? "" : " (AI 코딩과 다름)"}`,
    },
  );
}

/* ───────────────────────── EXP-07 동작 ───────────────────────── */

/** AI가 제안한 셀을 사람이 조정한다 */
export function setCell(id: string, cell: CrossCell, by: string, why: string) {
  const cur = read();
  const c = cur.conference.find((x) => x.id === id);
  if (!c || c.state === "signed") return;
  commit(
    {
      conference: cur.conference.map((x) =>
        x.id === id ? { ...x, cell, cellBy: by, cellWhy: why } : x,
      ),
    },
    {
      by,
      where: "협진",
      text: `${c.seat} 크로스 셀 ${cellOf(c.aiCell).label} → ${cellOf(cell).label} — ${why}`,
    },
  );
}

export function addComment(id: string, by: string, field: string, text: string, dissent: boolean) {
  const cur = read();
  const c = cur.conference.find((x) => x.id === id);
  if (!c) return;
  const entry: ConferenceComment = {
    id: `cm-${c.comments.length + 1}-${by}`,
    by,
    field,
    text,
    at: now(),
    dissent,
  };
  commit(
    {
      conference: cur.conference.map((x) =>
        x.id === id ? { ...x, comments: [...x.comments, entry] } : x,
      ),
    },
    { by, where: "협진", text: `${c.seat} 코멘트${dissent ? " (이견)" : ""} — ${field}` },
  );
}

/** 경계선 유보 — 확정하지 않고 다음 회차 재관찰로 넘긴다 */
export function holdCase(id: string, by: string, reason: string, nextRound: string) {
  const cur = read();
  const c = cur.conference.find((x) => x.id === id);
  if (!c || c.state === "signed") return;
  commit(
    {
      conference: cur.conference.map((x) =>
        x.id === id ? { ...x, state: "held", hold: { by, at: now(), reason, nextRound } } : x,
      ),
    },
    { by, where: "협진", text: `${c.seat} 판정 유보 → ${nextRound} 재관찰 — ${reason}` },
  );
}

export function reopenCase(id: string, by: string) {
  const cur = read();
  commit(
    {
      conference: cur.conference.map((x) =>
        x.id === id ? { ...x, state: "open", hold: undefined } : x,
      ),
    },
    { by, where: "협진", text: `${id} 유보를 풀고 다시 협진` },
  );
}

/**
 * 최종 확정·전자서명.
 *
 * 확정한 사람·시각과 함께 그 시점의 근거를 한 줄로 굳혀 해시를 남긴다. 뒤에 자료가
 * 바뀌면 같은 근거로 다시 계산한 해시가 달라지므로, 「확정 뒤에 무엇이 움직였다」는
 * 사실이 드러난다.
 */
export function signCase(id: string, by: string) {
  const cur = read();
  const c = cur.conference.find((x) => x.id === id);
  if (!c || c.state === "signed") return null;
  const basis = basisOf(c, cur.scores);
  const hash = basisHash(basis);
  commit(
    {
      conference: cur.conference.map((x) =>
        x.id === id ? { ...x, state: "signed", sign: { by, at: now(), hash, basis } } : x,
      ),
    },
    { by, where: "협진", text: `${c.seat} 최종 확정 · 전자서명 ${hash.slice(0, 8)}` },
  );
  return hash;
}

/** 서명 뒤에 근거가 움직였는지 — 지금 값으로 다시 계산해 견준다 */
export function signIntact(c: ConferenceCase, tasks: ScoreTask[]) {
  if (!c.sign) return null;
  return basisHash(basisOf(c, tasks)) === c.sign.hash;
}
