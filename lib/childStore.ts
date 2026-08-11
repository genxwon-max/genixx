"use client";

import { useSyncExternalStore } from "react";
import type { ConsentRoute } from "./account";

/**
 * 자녀 등록 진행 상태 (ACC-03-1 → ACC-03-2).
 *
 * 사이트맵 5장: 법정대리인 동의(B00)가 **등록 흐름 최선행**이다.
 * 그런데 어떤 동의를 받아야 하는지는 아이의 생년월일을 알아야 정해지므로,
 * B00 화면이 생년월일만 먼저 받아 만 14세 기준으로 갈래를 정하고
 * 그다음에 맞는 동의문을 보여 준다. 여기 담기는 값이 그 갈래다.
 */

export type ChildDraft = {
  /** YYYYMMDD */
  birth: string;
  /** 만 14세 기준으로 정해진 동의 주체 */
  route: ConsentRoute | null;
  /** 법정대리인 동의 완료 (만 14세 미만) */
  guardianConsented: boolean;
  /** 학생 본인 동의를 응시 로그인 시 받기로 예약 (만 14세 이상) */
  selfConsentQueued: boolean;
  /** 1차 동의에 포함된 단계별 동의 id */
  stages: string[];
};

const EMPTY: ChildDraft = {
  birth: "",
  route: null,
  guardianConsented: false,
  selfConsentQueued: false,
  stages: [],
};

const KEY = "genixx.child.draft";
const EVENT = "genixx:child-draft-change";

let cacheRaw: string | null = null;
let cacheValue: ChildDraft = EMPTY;

function read(): ChildDraft {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ChildDraft>) } : EMPTY;
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

export function useChildDraft(): ChildDraft {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function patchChildDraft(patch: Partial<ChildDraft>) {
  const next = { ...read(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function clearChildDraft() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** 동의를 마치지 않았으면 기본정보 입력으로 넘어갈 수 없다 */
export function consentDone(d: ChildDraft) {
  if (d.route === "guardian") return d.guardianConsented;
  if (d.route === "self") return d.selfConsentQueued;
  return false;
}
