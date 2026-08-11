"use client";

import { useSyncExternalStore } from "react";

/**
 * 로그인 주체.
 * 사이트맵 2장 권한 액터 정의 — P 학부모 · S 학생 · T 교사 · I 기관 · E 전문가 · A 운영관리자.
 * (기관 회원은 코드 안에서 오래 "director"로 불려 와서 이름을 그대로 둔다)
 */
export type Role = "director" | "parent" | "student" | "teacher" | "expert" | "admin";

/** 2FA가 필수인 계정 — 사이트맵 12장 보안 정책: "전문가·관리자 2FA 필수" */
export const mfaRequired: Role[] = ["expert", "admin"];

export type Session = {
  role: Role;
  name: string;
  /** 기관·학원명 (학원장) */
  org?: string;
  /** 간편 로그인 제공자. 아이디 로그인이면 null, 학생 접속코드면 "접속코드" */
  provider: string | null;
  email?: string;
  /** 아이디 로그인 계정의 로그인 아이디 */
  loginId?: string;
  /** 학생 세션일 때 명부상의 학생 ID */
  studentId?: string;
  /** 학부모가 학생 화면으로 들어온 경우 true (설문만 수행) */
  asGuardian?: boolean;
  /** 교사·기관 계정의 소속 승인 완료 여부. 승인 전에는 학생 데이터 접근 차단 (ACC-01-4) */
  approved?: boolean;
  /** 2FA를 통과했는지. 전문가·관리자는 통과 전까지 콘솔에 들어갈 수 없다 */
  mfaPassed?: boolean;
};

const KEY = "genixx.session";
const EVENT = "genixx:session-change";

let cacheRaw: string | null = null;
let cacheValue: Session | null = null;

function read(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cacheValue = null;
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

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function getSession() {
  return read();
}

export function signIn(session: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(EVENT));
}

export function patchSession(patch: Partial<Session>) {
  const current = read();
  if (!current) return;
  signIn({ ...current, ...patch });
}

export function signOut() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export const roleLabel: Record<Role, string> = {
  director: "학원장·기관",
  parent: "학부모",
  student: "학생",
  teacher: "교사",
  expert: "전문가",
  admin: "운영관리자",
};

/** 역할별 기본 진입 경로 (사이트맵 12장 URL 규칙) */
export const roleHome: Record<Role, string> = {
  director: "/org",
  parent: "/my",
  student: "/exam",
  // 교사도 기관 대시보드로 보낸다. 관찰 설문은 팝업 전용 화면이라 착지점이 될 수 없다.
  teacher: "/org",
  expert: "/expert",
  admin: "/admin",
};
