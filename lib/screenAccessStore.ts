"use client";

import { useSyncExternalStore } from "react";
import { admin2Nav, findAdmin2 } from "./admin2";

/**
 * ADM-03-2 화면 권한 — 운영자가 **콘솔에서 어떤 화면에 들어갈 수 있는가.**
 *
 * 역할·권한(lib/staffPermStore.ts)은 「무엇을 할 수 있나」(문항 쓰기 · 검수 · 감사 로그 열람)를
 * 칸으로 적는다. 그것만으로는 콘솔 기둥에 무엇이 서는지가 정해지지 않았다 — 권한 열여덟 칸을
 * 켜고 끈 뒤에도 기둥에는 화면 스물몇 개가 다 섰다.
 *
 * 여기서는 이름을 붙인 **화면 묶음**을 만든다(「고객지원」 = 회원 · 문의 · FAQ …). 운영자에게
 * 묶음 하나를 주면 그 사람의 기둥에는 고른 화면만 서고, 고르지 않은 화면은 주소를 직접 쳐도
 * 열리지 않는다(components/admin2/Shell.tsx).
 *
 * ── 슈퍼 관리자는 묶음을 받지 않는다 ──
 * 슈퍼 관리자에게 좁은 묶음을 주면 이 화면(화면 권한)에서도 밀려나 아무도 묶음을 되돌릴 수
 * 없게 된다. 슈퍼 관리자는 언제나 전체를 본다. 대신 「이 권한으로 보기」로 묶음을 받은 사람의
 * 콘솔을 그대로 미리 볼 수 있다.
 *
 * ── 누구에게 줬는지는 로그인 아이디로 적는다 ──
 * 콘솔 로그인(lib/staffStore.ts)과 운영자 명부(lib/adminUsers.ts)가 같은 아이디를 쓴다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 화면을 가리는 것은 편의일 뿐이고, 실제로 막는 것은 서버다.
 */

export type ScreenRole = {
  id: string;
  name: string;
  /** 들어갈 수 있는 화면 — admin2Nav 항목의 href */
  screens: string[];
  createdAt: string;
  updatedAt: string;
};

type State = {
  roles: ScreenRole[];
  /** 로그인 아이디 → 묶음 ID */
  assign: Record<string, string>;
  /** 슈퍼 관리자가 미리 보고 있는 묶음 */
  preview: string | null;
};

const EMPTY: State = { roles: [], assign: {}, preview: null };
const KEY = "genixx.screen-access";
const EVENT = "genixx:screen-access-change";

let cacheRaw: string | null = null;
let cacheValue: State = EMPTY;

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: State) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
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

export function useScreenAccess(): State {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function stamp() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 고를 수 있는 화면 전부 — 콘솔 기둥 그대로, 그룹째 */
export const screenGroups = admin2Nav.map((g) => ({
  label: g.label,
  items: g.items.map((it) => ({ href: it.href, label: it.label, code: it.code })),
}));

export const allScreens = screenGroups.flatMap((g) => g.items.map((it) => it.href));

export function saveScreenRole(input: { id?: string; name: string; screens: string[] }): ScreenRole {
  const cur = read();
  /* 차례는 기둥 그대로 — 고른 차례로 쌓으면 두 묶음을 나란히 견줄 수 없다 */
  const screens = allScreens.filter((h) => input.screens.includes(h));
  const at = stamp();
  const old = input.id ? cur.roles.find((r) => r.id === input.id) : undefined;
  const role: ScreenRole = old
    ? { ...old, name: input.name.trim(), screens, updatedAt: at }
    : {
        id: `SR-${Date.now().toString(36).toUpperCase()}`,
        name: input.name.trim(),
        screens,
        createdAt: at,
        updatedAt: at,
      };
  write({
    ...cur,
    roles: old ? cur.roles.map((r) => (r.id === role.id ? role : r)) : [...cur.roles, role],
  });
  return role;
}

/** 묶음을 지우면 그 묶음을 받은 사람은 묶음 없음(콘솔에 못 들어옴)으로 돌아간다 */
export function removeScreenRole(id: string) {
  const cur = read();
  const assign = Object.fromEntries(Object.entries(cur.assign).filter(([, v]) => v !== id));
  write({
    roles: cur.roles.filter((r) => r.id !== id),
    assign,
    preview: cur.preview === id ? null : cur.preview,
  });
}

/** roleId가 null이면 묶음을 거둔다 */
export function assignScreenRole(loginId: string, roleId: string | null) {
  const cur = read();
  const assign = { ...cur.assign };
  if (roleId) assign[loginId] = roleId;
  else delete assign[loginId];
  write({ ...cur, assign });
}

export function setScreenPreview(roleId: string | null) {
  write({ ...read(), preview: roleId });
}

/** 이 아이디가 받은 묶음 — 없으면 null */
export function roleFor(state: State, loginId: string | null | undefined): ScreenRole | null {
  if (!loginId) return null;
  const id = state.assign[loginId];
  return id ? (state.roles.find((r) => r.id === id) ?? null) : null;
}

/**
 * 지금 이 사람에게 보이는 화면 — null이면 제한 없이 전부.
 *
 * 슈퍼 관리자는 미리 보기 중일 때만 좁아진다. 그 밖의 역할은 받은 묶음만큼 보이고,
 * 묶음이 없으면 콘솔에 들어오지 못한다(Shell이 문을 세운다).
 */
export function visibleScreens(
  state: State,
  account: { loginId: string | null; super: boolean },
): string[] | null {
  if (account.super) {
    const p = state.preview ? state.roles.find((r) => r.id === state.preview) : null;
    return p ? p.screens : null;
  }
  return roleFor(state, account.loginId)?.screens ?? [];
}

/** 이 주소가 고른 화면 안인가 — 상세 주소(/admin2/items/IT-…)는 목록 화면을 따른다 */
export function canOpen(screens: string[] | null, pathname: string) {
  if (!screens) return true;
  const hit = findAdmin2(pathname);
  return hit ? screens.includes(hit.item.href) : false;
}
