"use client";

import { useSyncExternalStore } from "react";
import type { SignupTypeId } from "./account";

/**
 * 가입 진행 상태.
 *
 * 화면은 둘뿐이다 — 유형을 고르는 /signup/type과 나머지를 한 장에서 받는
 * /signup/join. 한때는 약관 동의와 본인확인을 각각 별도 주소로 나눈 다단계 흐름이
 * 함께 있었지만, 같은 가입이 두 길로 갈려 있으면 어느 쪽이 정본인지 알 수 없게 되어
 * 한 장짜리로 확정했다. 여기 담기는 값은 그 두 화면 사이를 건너가는 것들이다.
 */

export type SignupDraft = {
  type: SignupTypeId | null;
  /**
   * 학생이 「만 14세 이상」 갈래를 스스로 골랐는가.
   *
   * 유형 선택에서 학생 카드를 누르면 true가 된다. 그 카드에 만 14세 이상이라고 적혀
   * 있으므로, 누르는 행위 자체가 본인의 신고다. 예전에는 생년월일을 손으로 받아
   * 화면에서 만 나이를 계산했는데, 그 값은 언제든 아무렇게나 적을 수 있는 숫자였다.
   *
   * **판정은 이 값이 하지 않는다.** 뒤따르는 휴대폰 본인인증(PASS)이 돌려주는
   * 생년월일이 최종 판정이고, 거기서 만 14세 미만으로 확인되면 가입을 멈추고
   * 법정대리인 동의 경로(/signup/guardian)로 넘긴다. 이 값은 「학생 갈래를 거쳐
   * 들어왔는가」를 확인하는 문턱일 뿐이다.
   */
  selfAgeOk: boolean;
  /** 간편 로그인 제공자. 아이디 가입이면 null */
  provider: string | null;
  name: string;
  phone: string;
  email: string;
  /** 아이디 가입에서 정한 로그인 아이디 */
  loginId: string;
  /**
   * 본인확인으로 확인된 생년월일(YYYYMMDD).
   * 만 14세 이상인지 판정하는 데 쓴다. 주민등록번호는 받지도 저장하지도 않는다.
   */
  birth: string;
  /** 본인확인(휴대폰·간편인증) 완료 여부 — 법정대리인 신원 확인의 근거 */
  verified: boolean;
  /** 동의한 목적 id 목록 */
  consents: string[];
};

const EMPTY: SignupDraft = {
  type: null,
  selfAgeOk: false,
  provider: null,
  name: "",
  phone: "",
  email: "",
  loginId: "",
  birth: "",
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

/**
 * 구독하지 않고 지금 값만 한 번 읽는다 (authStore의 getSession과 같은 자리).
 * 가입 완료 화면처럼 **읽고 나서 지우는** 곳이 쓴다 — 구독하고 있으면 지우는 순간
 * 화면이 같이 비워진다.
 */
export function getSignupDraft(): SignupDraft {
  return read();
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
