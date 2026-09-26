"use client";

import { useSyncExternalStore } from "react";
import { isTrackId, type TrackId } from "./examCatalog";

/**
 * 학생이 들고 있는 응시권과 **접수 기록**.
 *
 * 보호자가 결제한 응시권(1~4매쯤)이 아이 앞으로 들어오고, 아이는 「접수하기」 탭에서
 * 평가 카드를 접수할 때 한 매를 쓴다. 접수한 평가만 「응시하기」 탭에 올라온다. 과목마다
 * 쓰는 것이 아니라 **평가 한 벌(회차 × 학년)에 한 매**다.
 *
 * ── 무료시험은 응시권을 쓰지 않는다 ──
 * 접수 기록에 갈래(tier)를 함께 적는다. 무료시험은 가입한 학생이면 누구나 보는 것이라
 * 응시권이 들지 않고, 유료시험만 한 매를 쓴다. 남은 매수(ticketsLeft)가 유료 접수만 세는
 * 까닭이 이것이다 — 무료 접수까지 세면 무료시험을 본 아이는 결제한 응시권을 이미 쓴 것이
 * 된다.
 *
 * 갈래는 **접수하는 순간** 정해진다 — 응시권이 있으면 한 매를 써서 유료로, 없으면 무료로
 * 접수한다(components/exam/ApplyFlow.tsx). 접수한 뒤에 갈래를 올리는 길은 화면에 두지
 * 않는다. 저장소는 그 길을 막지 않고 열어 둔다(spendTicket이 무료 줄의 갈래만 올린다) —
 * 언젠가 결제 화면에서 잇게 되면 줄을 새로 만들지 않고 그 줄을 쓰라는 뜻이다. 한 회차 한
 * 학년이라는 규칙은 그때도 그대로다.
 *
 * ── 한 회차에는 한 학년 ──
 * 같은 회차에서 두 학년을 접수할 수 없다. 응시 기록(lib/examStore.ts)이 학생마다 한
 * 벌이라, 두 학년을 받으면 초등 3-4학년에서 낸 국어가 5-6학년에도 「제출완료」로 선다.
 * 실제로도 한 회차에 두 학년 시험을 볼 까닭이 없다.
 *
 * ⚠ 보유 수(owned)는 결제 결과가 넘어오는 자리다. 지금은 시연용 씨앗 3매에서 출발하고,
 *   회원 존의 결제 화면(/my/payments)이 grantTickets로 얹는다. 붙일 때는 결제 API가
 *   승인 결과로 내려 주는 값으로 갈아 끼운다 — 그때 grantTickets를 부르는 자리가
 *   결제 성공 응답을 받는 자리로 옮겨 간다.
 */

/** 접수에 매기는 갈래 — 무료시험은 응시권이 들지 않는다 */
export type UseTier = "free" | "paid";

/** 접수 한 건 — at이 접수한 시각 */
export type TicketUse = { round: string; track: TrackId; tier: UseTier; at: string };

export type Wallet = {
  /** 받은 응시권 */
  owned: number;
  /** 접수 기록 — 쓴 매수는 이 길이에서 센다. 따로 「남은 수」를 들면 둘이 갈린다 */
  used: TicketUse[];
};

/** 시연용 — 보호자가 결제해 넘겨준 매수 */
export const SEED_OWNED = 3;

const SEED_WALLET: Wallet = { owned: SEED_OWNED, used: [] };

type Store = Record<string, Wallet>;

const KEY = "genixx.tickets";
const EVENT = "genixx:tickets-change";

let cacheRaw: string | null = null;
let cacheStore: Store = {};

function readStore(): Store {
  if (typeof window === "undefined") return {};
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheStore;
  }
  if (raw === cacheRaw) return cacheStore;
  cacheRaw = raw;
  try {
    cacheStore = raw ? clean(JSON.parse(raw) as Store) : {};
  } catch {
    cacheStore = {};
  }
  return cacheStore;
}

/**
 * 읽을 때 한 번 훑어 **없어진 학년 칸의 접수 기록을 버린다.**
 *
 * 학년 칸은 셋(e34 · e56 · m12)에서 아홉(e1 ~ m3)으로 갈렸다가, 진단평가 절차가 정한
 * 대상 학년에 맞춰 넷(e3 ~ e6)으로 좁았다. 저장분에 옛 번호가 남아 있으면 화면이 없는
 * 칸을 그리려다 멈춘다 — 접수 기록은 시연용으로 쌓인 값이라 옮겨 붙이지 않고 버린다.
 * 보유 매수(owned)는 그대로 둔다.
 *
 * 갈래(tier)가 없는 옛 줄은 유료로 본다 — 그때는 응시권을 써서 접수하는 길뿐이었다.
 *
 * 저장소를 옮겨 쓰는 일(migration)을 따로 두지 않고 읽는 자리에서 거른다. 브라우저마다
 * 언제 열지 알 수 없어, 한 번 도는 이사 코드는 결국 누군가의 브라우저를 건너뛴다.
 */
function clean(store: Store): Store {
  let touched = false;
  const next: Store = {};
  for (const [id, wallet] of Object.entries(store)) {
    const raw = wallet.used ?? [];
    const used = raw
      .filter((u) => isTrackId(u.track))
      .map((u) => (u.tier ? u : { ...u, tier: "paid" as UseTier }));
    if (used.length !== raw.length || used.some((u, k) => u !== raw[k])) touched = true;
    next[id] = { ...wallet, used };
  }
  return touched ? next : store;
}

/* 저장분이 없는 학생은 늘 같은 씨앗 객체를 돌려준다 — 새 객체면 구독이 끝없이 다시 그린다 */
function readWallet(studentId: string): Wallet {
  return readStore()[studentId] ?? SEED_WALLET;
}

function writeWallet(studentId: string, next: Wallet) {
  const store = { ...readStore(), [studentId]: next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
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

export function useWallet(studentId: string): Wallet {
  return useSyncExternalStore(
    subscribe,
    () => readWallet(studentId),
    () => SEED_WALLET,
  );
}

/* 서버 스냅샷은 늘 같은 참조여야 한다 — 새 객체를 돌려주면 구독이 끝없이 다시 그린다 */
const EMPTY_STORE: Store = {};

/**
 * 지갑 저장소 전체.
 *
 * 보호자 화면은 아이가 여럿이라 지갑을 사람 수만큼 읽어야 하는데, useWallet은 학생
 * 하나를 받는 훅이라 목록 안에서 돌려 부를 수 없다. 저장소째로 한 번 구독하고 줄마다
 * walletOf로 꺼낸다.
 */
export function useTickets(): Store {
  return useSyncExternalStore(subscribe, readStore, () => EMPTY_STORE);
}

/** 훅 밖에서 한 사람의 지갑을 읽는다 — 화면이 열릴 때 한 번 맞추는 자리에서 쓴다 */
export const getWallet = (studentId: string) => readWallet(studentId);

/** useTickets()로 받은 저장소에서 한 사람 몫을 꺼낸다 */
export const walletOf = (store: Store, studentId: string): Wallet =>
  store[studentId] ?? SEED_WALLET;

/** 쓴 응시권 — 유료 접수만 센다 */
export const ticketsSpent = (w: Wallet) => w.used.filter((u) => u.tier === "paid").length;

export const ticketsLeft = (w: Wallet) => Math.max(0, w.owned - ticketsSpent(w));

/** 이 회차에 이미 접수한 학년 — 없으면 null */
export const usedInRound = (w: Wallet, round: string) =>
  w.used.find((u) => u.round === round) ?? null;

/** 이 평가를 접수했는가 */
export const isApplied = (w: Wallet, round: string, track: TrackId) =>
  usedInRound(w, round)?.track === track;

/** 이 평가를 어느 갈래로 접수했는가 — 접수하지 않았으면 null */
export const tierApplied = (w: Wallet, round: string, track: TrackId): UseTier | null => {
  const u = usedInRound(w, round);
  return u && u.track === track ? u.tier : null;
};

/**
 * 유료 접수 — 응시권 한 매를 이 평가에 쓴다.
 *
 * 같은 평가를 무료로 접수해 두었으면 줄을 새로 만들지 않고 갈래만 올리고 한 매를 쓴다.
 * 이미 유료로 접수한 평가면 쓰지 않고 true, 남은 매수가 없거나 같은 회차에 **다른 학년**을
 * 접수해 두었으면 false.
 */
export function spendTicket(studentId: string, round: string, track: TrackId): boolean {
  const w = readWallet(studentId);
  const same = usedInRound(w, round);
  if (same && same.track !== track) return false;
  if (same?.tier === "paid") return true;
  if (ticketsLeft(w) <= 0) return false;
  const at = new Date().toISOString();
  writeWallet(studentId, {
    ...w,
    used: same
      ? w.used.map((u) => (u.round === round ? { ...u, tier: "paid" as UseTier, at } : u))
      : [...w.used, { round, track, tier: "paid" as UseTier, at }],
  });
  return true;
}

/**
 * 무료 접수 — 응시권을 쓰지 않고 이 평가를 무료시험으로 접수한다.
 *
 * 가입한 학생이 셋트를 물려받는 자리에서 부른다(lib/setStore.ts). 같은 회차에 이미 접수한
 * 것이 있으면 손대지 않는다 — 유료 접수를 무료로 끌어내리거나, 다른 학년을 덮어써서는
 * 안 된다.
 */
export function applyFree(studentId: string, round: string, track: TrackId): boolean {
  const w = readWallet(studentId);
  if (usedInRound(w, round)) return false;
  writeWallet(studentId, {
    ...w,
    used: [...w.used, { round, track, tier: "free" as UseTier, at: new Date().toISOString() }],
  });
  return true;
}

/**
 * 발급 — 결제가 끝난 응시권을 이 학생 앞으로 얹는다.
 *
 * 쓴 기록(used)은 건드리지 않는다. 보유 수만 는다 — 접수는 아이가 제 화면에서 하는
 * 일이고, 보호자가 결제했다고 해서 어느 평가에 쓸지까지 정해지는 것은 아니다.
 */
export function grantTickets(studentId: string, count: number) {
  if (count <= 0) return;
  const w = readWallet(studentId);
  writeWallet(studentId, { ...w, owned: w.owned + count });
}

/** 시연용 — 쓴 기록을 지우고 씨앗 매수로 되돌린다 */
export function resetWallet(studentId: string) {
  writeWallet(studentId, SEED_WALLET);
}
