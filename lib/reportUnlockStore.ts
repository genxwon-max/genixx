"use client";

import { useSyncExternalStore } from "react";

/**
 * 정밀본을 연 아이 — 학생 id → 연 시각.
 *
 * 요약본은 발행되면 누구나 무료로 본다. 정밀본은 결제 상품(「재능진단 종합 리포트」,
 * lib/productStore PRD-0002)인데, 2026 파일럿은 전면 무료라 결제를 붙이지 않고 「받기」를
 * 누르면 여기에 적어 연다. 정식 서비스에서는 이 기록 대신 결제 승인(lib/payments)이 연다.
 */
type Unlocks = Record<string, string>;

const KEY = "genixx.report-unlock";
const EVENT = "genixx:report-unlock-change";
const EMPTY: Unlocks = {};

let cacheRaw: string | null = null;
let cacheValue: Unlocks = EMPTY;

function read(): Unlocks {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Unlocks) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useFullUnlocked(studentId: string): boolean {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);
  return !!all[studentId];
}

export function unlockFull(studentId: string) {
  const next = { ...read(), [studentId]: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}
