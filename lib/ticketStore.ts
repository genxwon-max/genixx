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

/** 접수 한 건 — at이 접수한 시각 */
export type TicketUse = { round: string; track: TrackId; at: string };

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
 * 평가가 학년 칸 셋(e34 · e56 · m12)에서 학년 아홉(e1 ~ m3)으로 갈리면서 옛 칸 번호가
 * 사라졌다. 저장분에 그 번호가 남아 있으면 화면이 없는 칸을 그리려다 멈춘다 — 접수 기록은
 * 시연용으로 쌓인 값이라 옮겨 붙이지 않고 버린다. 보유 매수(owned)는 그대로 둔다.
 *
 * 저장소를 옮겨 쓰는 일(migration)을 따로 두지 않고 읽는 자리에서 거른다. 브라우저마다
 * 언제 열지 알 수 없어, 한 번 도는 이사 코드는 결국 누군가의 브라우저를 건너뛴다.
 */
function clean(store: Store): Store {
  let touched = false;
  const next: Store = {};
  for (const [id, wallet] of Object.entries(store)) {
    const used = (wallet.used ?? []).filter((u) => isTrackId(u.track));
    if (used.length !== (wallet.used ?? []).length) touched = true;
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

/** useTickets()로 받은 저장소에서 한 사람 몫을 꺼낸다 */
export const walletOf = (store: Store, studentId: string): Wallet =>
  store[studentId] ?? SEED_WALLET;

export const ticketsLeft = (w: Wallet) => Math.max(0, w.owned - w.used.length);

/** 이 회차에 이미 접수한 학년 — 없으면 null */
export const usedInRound = (w: Wallet, round: string) =>
  w.used.find((u) => u.round === round) ?? null;

/** 이 평가를 접수했는가 */
export const isApplied = (w: Wallet, round: string, track: TrackId) =>
  usedInRound(w, round)?.track === track;

/**
 * 접수 — 응시권 한 매를 이 평가에 쓴다.
 *
 * 이미 접수한 평가면 쓰지 않고 true, 남은 매수가 없거나 같은 회차에 다른 학년을
 * 접수해 두었으면 false.
 */
export function spendTicket(studentId: string, round: string, track: TrackId): boolean {
  const w = readWallet(studentId);
  const same = usedInRound(w, round);
  if (same) return same.track === track;
  if (ticketsLeft(w) <= 0) return false;
  writeWallet(studentId, {
    ...w,
    used: [...w.used, { round, track, at: new Date().toISOString() }],
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
