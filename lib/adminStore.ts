"use client";

import { useSyncExternalStore } from "react";
import type { StaffRoleId } from "./admin";

/**
 * 관리자 콘솔의 로컬 상태.
 *
 * 응시 존 세션(lib/authStore.ts)과 일부러 분리했다. 운영자 계정은 회원 계정과
 * 다른 체계(역할 기반 권한)이고, 같은 브라우저에서 학부모 계정으로 로그인한 채
 * 관리자 화면을 열어 보는 시연 상황도 있어야 하기 때문이다.
 *
 * 저장하는 것은 두 가지 —
 *  1) 지금 어떤 운영자 역할로 보고 있는지 (권한별 화면 차이를 확인하기 위한 전환)
 *  2) 글자 크기 배율 (50~60대 사용자가 직접 올려 쓰는 값이라 반드시 기억해야 한다)
 */

export type AdminPrefs = {
  staffName: string;
  role: StaffRoleId;
  /** 1 = 보통, 1.15 = 크게, 1.3 = 아주 크게 */
  zoom: number;
};

export const zoomSteps = [
  { value: 1, label: "보통" },
  { value: 1.15, label: "크게" },
  { value: 1.3, label: "아주 크게" },
] as const;

const DEFAULT: AdminPrefs = { staffName: "박서준", role: "super", zoom: 1 };

const KEY = "genixx.admin";
const EVENT = "genixx:admin-change";

let cacheRaw: string | null = null;
let cacheValue: AdminPrefs = DEFAULT;

function read(): AdminPrefs {
  if (typeof window === "undefined") return DEFAULT;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<AdminPrefs>) } : DEFAULT;
  } catch {
    cacheValue = DEFAULT;
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

export function useAdminPrefs(): AdminPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

export function patchAdminPrefs(patch: Partial<AdminPrefs>) {
  const next = { ...read(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

/* ───────────────────────── 열람 기록 ─────────────────────────
   개인정보를 연 순간을 이 세션 안에서 쌓아 둔다. 실제 서비스에서는 서버가
   기록하지만, 화면 설계 단계에서도 "사유 없이는 열 수 없다"는 흐름과
   "연 즉시 목록에 남는다"는 결과를 눈으로 확인할 수 있어야 한다. */

export type LocalAudit = {
  id: string;
  at: string;
  target: string;
  reason: string;
  actor: string;
};

/** 서버 스냅샷은 매번 같은 참조여야 한다. 새 배열을 돌려주면 React가 무한 루프로 본다. */
const EMPTY: LocalAudit[] = [];

const LOG_KEY = "genixx.admin.audit";
const LOG_EVENT = "genixx:admin-audit-change";

let logRaw: string | null = null;
let logValue: LocalAudit[] = [];

function readLog(): LocalAudit[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(LOG_KEY);
  if (raw === logRaw) return logValue;
  logRaw = raw;
  try {
    logValue = raw ? (JSON.parse(raw) as LocalAudit[]) : [];
  } catch {
    logValue = [];
  }
  return logValue;
}

function subscribeLog(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOG_EVENT, onChange);
  };
}

export function useLocalAudit(): LocalAudit[] {
  return useSyncExternalStore(subscribeLog, readLog, () => EMPTY);
}

export function recordAccess(target: string, reason: string, actor: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const entry: LocalAudit = {
    id: `L-${now.getTime().toString(36).toUpperCase()}`,
    at: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    target,
    reason,
    actor,
  };
  const next = [entry, ...readLog()].slice(0, 50);
  window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(LOG_EVENT));
  return entry;
}
