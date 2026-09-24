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
 * 네이버 예약처럼 **사람 → 날짜 → 시각** 차례로 좁히고, 마지막에 결제한다. 누구와
 * 이야기하는가가 먼저다 — 결과지를 놓고 한 시간을 나누는 자리라, 시각이 맞는다고 아무
 * 전문가나 만나게 할 수 없다. 사람이 정해지면 달력도 시간표도 그 사람 것 하나뿐이다.
 *
 * ── 한 번에 여러 자리 ──
 * 30분 두 칸, 60분 두 칸처럼 **한 번에 여러 자리**를 잡을 수 있다(bookMany). 한 시간으로
 * 모자라 다음 주에 또 잡는 집이 있고, 그때마다 결제를 따로 하면 같은 상담이 영수증 두
 * 장으로 갈린다. 자리마다 예약 한 줄을 세우되 결제 번호(orderId) 하나로 묶는다.
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
  /**
   * 이 자리를 산 결제 번호(lib/orderStore.ts). 한 번에 여러 자리를 잡으면 같은 번호를
   * 나눠 갖는다. 옛 줄에는 없을 수 있어 물음표를 붙인다.
   */
  orderId?: string;
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
   코앞의 날짜는 잡지 않는다. 면담원이 그 아이의 결과지·설문·채점 기록을 미리 읽고 들어와야
   하고, 급한 신청은 전화로 받는 일이다. */

/** 가장 이른 날 — 이레 뒤부터 */
export const LEAD_DAYS = 7;
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

/** 고른 상담사가 그 날 자리가 남았는가 — 달력 칸을 켜고 끄는 값 */
export const hasRoomOn = (rows: Booking[], c: Counselor, date: string, span: Span) =>
  startsOf(rows, c, date, span).length > 0;

/** 시간 고르개의 칸 하나 */
export type Slot = { start: string; open: boolean };

/**
 * 고른 상담사의 그 날 시간표 — **빈 칸만 추리지 않고 근무 시간을 통째로** 펴고,
 * 이미 찬 자리는 open: false로 내려 보낸다.
 *
 * 비는 칸만 세우면 목록이 날마다 다른 모양으로 서서, 보호자는 「10시가 없는 것」인지
 * 「10시에는 원래 일을 안 하는 것」인지 알 수 없다. 근무표를 그대로 펴고 찬 자리를
 * 잠가 두면 그 사람의 하루가 보이고, 다른 시간을 고를 때 어림을 할 수 있다.
 *
 * 60분은 다음 칸까지 비어야 열린다 — 퇴근 직전 칸과 점심 앞 칸이 잠기는 까닭이다.
 */
export function slotsOf(rows: Booking[], c: Counselor, date: string, span: Span): Slot[] {
  if (!worksOn(c, date)) return [];
  const open = new Set(startsOf(rows, c, date, span));
  return cellsOf(c).map((start) => ({ start, open: open.has(start) }));
}

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

export type BookingInput = Omit<Booking, "id" | "madeAt" | "state" | "start">;

/** 한 번에 잡을 수 있는 자리 수. 넷을 넘겨 잡는 집은 전화로 받는 것이 빠르다 */
export const MAX_SLOTS = 4;

/**
 * 신청 — 고른 자리를 한꺼번에 잡는다.
 *
 * 저장하기 직전에 자리를 **다시 센다.** 화면을 열어 둔 사이 다른 탭에서 같은 칸을 먼저
 * 잡았을 수 있다. 하나라도 막혀 있으면 아무것도 쓰지 않고 null을 돌려준다 — 넷 가운데
 * 셋만 잡히면 보호자는 무엇이 잡혔는지 영수증을 보고서야 알게 된다.
 *
 * 번호는 자리마다 따로 붙이고(CS-2610-0001 · 0002), 결제 번호는 넘겨받은 것을 함께
 * 박는다. 예약은 자리 단위로 취소되지만 결제는 한 건이기 때문이다.
 */
export function bookMany(input: BookingInput, starts: string[]): Booking[] | null {
  const rows = read();
  const c = counselors.find((x) => x.id === input.counselorId);
  if (!c || starts.length === 0 || starts.length > MAX_SLOTS) return null;

  const free = new Set(startsOf(rows, c, input.date, input.span));
  if (!starts.every((v) => free.has(v))) return null;

  const at = stamp();
  const made: Booking[] = [];
  let seq = rows;
  for (const start of [...starts].sort()) {
    const row: Booking = {
      ...input,
      start,
      id: nextId(seq, input.date),
      madeAt: at,
      state: "booked",
    };
    made.push(row);
    seq = [row, ...seq];
  }
  write(seq);
  return made;
}

/**
 * 잡아 둔 자리에 결제 번호를 붙인다.
 *
 * 자리를 **먼저 잡고** 결제를 적은 뒤에 부른다. 순서를 뒤집어 결제부터 적으면, 그 찰나에
 * 다른 탭이 같은 칸을 가져갔을 때 자리 없는 영수증이 남는다. 돈은 자리가 확보된 다음에만
 * 적는다.
 */
export function attachOrder(ids: string[], orderId: string) {
  const keys = new Set(ids);
  write(read().map((b) => (keys.has(b.id) ? { ...b, orderId } : b)));
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
