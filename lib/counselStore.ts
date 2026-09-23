"use client";

import { useSyncExternalStore } from "react";
import { addDays, minOf, pad, timeOf, today } from "./calendar";
import {
  cellsOf,
  counselors,
  seedBusy,
  STEP,
  worksOn,
  type Counselor,
  type CounselMode,
  type Span,
} from "./counselors";

/**
 * 보호자가 잡는 결과 해석 면담 예약 (/my/interviews).
 *
 * 네이버 예약처럼 **날짜 → 시각 → 사람** 차례로 좁힌다. 사람을 먼저 고르게 하면 그
 * 사람이 이번 주에 자리가 없을 때 처음으로 돌아가 다시 고르게 되는데, 보호자에게 급한
 * 것은 대개 「이번 주 토요일 저녁에 되는 사람」이지 특정 전문가가 아니다.
 *
 * ── 빈자리는 두 겹이다 ──
 * 상담사의 근무 칸(lib/counselors.ts의 cellsOf)에서 **시연용 가짜 일정**(seedBusy)과
 * **이 브라우저에 잡힌 예약**을 뺀 것이 빈자리다. 둘을 한 곳에서 빼는 까닭은, 화면마다
 * 제 나름으로 빼면 달력에는 자리가 있다고 켜 놓고 시각 목록에서는 없다고 하는 일이
 * 생기기 때문이다.
 *
 * ── 60분은 30분 칸 둘 ──
 * 눈금이 30분이라 60분 면담은 잇달은 두 칸이 모두 비어야 선다. 끝나는 시각이 근무
 * 구간을 넘거나 점심에 걸리면 그 칸은 30분으로만 열린다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 확정 안내(문자·메일)와 화상 링크는 면담 API를 붙일 때
 *   book() 자리에서 함께 부른다. 지금은 신청이 들어오면 담당자가 전화를 건다.
 */

export type BookingState = "booked" | "canceled";

export type Booking = {
  /** 예약 번호 — CS-2609-0003 */
  id: string;
  /** 누구 이야기를 하는 면담인가. 명부에서 지워져도 남도록 이름을 함께 박는다 */
  studentId: string;
  studentName: string;
  counselorId: string;
  date: string;
  start: string;
  span: Span;
  mode: CounselMode;
  /** 보호자가 미리 적어 보내는 궁금한 점 */
  note: string;
  /** 신청한 시각 */
  madeAt: string;
  state: BookingState;
};

const KEY = "genixx.counsel";
const EVENT = "genixx:counsel-change";

/* 서버 스냅샷은 늘 같은 참조여야 한다 — 새 배열을 돌려주면 구독이 끝없이 다시 그린다 */
const EMPTY: Booking[] = [];

let cacheRaw: string | null = null;
let cacheValue: Booking[] = EMPTY;

function read(): Booking[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Booking[]) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Booking[]) {
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

/** 최근 신청이 앞에 온다 */
export function useBookings(): Booking[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/* ───────────────────────── 예약 창 ─────────────────────────
   오늘은 잡지 않는다. 면담원에게도 준비할 것이 있고, 당일 신청은 전화로 받는 일이다. */

/** 가장 이른 날 — 내일부터 */
export const LEAD_DAYS = 1;
/** 가장 늦은 날 — 여드레 뒤까지가 아니라 넉넉히 두 달 */
export const WINDOW_DAYS = 60;

/**
 * 이 날짜를 고를 수 있는가.
 *
 * ⚠ 오늘을 읽으므로 부르는 쪽은 하이드레이션이 끝난 뒤에만 쓴다. 서버가 그린 달력과
 *   브라우저가 그린 달력이 갈리면 칸이 통째로 다시 그려진다.
 */
export function inWindow(date: string, now = today()) {
  return date >= addDays(now, LEAD_DAYS) && date <= addDays(now, WINDOW_DAYS);
}

/* ───────────────────────── 빈자리 ───────────────────────── */

/** 그 시각에 이 상담사가 잡혀 있는가 — 취소한 예약은 자리를 돌려준다 */
function bookedAt(rows: Booking[], c: Counselor, date: string, cell: string) {
  const m = minOf(cell);
  return rows.some(
    (b) =>
      b.state === "booked" &&
      b.counselorId === c.id &&
      b.date === date &&
      minOf(b.start) <= m &&
      m < minOf(b.start) + b.span,
  );
}

/** 30분 칸 하나가 비어 있는가 */
const cellFree = (rows: Booking[], c: Counselor, date: string, cell: string) =>
  !seedBusy(c, date, cell) && !bookedAt(rows, c, date, cell);

/**
 * 이 상담사가 그 날 낼 수 있는 시작 시각.
 *
 * 60분이면 다음 칸까지 근무 칸에 있어야 한다 — cells에 없는 시각은 점심이거나 퇴근
 * 뒤라, 비어 있는지를 묻는 것 자체가 뜻이 없다.
 */
export function startsOf(rows: Booking[], c: Counselor, date: string, span: Span): string[] {
  if (!worksOn(c, date)) return [];
  const cells = cellsOf(c);
  const has = new Set(cells);
  return cells.filter((cell) => {
    const next = timeOf(minOf(cell) + STEP);
    if (span === 60 && !has.has(next)) return false;
    if (!cellFree(rows, c, date, cell)) return false;
    return span === 30 || cellFree(rows, c, date, next);
  });
}

/** 그 날 누구든 낼 수 있는 시작 시각 — 시각 고르개가 세우는 눈금 */
export function dayStarts(rows: Booking[], date: string, span: Span): string[] {
  const all = new Set<string>();
  for (const c of counselors) for (const s of startsOf(rows, c, date, span)) all.add(s);
  return [...all].sort();
}

/** 그 날 그 시각에 자리가 있는 상담사 */
export function freeAt(rows: Booking[], date: string, start: string, span: Span): Counselor[] {
  return counselors.filter((c) => startsOf(rows, c, date, span).includes(start));
}

/** 그 날 자리가 하나라도 있는가 — 달력 칸을 켜고 끄는 값 */
export const hasRoom = (rows: Booking[], date: string, span: Span) =>
  counselors.some((c) => startsOf(rows, c, date, span).length > 0);

/* ───────────────────────── 신청 ───────────────────────── */

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 다음 예약 번호 — CS-2609-0003. 가장 큰 수 다음을 쓴다 */
function nextId(rows: Booking[], date: string) {
  const head = `CS-${date.slice(2, 4)}${date.slice(5, 7)}-`;
  const max = rows
    .filter((b) => b.id.startsWith(head))
    .reduce((m, b) => Math.max(m, Number(b.id.slice(head.length)) || 0), 0);
  return `${head}${String(max + 1).padStart(4, "0")}`;
}

export type BookingInput = Omit<Booking, "id" | "madeAt" | "state">;

/**
 * 신청.
 *
 * 저장하기 직전에 자리를 한 번 더 본다 — 다른 탭에서 같은 자리를 먼저 잡았을 수 있다.
 * 자리가 없으면 null을 돌려주고, 부르는 쪽이 목록을 다시 그린다.
 */
export function book(input: BookingInput): Booking | null {
  const rows = read();
  const c = counselors.find((x) => x.id === input.counselorId);
  if (!c || !startsOf(rows, c, input.date, input.span).includes(input.start)) return null;

  const made: Booking = {
    ...input,
    id: nextId(rows, input.date),
    madeAt: stamp(),
    state: "booked",
  };
  write([made, ...rows]);
  return made;
}

/** 취소 — 줄을 지우지 않고 상태만 바꾼다. 지난 신청이 있었다는 사실은 남아야 한다 */
export function cancelBooking(id: string) {
  write(read().map((b) => (b.id === id ? { ...b, state: "canceled" } : b)));
}

/** 시연용 — 예약을 비운다 */
export function clearBookings() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}
