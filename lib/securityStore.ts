"use client";

import { useSyncExternalStore } from "react";

/**
 * 응시 보안 · 문항 회전 설정 (ADM-04-4).
 *
 * 이 파일이 지키려는 태도가 하나 있다 — **막을 수 있는 것과 없는 것을 함께 적는다.**
 *
 * 화면 안에서 하는 차단은 전부 우회할 수 있다. 오른쪽 단추를 막아도 스크린샷은
 * 찍히고, 스크린샷을 막을 방법이 있더라도 옆에서 휴대폰으로 찍는 것은 못 막는다.
 * 그런데 「캡처 차단」이라고만 적어 두면 운영자는 막힌 줄 알고, 정작 문항이 새어
 * 나갔을 때 무엇이 뚫린 것인지 아무도 설명하지 못한다.
 *
 * 그래서 스위치마다 한계를 함께 담아 화면에 그대로 띄운다. 진짜 대비책은 차단이
 * 아니라 **회전**이다 — 같은 문항이 같은 자리에 계속 나오지 않게 하는 것.
 */

export type GuardId = "copy" | "contextmenu" | "watermark";

export type GuardSpec = {
  id: GuardId;
  label: string;
  /** 켜면 무엇이 실제로 막히는가 */
  blocks: string;
  /** 켜도 막지 못하는 것 — 반드시 함께 적는다 */
  cannot: string;
  /** 응시자가 치르는 대가 */
  cost: string;
};

export const guards: GuardSpec[] = [
  {
    id: "copy",
    label: "글 복사 · 끌기 막기",
    blocks: "지문·발문·보기를 마우스로 끌어 선택하거나 Ctrl+C로 복사하는 것",
    cannot: "스크린샷, 다른 기기로 찍기, 손으로 옮겨 적기",
    cost: "글자를 짚어 가며 읽는 습관이 있는 학생은 읽기가 불편해집니다",
  },
  {
    id: "contextmenu",
    label: "오른쪽 단추 막기",
    blocks: "오른쪽 단추 메뉴의 「이미지 저장」·「복사」",
    cannot: "브라우저 메뉴·개발자 도구·확장 프로그램으로 같은 일을 하는 것",
    cost: "보조기술이 오른쪽 단추 메뉴를 쓰는 경우 방해가 됩니다",
  },
  {
    id: "watermark",
    label: "응시자 표시 겹치기",
    blocks:
      "찍힌 화면이 돌아다닐 때 누구 화면인지 드러납니다. 막는 것이 아니라 새어 나간 뒤에 찾는 장치입니다",
    cannot: "찍는 행위 자체는 막지 못합니다",
    cost: "글 위에 옅은 글자가 겹쳐 읽기가 조금 어려워집니다",
  },
];

export const guardOf = (id: GuardId) => guards.find((g) => g.id === id)!;

/* ── 회전 규칙 ──
   앵커는 회전에서 뺀다. 회차마다 똑같이 들어가야 등화의 기준이 되기 때문이다.
   나머지 문항은 연속으로 나간 횟수가 한계에 닿으면 한 회차 쉬게 한다. */

export type SecuritySettings = {
  guards: Record<GuardId, boolean>;
  /** 앵커가 아닌 문항이 연달아 나갈 수 있는 회차 수 */
  maxRuns: number;
  /** 한 응시자에게 배정하는 문항 수 */
  perStudent: number;
  /** 그중 모든 응시자에게 똑같이 나가는 수(앵커 자리) */
  shared: number;
  updatedAt: string;
  updatedBy: string;
};

export const DEFAULTS: SecuritySettings = {
  guards: { copy: true, contextmenu: true, watermark: false },
  maxRuns: 2,
  perStudent: 10,
  shared: 3,
  updatedAt: "2026-03-02 09:40",
  updatedBy: "초기 설정",
};

export type SecurityLogEntry = {
  id: string;
  at: string;
  by: string;
  text: string;
  reason: string;
};

const SEED_LOG: SecurityLogEntry[] = [];

const KEY = "genixx.security";
const LOG_KEY = "genixx.security.log";
const EVENT = "genixx:security-change";

let cacheRaw: string | null = null;
let cacheValue: SecuritySettings = DEFAULTS;

function read(): SecuritySettings {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const got = raw ? (JSON.parse(raw) as Partial<SecuritySettings>) : null;
    cacheValue = got ? { ...DEFAULTS, ...got, guards: { ...DEFAULTS.guards, ...got.guards } } : DEFAULTS;
  } catch {
    cacheValue = DEFAULTS;
  }
  return cacheValue;
}

let logRaw: string | null = null;
let logValue: SecurityLogEntry[] = SEED_LOG;

function readLog(): SecurityLogEntry[] {
  if (typeof window === "undefined") return SEED_LOG;
  const raw = window.localStorage.getItem(LOG_KEY);
  if (raw === logRaw) return logValue;
  logRaw = raw;
  try {
    logValue = raw ? (JSON.parse(raw) as SecurityLogEntry[]) : SEED_LOG;
  } catch {
    logValue = SEED_LOG;
  }
  return logValue;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useSecurity(): SecuritySettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

export function useSecurityLog(): SecurityLogEntry[] {
  return useSyncExternalStore(subscribe, readLog, () => SEED_LOG);
}

function now() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 설정을 바꾼다.
 *
 * 응시 환경이 바뀌는 일이라 까닭을 받는다. 「왜 이 회차만 워터마크가 켜져 있었나」에
 * 답하지 못하면, 그 회차 자료를 나중에 읽는 사람이 조건 차이를 설명할 수 없다.
 */
export function patchSecurity(patch: Partial<SecuritySettings>, by: string, what: string, reason: string) {
  const next: SecuritySettings = {
    ...read(),
    ...patch,
    guards: { ...read().guards, ...patch.guards },
    updatedAt: now(),
    updatedBy: by,
  };
  window.localStorage.setItem(KEY, JSON.stringify(next));

  const entry: SecurityLogEntry = {
    id: `SC-${Date.now().toString(36).toUpperCase()}`,
    at: now(),
    by,
    text: what,
    reason,
  };
  window.localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...readLog()].slice(0, 100)));
  window.dispatchEvent(new Event(EVENT));
  return entry;
}
