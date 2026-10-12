"use client";

import { useMemo, useSyncExternalStore } from "react";
import { seedGraded, seedMarksOf } from "./gradedSeed";

/**
 * 전문가가 응시 원본 위에 손본 것 (EXP-04-1).
 *
 * 서술형 응답의 판정·배점·해설은 채점 자료가 들고 있다(lib/expertStore.ts의 markSheet).
 * 그것과 별개로, **객관식을 포함한 시험지 전체**에 대해 전문가가 배점을 손보고 해설을
 * 붙일 수 있어야 한다 — 정답을 골랐어도 자아성찰을 보면 찍은 것이 분명한 문항이 있고,
 * 틀렸어도 자료를 바르게 읽은 흔적이 남은 문항이 있다.
 *
 * ── 씨앗 위에 덮는다 ──
 * AI가 매긴 점수(정오)는 지우지 않는다. 사람이 고친 값을 옆에 붙일 뿐이라, 화면이
 * 「AI는 0점이라 했고 사람이 0.5로 올렸다」를 함께 그린다. 이 콘솔이 채점에서 지키는
 * 약속과 같다 — AI 값은 지우지 않고 사람의 값을 옆에 둔다.
 *
 * ⚠ 열쇠는 「답안지/문항」 둘을 이은 것이다. 문항 번호는 회차마다 같으므로 답안지를
 *   앞에 붙이지 않으면 한 아이에게 매긴 점수가 모두에게 붙는다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 채점 API로 갈아 끼운다.
 */

export type QuestionMark = {
  /** 손본 배점. 없으면 AI가 매긴 값을 그대로 쓴다 */
  points?: number;
  /** 아이와 학부모가 읽는 해설 */
  comment?: string;
  at: string;
  by: string;
};

export type SheetMarks = Record<string, QuestionMark>;

const EMPTY: SheetMarks = {};

const KEY = "genixx.sheet-marks";
const EVENT = "genixx:sheet-marks-change";

let cacheRaw: string | null = null;
let cacheValue: SheetMarks = EMPTY;

function read(): SheetMarks {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as SheetMarks) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: SheetMarks) {
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

/* ───────────────────────── 씨앗 — 채점이 끝난 답안지 ─────────────────────────
   지난 회차와 이번 회차의 몇 장은 채점이 끝난 채로 시작한다(lib/gradedSeed.ts). 그 답안지의
   문항에는 채점자가 AI의 점수를 하나씩 확인한 표시를 깔아 둔다 — 깔아 두지 않으면 반년 전에
   끝난 회차까지 「채점 중 0 / 20」으로 서고, 채점이 끝나야 만들어지는 리포트(lib/reportStore.ts)
   는 거기서 나올 답안지가 없다.

   저장소에 적어 넣지 않는다. 저장한 값 아래에 깔 뿐이라, 채점자가 그 답안지를 다시 열어 고치면
   고친 문항만 저장된다. 점수를 정하는 셈은 lib/gradedSeed.ts에 있다 — 리포트 저장소가 같은
   점수로 리포트를 조립한다. */

let seedCache: SheetMarks | null = null;

/** 씨앗 채점(lib/gradedSeed.ts)을 이 저장소의 열쇠(답안지/문항)로 편다 */
function seedMarks(): SheetMarks {
  if (seedCache) return seedCache;
  const out: SheetMarks = {};
  for (const g of seedGraded) {
    for (const [id, m] of Object.entries(seedMarksOf(g))) out[markKey(g.sheet.key, id)] = m;
  }
  seedCache = out;
  return out;
}

function useMarks(): SheetMarks {
  /* ⚠ 서버 스냅숏으로 모듈 상수를 돌려준다. 새 객체를 만들면 렌더마다 참조가 달라
     React가 무한 루프로 본다 */
  const stored = useSyncExternalStore(subscribe, read, () => EMPTY);
  /* 저장한 값이 씨앗을 덮는다 — 씨앗은 서버와 브라우저에서 같은 값이라 하이드레이션에서 갈리지 않는다 */
  return useMemo(() => ({ ...seedMarks(), ...stored }), [stored]);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const markKey = (sheetKey: string, questionId: string) => `${sheetKey}/${questionId}`;

/**
 * 손본 것 전부 — 목록이 답안지 스물다섯 장을 한 번에 셀 때 쓴다.
 *
 * 답안지마다 useSheetMarks를 부를 수는 없다. 줄 수가 회차마다 달라 훅 개수가 바뀐다.
 */
export function useAllMarks(): SheetMarks {
  return useMarks();
}

/** 이 답안지에 손본 것들 — 문항 번호를 열쇠로 */
export function useSheetMarks(sheetKey: string): Record<string, QuestionMark> {
  const all = useMarks();
  return useMemo(() => {
    const head = `${sheetKey}/`;
    const out: Record<string, QuestionMark> = {};
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith(head)) out[k.slice(head.length)] = v;
    }
    return out;
  }, [all, sheetKey]);
}

/**
 * 답안지 한 장을 한 번에 저장한다.
 *
 * 문항마다 저장을 두면 서른 문항짜리에서 서른 번을 누르고, 그러다 두어 개를 안 누른 채
 * 나간다(lib/expertStore.ts의 markSheet와 같은 까닭).
 *
 * 손댄 것이 없어진 문항은 열쇠째 지운다. 빈 값을 들고 있으면 목록이 「고침」이라고 말하고,
 * 나중에 AI 점수가 바뀌어도 그 문항만 옛 값에 붙들린다.
 */
export function saveSheetMarks(
  sheetKey: string,
  edits: { id: string; points: number | null; comment: string }[],
  by: string,
) {
  const cur = read();
  const next = { ...cur };
  const at = now();
  let touched = 0;

  for (const e of edits) {
    const k = markKey(sheetKey, e.id);
    const was = cur[k];
    const points = e.points ?? undefined;
    const comment = e.comment.trim();
    const empty = points === undefined && comment === "";

    if (empty) {
      if (was) {
        delete next[k];
        touched += 1;
      }
      continue;
    }
    if (was && was.points === points && (was.comment ?? "") === comment) continue;
    next[k] = { points, comment: comment || undefined, at, by };
    touched += 1;
  }

  if (touched === 0) return;
  write(next);
}
