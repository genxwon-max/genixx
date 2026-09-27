"use client";

import { useSyncExternalStore } from "react";
import type { SurveyKey } from "./examStore";
import { surveyKeys } from "./examStore";
import { surveyBandIds, type SurveyBand } from "./surveyBands";
import { surveys } from "./survey";

/**
 * 설문 원본 관리 (ADM-14).
 *
 * 지금까지 학생·학부모·교사 설문은 lib/survey.ts에 박혀 있었다. 문항 하나를 고치려면
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
 * 한 갈래(학생·학부모·교사)가 학년대(초3~4 · 초5~6)마다 한 벌씩 있다. 초3에게 묻는 말과
 * 초6에게 묻는 말이 같을 수 없어서다. 그래서 저장 단위는 갈래가 아니라 **갈래+학년대**이고,
 * 그 열쇠가 SurveyDocId(`guardian:e34`)다. 학생 명부의 학년 글자로 학년대를 고르는 일은
 * lib/surveyBands.ts가 한다.
 *
 * 갈래나 학년대가 줄면 저장분에 없어진 열쇠가 남는다. fill·readLog가 읽을 때 지금 열쇠
 * 목록(surveyDocIds)에 없는 것을 버린다 — 한 번 도는 이사 코드를 두면 언제 열지 알 수
 * 없는 브라우저를 결국 건너뛴다.
 */

export type SurveyItem = {
  /** 판이 바뀌어도 같은 문항임을 알아보게 하는 값. 문항 글을 고쳐도 유지된다. */
  id: string;
  /** 설문지의 문항 번호 (S01 · P14). 의뢰인과 같은 번호로 이야기하기 위한 것 */
  no: string;
  /** 설문지의 구역 이름. 응답자 화면이 이 이름으로 문항을 묶는다 */
  section: string;
  /** 무엇을 재는 칸인가 — 역량(C01 논리적 사고)이거나 참고 칸(부모 관여) */
  group: string;
  text: string;
};

/** 해당되는 것을 모두 고르는 묶음 */
export type SurveyChoice = {
  id: string;
  no: string;
  section: string;
  label: string;
  options: string[];
};

/** 서술형 질문 한 줄 */
export type SurveyOpen = {
  id: string;
  no: string;
  section: string;
  label: string;
  hint: string;
  placeholder: string;
};

/**
 * 응답자에게 나가는 설문 한 벌.
 *
 * 묻는 방식이 셋이라 칸도 셋이다 — 5점 척도(items) · 모두 고르기(choices) · 서술(opens).
 * 점수가 되는 것은 items뿐이고, 나머지 둘은 해석과 면담에 쓰는 참고 자료다. 그래서
 * 응답자 화면도 척도만 필수로 두고 나머지는 비워 두어도 제출할 수 있게 한다.
 */
export type SurveyForm = {
  title: string;
  who: string;
  desc: string;
  note: string;
  items: SurveyItem[];
  choices: SurveyChoice[];
  opens: SurveyOpen[];
};

/** 저장 단위 — 갈래와 학년대를 함께 묶은 열쇠 (`guardian:e34`) */
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

/**
 * 한 설문에 둘 수 있는 척도 문항 수.
 *
 * 한동안 30이었다. 학부모 설문지 v1.0이 정확히 30문항(P01~P30)이라, 그대로 두면
 * 운영자가 오타 난 문항을 지웠다가 되살릴 자리조차 없다. 설문지 한 벌이 다 들어가고도
 * 손댈 여유가 남게 40으로 둔다.
 */
export const MAX_ITEMS = 40;
/** 올릴 수 있는 파일 크기 — 글만 담기므로 넉넉하다 */
export const MAX_UPLOAD_BYTES = 200 * 1024;

/* ───────────────────────── 씨앗 ─────────────────────────
   lib/survey.ts가 v1이다. 그 파일은 이제 「지금 쓰는 설문」이 아니라 「처음 판」으로,
   브라우저에 저장된 것이 없을 때만 쓰인다. */

/** 씨앗의 시각은 고정값이다 — 렌더할 때마다 달라지면 서버·브라우저 화면이 어긋난다. */
const SEED_AT = "2026-03-02 09:40";

function seedForm(key: SurveyKey, band: SurveyBand): SurveyForm {
  const c = surveys[key];
  /* 두 학년대가 같은 문항으로 시작한다. 설문지 v1.0이 초1~고3을 한 벌로 묻기 때문이다.
     학년대별로 말을 고르는 일은 다음 판이 오면 따라가고, 그 전에 급하면 관리자가
     학년대를 골라 고친다 — 「다른 학년대에도 이 문항 쓰기」로 도로 맞출 수도 있다. */
  const at = (no: string) => `${key}-${band}-${no}`;
  return {
    title: c.title,
    who: c.who,
    desc: c.desc,
    note: c.note,
    items: c.items.map((i) => ({ ...i, id: at(i.no) })),
    choices: c.choices.map((ch) => ({ ...ch, id: at(ch.no) })),
    opens: c.opens.map((o) => ({
      ...o,
      id: at(o.no),
      hint: o.hint ?? "",
      placeholder: o.placeholder ?? "",
    })),
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

/**
 * 저장 열쇠에 씨앗 판 번호를 붙인다.
 *
 * 저장된 판은 씨앗을 이긴다 — 운영자가 고친 것을 코드 배포가 덮어쓰면 안 되기 때문이다.
 * 그런데 설문지 자체가 v1.0으로 통째로 갈리면 이야기가 다르다. 옛 여덟 문항이 담긴
 * 브라우저는 새 설문지를 영영 못 보게 되고, 화면은 「고쳤는데 안 바뀐다」가 된다.
 *
 * 그래서 설문지가 갈릴 때만 이 숫자를 올린다. 옛 열쇠는 건드리지 않고 두므로,
 * 지난 판이 무엇이었는지는 브라우저 저장소에 그대로 남는다.
 */
const SEED_REV = 2;

const KEY = `genixx.surveys.r${SEED_REV}`;
const LOG_KEY = `genixx.surveys.log.r${SEED_REV}`;
const EVENT = "genixx:surveys-change";

/* ───────────────────────── 읽기 ───────────────────────── */

let cacheRaw: string | null = null;
let cacheValue: SurveyDocs = SEED;

/** 저장된 판에 없는 칸을 씨앗으로 메운다 — 항목이 늘어난 뒤에도 화면이 터지지 않게 */
function fill(raw: Partial<SurveyDocs> | undefined): SurveyDocs {
  /* 묻는 방식 셋은 「없음」과 「빈 목록」이 다르다. 저장된 판에 choices 칸이 아예
     없으면 그것은 옛 판이라 씨앗을 깔고, 빈 배열이면 운영자가 지운 것이라 그대로 둔다. */
  const merge = (seed: SurveyForm, got: Partial<SurveyForm> | undefined): SurveyForm => ({
    ...seed,
    ...got,
    items: got?.items ?? seed.items,
    choices: got?.choices ?? seed.choices,
    opens: got?.opens ?? seed.opens,
  });
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
          live: merge(seed.live, got.live),
          draft: merge(seed.draft, got.draft),
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
    /* 없어진 갈래·학년대의 기록은 버린다 — 지금 화면에 그 칸이 없다 */
    logValue = raw
      ? (JSON.parse(raw) as SurveyLogEntry[]).filter((e) => surveyDocIds.includes(e.docId))
      : SEED_LOG;
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

export function patchDraftItem(
  id: SurveyDocId,
  itemId: string,
  patch: Partial<Omit<SurveyItem, "id">>,
  by: string,
) {
  const doc = read()[id];
  patchDraft(
    id,
    { items: doc.draft.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) },
    by,
  );
}

/**
 * 새 문항은 바로 앞 문항의 구역을 물려받는다.
 *
 * 구역이 비면 응답자 화면에서 그 문항만 이름 없는 묶음으로 떨어져 나간다. 대개는
 * 「이 구역에 하나 더」라서, 앞줄을 따라가는 편이 맞고 다르면 그 자리에서 고치면 된다.
 */
export function addDraftItem(id: SurveyDocId, by: string) {
  const doc = read()[id];
  const items = doc.draft.items;
  if (items.length >= MAX_ITEMS) return;
  const last = items[items.length - 1];
  const item: SurveyItem = {
    id: `${id}-${Date.now().toString(36)}`,
    no: "",
    section: last?.section ?? "",
    group: "",
    text: "",
  };
  patchDraft(id, { items: [...items, item] }, by);
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

/* ── 고르기·서술 칸 ──
   문항과 손질법이 같아 한 벌로 묶는다. 셋을 따로 쓰면 「문항만 옮길 수 있고
   서술은 못 옮기는」 식으로 조용히 갈라진다. */

type ListKey = "choices" | "opens";

const listPatch = (
  id: SurveyDocId,
  list: ListKey,
  next: SurveyChoice[] | SurveyOpen[],
  by: string,
) => patchDraft(id, { [list]: next } as Partial<SurveyForm>, by);

export function patchDraftChoice(
  id: SurveyDocId,
  choiceId: string,
  patch: Partial<Omit<SurveyChoice, "id">>,
  by: string,
) {
  const d = read()[id].draft;
  listPatch(id, "choices", d.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)), by);
}

export function patchDraftOpen(
  id: SurveyDocId,
  openId: string,
  patch: Partial<Omit<SurveyOpen, "id">>,
  by: string,
) {
  const d = read()[id].draft;
  listPatch(id, "opens", d.opens.map((o) => (o.id === openId ? { ...o, ...patch } : o)), by);
}

export function addDraftChoice(id: SurveyDocId, by: string) {
  const d = read()[id].draft;
  const last = d.choices[d.choices.length - 1];
  listPatch(
    id,
    "choices",
    [
      ...d.choices,
      {
        id: `${id}-ch-${Date.now().toString(36)}`,
        no: "",
        section: last?.section ?? "",
        label: "",
        options: [""],
      },
    ],
    by,
  );
}

export function addDraftOpen(id: SurveyDocId, by: string) {
  const d = read()[id].draft;
  const last = d.opens[d.opens.length - 1];
  listPatch(
    id,
    "opens",
    [
      ...d.opens,
      {
        id: `${id}-op-${Date.now().toString(36)}`,
        no: "",
        section: last?.section ?? "",
        label: "",
        hint: "",
        placeholder: "",
      },
    ],
    by,
  );
}

export function removeDraftChoice(id: SurveyDocId, choiceId: string, by: string) {
  const d = read()[id].draft;
  listPatch(id, "choices", d.choices.filter((c) => c.id !== choiceId), by);
}

export function removeDraftOpen(id: SurveyDocId, openId: string, by: string) {
  const d = read()[id].draft;
  listPatch(id, "opens", d.opens.filter((o) => o.id !== openId), by);
}

/** 고르기·서술 차례 옮기기. 끝에서 더 밀면 아무 일도 일어나지 않는다. */
export function moveDraftEntry(id: SurveyDocId, list: ListKey, entryId: string, dir: 1 | -1, by: string) {
  const arr: (SurveyChoice | SurveyOpen)[] = [...read()[id].draft[list]];
  const at = arr.findIndex((v) => v.id === entryId);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= arr.length) return;
  [arr[at], arr[to]] = [arr[to], arr[at]];
  listPatch(id, list, arr as SurveyChoice[] | SurveyOpen[], by);
}

/**
 * 지금 학년대의 초안 문항을 나머지 학년대에 그대로 복사한다.
 *
 * 벌을 따로 두면 「초3~4만 고치고 나머지를 잊는」 일이 반드시 생긴다. 문항이
 * 학년대별로 갈릴 이유가 없을 때는 한 번에 맞출 길이 있어야 한다.
 * 초안에만 넣는다 — 나가는 판은 학년대마다 따로 발행한다.
 *
 * 척도 문항만 옮기지 않는다. 고르기와 서술도 응답자에게는 같은 설문의 일부라,
 * 척도만 맞춰 두면 학년대에 따라 묻는 것이 달라진 줄도 모르게 된다.
 */
export function copyItemsToOtherBands(id: SurveyDocId, by: string) {
  const [key] = split(id);
  const from = read()[id].draft;
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
        /* id는 학년대마다 새로 딴다. 같은 id가 두 벌에 있으면 「어느 판의 몇 번
           문항인가」를 기록에서 가릴 수 없다. */
        items: from.items.map((i, n) => ({ ...i, id: `${to}-c${n + 1}` })),
        choices: from.choices.map((c, n) => ({ ...c, id: `${to}-cc${n + 1}` })),
        opens: from.opens.map((o, n) => ({ ...o, id: `${to}-co${n + 1}` })),
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
  const last = doc.draft.items[doc.draft.items.length - 1];
  const made: SurveyItem[] = texts.map((text, n) => ({
    id: `${id}-${Date.now().toString(36)}-${n}`,
    no: "",
    /* 붙이는 것이면 앞 문항의 구역을 따라간다. 통째로 바꾸는 것이면 따라갈 앞줄이
       없으므로 비워 두고, 운영자가 문항 화면에서 구역을 적는다. */
    section: mode === "append" ? (last?.section ?? "") : "",
    group: "",
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

const FIELDS: [keyof Omit<SurveyForm, "items" | "choices" | "opens">, string][] = [
  ["title", "제목"],
  ["who", "응답자"],
  ["desc", "안내문"],
  ["note", "고지 문구"],
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

  /** id로 짝지어 견준다. 차례가 아니라 열쇠로 봐야 순서만 바꾼 것을 「다 바뀌었다」로 읽지 않는다. */
  const rows = <T extends { id: string }>(
    kind: string,
    bs: T[],
    as: T[],
    say: (v: T) => string,
    /** 같은 것끼리 무엇이 달라졌는지 — 빈 목록이면 그대로다 */
    what: (b: T, a: T) => string[],
  ) => {
    const bIds = bs.map((v) => v.id);
    const aIds = as.map((v) => v.id);
    for (const v of as.filter((v) => !bIds.includes(v.id))) {
      lines.push(`${kind} 추가 — 「${cut(say(v))}」`);
    }
    for (const v of bs.filter((v) => !aIds.includes(v.id))) {
      lines.push(`${kind} 삭제 — 「${cut(say(v))}」`);
    }
    bs.forEach((b, n) => {
      const a = as.find((x) => x.id === b.id);
      if (!a) return;
      for (const line of what(b, a)) lines.push(`${n + 1}번 ${kind} — ${line}`);
    });

    /* 지우고 더한 것을 뺀 나머지의 앞뒤가 다르면 순서가 바뀐 것이다 */
    const keptBefore = bIds.filter((id) => aIds.includes(id)).join("|");
    const keptAfter = aIds.filter((id) => bIds.includes(id)).join("|");
    if (keptBefore !== keptAfter) lines.push(`${kind} 순서가 바뀌었습니다`);

    if (bs.length !== as.length) lines.push(`${kind} 수 ${bs.length} → ${as.length}`);
  };

  rows("문항", before.items, after.items, (i) => i.text, (b, a) => {
    const out: string[] = [];
    if (b.text !== a.text) out.push(`「${cut(b.text)}」 → 「${cut(a.text)}」`);
    if (b.no !== a.no) out.push(`번호 ${b.no || "(빈칸)"} → ${a.no || "(빈칸)"}`);
    if (b.section !== a.section) out.push(`구역 「${cut(b.section, 12)}」 → 「${cut(a.section, 12)}」`);
    /* 역량이 갈리면 점수가 붙는 칸이 갈린다 — 글자 하나 바뀐 것과 같은 무게로 적지 않는다 */
    if (b.group !== a.group) out.push(`재는 칸 「${cut(b.group, 14)}」 → 「${cut(a.group, 14)}」`);
    return out;
  });

  rows("고르기", before.choices, after.choices, (c) => c.label, (b, a) => {
    const out: string[] = [];
    if (b.label !== a.label) out.push(`「${cut(b.label)}」 → 「${cut(a.label)}」`);
    if (b.options.join("|") !== a.options.join("|")) {
      out.push(`보기 ${b.options.length}개 → ${a.options.length}개 (${cut(a.options.join(", "), 30)})`);
    }
    return out;
  });

  rows("서술", before.opens, after.opens, (o) => o.label, (b, a) => {
    const out: string[] = [];
    if (b.label !== a.label) out.push(`「${cut(b.label)}」 → 「${cut(a.label)}」`);
    if (b.hint !== a.hint) out.push(`도움말 「${cut(b.hint)}」 → 「${cut(a.hint)}」`);
    if (b.placeholder !== a.placeholder) {
      out.push(`예시글 「${cut(b.placeholder)}」 → 「${cut(a.placeholder)}」`);
    }
    return out;
  });

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
  const d = doc.draft;

  const blank = d.items.filter((i) => !i.text.trim()).length;
  if (blank > 0) w.push(`빈 문항이 ${blank}건 있습니다. 그대로 나가면 응답자에게 빈 줄로 보입니다.`);
  if (d.items.length === 0) w.push("문항이 하나도 없습니다.");
  if (d.items.length !== doc.live.items.length && answered > 0) {
    w.push(
      `이미 이 설문에 ${answered}건이 들어와 있습니다. 문항 수가 달라지면 두 판의 응답을 나란히 비교할 수 없습니다.`,
    );
  }
  const dup = d.items.map((i) => i.text.trim()).filter(Boolean);
  if (dup.length !== new Set(dup).size) w.push("같은 문항이 둘 이상 있습니다.");

  /* 재는 칸이 비면 그 문항의 답은 어느 역량에도 붙지 못하고 버려진다. 설문지가 정한
     셈법이 「역량마다 연결된 2문항의 평균」이라, 이것만은 발행 전에 반드시 보여야 한다. */
  const noGroup = d.items.filter((i) => i.text.trim() && !i.group.trim()).length;
  if (noGroup > 0) {
    w.push(`재는 칸(역량)이 비어 있는 문항이 ${noGroup}건 있습니다. 그 답은 역량 점수에 들어가지 않습니다.`);
  }

  const emptyChoice = d.choices.filter((c) => c.options.filter((o) => o.trim()).length === 0).length;
  if (emptyChoice > 0) w.push(`보기가 하나도 없는 고르기 묶음이 ${emptyChoice}건 있습니다.`);

  const blankOpen = d.opens.filter((o) => !o.label.trim()).length;
  if (blankOpen > 0) w.push(`질문이 비어 있는 서술 칸이 ${blankOpen}건 있습니다.`);

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
