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
  /** 글자 크기 배율. 1이 기본이고 ZOOM_LEVELS 안의 값만 들어간다 */
  zoom: number;
};

/**
 * 글자 크기 눈금.
 *
 * 처음에는 「보통 / 크게 / 아주 크게」 세 버튼을 헤더에 세워 두었는데, 상시로 자리를
 * 크게 차지하면서 정작 그 셋 사이를 못 맞추겠다는 말이 나왔다. 눈금을 여섯으로 늘리고
 * 컨트롤은 － ＋ 두 개로 줄인다. 지금 몇 %인지는 두 버튼 사이에 적어 둔다 — 배율을
 * 숨기면 「원래대로」로 돌아오는 길이 사라진다.
 */
export const ZOOM_LEVELS = [0.9, 1, 1.1, 1.25, 1.4, 1.6] as const;

export const ZOOM_MIN = ZOOM_LEVELS[0];
export const ZOOM_MAX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

/** 지금 배율에서 한 칸 옮긴 값. 눈금 밖이면 가장 가까운 눈금부터 센다. */
export function stepZoom(current: number, dir: 1 | -1) {
  const at = ZOOM_LEVELS.reduce(
    (best, v, i) => (Math.abs(v - current) < Math.abs(ZOOM_LEVELS[best] - current) ? i : best),
    0,
  );
  const next = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, at + dir));
  return ZOOM_LEVELS[next];
}

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

/**
 * 글자 크기를 한 칸 옮긴다.
 *
 * 컴포넌트가 들고 있는 값이 아니라 저장된 값을 그때그때 읽는다. 렌더 사이의 값을
 * 그대로 쓰면 － 나 ＋ 를 빠르게 두 번 눌렀을 때 두 번째가 첫 번째와 같은 값에서
 * 출발해 한 칸만 움직인다.
 */
export function bumpZoom(dir: 1 | -1) {
  patchAdminPrefs({ zoom: stepZoom(read().zoom, dir) });
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
