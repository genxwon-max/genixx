"use client";

import { useSyncExternalStore } from "react";
import { pad } from "./calendar";

/**
 * 회원이 한 결제 (PAY-03) — 무엇을 누구 앞으로 샀나.
 *
 * 관리자 콘솔의 결제 내역(lib/payments.ts)과 이름이 닮았지만 서로 다른 자료다. 저쪽은
 * **들어온 돈**을 위에서 내려다보는 장부라 구매자 이름이 가려져 있고 학생이 없다.
 * 여기는 보호자가 **내 결제**를 보는 자리라, 가린 이름 대신 누구 몫으로 산 것인지가
 * 남아야 한다 — 아이가 셋이면 「어느 아이 응시권을 샀더라」가 곧바로 물음이 된다.
 *
 * ── 한 건에 여럿 ──
 * 결제 한 번에 아이를 여럿 고를 수 있다. 아이마다 주문을 쪼개면 같은 날 같은 카드로
 * 세 줄이 서고, 취소·환불이 들어왔을 때 셋 중 어느 줄인지를 사람이 맞춰야 한다.
 *
 * 그래서 **몇 벌을 샀는가(qty)**가 인원과 따로 있다. 응시권은 아이마다 한 장이라 둘이
 * 같지만, 면담은 아이 하나를 놓고 30분 자리 둘을 잡는 일이 있어 인원으로는 셈이 안 된다.
 * 적지 않으면 인원을 그대로 쓴다.
 *
 * ── 금액은 결제 시점의 값을 박는다 ──
 * 상품(lib/productStore.ts)의 가격은 관리자가 언제든 고친다. 주문이 상품 번호만 들고
 * 있으면 가격이 바뀐 뒤에 지난 결제 금액까지 함께 바뀐다. 이름과 단가를 그 자리에서
 * 복사해 둔다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 실제 승인은 결제대행사(PG)에서 일어나고, 붙일 때는
 *   승인 응답을 받아 이 자리에 적는다 — 카드번호 같은 결제 정보는 지금도 앞으로도
 *   이 화면이 받지 않는다.
 */

export type OrderMethod = "card" | "kakao" | "naver" | "transfer";

export const orderMethods: Record<OrderMethod, string> = {
  card: "신용·체크카드",
  kakao: "카카오페이",
  naver: "네이버페이",
  transfer: "계좌이체",
};

/** 결제에 얹힌 아이 한 명 — 이름을 함께 박는다. 명부에서 지워져도 영수증은 남는다 */
export type OrderStudent = { id: string; name: string };

export type Order = {
  /** 주문번호 — GX2026-000148 */
  id: string;
  /** 결제한 시각 "2026-09-23 14:05" */
  paidAt: string;
  productId: string;
  productName: string;
  /** 응시권인가 — 발급까지 함께 일어난 주문인지가 내역에서 읽혀야 한다 */
  grantsTicket: boolean;
  students: OrderStudent[];
  /** 한 사람 몫 · 한 자리 몫 */
  unit: number;
  /** 몇 벌인가 — 적지 않으면 인원 수 */
  qty: number;
  /** 실제로 낸 금액 = unit × qty */
  amount: number;
  method: OrderMethod;
};

const KEY = "genixx.orders";
const EVENT = "genixx:orders-change";

/* 서버 스냅샷은 늘 같은 참조여야 한다 — 새 배열을 돌려주면 구독이 끝없이 다시 그린다 */
const EMPTY: Order[] = [];

let cacheRaw: string | null = null;
let cacheValue: Order[] = EMPTY;

function read(): Order[] {
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
    cacheValue = raw ? (JSON.parse(raw) as Order[]) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Order[]) {
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

/** 최근 결제가 앞에 온다 */
export function useOrders(): Order[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 다음 주문번호 — GX2026-000148.
 *
 * 실제 번호는 결제대행사가 짓는다. 시연에서는 해와 일련번호로 짓되 **가장 큰 수 다음**을
 * 쓴다 — 목록 길이로 세면 지운 주문 하나에 번호가 겹친다.
 */
function nextId(rows: Order[]) {
  const year = new Date().getFullYear();
  const head = `GX${year}-`;
  const max = rows
    .filter((o) => o.id.startsWith(head))
    .reduce((m, o) => Math.max(m, Number(o.id.slice(head.length)) || 0), 147);
  return `${head}${String(max + 1).padStart(6, "0")}`;
}

export type OrderInput = Omit<Order, "id" | "paidAt" | "amount" | "qty"> & { qty?: number };

/** 결제 한 건을 적는다. 응시권 발급은 부르는 쪽이 따로 한다(lib/ticketStore.ts) */
export function placeOrder(input: OrderInput): Order {
  const rows = read();
  const qty = input.qty ?? input.students.length;
  const made: Order = {
    ...input,
    qty,
    id: nextId(rows),
    paidAt: stamp(),
    amount: input.unit * qty,
  };
  write([made, ...rows]);
  return made;
}

/** 시연용 — 내역을 비운다 */
export function clearOrders() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

/** 원화 표기 — 0원은 「무료」로 부른다. 파일럿 응시권이 0원이라 목록에 자주 선다 */
export const orderWon = (v: number) => (v === 0 ? "무료" : `${v.toLocaleString("ko-KR")}원`);
