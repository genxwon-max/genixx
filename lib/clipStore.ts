"use client";

import { useMemo, useSyncExternalStore } from "react";
import { clips as clipSeed, type Clip, type ClipKind } from "./promoClips";

/**
 * ADM-15-2 홍보 영상 — /newhome 「영상으로 보기」 칸에 걸리는 영상 목록.
 *
 * 여태 이 목록은 코드에 박혀 있었다(lib/promoClips.ts). 영상은 **올라오는 대로 걸리는
 * 것**이라, 유튜브 링크 하나 붙이는 일에 배포가 필요한 화면은 쓸 수 없다. 공지·자주 묻는
 * 질문을 콘솔로 내린 것과 같은 까닭이다(lib/contentStore.ts).
 *
 * 저쪽 파일은 씨앗으로 남는다 — 저장분이 없으면 지금 화면에 서 있는 여섯 칸이 그대로
 * 나가므로, 옮기는 동안 공개 화면이 한 글자도 바뀌지 않는다.
 *
 * ── 차례가 곧 보이는 차례 ──
 * 배열 순서로 선다. order 번호를 따로 두지 않는다 — 번호를 들면 지우고 넣을 때마다
 * 1,2,4처럼 구멍이 나고, 그 구멍을 메우는 코드가 화면과 저장소 두 군데에 생긴다
 * (lib/roundPlanStore.ts의 subjects와 같은 규칙).
 *
 * ── 주소가 없는 영상 ──
 * url이 비면 카드가 링크가 아니라 「준비 중」으로 그려진다. 지우지 않고 비워 두는 자리가
 * 필요하다 — 찍기로 한 영상을 목록에 미리 걸어 두는 일이 실제로 있고, 그때 없는 주소를
 * 지어 넣으면 누른 사람이 빈 창을 본다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 콘텐츠 API로 갈아 끼우고, 서버 렌더가 첫 화면을
 *   그리도록 옮긴다 — 지금은 서버가 씨앗을 그리고 브라우저가 저장분으로 덮는다.
 */

export type ClipRow = Clip & {
  /** 공개 화면에 세우는가. 내려 두면 목록에는 남고 사람 눈에는 안 보인다 */
  shown: boolean;
};

export const clipKindLabel: Record<ClipKind, string> = {
  long: "가로 영상",
  short: "숏폼",
};

export const clipKinds: ClipKind[] = ["long", "short"];

/** 갈래마다 카드 비율이 다르다 — 화면이 이 값으로 틀을 가른다 */
export const clipRatio: Record<ClipKind, string> = { long: "16:9", short: "9:16" };

const SEED: ClipRow[] = clipSeed.map((c) => ({ ...c, shown: true }));

const KEY = "genixx.clips";
const EVENT = "genixx:clips-change";

let cacheRaw: string | null = null;
let cacheValue: ClipRow[] = SEED;

function normalize(rows: Partial<ClipRow>[]): ClipRow[] {
  return rows.map((r, i) => ({
    id: r.id || `clip-${i + 1}`,
    kind: r.kind === "short" ? "short" : "long",
    title: r.title ?? "",
    desc: r.desc ?? "",
    length: r.length ?? "",
    url: r.url,
    shown: r.shown ?? true,
  }));
}

function read(): ClipRow[] {
  if (typeof window === "undefined") return SEED;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? normalize(JSON.parse(raw) as Partial<ClipRow>[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: ClipRow[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
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

/** 관리자 목록이 읽는 날것 — 내려 둔 것까지 그대로 */
export function useClipRows(): ClipRow[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

export function useClip(id: string): ClipRow | null {
  const rows = useClipRows();
  return useMemo(() => rows.find((r) => r.id === id) ?? null, [rows, id]);
}

/** 공개 화면이 읽는 목록 — 내려 둔 것은 빠진다 */
export function useClips(kind: ClipKind): Clip[] {
  const rows = useClipRows();
  return useMemo(() => rows.filter((r) => r.shown && r.kind === kind), [rows, kind]);
}

/* ───────────────────────── 고치기 ───────────────────────── */

/** 다음 번호 — 주소에 쓰이는 값이라 지운 번호는 다시 쓰지 않는다 */
function nextId(rows: ClipRow[]) {
  const max = rows.reduce((m, r) => {
    const n = Number(/^VOD-(\d+)$/.exec(r.id)?.[1] ?? 0);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `VOD-${String(max + 1).padStart(3, "0")}`;
}

/**
 * 새 줄 — **내려 둔 채로** 만든다.
 *
 * 만드는 즉시 첫 화면에 서면 제목도 주소도 없는 칸이 「준비 중」으로 뜬다. 채운 뒤에
 * 노출을 켜는 것이 순서다.
 */
export function blankClip(rows: ClipRow[]): ClipRow {
  return { id: nextId(rows), kind: "long", title: "", desc: "", length: "", url: "", shown: false };
}

/** 있으면 갈아 끼우고 없으면 뒤에 붙인다 */
export function saveClip(next: ClipRow) {
  const rows = read();
  const one = canonClip(next);
  const has = rows.some((r) => r.id === next.id);
  write(has ? rows.map((r) => (r.id === next.id ? one : r)) : [...rows, one]);
}

/**
 * 저장할 꼴로 다듬는다 — 저장한 뒤에 읽어 오는 값과 같아야 한다(EditGuard의 dirty 셈).
 *
 * 빈 주소는 undefined로 눕힌다. 빈 문자열로 담아 두면 「주소가 있다」로 읽는 화면이 생기고,
 * 카드가 아무 데도 가지 않는 링크가 된다.
 */
export function canonClip(row: ClipRow): ClipRow {
  const url = (row.url ?? "").trim();
  return {
    ...row,
    title: row.title.trim(),
    desc: row.desc.trim(),
    length: row.length.trim(),
    url: url || undefined,
  };
}

export function setClipShown(id: string, shown: boolean) {
  write(read().map((r) => (r.id === id ? { ...r, shown } : r)));
}

export function removeClip(id: string) {
  write(read().filter((r) => r.id !== id));
}

/**
 * 한 칸을 앞뒤로 옮긴다 — **같은 갈래 안에서만.**
 *
 * 화면이 가로 영상과 숏폼을 다른 줄에 세우므로(newhome ⑤ 구간), 갈래를 건너 옮기는
 * 것은 보이는 차례를 바꾸지 않는다. 그 자리에서 눌러도 아무 일이 안 일어나면 단추가
 * 고장 난 것으로 읽히니, 옮길 곳은 같은 갈래의 이웃으로 찾는다.
 */
export function moveClip(id: string, dir: -1 | 1) {
  const rows = read();
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return;
  const kind = rows[i].kind;
  let j = i + dir;
  while (j >= 0 && j < rows.length && rows[j].kind !== kind) j += dir;
  if (j < 0 || j >= rows.length) return;
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  write(next);
}

/** 이 줄을 더 옮길 수 있는가 — 단추를 끄는 값 */
export function canMove(rows: ClipRow[], id: string, dir: -1 | 1) {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return false;
  const kind = rows[i].kind;
  for (let j = i + dir; j >= 0 && j < rows.length; j += dir) {
    if (rows[j].kind === kind) return true;
  }
  return false;
}

/** 시연용 — 목록을 씨앗으로 되돌린다 */
export function clearClips() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

/* ───────────────────────── 주소 읽기 ───────────────────────── */

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

/** 유튜브 주소에서 영상 번호를 뽑는다 — 미리보기 그림과 심어 보기가 쓴다 */
export const youtubeId = (url?: string) => (url ? (YT.exec(url)?.[1] ?? null) : null);

/**
 * 쓸 수 있는 주소인가 — **막지 않고 일러만 준다.**
 *
 * 유튜브가 아닌 주소(비메오·우리 서버에 올린 mp4)를 걸 일이 있다. https로 시작하면
 * 통과시키고, 유튜브인지 아닌지는 미리보기 그림이 서는지로 저절로 드러난다.
 */
export const looksLikeUrl = (url: string) => /^https?:\/\//i.test(url.trim());
