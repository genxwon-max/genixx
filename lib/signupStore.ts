"use client";

import { useSyncExternalStore } from "react";
import type { SignupTypeId } from "./account";

/**
 * 가입 진행 상태.
 *
 * 사이트맵이 ACC-01-1(유형) · ACC-01-2(본인확인) · ACC-01-3(약관·동의)를 각각
 * 별도 URL로 정의하고 있어, 한 화면짜리 위저드가 아니라 실제 라우트로 나눈다.
 * 그래서 단계 사이를 넘어다닐 값을 여기에 담아 둔다.
 */

export type SignupDraft = {
  type: SignupTypeId | null;
  /** 간편 로그인 제공자. 이메일 가입이면 null */
  provider: string | null;
  name: string;
  phone: string;
  email: string;
  /** 본인확인(휴대폰·간편인증) 완료 여부 — 법정대리인 신원 확인의 근거 */
  verified: boolean;
  /** 동의한 목적 id 목록 */
  consents: string[];
};

const EMPTY: SignupDraft = {
  type: null,
  provider: null,
  name: "",
  phone: "",
  email: "",
  verified: false,
  consents: [],
};

const KEY = "genixx.signup";
const EVENT = "genixx:signup-change";

let cacheRaw: string | null = null;
let cacheValue: SignupDraft = EMPTY;

function read(): SignupDraft {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<SignupDraft>) } : EMPTY;
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

export function useSignupDraft(): SignupDraft {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function patchSignupDraft(patch: Partial<SignupDraft>) {
  const next = { ...read(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function clearSignupDraft() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** 각 단계에 들어가기 전에 앞 단계가 끝났는지 확인한다 */
export function stepGuard(draft: SignupDraft, step: "verify" | "consent" | "done") {
  if (!draft.type) return { ok: false, back: "/signup/type", why: "회원 유형을 먼저 골라 주세요." };
  if (step === "verify") return { ok: true, back: "", why: "" };
  if (!draft.verified)
    return { ok: false, back: "/signup/verify", why: "본인확인을 먼저 마쳐 주세요." };
  if (step === "consent") return { ok: true, back: "", why: "" };
  return { ok: true, back: "", why: "" };
}
