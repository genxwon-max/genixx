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
  /** 어느 회차에서 걷힌 응답인가 (lib/admin.ts rounds의 id) */
  round: string;
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
  /**
   * 손으로 고친 배점.
   *
   * 루브릭은 0·1·2 세 칸이라 그 사이가 없다. 「답은 맞는데 까닭이 반만 있다」처럼
   * 칸 사이에 떨어지는 답이 실제로 나오므로, 답안지를 훑는 자리에서 0.5씩 손볼 수
   * 있게 둔다. 손대지 않으면 루브릭 점수를 그대로 쓴다 — 그래서 undefined가 뜻을 갖는다.
   */
  points?: number;
  /** 아이와 학부모가 읽는 해설 — 리포트에 실린다. 채점 메모(human.note)와 다른 글이다 */
  comment?: string;
  markedBy?: string;
  markedAt?: string;
};

/** 서술형 한 문항의 만점 */
export const MAX_POINT = 2;

/** 배점을 고르는 눈금 — 0부터 만점까지 0.5씩 */
export const POINT_STEPS = [0, 0.5, 1, 1.5, 2];

/** 저신뢰라 사람에게 자동으로 넘어간 건인가 */
export const isRouted = (t: ScoreTask) => t.confidence < ROUTE_CUT;

/** 지금 이 응답에 붙어 있는 값 — 사람이 확정했으면 사람 값이다 */
export const levelOf = (t: ScoreTask) => t.human?.level ?? t.aiLevel;

export const scoreDone = (t: ScoreTask) => !!t.human;

/** 지금 이 응답에 붙은 점수 — 손으로 고쳤으면 그 값, 아니면 루브릭 점수 */
export const pointsOf = (t: ScoreTask) => t.points ?? rubric[levelOf(t)].point;

/** 사람이 배점을 손댄 자리인가 — 목록에서 표시해 준다 */
export const pointsFixed = (t: ScoreTask) =>
  t.points != null && t.points !== rubric[levelOf(t)].point;

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
  round: string,
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
  round,
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

/** 손으로 쓴 아홉 건 — 화면을 처음 세울 때 기준으로 삼은 글이다 */
const HAND_SCORES: ScoreTask[] = [
  st(
    "SC-0412-K1",
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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
    "2026-3",
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

/* ───────────────────────── 씨앗 짓기 ───────────────────────── */

/**
 * 발문 하나와 수준별 답·근거.
 *
 * 회차마다 같은 발문이 여러 아이에게 나가고 아이마다 답이 다르다. 그래서 씨앗을
 * 「발문 × 수준」으로 짜 두고 아이를 거기에 붙인다 — 답과 AI 근거가 늘 짝이 맞아,
 * 화면에서 「오답인데 근거는 완전정답 이야기」 같은 줄이 서지 않는다.
 *
 * ⚠ 아이 답은 **맞춤법을 고치지 않았다.** 고쳐 두면 채점하는 눈이 달라진다 — 실제
 *   화면에서도 아이가 쓴 그대로를 보여 준다.
 */
type StemSeed = {
  subject: ScoreTask["subject"];
  axis: string;
  /** 이 발문이 나가는 학년 */
  grades: string[];
  stem: string;
  ans: Record<RubricLevel, { answer: string; why: string }>;
};

const STEMS: StemSeed[] = [
  {
    subject: "국어",
    axis: "언어",
    grades: ["초3", "초4"],
    stem: "이야기에서 가장 중요한 사건을 하나 고르고 그렇게 고른 까닭을 쓰시오",
    ans: {
      full: {
        answer: "제일 중요한건 주인공이 강아지를 다시 데려온 일이다 왜냬하면 그전까지는 계속 혼자서 밥먹는 장면만 나왔는데 강아지 데려오고 나서부터 마당에서 웃는 장면이 나오기 때문이다 그래서 여기서부터 이야기가 바뀐거 같다",
        why: "「혼자서 밥먹는 장면」과 「마당에서 웃는 장면」을 앞뒤로 견주어 그 사건을 고른 까닭을 글에서 끌어왔고, 이야기가 바뀌는 자리라는 말까지 덧붙였습니다.",
      },
      partial: {
        answer: "강아지 다시 데려온 일이 제일 중요한 사건이다",
        why: "고른 사건은 글의 중심 사건과 맞지만 왜 중요한지가 한 줄도 없어, 글을 읽고 고른 것인지 찍은 것인지 가릴 수 없습니다.",
      },
      none: {
        answer: "가장 중요한 사건을 하나 고르고 그렇게 고른 까닭을 쓰는것 나는 강아지 키우고 싶은데 엄마가 안됀다고 한다 형이 알레르기 있어서 안됀다고 했다",
        why: "발문을 그대로 옮겨 적은 뒤 집에서 강아지를 못 키운다는 자기 이야기로 넘어가, 글에서 사건을 고른 대목이 없습니다.",
      },
    },
  },
  {
    subject: "국어",
    axis: "언어",
    grades: ["초3", "초4"],
    stem: "밑줄 친 낱말이 윗글에서 어떤 뜻으로 쓰였는지 앞뒤 문장을 근거로 쓰시오",
    ans: {
      full: {
        answer: "여기서 굳다는 딱딱해진다는 뜻이 아니라 마음을 단단이 먹었다는 뜻이다 바로 앞문장에 다시는 울지 않겠다고 나와서 그렇게 봤다",
        why: "바로 앞 문장의 「다시는 울지 않겠다」를 근거로 들어 사전에 나오는 뜻과 윗글에서 쓰인 뜻을 갈라냈습니다.",
      },
      partial: {
        answer: "마음이 굳었다는건 마음을 단단히 먹었다는 뜻인거 같다 왜냐하면 우리 아빠도 나한테 마음 굳게 먹어라고 말할때가 있는데 그때 참으라는 뜻이기 때문이다",
        why: "뜻은 문맥에 맞게 짚었으나 근거로 든 것이 아빠가 쓰는 말이라, 앞뒤 문장에서 찾으라는 조건과 이어지지 않습니다.",
      },
      none: {
        answer: "잘 모르겠어요 낱말이 너무 어려워요",
        why: "뜻을 적은 대목이 없어 판단할 내용이 없습니다.",
      },
    },
  },
  {
    subject: "국어",
    axis: "언어",
    grades: ["초5", "초6"],
    stem: "글쓴이가 든 근거 가운데 주장을 뒷받침하지 못하는 것을 하나 골라 쓰고, 왜 그렇게 보았는지 쓰시오",
    ans: {
      full: {
        answer: "세번째 근거가 주장이랑 상관없다 운동화 값이 비싸다는건 잔디를 깔든 안깔든 똑같은거라서 운동장을 바꿔야 되는 이유가 안댄다 앞에 두개는 넘어져서 다친 애들 수랑 흙먼지 이야기라 운동장이랑 이어지는데 이거만 혼자 다른 이야기다",
        why: "세 번째 근거를 고른 뒤 「잔디를 깔든 안 깔든 똑같다」로 주장과 이어지지 않는 까닭을 댔고, 앞의 두 근거와 견주어 왜 그것만 겉도는지까지 보였습니다.",
      },
      partial: {
        answer: "세번째 근거가 주장이랑 안맞다 그거 빼면 될거 같다",
        why: "뒷받침이 되지 않는 근거는 바르게 골랐으나 어디가 어떻게 안 맞는지가 없어, 고른 까닭을 확인할 수 없습니다.",
      },
      none: {
        answer: "나는 인조잔디로 바꾸는게 좋다고 생각한다 우리 형 학교는 잔디가 있어서 축구할때 넘어져도 안아프다고 했다 흙운동장은 비오면 물웅덩이도 생긴다 그래서 우리학교도 빨리 바꿔줬으면 좋겠다",
        why: "자기 의견과 형 학교 이야기만 적었을 뿐, 글쓴이가 든 근거 가운데 하나를 고른 대목이 없습니다.",
      },
    },
  },
  {
    subject: "국어",
    axis: "언어",
    grades: ["초5", "초6"],
    stem: "윗글에서 사실인 부분과 글쓴이의 생각인 부분을 하나씩 찾아 쓰고, 그렇게 나눈 까닭을 쓰시오",
    ans: {
      full: {
        answer: "사실은 작년에 도서관을 쓴 사람이 삼천명이라는 거고 생각은 도서관을 더 늦게까지 열어야 한다는 거다 앞에꺼는 숫자라서 세보면 맞는지 알수있고 뒤에꺼는 사람마다 다르게 생각할수 있으니까 글쓴이 생각이다",
        why: "두 문장을 각각 옮겨 적은 뒤 「세보면 알수있다」와 「사람마다 다르게 생각할수 있다」로 가르는 기준까지 세웠습니다.",
      },
      partial: {
        answer: "사실은 도서관 쓴 사람이 삼천명이라는 거다 생각은 그냥 글쓴이 마음이다 왜냐하면 사실은 안변하고 생각은 변하기 때문이다",
        why: "사실 쪽은 「삼천명」을 글에서 골랐으나 생각 쪽은 어느 문장인지 짚지 않았고, 까닭도 「변하기 때문」이라는 일반 설명에 그칩니다.",
      },
      none: {
        answer: "사실 두개 생각 한개",
        why: "찾은 개수만 적고 어느 문장인지 쓰지 않아 판단할 내용이 없습니다. 다만 한 줄에서 끊겨 뒤에 이어 쓰려다 만 것인지는 가리기 어렵습니다.",
      },
    },
  },
  {
    subject: "국어",
    axis: "언어",
    grades: ["중1", "중2"],
    stem: "글쓴이가 이 글을 쓴 목적이 무엇인지 쓰고, 그렇게 본 근거를 글에서 찾아 쓰시오",
    ans: {
      full: {
        answer: "학교앞 횡단보도에 신호등 놔달라고 설득하려고 쓴 글이다 두번째 문단에서 작년에 사고가 네번 났다고 숫자를 대고 마지막에 이제는 어른들이 나서야 한다고 부탁하면서 끝냈기 때문이다 그냥 알려주려는 글이였으면 끝에 부탁하는 말이 안나왔을거다",
        why: "두 번째 문단의 사고 횟수와 끝문장의 요청을 함께 근거로 들었고, 정보를 알리는 글이었다면 부탁이 없었을 것이라고 견주어 목적을 설득으로 좁혔습니다.",
      },
      partial: {
        answer: "신호등 놔달라고 하려고 쓴 글이다",
        why: "목적은 바르게 짚었으나 글의 어느 문단이나 문장을 보고 그렇게 판단했는지가 없습니다.",
      },
      none: {
        answer: "글쓴이는 학교 앞이 위험하다고 했다 차가 많이 다니고 아이들도 많이 지나 다녀서 위험하다고 했다",
        why: "글에 나온 내용을 다시 옮겨 적었을 뿐, 이 글을 왜 썼는지에 해당하는 말이 없습니다.",
      },
    },
  },
  {
    subject: "국어",
    axis: "언어",
    grades: ["중1", "중2"],
    stem: "두번째 문단이 글 전체에서 하는 구실이 무엇인지 앞뒤 문단과 견주어 쓰시오",
    ans: {
      full: {
        answer: "두번째 문단은 첫문단이 던진 물음에 답을 주는 자리다 첫문단에서 요즘 애들이 왜 책을 안읽냐고 물어보고 두번째에서 스마트폰 때문이라고 이유를 대고 세번째부터는 그럼 어떡할지로 넘어간다 그래서 두번째가 빠지면 세번째 해결책이 갑자기 나오는 셈이 됀다",
        why: "앞 문단의 물음과 뒤 문단의 해결책을 나란히 놓고 두 번째 문단을 이유 대기로 자리매김했으며, 그 문단이 빠졌을 때 어떻게 되는지까지 따져 보였습니다.",
      },
      partial: {
        answer: "두번째 문단은 이유를 말해주는 문단이다 왜냐하면 원래 글은 처음에 문제를 말하고 가운데에서 이유를 대고 마지막에 해결책을 쓰기 때문이다 학원에서도 그렇게 배웠다 그래서 가운데 문단은 거의 이유라고 보면 된다",
        why: "구실은 이유 대기로 바르게 보았으나 근거가 윗글의 짜임이 아니라 「원래 글은」이라는 일반 틀이어서, 앞뒤 문단과 견주라는 조건을 채우지 못했습니다.",
      },
      none: {
        answer: "두번째 문단은 두번째로 나오는 문단이다",
        why: "문단의 차례를 되풀이해 적었을 뿐, 글 안에서 하는 구실을 말한 대목이 없습니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["초5", "초6"],
    stem: "친구의 풀이에서 처음으로 잘못된 곳을 찾고, 왜 잘못인지 쓰시오",
    ans: {
      full: {
        answer: "세번째 줄 부터 틀렷다 24÷6+2 인데 친구는 6+2를 먼저 더해서 8을 만들고 24÷8=3 이라고 했다 ÷하고 +가 같이 있을때는 나누기 부터 하는거라서 24÷6=4를 하고 거기다 2를 더해서 6이 되야 맞다",
        why: "24÷8=3이 나온 세 번째 줄을 짚었고 나누기를 먼저 한다는 순서로 4+2=6까지 되짚어 완전정답으로 봅니다.",
      },
      partial: {
        answer: "세번째 줄이 틀렷다 여기서 부터 답이 이상해젓다",
        why: "세 번째 줄이라는 위치는 맞게 짚었으나 6+2를 먼저 하면 왜 안 되는지가 이상해졌다는 말뿐이라 부분정답으로 봅니다.",
      },
      none: {
        answer: "친구가 어디서 부터 잘못한건지 아무리 봐도 모르겟다 나도 이런 문제만 나오면 자꾸 틀려서 자신이 없다",
        why: "몇째 줄인지도 계산 순서 이야기도 없고 자신이 없다는 자기 이야기로 끝나 판단할 내용이 없습니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["초3", "초4"],
    stem: "나눗셈의 몫과 나머지가 이 상황에서 각각 무엇을 뜻하는지 밝히고, 필요한 의자 수를 쓰시오",
    ans: {
      full: {
        answer: "35÷4를 하면 8이고 3이 남는다 8은 네명이 꽉 찬 의자가 8개 라는 뜻이고 3은 아직 못 앉은 아이가 3명 남앗다는 뜻이다 그 3명도 앉아야 되니까 의자를 한개 더 놔서 다 해서 9개가 있어야 된다",
        why: "몫 8을 꽉 찬 의자로, 나머지 3을 못 앉은 아이로 각각 옮겨 읽고 그래서 한 개를 더 놓아 9개라는 결론까지 이어 붙여 완전정답입니다.",
      },
      partial: {
        answer: "의자는 9개 있어야 된다 왜냬하면 한명이라도 못 앉고 서 있으면 안됀다고 생각하기 때문이다",
        why: "의자 9개라는 답은 맞으나 까닭이 남은 3명이 아니라 서 있으면 안 된다는 자기 생각이어서 몫과 나머지의 뜻으로 이어지지 않습니다.",
      },
      none: {
        answer: "의자 한개에 4명씩 앉고 아이는 35명 입니다",
        why: "문제에 있는 4명과 35명을 옮겨 적었을 뿐 몫과 나머지가 무엇을 뜻하는지도 의자 수도 없습니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["초5", "초6"],
    stem: "두 가게의 값을 견주어 어느 쪽이 더 싼지 고르고, 그렇게 본 까닭을 쓰시오",
    ans: {
      full: {
        answer: "나 가게가 더 싸다 가 가게는 300g에 4500원 이니까 100g으로 하면 1500원 이고 나 가게는 500g에 6500원 이니까 100g에 1300원이다 g수가 서로 달라서 100g으로 똑같이 맞춰놓고 봐야 되는데 그렇게 하니까 나 가게가 100g마다 200원씩 더 쌋다",
        why: "300g에 4500원과 500g에 6500원을 각각 100g당 1500원과 1300원으로 고친 과정이 답에 그대로 남아 있고 200원 차까지 짚어 완전정답입니다.",
      },
      partial: {
        answer: "나 가게가 더 쌈 100g으로 하면 1300원 나옴",
        why: "100g당 1300원까지는 맞게 구했으나 가 가게를 100g당 얼마로 고쳤는지가 없어 견준 자리가 비어 부분정답으로 봅니다.",
      },
      none: {
        answer: "가 가게가 싸다 4500원이 6500원 보다 싸니까 그러니까 당연이 가 가게다",
        why: "300g과 500g으로 양이 다른데 전체 값 4500원과 6500원만 견주어 반대 결론을 냈습니다. 값을 비교하기는 했으나 묻는 것과 다른 답입니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["중1", "중2"],
    stem: "같은 문제를 서로 다른 두 가지 방법으로 풀고, 두 방법에서 왜 같은 답이 나오는지 쓰시오",
    ans: {
      full: {
        answer: "첫번째는 괄호 안 부터 더해서 4×(7+3)=4×10=40 으로 풀었고 두번째는 따로 곱해서 4×7+4×3=28+12=40 으로 풀었다 둘다 40이 나오는 이유는 4개짜리를 10묶음 한꺼번에 세는거랑 7묶음 세고 3묶음 세서 더하는거랑 결국 세는 물건이 똑같은 거 이기 때문이다",
        why: "두 식을 값까지 모두 적었고 10묶음을 한꺼번에 세는 것과 7묶음·3묶음을 나눠 세는 것이 같은 물건을 센다는 뜻으로 이어 붙여 완전정답입니다.",
      },
      partial: {
        answer: "4×(7+3)=40 이고 4×7+4×3=40 이다 계산해 보니까 둘다 40으로 똑같이 나왔다 답이 같게 나왔으니까 두개는 같은 방법인게 맞다",
        why: "두 식과 40이라는 값은 맞으나 까닭이 답이 같으니 같다는 되풀이여서 4를 묶어 곱한 것과 나눠 곱한 것 사이의 관계로 이어지지 않습니다.",
      },
      none: {
        answer: "4×(7+3)=4×10=40 답은 40",
        why: "한 가지 방법의 계산만 있고 다른 방법도, 두 방법이 왜 같은지도 없어 묻는 것에 답하지 못했습니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["초3", "초4"],
    stem: "계산하기 전에 답을 어림해 보고, 어림한 값과 실제로 계산한 값을 견주어 쓰시오",
    ans: {
      full: {
        answer: "397은 400으로 올리고 206은 200으로 내려서 600쯤 이라고 어림햇다 근데 진짜 답은 603이라서 어림이 3 작았다 206에서 6을 내린게 397에 3을 올린거 보다 커서 그런거 같다",
        why: "600과 603의 3 차이를 6을 내린 것과 3을 올린 것의 크기로 되짚어 어림이 왜 작게 나왔는지까지 적어 완전정답입니다.",
      },
      partial: {
        answer: "600쯤 나올거 같다 계산하니까 603 나옴",
        why: "어림값 600과 계산값 603을 둘 다 맞게 적었으나 3만큼 차이가 난 까닭이 한 줄도 없어 부분정답으로 봅니다.",
      },
      none: {
        answer: "어림은 안하고 그냥 계산 햇다 397+206=603 이다 어림은 어차피 정확하지가 않아서 안 해도 될거 같다",
        why: "어림한 값이 없어 견줄 대상 자체가 없고 어림은 안 해도 된다는 자기 생각으로 끝나 묻는 것과 다른 답이 되었습니다.",
      },
    },
  },
  {
    subject: "수학",
    axis: "수리·논리",
    grades: ["중1", "중2"],
    stem: "빠짐없이 겹치지 않게 세는 방법을 설명하고, 모두 몇 가지인지 쓰시오",
    ans: {
      full: {
        answer: "윗옷 한개를 먼저 딱 정해놓고 거기다가 바지 4개를 하나씩 다 붙여보면 윗옷 한개당 4가지가 나온다 윗옷이 3개니까 3×4=12 가지다 이렇게 윗옷 순서대로 가면 빠트리는 것도 없고 아까 센거를 또 세는 것도 없다",
        why: "윗옷 하나를 고정하고 바지 4개를 붙이는 절차를 적은 뒤 윗옷이 3개라서 3×4=12가지라는 값으로 이어 붙여 완전정답입니다.",
      },
      partial: {
        answer: "12가지다 공책에 하나씩 다 그려봣더니 12개가 나왔다 천천히 세면 안 틀린다",
        why: "12가지라는 수는 맞으나 세는 방법이 천천히 센다는 말에 그쳐 윗옷 3개와 바지 4개를 어떻게 짝지었는지로 이어지지 않습니다.",
      },
      none: {
        answer: "윗옷이 3개고 바지가 4개니까 3+4=7 이라서 7가지 입니다",
        why: "옷을 짝짓지 않고 개수만 더해 7가지라 했고 빠짐없이 세는 방법도 없어 묻는 것과 다른 답입니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["초5", "초6"],
    stem: "실험에서 한 가지만 다르게 한 것과 똑같이 맞춘 것이 각각 무엇인지 쓰고, 왜 그렇게 했는지 쓰시오",
    ans: {
      full: {
        answer: "우리조는 물 주는 양만 다르게 했다 한쪽은 20mL 한쪽은 5mL 주고 흙은 같은 봉지에서 퍼서 넣고 컵도 같은거 쓰고 창가에 나란히 놔뒀다 왜냬하면 물말고 딴게 같이 달라지면 콩나물이 물때문에 자란건지 햇빛때문에 자란건지 몰라서 이다 그래서 나머지는 다 똑같이 마춰야 한다",
        why: "다르게 한 것을 20mL와 5mL라는 값까지 들어 적고 흙·컵·놓은 자리를 같게 맞춘 것을 하나씩 든 뒤, 다른 것이 같이 바뀌면 물 때문인지 햇빛 때문인지 가릴 수 없다는 까닭까지 이었습니다.",
      },
      partial: {
        answer: "물 주는 양만 다르게 했고 나머지는 똑같이 마췄다 흙이랑 컵이랑 놓은 자리",
        why: "다르게 한 것과 같게 맞춘 것을 흙·컵·자리까지 정확히 짚었으나, 왜 그것들을 같게 맞춰야 하는지가 한 줄도 없어 부분정답으로 봅니다.",
      },
      none: {
        answer: "한 가지만 다르게 하고 나머지는 똑같이 맞추었습니다 그래서 실험이 잘 됬다 우리조가 제일 빨리 끝냈다",
        why: "발문의 문장을 거의 그대로 옮겨 적고 조 자랑을 붙였을 뿐, 무엇을 다르게 했고 무엇을 같게 맞추었는지는 한 가지도 적히지 않았습니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["초3", "초4"],
    stem: "같은 것을 한 번만 재지 않고 여러 번 잰 까닭을 쓰시오",
    ans: {
      full: {
        answer: "한번만 재면 내가 초시게를 늦게 눌럿을수도 있어서 그게 진짜 값인지 모른다 우리는 세번 재서 12초 13초 12초가 나왔는데 12초가 두번이라서 12초로 정했다 여러번 재면 이상한 값이 껴도 바로 알수있다",
        why: "한 번은 초시계를 늦게 눌렀을 수 있다는 점을 들고, 12·13·12초라는 자기 조가 잰 값 셋을 그대로 근거로 삼아 12초로 정한 데까지 이어 완전정답으로 봅니다.",
      },
      partial: {
        answer: "여러번 재야 더 정확해진다 과학자들도 다 여러번 한다고 티비에서 봤다 나도 커서 과학자 될거다",
        why: "정확해진다는 까닭을 대기는 했으나 우리 조가 잰 값이 서로 달랐다는 실험 기록은 한 번도 들지 않고 방송에서 들은 이야기에만 기대고 있습니다.",
      },
      none: {
        answer: "세번 쟀다",
        why: "몇 번 쟀는지만 적혀 있고 까닭에 해당하는 말이 없습니다. 다만 분량이 한 줄이라 뒤에 쓰려던 것이 있었는지는 판단이 어렵습니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["초5", "초6"],
    stem: "모아 온 잎을 두 무리로 나눈 기준이 무엇인지 쓰고, 그 기준이면 왜 헷갈리지 않는지 쓰시오",
    ans: {
      full: {
        answer: "나는 잎 가장자리가 톱니처럼 뾰족뾰족한거랑 매끈한거로 나눴다 크기로 나누면 중간짜리가 큰쪽인지 작은쪽인지 애매해서 나랑 짝이랑 다르게 나눌수 있는데 톱니는 있나 없나만 보면 되니까 누가 나눠도 똑같이 나눠진다",
        why: "가장자리의 톱니 유무라는 기준을 대고, 크기로 나누면 중간 크기가 어느 쪽인지 사람마다 갈린다는 견줌을 들어 그 기준이면 왜 헷갈리지 않는지까지 답했습니다.",
      },
      partial: {
        answer: "잎 끝이 뾰족한거랑 안 뾰족한거로 나눴다 뾰족한게 12장이고 안 뾰족한게 8장 이렇게 됬다",
        why: "나눈 기준과 무리마다의 장수까지 적었으나, 그 기준이면 왜 헷갈리지 않는지에 해당하는 말이 없어 부분정답으로 봅니다.",
      },
      none: {
        answer: "잎을 진짜 많이 주웠다 단풍잎이 제일 이뻣다 나는 노란색을 조아한다 다음에 또 줍고싶다",
        why: "주운 잎에 대한 느낌만 네 줄 적혀 있고 두 무리로 가른 기준에 해당하는 말이 한 군데도 없습니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["초3", "초4"],
    stem: "표에 적은 그림자 길이를 보고 하루 동안 그림자가 어떻게 달라졌는지 쓰고, 표의 어느 값을 보고 그렇게 보았는지 함께 쓰시오",
    ans: {
      full: {
        answer: "그림자가 짧아졌다가 다시 길어졌다 9시에 65cm였는데 12시에 20cm로 제일 짧아지고 3시에 다시 58cm가 됬다 그래서 낮 12시쯤에 제일 짧고 아침이랑 저녁쪽으로 갈수록 길어지는거 같다",
        why: "9시 65cm, 12시 20cm, 3시 58cm라는 표의 값 셋을 그대로 들어 짧아졌다 다시 길어지는 흐름을 세웠고, 가장 짧은 때가 정오 무렵이라는 데까지 갔습니다.",
      },
      partial: {
        answer: "해가 움직이니까 그림자도 따라 움직여서 길이가 달라진다 아침에는 길고 낮에는 짧다고 책에서 봤다",
        why: "아침에 길고 낮에 짧다는 방향은 맞게 짚었으나 우리 조가 표에 적은 65cm·20cm 같은 값은 하나도 들지 않고 책에서 본 이야기로만 답했습니다.",
      },
      none: {
        answer: "표에 숫자가 너무 많아서 잘 모르겠다 그리고 우리조는 3시에 안 재서 칸이 비어있다",
        why: "표가 어렵다는 말과 빈칸 이야기뿐이라 그림자 길이가 어떻게 달라졌는지에 대한 답이 없습니다. 다만 3시 값이 실제로 비어 있었다면 견주기 어려웠을 수는 있습니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["중1", "중2"],
    stem: "우리 조 기록지만 보고 다른 반 친구가 이 실험을 똑같이 해 보려 한다. 기록지에서 빠진 것을 찾아 쓰고, 그것이 없으면 결과가 어떻게 달라지는지 쓰시오",
    ans: {
      full: {
        answer: "우리 기록지에는 물 100mL에 소금 넣었다고만 썻고 그 물이 몇도짜리인지가 안 적혀있다 남이 찬물로 하면 소금이 다 안 녹아서 우리보다 적게 녹은걸로 나온다 그리고 몇분동안 저었는지도 안 써놔서 대충 저으면 녹는 양이 또 달라진다",
        why: "빠진 기록을 물의 온도와 젓는 시간 둘로 짚고, 찬물로 하면 덜 녹아 우리 결과와 달라진다는 데까지 이어 완전정답입니다.",
      },
      partial: {
        answer: "물 온도랑 소금 양이랑 몇분 저었는지랑 온도계 종류도 적어야 된다",
        why: "빠진 기록을 온도·소금 양·젓는 시간·온도계까지 네 가지나 골랐으나, 그것이 빠지면 결과가 어떻게 달라지는지는 한 가지도 적지 않아 부분정답으로 봅니다.",
      },
      none: {
        answer: "실험 순서를 잘 지키고 안전에 조심하라고 적어야 한다 보안경도 껴야되고 소금 먹으면 안됀다",
        why: "안전 수칙만 적었을 뿐, 같은 실험을 되풀이하는 데 필요한 기록이 무엇인지는 답하지 않았습니다.",
      },
    },
  },
  {
    subject: "과학",
    axis: "자연·탐구",
    grades: ["중1", "중2"],
    stem: "같은 물의 온도를 재는데 친구가 잰 값과 내가 잰 값이 다르게 나왔다. 어느 값을 쓸지 정하고 그 까닭을 쓰시오",
    ans: {
      full: {
        answer: "나는 42도 친구는 45도로 틀리게 나왔다 근데 친구는 온도계를 물에서 꺼내들고 눈금을 읽었고 나는 담근 채로 읽었다 꺼내면 공기 온도때문에 눈금이 바뀌니까 담근채로 읽은 내 값 42도를 쓰기로 했다 대신 이따가 한번 더 같이 재보기로 했다",
        why: "두 값이 갈린 까닭을 온도계를 꺼내 읽었는지 담근 채 읽었는지로 짚고, 그 설명 위에서 42도를 고른 뒤 다시 재 보자는 데까지 갔습니다.",
      },
      partial: {
        answer: "내 값을 쓸거다 왜냬하면 내가 원래 더 꼼꼼히 하는 편이고 친구는 좀 대충 하기 때문이다",
        why: "쓸 값은 정했으나 까닭이 잰 방법이 아니라 친구의 성격이라, 온도계를 어떻게 읽었는지에 대한 기록과는 이어지지 않습니다.",
      },
      none: {
        answer: "값이 다르게 나왔다 왜 다른지는 모르겠다",
        why: "값이 달랐다는 사실만 옮겨 적었고 어느 값을 쓸지 정하지 않아 판단할 내용이 없습니다.",
      },
    },
  },
];

/** 씨앗을 늘 같은 꼴로 짓는 난수 — 화면을 다시 열 때마다 답이 바뀌면 안 된다 */
function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 못 박은 날에서 분 단위로 옮긴 시각 — 시계를 읽지 않으므로 서버와 브라우저가 같다 */
function stampAt(base: string, minutes: number) {
  const d = new Date(`${base}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** 채점하는 사람들 — 감사 로그(lib/admin.ts)에 서는 이름과 같게 둔다 */
const SCORERS = ["이서연", "정태호", "강수아", "노아름"];

/**
 * 회차마다 채점이 어디까지 갔는가.
 *
 * 회차 현황(lib/admin.ts rounds)이 적어 둔 것과 어긋나지 않게 잡는다 — 3회차는 아직
 * 응시를 받는 중이라 채점이 한창이고, 2회차는 막바지, 1회차는 끝났다. 준비중인 4회차는
 * 걷힌 답이 없으므로 한 줄도 짓지 않는다. 여기서 어긋나면 회차 화면에서 「채점 완료
 * 1052건」인 회차가 채점 화면에서는 대기 스물로 서게 된다.
 */
const ROUND_SEEDS = [
  { id: "2026-3", rn: 3, seats: 26, seat0: 440, done: 0.3, from: "2026-08-18T09:10" },
  { id: "2026-2", rn: 2, seats: 18, seat0: 118, done: 0.92, from: "2026-06-09T09:40" },
  { id: "2026-1", rn: 1, seats: 14, seat0: 205, done: 1, from: "2026-03-05T10:05" },
];

const SUBJECT_CODE: Record<ScoreTask["subject"], string> = { 국어: "K", 수학: "M", 과학: "S" };
const GRADES = ["초3", "초4", "초5", "초6", "중1", "중2"];
const LEVELS: RubricLevel[] = ["full", "partial", "none"];

/** 사람이 AI와 다르게 본 까닭 — 바꾼 방향에 맞는 말만 고른다 */
const CHANGE_NOTE: Record<"up" | "down", string[]> = {
  up: [
    "짧지만 묻는 것과 까닭이 다 들어 있어 한 단계 올렸습니다.",
    "맞춤법이 거칠 뿐 근거는 자료에서 끌어왔습니다.",
    "AI가 분량을 보고 낮춘 것으로 보입니다. 내용으로는 기준을 채웁니다.",
  ],
  down: [
    "근거로 든 것이 자료가 아니라 아이 경험이라 한 단계 내렸습니다.",
    "답은 맞게 짚었으나 까닭이 없어 완전정답으로 보기 어렵습니다.",
    "묻는 것과 조금 다른 것에 답했습니다.",
  ],
};

/**
 * 아이와 학부모가 읽는 해설.
 *
 * 점수를 되풀이해 적지 않는다 — 「2점입니다」는 숫자 칸이 이미 말한다. 여기 적을 것은
 * **다음에 무엇을 하면 되는가**뿐이라, 발문이 무엇이든 같은 자리를 짚게 된다.
 */
const COMMENTS: Record<RubricLevel, string> = {
  full: "묻는 것과 그렇게 본 까닭을 함께 적었습니다. 다음에는 까닭을 두 가지로 늘려 보면 더 단단해집니다.",
  partial: "답은 바르게 짚었습니다. 왜 그렇게 보았는지를 자료에서 한 줄만 끌어와 붙이면 완전정답이 됩니다.",
  none: "묻는 것이 무엇인지부터 다시 짚어 봅시다. 문제에서 「무엇을 쓰라」고 했는지 밑줄을 그어 보면 좋겠습니다.",
};

/**
 * 회차·과목별 응답을 짓는다.
 *
 * 손으로 쓴 아홉 건(위)만으로는 이 화면이 하는 일이 안 보인다 — 채점은 「쌓인 것을
 * 훑어 내려가는 일」이라 줄이 열도 안 되면 거르개도 쪽 넘김도 쓸 자리가 없다.
 */
function makeScores(): ScoreTask[] {
  const r = seedRng(20260908);
  const out: ScoreTask[] = [];

  for (const round of ROUND_SEEDS) {
    let seat = round.seat0;
    for (let i = 0; i < round.seats; i++) {
      /* 응시번호는 띄엄띄엄 붙는다 — 회차에 800명이 보는데 번호가 촘촘히 이어지면
         이 목록이 전수인 줄로 읽힌다 */
      seat += 1 + Math.floor(r() * 3);
      const seatNo = String(seat).padStart(4, "0");
      const grade = GRADES[Math.floor(r() * GRADES.length)];
      const fits = STEMS.filter((s) => s.grades.includes(grade));
      const pool = fits.length > 0 ? fits : STEMS;

      /* 한 아이가 한 과목만 보지 않는다. 다만 전 과목을 다 넣으면 목록이 학생 명부가
         된다 — 서술형이 걸린 과목만 여기 선다 */
      const howMany = r() > 0.45 ? 2 : 1;
      const used: string[] = [];
      for (let k = 0; k < howMany; k++) {
        const pick = pool[Math.floor(r() * pool.length)];
        if (used.includes(pick.stem)) continue;
        used.push(pick.stem);

        const roll = r();
        const level: RubricLevel = roll < 0.42 ? "full" : roll < 0.76 ? "partial" : "none";
        const cell = pick.ans[level];

        /* 확신도는 수준에 따라 다르게 흩는다 — AI는 완전정답을 가장 잘 맞히고,
           오답은 「짧아서 오답인지 몰라서 오답인지」를 못 가려 낮게 나온다 */
        const span =
          level === "full" ? [0.78, 0.97] : level === "partial" ? [0.6, 0.92] : [0.48, 0.86];
        const confidence = Math.round((span[0] + r() * (span[1] - span[0])) * 100) / 100;

        /* 이중 채점 표본 — 전수로 두 번 매길 수는 없으니 얼마쯤만 뽑는다. 너무 적게
           뽑으면 일치도가 표본 서넛에서 나와 값이 크게 흔들린다 */
        const double = r() < 0.26;
        const settled = r() < round.done;
        const minutes = Math.floor(r() * 40 * 60);

        const task: ScoreTask = {
          id: `SC-${round.rn}-${seatNo}-${SUBJECT_CODE[pick.subject]}${k + 1}`,
          round: round.id,
          seat: seatNo,
          grade,
          subject: pick.subject,
          axis: pick.axis,
          stem: pick.stem,
          answer: cell.answer,
          aiLevel: level,
          confidence,
          aiWhy: cell.why,
          assignee: null,
          double,
        };

        if (settled) {
          /* 사람이 AI를 뒤집는 일은 흔치 않다. 흔하면 AI를 쓸 까닭이 없고, 아예
             없으면 사람이 확인 도장만 찍는 셈이라 둘 다 사실이 아니다 */
          const flip = r() < 0.22;
          const others = LEVELS.filter((v) => v !== level);
          const humanLevel = flip ? others[Math.floor(r() * others.length)] : level;
          const dir = rubric[humanLevel].point > rubric[level].point ? "up" : "down";
          const notes = CHANGE_NOTE[dir];
          task.human = {
            level: humanLevel,
            by: SCORERS[Math.floor(r() * SCORERS.length)],
            at: stampAt(round.from, minutes),
            note: flip ? notes[Math.floor(r() * notes.length)] : "",
          };

          /* 2차는 1차보다 늦게 붙는다 — 표본 가운데 얼마쯤은 늘 두 번째 사람을
             기다리는 중이다. 다 채워 두면 「이중 채점」 자리가 늘 비어 있어, 그 화면이
             하는 일이 무엇인지 볼 수가 없다 */
          /* 해설은 확정한 것에만 붙는다. 점수가 정해지기 전에 「다음에 이렇게 해 보자」를
             적으면 그 뒤에 점수가 바뀌었을 때 둘이 어긋난다 */
          if (r() < 0.3) {
            task.comment = COMMENTS[humanLevel];
            task.markedBy = task.human.by;
            task.markedAt = stampAt(round.from, minutes + 30 + Math.floor(r() * 300));
          }

          /* 루브릭 세 칸 사이에 떨어지는 답 — 사람이 반 칸을 얹거나 덜어 낸 자리다 */
          if (r() < 0.12) {
            const base = rubric[humanLevel].point;
            task.points = base === MAX_POINT ? base - 0.5 : base + 0.5;
            task.markedBy = task.human.by;
            task.markedAt = task.markedAt ?? stampAt(round.from, minutes + 45);
          }

          if (double && r() < 0.68) {
            /* 2차는 1차를 보지 않고 매긴다 — 그래서 가끔 갈린다. 갈린 자리가 곧
               루브릭을 다시 손볼 자리다 */
            const split = r() < 0.18;
            const alt = LEVELS.filter((v) => v !== humanLevel);
            task.second = {
              level: split ? alt[Math.floor(r() * alt.length)] : humanLevel,
              by: SCORERS[Math.floor(r() * SCORERS.length)],
              at: stampAt(round.from, minutes + 60 + Math.floor(r() * 600)),
            };
          }
        } else if (confidence < ROUTE_CUT && r() < 0.55) {
          /* 저신뢰인데 아직 확정 전 — 절반쯤은 이미 사람 손에 들어가 있다 */
          task.assignee = SCORERS[Math.floor(r() * SCORERS.length)];
        }

        out.push(task);
      }
    }
  }

  return out;
}

/**
 * 채점 대상 전부 — 손으로 쓴 것이 앞, 지은 것이 뒤.
 *
 * 차례가 곧 목록의 차례다(DataTable은 담긴 대로 번호를 매긴다). 열려 있는 회차가
 * 위로 오게 두어, 화면을 열면 지금 손이 가야 하는 것부터 보인다.
 */
const SEED_SCORES: ScoreTask[] = [...HAND_SCORES, ...makeScores()];

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

/**
 * 답안지 하나 — 한 회차에서 한 아이가 낸 서술형 전부.
 *
 * 채점 화면의 단위는 응답이지만(확신도가 응답마다 다르므로), **되돌려 주는 단위는
 * 사람**이다. 리포트에 실리는 것은 「이 아이가 이번 회차에 몇 점을 받았고 무엇을
 * 더 하면 되는가」이지 응답 하나가 아니다. 그래서 같은 자료를 사람으로도 묶는다.
 */
export type Sheet = {
  key: string;
  round: string;
  seat: string;
  grade: string;
  tasks: ScoreTask[];
};

/** 답안지 주소 — 응시번호는 회차 안에서만 유일하므로 회차를 앞에 붙인다 */
export const sheetKey = (t: { round: string; seat: string }) => `${t.round}-${t.seat}`;

/** 주소를 회차와 응시번호로 되돌린다 — 회차 id에도 대시가 있어 뒤에서 자른다 */
export function splitSheetKey(key: string) {
  const cut = key.lastIndexOf("-");
  return cut < 0 ? { round: key, seat: "" } : { round: key.slice(0, cut), seat: key.slice(cut + 1) };
}

/** 응답을 사람으로 묶는다 — 담긴 차례를 지켜, 목록의 차례가 회차 차례와 같게 둔다 */
export function sheetsOf(scores: ScoreTask[]): Sheet[] {
  const out: Sheet[] = [];
  const at = new Map<string, Sheet>();
  for (const t of scores) {
    const key = sheetKey(t);
    let sheet = at.get(key);
    if (!sheet) {
      sheet = { key, round: t.round, seat: t.seat, grade: t.grade, tasks: [] };
      at.set(key, sheet);
      out.push(sheet);
    }
    sheet.tasks.push(t);
  }
  return out;
}

/** 답안지 한 장의 점수 — 받은 점 / 만점 */
export function sheetScore(sheet: Sheet) {
  return {
    got: sheet.tasks.reduce((sum, t) => sum + (scoreDone(t) ? pointsOf(t) : 0), 0),
    max: sheet.tasks.length * MAX_POINT,
    done: sheet.tasks.filter(scoreDone).length,
    total: sheet.tasks.length,
  };
}

/**
 * 배점과 해설을 손본다 — 답안지 한 장을 한 번에 저장한다.
 *
 * 응답마다 저장을 누르게 두면 열 문항짜리 답안지에서 열 번을 누르게 되고, 그러다
 * 두어 개를 안 누르고 나간다. 한 장이 한 번이다.
 */
export function markSheet(
  edits: { id: string; points: number | null; comment: string }[],
  by: string,
) {
  const cur = read();
  const map = new Map(edits.map((e) => [e.id, e]));
  if (map.size === 0) return;
  const at = now();
  let touched = 0;
  const scores = cur.scores.map((t) => {
    const e = map.get(t.id);
    if (!e) return t;
    const points = e.points ?? undefined;
    const comment = e.comment.trim();
    /* 값이 그대로면 손댄 것으로 치지 않는다 — 안 고친 응답에 「누가 언제」가 찍히면
       그 도장이 아무것도 뜻하지 않게 된다 */
    if (points === t.points && comment === (t.comment ?? "")) return t;
    touched += 1;
    return {
      ...t,
      points,
      comment: comment || undefined,
      markedBy: by,
      markedAt: at,
    };
  });
  if (touched === 0) return;
  const first = cur.scores.find((t) => map.has(t.id));
  commit(
    { scores },
    {
      by,
      where: "채점",
      text: `${first ? `${first.seat} ` : ""}답안지 ${touched}문항 — 배점·해설 손봄`,
    },
  );
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

/**
 * 면담 케이스를 한 줄 더한다.
 *
 * admin2 면담 관리(/admin2/interviews)에서 보호자·교사가 보낸 신청을 대상으로 받을 때
 * 부른다. 그 줄이 여기 서야 이 콘솔의 면담 워크벤치와 판정 협진이 같은 케이스를 본다.
 *
 * ⚠ InterviewCase의 **모양은 건드리지 않는다.** 칸을 새로 붙이면 이미 genixx.expert를 쓴
 *   브라우저에서는 영영 안 나타난다 — read()가 최상위 키만 덮어서 interviews 배열은
 *   저장분이 통째로 이기기 때문이다. 줄을 더하는 것은 쓰기라 그 함정에 안 걸린다.
 *
 * ⚠ 소요시간·방식·장소는 여기 담지 않는다. 그 값은 admin2가 제 저장소에 덮어 든다
 *   (lib/interviewStore.ts). 두 콘솔이 「언제」는 같이 보고 「몇 분·어떤 방식」은 admin2만
 *   안다 — 면담 API를 붙일 때 한 벌로 합친다.
 */
export function pushInterview(c: InterviewCase, by: string) {
  const cur = read();
  if (cur.interviews.some((v) => v.id === c.id)) return;
  commit(
    { interviews: [...cur.interviews, c] },
    { by, where: "면담", text: `${c.id} ${c.seat} 면담 대상 확정 — 보호자·교사 신청` },
  );
}

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

/**
 * 잡아 둔 일정을 걷는다 — 선발됨으로 되돌린다.
 *
 * scheduleInterview의 짝이다. 짝이 없으면 admin2에서 일정을 지웠을 때 이 콘솔은 계속
 * 「일정 잡힘」이라 말하고, scheduledAt이 남아 있어 저쪽 화면이 그 문자열을 되읽어
 * 방금 지운 일정을 다시 세운다.
 *
 * ⚠ 기록(notes·transcript)은 건드리지 않는다. 날짜를 물렸다고 면담원이 적어 둔 것을
 *   지울 까닭이 없고, 그 글은 다시 잡은 면담에서 그대로 이어 쓴다.
 */
export function unscheduleInterview(id: string, by: string, why: string) {
  const cur = read();
  commit(
    {
      interviews: cur.interviews.map((v) =>
        v.id === id
          ? { ...v, state: "queued", scheduledAt: undefined, interviewer: undefined }
          : v,
      ),
    },
    { by, where: "면담", text: `${id} 일정 지움 — ${why}` },
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
