"use client";

import { useSyncExternalStore } from "react";
import type { StaffRoleId } from "./admin";

/**
 * 문항 초안 저장소 — 출제 워크벤치(EXP-02)와 검수 워크벤치(EXP-03)가 함께 쓴다.
 *
 * 두 화면이 같은 목록을 보고 서로의 결과를 받는다는 것이 이 콘솔의 요점이라, 상태를
 * 한곳에 두고 양쪽에서 고친다. 출제자가 제출하면 검수 목록에 뜨고, 검수자가 반려하면
 * 사유와 코멘트가 붙어 출제자의 반려함으로 돌아간다.
 *
 * 상태는 넷뿐이다 —
 *   draft(작성 중) → submitted(검수 대기) → approved(승인) 또는 rejected(반려)
 *   rejected는 고쳐서 다시 submitted로 간다.
 */

export type ItemState = "draft" | "submitted" | "rejected" | "approved";

export type ItemComment = {
  at: string;
  by: string;
  role: StaffRoleId;
  /** 반려 사유 코드. 승인·질의 코멘트에는 없다. */
  code?: RejectCode;
  text: string;
};

export type ItemDraft = {
  id: string;
  /** 문항 코드 — 사람이 부르는 이름 */
  code: string;
  subject: "국어" | "수학" | "과학";
  grade: string;
  /** 지문·자료 (없을 수 있다) */
  passage: string;
  /** 발문 */
  stem: string;
  choices: string[];
  /** 정답 보기 index */
  answer: number;
  explain: string;
  /** Tag A — 학력 내용축 */
  tagA: string;
  /** Tag B — 재능·인지과정축 */
  tagB: string;
  /** S1 지각 · S2 이해 · S3 생성 · S4 창의 */
  level: "S1" | "S2" | "S3" | "S4";
  /** 출제자 아이디 */
  author: string;
  authorName: string;
  state: ItemState;
  comments: ItemComment[];
  updatedAt: string;
};

/** 반려 사유 — 코드로 고르게 해서 출제자가 무엇을 고쳐야 하는지 바로 알게 한다 */
export const rejectCodes = [
  { id: "content", label: "내용 오류", desc: "교과 내용이 틀렸거나 근거가 약합니다" },
  { id: "answer", label: "정답 불명확", desc: "정답이 둘 이상으로 읽히거나 근거가 부족합니다" },
  { id: "wording", label: "발문 모호", desc: "묻는 바가 분명하지 않습니다" },
  { id: "grade", label: "학년 부적합", desc: "해당 학년이 읽기에 어렵거나 쉽습니다" },
  { id: "bias", label: "편향 우려", desc: "성·지역·문화·SES 편향이 보입니다" },
  { id: "tag", label: "태깅 불일치", desc: "이중태그나 S위계가 문항과 맞지 않습니다" },
] as const;

export type RejectCode = (typeof rejectCodes)[number]["id"];

export const rejectLabel = (id: RejectCode) =>
  rejectCodes.find((c) => c.id === id)?.label ?? id;

/** 검수 3단 — 정의서 EXP-03-1~3 */
export const reviewChecks = [
  { id: "content", label: "1차 내용", desc: "교과 정확성 · 발문 명료성 · 정답 유일성 · 학년 이독성" },
  { id: "tagging", label: "2차 태깅", desc: "이중태그와 S위계가 문항이 실제로 재는 것과 맞는가" },
  { id: "ethics", label: "3차 윤리·편향", desc: "성·지역·문화·SES 편향, 아동 정서 적합성" },
] as const;

export type ReviewCheckId = (typeof reviewChecks)[number]["id"];

const SEED: ItemDraft[] = [
  {
    id: "IT-2601",
    code: "KOR-3-014",
    subject: "국어",
    grade: "초등 3학년",
    passage:
      "민수는 학교에서 돌아오는 길에 길 잃은 강아지를 보았습니다. 강아지는 목줄을 하고 있었지만 이름표는 없었습니다.",
    stem: "민수가 가장 먼저 해야 할 일로 알맞은 것은 무엇입니까?",
    choices: [
      "강아지를 집으로 데려간다",
      "주변에 주인을 찾는 사람이 있는지 살펴본다",
      "강아지를 그냥 두고 지나간다",
      "강아지에게 먹이를 준다",
    ],
    answer: 1,
    explain: "글에 드러난 상황에서 가장 먼저 확인해야 할 것을 고르는 문항입니다.",
    tagA: "읽기 — 추론",
    tagB: "사회·관계 — 상황 판단",
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "submitted",
    comments: [],
    updatedAt: "2026-08-10 14:20",
  },
  {
    id: "IT-2602",
    code: "MAT-3-008",
    subject: "수학",
    grade: "초등 3학년",
    passage: "",
    stem: "사과 24개를 한 상자에 6개씩 담으려고 합니다. 상자는 몇 개가 필요합니까?",
    choices: ["3개", "4개", "5개", "6개"],
    answer: 1,
    explain: "24 ÷ 6 = 4. 나눗셈의 등분제 상황입니다.",
    tagA: "수와 연산 — 나눗셈",
    tagB: "수리·논리 — 절차 적용",
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "rejected",
    comments: [
      {
        at: "2026-08-10 16:05",
        by: "이검수",
        role: "reviewer",
        code: "grade",
        text: "초등 3학년 1학기에는 나눗셈이 아직 나오지 않습니다. 곱셈 상황으로 바꾸거나 학년을 4학년으로 올려 주세요.",
      },
    ],
    updatedAt: "2026-08-10 16:05",
  },
  {
    id: "IT-2603",
    code: "SCI-4-002",
    subject: "과학",
    grade: "초등 4학년",
    passage: "",
    stem: "물이 얼면 부피는 어떻게 됩니까?",
    choices: ["늘어난다", "줄어든다", "변하지 않는다", "알 수 없다"],
    answer: 0,
    explain: "물은 얼면 부피가 늘어납니다.",
    tagA: "물질 — 상태 변화",
    tagB: "자연·생태 — 관찰 기반 추론",
    level: "S1",
    author: "author.yoon",
    authorName: "윤출제",
    state: "submitted",
    comments: [],
    updatedAt: "2026-08-11 09:02",
  },
  {
    id: "IT-2604",
    code: "KOR-4-021",
    subject: "국어",
    grade: "초등 4학년",
    passage: "",
    stem: "다음 중 낱말의 뜻이 나머지와 다른 하나는 무엇입니까?",
    choices: ["기쁘다", "즐겁다", "슬프다", "행복하다"],
    answer: 2,
    explain: "나머지는 긍정적 감정, '슬프다'만 부정적 감정입니다.",
    tagA: "어휘 — 의미 관계",
    tagB: "언어 — 범주화",
    level: "S1",
    author: "author.kim",
    authorName: "김출제",
    state: "approved",
    comments: [
      {
        at: "2026-08-09 11:30",
        by: "이검수",
        role: "reviewer",
        text: "정답 유일성과 학년 이독성 모두 문제 없습니다. 승인합니다.",
      },
    ],
    updatedAt: "2026-08-09 11:30",
  },
  {
    id: "IT-2605",
    code: "MAT-4-011",
    subject: "수학",
    grade: "초등 4학년",
    passage: "",
    stem: "",
    choices: ["", "", "", ""],
    answer: 0,
    explain: "",
    tagA: "",
    tagB: "",
    level: "S2",
    author: "author.kim",
    authorName: "김출제",
    state: "draft",
    comments: [],
    updatedAt: "2026-08-11 10:15",
  },
];

const KEY = "genixx.items";
const EVENT = "genixx:items-change";

let cacheRaw: string | null = null;
let cacheValue: ItemDraft[] = SEED;

function read(): ItemDraft[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as ItemDraft[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ItemDraft[]) {
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

export function useItems(): ItemDraft[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/** 화면에 찍는 시각 — 초 단위까지 갈 필요가 없다 */
function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function patchItem(id: string, patch: Partial<ItemDraft>) {
  write(read().map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)));
}

export function addItem(author: string, authorName: string): ItemDraft {
  const list = read();
  const item: ItemDraft = {
    id: `IT-${2600 + list.length + 1}`,
    code: "",
    subject: "국어",
    grade: "초등 3학년",
    passage: "",
    stem: "",
    choices: ["", "", "", ""],
    answer: 0,
    explain: "",
    tagA: "",
    tagB: "",
    level: "S1",
    author,
    authorName,
    state: "draft",
    comments: [],
    updatedAt: now(),
  };
  write([item, ...list]);
  return item;
}

/** 제출 — 검수 목록으로 넘어간다. 제출 후에는 출제자가 고칠 수 없다(EXP-02-5). */
export function submitItem(id: string) {
  patchItem(id, { state: "submitted" });
}

/** 반려 — 사유 코드와 코멘트가 붙어 출제자의 반려함으로 돌아간다 */
export function rejectItem(id: string, by: string, code: RejectCode, text: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    state: "rejected",
    comments: [...item.comments, { at: now(), by, role: "reviewer", code, text }],
  });
}

/** 승인 — 문항 은행에 올라가 검사지 조립 대상이 된다 */
export function approveItem(id: string, by: string, text: string) {
  const item = read().find((i) => i.id === id);
  if (!item) return;
  patchItem(id, {
    state: "approved",
    comments: [...item.comments, { at: now(), by, role: "reviewer", text }],
  });
}

/** 채워야 할 칸이 다 찼는지 — 제출 버튼을 열지 말지 정한다 */
export function itemReady(i: ItemDraft) {
  return (
    i.code.trim().length > 0 &&
    i.stem.trim().length > 0 &&
    i.choices.every((c) => c.trim().length > 0) &&
    i.explain.trim().length > 0 &&
    i.tagA.trim().length > 0 &&
    i.tagB.trim().length > 0
  );
}

export const stateLabel: Record<ItemState, string> = {
  draft: "작성 중",
  submitted: "검수 대기",
  rejected: "반려됨",
  approved: "승인됨",
};

export const stateTone: Record<ItemState, string> = {
  draft: "border-exam-line bg-exam-raised text-exam-muted",
  submitted: "border-brand-300 bg-brand-50 text-brand-700",
  rejected: "border-rose-300 bg-rose-50 text-rose-700",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
};
