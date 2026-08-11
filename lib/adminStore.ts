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
 * 저장하는 것은 세 가지 —
 *  1) 지금 들어와 있는 운영자 계정(아이디·이름·역할)
 *  2) 글자 크기 배율 (50~60대 사용자가 직접 올려 쓰는 값이라 반드시 기억해야 한다)
 *  3) 임시 비밀번호를 아직 안 바꿨는지 (안내 띠를 띄우기 위한 값)
 *
 * 비밀번호는 담지 않는다 — lib/staffStore.ts의 설명 참조.
 */

export type AdminPrefs = {
  /** null이면 아직 로그인하지 않았다 */
  loginId: string | null;
  staffName: string;
  role: StaffRoleId;
  /** 임시 비밀번호를 아직 바꾸지 않았다 — 안내 띠를 띄운다 */
  temp: boolean;
  /** 1 = 보통, 1.15 = 크게, 1.3 = 아주 크게 */
  zoom: number;
};

export const zoomSteps = [
  { value: 1, label: "보통" },
  { value: 1.15, label: "크게" },
  { value: 1.3, label: "아주 크게" },
] as const;

const DEFAULT: AdminPrefs = {
  loginId: null,
  staffName: "",
  role: "super",
  temp: false,
  zoom: 1,
};

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

/** 콘솔 로그인 — 글자 크기는 사람이 맞춰 둔 값이라 로그아웃해도 남긴다 */
export function adminSignIn(account: {
  loginId: string;
  staffName: string;
  role: StaffRoleId;
  temp: boolean;
}) {
  patchAdminPrefs(account);
}

export function adminSignOut() {
  patchAdminPrefs({ loginId: null, staffName: "", temp: false });
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
  /** 무엇을 했는지. 없으면 개인정보 열람이다. */
  action?: string;
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

function push(entry: Omit<LocalAudit, "id" | "at">) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const full: LocalAudit = {
    ...entry,
    id: `L-${now.getTime().toString(36).toUpperCase()}`,
    at: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
  const next = [full, ...readLog()].slice(0, 50);
  window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(LOG_EVENT));
  return full;
}

export function recordAccess(target: string, reason: string, actor: string) {
  return push({ target, reason, actor, action: "개인정보 열람" });
}

/** 계정 정지·해제·삭제처럼 상태를 바꾼 조치를 남긴다 */
export function recordAction(target: string, action: string, reason: string, actor: string) {
  return push({ target, action, reason, actor });
}
