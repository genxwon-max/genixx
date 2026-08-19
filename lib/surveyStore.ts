"use client";

import { useSyncExternalStore } from "react";
import type { SurveyKey } from "./examStore";
import { surveyKeys } from "./examStore";
import { surveyBandIds, type SurveyBand } from "./surveyBands";
import { surveys } from "./survey";

/**
 * 설문 원본 관리 (ADM-14).
 *
 * 지금까지 어머니·아버지·교사 설문은 lib/survey.ts에 박혀 있었다. 문항 하나를 고치려면
 * 개발자가 코드를 고쳐 배포해야 했고, 언제 누가 무엇을 왜 바꿨는지는 커밋 로그에만
 * 남아 운영자는 볼 수 없었다. 설문은 문항과 마찬가지로 **측정 도구**다 — 도구가
 * 바뀌었는데 그 사실이 기록에 없으면 회차 사이의 응답을 비교할 근거가 사라진다.
 *
 * 그래서 이 저장소는 두 벌을 따로 둔다.
 *
 *   live   지금 응답자에게 나가고 있는 판. 판 번호(liveVersion)를 달고 있다.
 *   draft  운영자가 고치고 있는 초안. 아무리 고쳐도 응답자 화면은 바뀌지 않는다.
 *
 * 한 벌만 두면 운영자가 오타를 고치는 순간 설문에 답하고 있던 학부모의 화면이
 * 바뀐다. 응답이 도는 중에 문항이 갈리면 그 회차 자료는 반쪽이 된다.
 *
 * 초안을 내보내는 것이 「발행」이고, 발행할 때만 판 번호가 오른다. 발행·되돌리기는
 * 사유를 받아 기록에 남기며, 그 시점의 판 전체를 함께 담는다 — 되돌릴 때 옛 판을
 * 어디선가 다시 만들어 내지 않고 그대로 꺼내 쓰기 위해서다.
 *
 * ⚠ 되돌려도 판 번호는 앞으로만 간다. v3에서 v2 내용으로 돌아가면 그것은 v2가
 *   아니라 v4다. 번호를 되쓰면 「v2 응답」이 두 가지 설문을 가리키게 된다.
 *
 * ── 학년대 ──
 *
 * 한 갈래(어머니·아버지·교사)가 학년대(초3~4 · 초5~6 · 중1 · 중2~3)마다 한 벌씩
 * 있다. 초3에게 묻는 말과 중3에게 묻는 말이 같을 수 없어서다. 그래서 저장 단위는
 * 갈래가 아니라 **갈래+학년대**이고, 그 열쇠가 SurveyDocId(`mother:e34`)다.
 * 학생 명부의 학년 글자로 학년대를 고르는 일은 lib/surveyBands.ts가 한다.
 */

export type SurveyItem = {
  /** 판이 바뀌어도 같은 문항임을 알아보게 하는 값. 문항 글을 고쳐도 유지된다. */
  id: string;
  text: string;
};

/** 응답자에게 나가는 설문 한 벌 */
export type SurveyForm = {
  title: string;
  who: string;
  desc: string;
  note: string;
  items: SurveyItem[];
  openLabel: string;
  openHint: string;
  placeholder: string;
};

/** 저장 단위 — 갈래와 학년대를 함께 묶은 열쇠 (`mother:e34`) */
export type SurveyDocId = `${SurveyKey}:${SurveyBand}`;

export const docIdOf = (key: SurveyKey, band: SurveyBand): SurveyDocId => `${key}:${band}`;

export const surveyDocIds: SurveyDocId[] = surveyKeys.flatMap((k) =>
  surveyBandIds.map((b) => docIdOf(k, b)),
);

export type SurveyDoc = {
  key: SurveyKey;
  band: SurveyBand;
  /** 정의서상의 설문 코드 (ASM-05 / ASM-06) */
  code: string;
  live: SurveyForm;
  liveVersion: number;
  publishedAt: string;
  publishedBy: string;
  draft: SurveyForm;
  draftAt: string;
  draftBy: string;
};

export type SurveyAction = "publish" | "upload" | "revert" | "discard";

export type SurveyLogEntry = {
  id: string;
  /** 어느 갈래의 어느 학년대에 일어난 일인가 */
  docId: SurveyDocId;
  at: string;
  by: string;
  action: SurveyAction;
  /** 발행·되돌리기로 새로 생긴 판 번호 */
  version?: number;
  reason: string;
  /** 무엇이 달라졌는지 한 줄씩 */
  lines: string[];
  /** 그때 내보낸 판. 되돌리기가 이걸 그대로 꺼내 쓴다. */
  snapshot?: SurveyForm;
};

export const actionLabel: Record<SurveyAction, string> = {
  publish: "발행",
  upload: "파일 올림",
  revert: "이전 판으로 되돌림",
  discard: "초안 버림",
};

/** 한 설문에 둘 수 있는 문항 수. 넘으면 응답자가 끝까지 못 간다. */
export const MAX_ITEMS = 30;
/** 올릴 수 있는 파일 크기 — 글만 담기므로 넉넉하다 */
export const MAX_UPLOAD_BYTES = 200 * 1024;

/* ───────────────────────── 씨앗 ─────────────────────────
   lib/survey.ts가 v1이다. 그 파일은 이제 「지금 쓰는 설문」이 아니라 「처음 판」으로,
   브라우저에 저장된 것이 없을 때만 쓰인다. */

/** 씨앗의 시각은 고정값이다 — 렌더할 때마다 달라지면 서버·브라우저 화면이 어긋난다. */
const SEED_AT = "2026-03-02 09:40";

function seedForm(key: SurveyKey, band: SurveyBand): SurveyForm {
  const c = surveys[key];
  /* 네 학년대가 같은 문항으로 시작한다. 무엇이 어떻게 달라야 하는지는 교육 쪽에서
     정할 일이라 여기서 지어내지 않는다. 관리자가 학년대를 골라 고치면 그때부터
     갈라지고, 「다른 학년대에도 이 문항 쓰기」로 도로 맞출 수도 있다. */
  return {
    title: c.title,
    who: c.who,
    desc: c.desc,
    note: c.note,
    items: c.items.map((text, n) => ({ id: `${key}-${band}-${n + 1}`, text })),
    openLabel: c.openLabel,
    openHint: c.openHint,
    placeholder: c.placeholder,
  };
}

function seedDoc(key: SurveyKey, band: SurveyBand): SurveyDoc {
  const form = seedForm(key, band);
  return {
    key,
    band,
    code: surveys[key].code,
    live: form,
    liveVersion: 1,
    publishedAt: SEED_AT,
    publishedBy: "초기 설정",
    draft: form,
    draftAt: SEED_AT,
    draftBy: "초기 설정",
  };
}

export type SurveyDocs = Record<SurveyDocId, SurveyDoc>;

const split = (id: SurveyDocId) => id.split(":") as [SurveyKey, SurveyBand];

const SEED: SurveyDocs = Object.fromEntries(
  surveyDocIds.map((id) => [id, seedDoc(...split(id))]),
) as SurveyDocs;

/**
 * 첫 판도 기록에 넣어 둔다.
 *
 * 넣지 않으면 v2를 발행한 뒤 v1로 돌아갈 길이 없다 — 기록에 없는 판은 되돌릴 수도
 * 없기 때문이다. 「처음부터 있던 것」도 판의 하나로 세어야 이력이 끊기지 않는다.
 */
const SEED_LOG: SurveyLogEntry[] = surveyDocIds.map((id) => ({
  id: `SV-SEED-${id}`,
  docId: id,
  at: SEED_AT,
  by: "초기 설정",
  action: "publish" as const,
  version: 1,
  reason: "서비스 시작 시 깔린 첫 판입니다",
  lines: [],
  snapshot: seedForm(...split(id)),
}));

const KEY = "genixx.surveys";
const LOG_KEY = "genixx.surveys.log";
const EVENT = "genixx:surveys-change";

/* ───────────────────────── 읽기 ───────────────────────── */

let cacheRaw: string | null = null;
let cacheValue: SurveyDocs = SEED;

/** 저장된 판에 없는 칸을 씨앗으로 메운다 — 항목이 늘어난 뒤에도 화면이 터지지 않게 */
function fill(raw: Partial<SurveyDocs> | undefined): SurveyDocs {
  return Object.fromEntries(
    surveyDocIds.map((id) => {
      const seed = seedDoc(...split(id));
      const got = raw?.[id];
      if (!got) return [id, seed];
      return [
        id,
        {
          ...seed,
          ...got,
          live: { ...seed.live, ...got.live },
          draft: { ...seed.draft, ...got.draft },
        },
      ];
    }),
  ) as SurveyDocs;
}

function read(): SurveyDocs {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? fill(JSON.parse(raw) as Partial<SurveyDocs>) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

let logRaw: string | null = null;
let logValue: SurveyLogEntry[] = SEED_LOG;

function readLog(): SurveyLogEntry[] {
  if (typeof window === "undefined") return SEED_LOG;
  const raw = window.localStorage.getItem(LOG_KEY);
  if (raw === logRaw) return logValue;
  logRaw = raw;
  try {
    logValue = raw ? (JSON.parse(raw) as SurveyLogEntry[]) : SEED_LOG;
  } catch {
    logValue = SEED_LOG;
  }
  return logValue;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useSurveyDocs(): SurveyDocs {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

export function useSurveyDoc(key: SurveyKey, band: SurveyBand): SurveyDoc {
  return useSurveyDocs()[docIdOf(key, band)];
}

export function useSurveyLog(): SurveyLogEntry[] {
  return useSyncExternalStore(subscribe, readLog, () => SEED_LOG);
}

/* ───────────────────────── 쓰기 ───────────────────────── */

function write(next: SurveyDocs) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function pushLog(entry: Omit<SurveyLogEntry, "id" | "at">) {
  const full: SurveyLogEntry = {
    ...entry,
    id: `SV-${Date.now().toString(36).toUpperCase()}`,
    at: now(),
  };
  const next = [full, ...readLog()].slice(0, 100);
  window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return full;
}

function patchDoc(id: SurveyDocId, patch: Partial<SurveyDoc>) {
  const docs = read();
  write({ ...docs, [id]: { ...docs[id], ...patch } });
}

/** 초안만 고친다. 응답자 화면은 발행 전까지 그대로다. */
export function patchDraft(id: SurveyDocId, patch: Partial<SurveyForm>, by: string) {
  const doc = read()[id];
  patchDoc(id, {
    draft: { ...doc.draft, ...patch },
    draftAt: now(),
    draftBy: by,
  });
}

export function patchDraftItem(id: SurveyDocId, itemId: string, text: string, by: string) {
  const doc = read()[id];
  patchDraft(id, { items: doc.draft.items.map((i) => (i.id === itemId ? { ...i, text } : i)) }, by);
}

export function addDraftItem(id: SurveyDocId, by: string) {
  const doc = read()[id];
  if (doc.draft.items.length >= MAX_ITEMS) return;
  const item: SurveyItem = { id: `${id}-${Date.now().toString(36)}`, text: "" };
  patchDraft(id, { items: [...doc.draft.items, item] }, by);
}

export function removeDraftItem(id: SurveyDocId, itemId: string, by: string) {
  const doc = read()[id];
  patchDraft(id, { items: doc.draft.items.filter((i) => i.id !== itemId) }, by);
}

/** 문항 순서 옮기기. 끝에서 더 밀면 아무 일도 일어나지 않는다. */
export function moveDraftItem(id: SurveyDocId, itemId: string, dir: 1 | -1, by: string) {
  const items = [...read()[id].draft.items];
  const at = items.findIndex((i) => i.id === itemId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= items.length) return;
  [items[at], items[to]] = [items[to], items[at]];
  patchDraft(id, { items }, by);
}

/**
 * 지금 학년대의 초안 문항을 나머지 세 학년대에 그대로 복사한다.
 *
 * 네 벌을 따로 두면 「초3~4만 고치고 나머지를 잊는」 일이 반드시 생긴다. 문항이
 * 학년대별로 갈릴 이유가 없을 때는 한 번에 맞출 길이 있어야 한다.
 * 초안에만 넣는다 — 나가는 판은 학년대마다 따로 발행한다.
 */
export function copyItemsToOtherBands(id: SurveyDocId, by: string) {
  const [key] = split(id);
  const from = read()[id].draft.items;
  const docs = read();
  const next = { ...docs };
  let count = 0;
  for (const band of surveyBandIds) {
    const to = docIdOf(key, band);
    if (to === id) continue;
    next[to] = {
      ...docs[to],
      draft: {
        ...docs[to].draft,
        /* 문항 id는 학년대마다 새로 딴다. 같은 id가 두 벌에 있으면 「어느 판의
           몇 번 문항인가」를 기록에서 가릴 수 없다. */
        items: from.map((i, n) => ({ id: `${to}-c${n + 1}`, text: i.text })),
      },
      draftAt: now(),
      draftBy: by,
    };
    count += 1;
  }
  write(next);
  return count;
}

/**
 * 파일에서 읽은 문항을 초안에 넣는다.
 *
 * 「바꾸기」는 기존 문항을 통째로 버리므로 되돌릴 수 없다 — 그래서 화면에서 한 번 더
 * 묻는다. 어느 쪽이든 초안에만 들어가고, 파일 이름과 건수는 곧바로 기록에 남긴다.
 * 아직 나가지 않은 초안이라도 「어디서 온 문항인지」는 나중에 반드시 묻게 된다.
 */
export function uploadDraftItems(
  id: SurveyDocId,
  texts: string[],
  mode: "append" | "replace",
  fileName: string,
  by: string,
) {
  const doc = read()[id];
  const made: SurveyItem[] = texts.map((text, n) => ({
    id: `${id}-${Date.now().toString(36)}-${n}`,
    text,
  }));
  const items = (mode === "append" ? [...doc.draft.items, ...made] : made).slice(0, MAX_ITEMS);
  patchDraft(id, { items }, by);
  pushLog({
    docId: id,
    by,
    action: "upload",
    reason: `${fileName} — ${mode === "append" ? "기존 문항 뒤에 붙임" : "기존 문항을 바꿈"}`,
    lines: [
      `${fileName}에서 ${texts.length}건을 읽어 초안에 넣었습니다`,
      mode === "replace" ? `기존 문항 ${doc.draft.items.length}건을 버렸습니다` : "기존 문항은 그대로 두었습니다",
      `초안 문항 ${doc.draft.items.length} → ${items.length}`,
    ],
  });
}

/**
 * 초안을 내보낸다 — 이 순간부터 응답자가 새 판을 본다.
 * 발행하지 않으면 아무것도 나가지 않으므로, 여기가 이 화면의 유일한 관문이다.
 */
export function publishDraft(id: SurveyDocId, by: string, reason: string) {
  const doc = read()[id];
  const version = doc.liveVersion + 1;
  const at = now();
  patchDoc(id, {
    live: doc.draft,
    liveVersion: version,
    publishedAt: at,
    publishedBy: by,
    draftAt: at,
    draftBy: by,
  });
  return pushLog({
    docId: id,
    by,
    action: "publish",
    version,
    reason,
    lines: diffForms(doc.live, doc.draft),
    snapshot: doc.draft,
  });
}

/** 초안을 버리고 나가고 있는 판으로 되돌린다 */
export function discardDraft(id: SurveyDocId, by: string) {
  const doc = read()[id];
  const lines = diffForms(doc.live, doc.draft);
  patchDoc(id, { draft: doc.live, draftAt: now(), draftBy: by });
  pushLog({
    docId: id,
    by,
    action: "discard",
    reason: `발행하지 않은 수정 ${lines.length}곳을 버렸습니다`,
    lines,
  });
}

/**
 * 기록에 담긴 옛 판을 다시 내보낸다.
 * 번호는 되쓰지 않고 새로 딴다 — 위 머리말의 ⚠ 참조.
 */
export function revertTo(id: SurveyDocId, entryId: string, by: string, reason: string) {
  const entry = readLog().find((e) => e.id === entryId);
  if (!entry?.snapshot) return null;
  const doc = read()[id];
  const version = doc.liveVersion + 1;
  const at = now();
  patchDoc(id, {
    live: entry.snapshot,
    liveVersion: version,
    publishedAt: at,
    publishedBy: by,
    draft: entry.snapshot,
    draftAt: at,
    draftBy: by,
  });
  return pushLog({
    docId: id,
    by,
    action: "revert",
    version,
    reason: `v${entry.version}로 되돌림 — ${reason}`,
    lines: diffForms(doc.live, entry.snapshot),
    snapshot: entry.snapshot,
  });
}

/* ───────────────────────── 견주기 ───────────────────────── */

const FIELDS: [keyof Omit<SurveyForm, "items">, string][] = [
  ["title", "제목"],
  ["who", "응답자"],
  ["desc", "안내문"],
  ["note", "고지 문구"],
  ["openLabel", "자유서술 이름표"],
  ["openHint", "자유서술 도움말"],
  ["placeholder", "자유서술 예시글"],
];

const cut = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n)}…` : s || "(빈칸)");

/**
 * 두 판이 어떻게 다른지 사람 말로 적는다.
 *
 * 「수정됨」 한 줄만 남기면 기록을 열어 볼 이유가 없어진다. 무엇이 무엇으로 바뀌었는지
 * 그 자리에서 읽혀야 나중에 「이 문항 언제 이렇게 됐지」에 답할 수 있다.
 */
export function diffForms(before: SurveyForm, after: SurveyForm): string[] {
  const lines: string[] = [];

  for (const [k, label] of FIELDS) {
    if (before[k] !== after[k]) lines.push(`${label} — 「${cut(before[k])}」 → 「${cut(after[k])}」`);
  }

  const beforeIds = before.items.map((i) => i.id);
  const afterIds = after.items.map((i) => i.id);

  for (const i of after.items.filter((i) => !beforeIds.includes(i.id))) {
    lines.push(`문항 추가 — 「${cut(i.text)}」`);
  }
  for (const i of before.items.filter((i) => !afterIds.includes(i.id))) {
    lines.push(`문항 삭제 — 「${cut(i.text)}」`);
  }
  before.items.forEach((b, n) => {
    const a = after.items.find((x) => x.id === b.id);
    if (a && a.text !== b.text) {
      lines.push(`${n + 1}번 문항 — 「${cut(b.text)}」 → 「${cut(a.text)}」`);
    }
  });

  /* 지우고 더한 것을 뺀 나머지의 앞뒤가 다르면 순서가 바뀐 것이다 */
  const keptBefore = beforeIds.filter((id) => afterIds.includes(id)).join("|");
  const keptAfter = afterIds.filter((id) => beforeIds.includes(id)).join("|");
  if (keptBefore !== keptAfter) lines.push("문항 순서가 바뀌었습니다");

  if (before.items.length !== after.items.length) {
    lines.push(`문항 수 ${before.items.length} → ${after.items.length}`);
  }

  return lines;
}

/** 발행하지 않은 수정이 있는지 */
export function draftChanges(doc: SurveyDoc): string[] {
  return diffForms(doc.live, doc.draft);
}

/**
 * 발행 전에 짚어야 할 것.
 *
 * 막지는 않는다 — 문항을 줄이는 개편이 정당할 때도 있다. 다만 「응답 비교가 끊긴다」는
 * 사실을 모르고 누르는 일은 없어야 한다.
 */
export function publishWarnings(doc: SurveyDoc, answered: number): string[] {
  const w: string[] = [];
  const blank = doc.draft.items.filter((i) => !i.text.trim()).length;
  if (blank > 0) w.push(`빈 문항이 ${blank}건 있습니다. 그대로 나가면 응답자에게 빈 줄로 보입니다.`);
  if (doc.draft.items.length === 0) w.push("문항이 하나도 없습니다.");
  if (doc.draft.items.length !== doc.live.items.length && answered > 0) {
    w.push(
      `이미 이 설문에 ${answered}건이 들어와 있습니다. 문항 수가 달라지면 두 판의 응답을 나란히 비교할 수 없습니다.`,
    );
  }
  const dup = doc.draft.items.map((i) => i.text.trim()).filter(Boolean);
  if (dup.length !== new Set(dup).size) w.push("같은 문항이 둘 이상 있습니다.");
  return w;
}

/* ───────────────────────── 파일 읽기 ───────────────────────── */

export type ParsedUpload = {
  items: string[];
  /** 비어 있어 건너뛴 줄 */
  skipped: number;
  error?: string;
};

/**
 * 한 줄 = 한 문항으로 읽는다.
 *
 * 쉼표로 칸을 나누지 않는다. 설문 문항에는 쉼표가 흔히 들어가는데(「시키지 않아도,
 * 오래」) 칸으로 자르면 문항이 조용히 반토막 난다. 엑셀에서 한 열만 내보낸 CSV는
 * 어차피 한 줄에 한 칸이고, 쉼표가 든 칸은 따옴표로 감싸여 오므로 그것만 벗긴다.
 */
const unquote = (s: string) =>
  s.length > 1 && s.startsWith('"') && s.endsWith('"')
    ? s.slice(1, -1).replace(/""/g, '"').trim()
    : s;

function cleanLine(raw: string): string {
  /* 따옴표를 두 번 벗긴다. 엑셀은 칸 전체를 감싸(「"2) 친구와, 먼저"」) 내보내지만,
     손으로 만든 파일은 번호 뒤에 따옴표가 오기도 한다(「2) "친구와, 먼저"」). */
  let s = unquote(raw.trim());
  if (!s) return "";
  /* 「1. 」 「1) 」 「- 」 같은 머리표를 뗀다. 화면이 번호를 다시 매기므로 남기면 겹친다. */
  s = s.replace(/^\s*(?:\d{1,2}\s*[.)·、]|[-–—•*])\s*/, "");
  return unquote(s.trim());
}

export function parseSurveyFile(name: string, text: string): ParsedUpload {
  if (name.toLowerCase().endsWith(".json")) {
    try {
      const data: unknown = JSON.parse(text);
      const raw = Array.isArray(data)
        ? data
        : ((data as { items?: unknown }).items as unknown[] | undefined);
      if (!Array.isArray(raw)) {
        return { items: [], skipped: 0, error: "문항 목록을 찾지 못했습니다. 글 목록이거나 items 칸이 있어야 합니다." };
      }
      const items = raw
        .map((v) => (typeof v === "string" ? v : ((v as { text?: string })?.text ?? "")))
        .map((s) => s.trim())
        .filter(Boolean);
      return { items, skipped: raw.length - items.length };
    } catch {
      return { items: [], skipped: 0, error: "JSON 형식이 아닙니다." };
    }
  }

  const rows = text.split(/\r?\n/);
  const items = rows.map(cleanLine).filter(Boolean);
  return { items, skipped: rows.length - items.length };
}

/** 올릴 수 있는 파일인지 */
export function uploadKindOf(file: File): "text" | null {
  return /\.(csv|txt|tsv|json)$/i.test(file.name) ? "text" : null;
}
