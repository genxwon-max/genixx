"use client";

import { useSyncExternalStore } from "react";
import { staffRoles, type StaffRoleId } from "./admin";

/**
 * 운영자 계정 저장소.
 *
 * 슈퍼 관리자가 아이디를 만들어 역할을 붙이고 임시 비밀번호를 발급한다. 받은 사람은
 * 그 아이디로 콘솔에 들어오고, 원하면 비밀번호를 바꾼다(강제하지 않는다).
 *
 * ⚠ 비밀번호는 여기에 담지 않는다.
 * 이 프로젝트에는 인증 서버가 없어서, 담는 순간 브라우저 저장소에 평문으로 남는다.
 * 대신 「임시 비밀번호를 아직 안 바꿨는가(temp)」 한 가지만 기억한다. 발급된 임시
 * 비밀번호는 발급 직후 화면에 한 번만 보여 주고 흘려보낸다 — 실제 구현에서는 서버가
 * 해시만 저장하고 대조하는 자리다. 로그인도 아이디만 맞추고 비밀번호는 형식만 본다.
 */

export type StaffAccount = {
  /** 사번 */
  id: string;
  loginId: string;
  name: string;
  role: StaffRoleId;
  team: string;
  /** 임시 비밀번호를 아직 바꾸지 않았다 */
  temp: boolean;
  mfa: boolean;
  createdAt: string;
  lastSeen: string | null;
  /** 정지된 계정은 로그인할 수 없다 */
  active: boolean;
};

const SEED: StaffAccount[] = [
  {
    id: "S-001",
    loginId: "admin.park",
    name: "박서준",
    role: "super",
    team: "운영본부",
    temp: false,
    mfa: true,
    createdAt: "2026-01-05",
    lastSeen: "2026-08-11 08:40",
    active: true,
  },
  {
    id: "S-014",
    loginId: "author.kim",
    name: "김출제",
    role: "author",
    team: "문항개발팀",
    temp: false,
    mfa: true,
    createdAt: "2026-02-11",
    lastSeen: "2026-08-11 09:12",
    active: true,
  },
  {
    id: "S-021",
    loginId: "review.lee",
    name: "이검수",
    role: "reviewer",
    team: "문항검수팀",
    temp: false,
    mfa: true,
    createdAt: "2026-02-11",
    lastSeen: "2026-08-10 17:55",
    active: true,
  },
  {
    id: "S-030",
    loginId: "master.jung",
    name: "정마스터",
    role: "master",
    team: "판정협진",
    temp: false,
    mfa: true,
    createdAt: "2026-03-02",
    lastSeen: "2026-08-11 07:20",
    active: true,
  },
  {
    id: "S-041",
    loginId: "author.yoon",
    name: "윤출제",
    role: "author",
    team: "문항개발팀",
    temp: true,
    mfa: false,
    createdAt: "2026-08-09",
    lastSeen: null,
    active: true,
  },
];

const KEY = "genixx.staff";
const EVENT = "genixx:staff-change";

let cacheRaw: string | null = null;
let cacheValue: StaffAccount[] = SEED;

function read(): StaffAccount[] {
  if (typeof window === "undefined") return SEED;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as StaffAccount[]) : SEED;
  } catch {
    cacheValue = SEED;
  }
  return cacheValue;
}

function write(next: StaffAccount[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
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

/** 서버 스냅샷은 매번 같은 참조를 돌려줘야 한다 */
export function useStaffAccounts(): StaffAccount[] {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

export function getStaffAccounts() {
  return read();
}

export function findStaff(loginId: string) {
  return read().find((s) => s.loginId === loginId.trim().toLowerCase()) ?? null;
}

/** 아이디 규칙 — 회원 아이디와 달리 점을 허용한다 (author.kim 처럼 팀을 앞에 둔다) */
export const staffIdRe = /^[a-z][a-z0-9._]{3,23}$/;

/**
 * 임시 비밀번호를 만든다.
 * 혼동하기 쉬운 글자를 빼고, 종류를 섞어 첫 로그인 전까지만 쓰게 한다.
 */
export function makeTempPassword() {
  const alpha = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digit = "23456789";
  const mark = "!@#$%";
  const pool = alpha + upper + digit + mark;
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  const body = Array.from(buf, (n) => pool[n % pool.length]).join("");
  // 종류가 하나라도 빠지지 않게 앞에 심어 둔다
  const seed = new Uint32Array(4);
  crypto.getRandomValues(seed);
  return (
    alpha[seed[0] % alpha.length] +
    upper[seed[1] % upper.length] +
    digit[seed[2] % digit.length] +
    mark[seed[3] % mark.length] +
    body.slice(0, 8)
  );
}

export type NewStaff = {
  loginId: string;
  name: string;
  role: StaffRoleId;
  team: string;
};

export type IssueResult =
  | { ok: false; error: string }
  | { ok: true; account: StaffAccount; tempPassword: string };

/** 계정을 만들고, 화면에 한 번만 보여 줄 임시 비밀번호를 돌려준다 */
export function issueStaff(input: NewStaff): IssueResult {
  const list = read();
  const loginId = input.loginId.trim().toLowerCase();
  if (list.some((s) => s.loginId === loginId))
    return { ok: false, error: "이미 쓰고 있는 아이디입니다." };
  if (!staffIdRe.test(loginId))
    return {
      ok: false,
      error: "아이디는 영문 소문자로 시작하는 4~24자입니다. 점(.)과 밑줄(_)을 쓸 수 있습니다.",
    };
  if (input.name.trim().length < 2) return { ok: false, error: "이름을 입력해 주세요." };

  const nextNo = list.length + 1;
  const account: StaffAccount = {
    id: `S-${String(100 + nextNo).slice(-3)}`,
    loginId,
    name: input.name.trim(),
    role: input.role,
    team: input.team.trim() || roleTeam(input.role),
    temp: true,
    mfa: false,
    createdAt: new Date().toISOString().slice(0, 10),
    lastSeen: null,
    active: true,
  };
  write([...list, account]);
  return { ok: true, account, tempPassword: makeTempPassword() };
}

function roleTeam(role: StaffRoleId) {
  return (
    { super: "운영본부", author: "문항개발팀", reviewer: "문항검수팀", master: "판정협진" }[role] ??
    "운영본부"
  );
}

export function patchStaff(loginId: string, patch: Partial<StaffAccount>) {
  write(read().map((s) => (s.loginId === loginId ? { ...s, ...patch } : s)));
}

/** 비밀번호를 다시 발급한다. 받은 사람은 다시 임시 상태가 된다. */
export function resetStaffPassword(loginId: string) {
  patchStaff(loginId, { temp: true });
  return makeTempPassword();
}

export const roleLabelOf = (id: StaffRoleId) =>
  staffRoles.find((r) => r.id === id)?.label ?? id;
