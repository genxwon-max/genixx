"use client";

import { useMemo, useSyncExternalStore } from "react";
import { recordAction } from "./adminStore";
import {
  blankCounselorRow,
  getCounselorRows,
  saveCounselor,
  setCounselorShown,
} from "./counselorStore";
import { syncExpertConsole } from "./expertConsole";
import {
  blankExpertProfile,
  DEMO_EXPERT_ID,
  dutyLabel,
  expertSeed,
  sortDuties,
  type ExpertAccount,
  type ExpertDecision,
  type ExpertDuty,
  type ExpertProfile,
} from "./expertAccounts";

/**
 * 전문가 계정 저장소 — 가입 신청, 운영진의 결론과 권한, 본인이 고친 프로필.
 *
 * 씨앗(lib/expertAccounts.ts) 위에 **이 브라우저에서 바뀐 계정만** 얹는다. 새로 가입한
 * 사람과 손댄 씨앗이 같은 꼴로 담기고, 읽을 때 씨앗과 합친다(lib/directoryStore.ts와
 * 같은 방식).
 *
 * ── 승인과 권한을 한 곳에 둔다 ──
 * 교사·기관 신청의 결론은 lib/approvalStore.ts가 들지만, 전문가는 결론에 **권한**이 딸려
 * 오고 승인 뒤에도 그 권한을 고친다. 결론과 권한이 두 저장소에 갈려 있으면 「승인됐는데
 * 권한이 없는 계정」이 생기므로 계정 한 줄에 함께 둔다. 가입 승인 화면은 이 줄을 신청
 * 한 건으로 펴서 읽는다(approvalStore의 useApprovals).
 *
 * ── 상담사 직무는 상담사 명단에 줄을 세운다 ──
 * 보호자가 면담을 신청하는 목록은 lib/counselorStore.ts가 주인이다. 상담사 직무를 받으면
 * 그 명단에 이 사람의 줄을 세우고, 직무를 거두면 지우지 않고 **내린다** — 이미 잡힌
 * 예약이 이름을 잃지 않게. 프로필을 고치면 그 줄의 이름·연혁도 함께 고친다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 비밀번호는 담지 않는다(lib/staffStore.ts와 같은 까닭).
 */

type Saved = Record<string, ExpertAccount>;

const KEY = "genixx.experts";
const EVENT = "genixx:experts-change";

const EMPTY: Saved = {};

let cacheRaw: string | null = null;
let cacheSaved: Saved = EMPTY;
let cacheList: ExpertAccount[] = expertSeed;

/** 새로 가입한 사람이 위로, 그 아래에 씨앗 — 손댄 씨앗은 제자리에서 갈아 끼운다 */
function listOf(saved: Saved): ExpertAccount[] {
  const seedIds = new Set(expertSeed.map((a) => a.id));
  const fresh = Object.values(saved)
    .filter((a) => !seedIds.has(a.id))
    .sort((a, b) => b.id.localeCompare(a.id));
  return [...fresh, ...expertSeed.map((a) => saved[a.id] ?? a)];
}

function read(): ExpertAccount[] {
  if (typeof window === "undefined") return expertSeed;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheList;
  }
  if (raw === cacheRaw) return cacheList;
  cacheRaw = raw;
  try {
    cacheSaved = raw ? (JSON.parse(raw) as Saved) : EMPTY;
  } catch {
    cacheSaved = EMPTY;
  }
  cacheList = cacheSaved === EMPTY ? expertSeed : listOf(cacheSaved);
  return cacheList;
}

function put(account: ExpertAccount) {
  read();
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...cacheSaved, [account.id]: account }));
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

/* 서버 스냅숏은 씨앗 그대로 — 늘 같은 참조여야 한다 */
export function useExpertAccounts(): ExpertAccount[] {
  return useSyncExternalStore(subscribe, read, () => expertSeed);
}

export const getExpertAccounts = () => read();

export function useExpertAccount(id: string | null | undefined): ExpertAccount | null {
  const all = useExpertAccounts();
  return useMemo(() => (id ? (all.find((a) => a.id === id) ?? null) : null), [all, id]);
}

/**
 * 로그인 아이디로 계정을 찾는다.
 *
 * 가입한 아이디가 먼저다. 없으면 expert로 시작하는 아이디를 시연 계정으로 잇는다 —
 * 처음 연 브라우저에서도 승인된 전문가 화면을 바로 볼 수 있어야 한다.
 */
export function findExpertByLogin(loginId: string): ExpertAccount | null {
  const id = loginId.trim().toLowerCase();
  const all = read();
  return (
    all.find((a) => a.loginId && a.loginId === id) ??
    (id.startsWith("expert") ? (all.find((a) => a.id === DEMO_EXPERT_ID) ?? null) : null)
  );
}

/** 이미 전문가가 쓰고 있는 아이디인가 — 가입 화면의 중복 확인이 함께 본다 */
export const expertLoginTaken = (loginId: string) =>
  read().some((a) => a.loginId && a.loginId === loginId.trim().toLowerCase());

const p2 = (n: number) => String(n).padStart(2, "0");

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** 다음 신청 번호 — EX-2610-004. 같은 달 안에서 이어 센다 */
function nextId(all: ExpertAccount[]) {
  const d = new Date();
  const head = `EX-${String(d.getFullYear()).slice(2)}${p2(d.getMonth() + 1)}-`;
  const max = all
    .filter((a) => a.id.startsWith(head))
    .reduce((m, a) => Math.max(m, Number(a.id.slice(head.length)) || 0), 0);
  return `${head}${String(max + 1).padStart(3, "0")}`;
}

/* ───────────────────────── 가입 신청 ───────────────────────── */

export type ExpertApplication = {
  loginId: string;
  provider: string | null;
  email: string;
  phone: string;
  name: string;
};

/**
 * 가입 신청을 접수한다. 계정은 **대기** 상태로 서고, 권한은 비어 있다.
 *
 * 가입에서 받는 것은 이름뿐이라 프로필도 이름만 채운 채로 선다. 소속 · 연혁 · 소개는
 * 본인이 「내 정보」에서 채운다.
 */
export function applyExpert(input: ExpertApplication): ExpertAccount {
  const all = read();
  const d = new Date();
  const account: ExpertAccount = {
    id: nextId(all),
    loginId: input.loginId.trim().toLowerCase(),
    provider: input.provider,
    email: input.email,
    phone: input.phone,
    warning: null,
    appliedAt: `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`,
    profile: { ...blankExpertProfile(), name: input.name.trim() },
    state: "pending",
    duties: [],
  };
  put(account);
  return account;
}

/* ───────────────────────── 상담사 명단과 맞추기 ───────────────────────── */

/**
 * 계정의 상담사 직무를 상담사 명단(lib/counselorStore.ts)에 옮긴다.
 *
 * 돌려주는 값은 그 줄의 번호다(없으면 undefined) — 계정이 이 번호를 들고 있어야 「나에게
 * 들어온 예약」을 찾는다.
 */
function syncCounselor(account: ExpertAccount): string | undefined {
  const rows = getCounselorRows();
  const id = account.counselorId ?? account.id;
  const row = rows.find((r) => r.id === id);
  const on = account.state === "approved" && account.duties.includes("counselor");

  if (!on) {
    if (row?.shown) setCounselorShown(id, false);
    return account.counselorId;
  }

  const p = account.profile;
  saveCounselor({
    /* 근무 요일·시간·값은 관리자가 상담사 관리(EXP-06-2)에서 고친다 — 처음에는 기본 칸 */
    ...(row ?? { ...blankCounselorRow(rows), id, focus: p.headline }),
    name: p.name,
    role: p.role,
    org: p.org,
    headline: p.headline,
    bio: p.bio,
    tags: p.tags,
    career: p.career,
    photo: p.photo,
    shown: true,
  });
  return id;
}

/* ───────────────────────── 결론과 권한 ───────────────────────── */

const dutyText = (list: ExpertDuty[]) => list.map(dutyLabel).join(" · ") || "없음";

/**
 * 승인 또는 반려. 승인이면 권한을 함께 준다.
 *
 * 권한 없는 승인은 받지 않는다(false) — 계정은 열렸는데 할 수 있는 일이 하나도 없는
 * 전문가가 생긴다. 화면에서도 단추를 내려 두지만 저장이 한 번 더 막는다.
 */
export function decideExpert(
  id: string,
  verdict: ExpertDecision["verdict"],
  reason: string,
  by: string,
  duties: ExpertDuty[],
): boolean {
  const cur = read().find((a) => a.id === id);
  if (!cur) return false;
  const given = verdict === "approved" ? sortDuties(duties) : [];
  if (verdict === "approved" && given.length === 0) return false;

  const next: ExpertAccount = {
    ...cur,
    state: verdict,
    decision: { verdict, reason, at: stamp(), by },
    duties: given,
  };
  put({ ...next, counselorId: syncCounselor(next) });
  /* 출제 · 검토 · 채점 권한은 콘솔의 화면 권한으로 옮긴다 */
  syncExpertConsole(next);
  recordAction(
    `신청 ${cur.id} · ${cur.profile.name}`,
    verdict === "approved" ? "가입 승인" : "가입 반려",
    verdict === "approved" ? `${reason} · 권한 ${dutyText(given)}` : reason,
    by,
  );
  return true;
}

/** 승인된 계정의 권한을 고친다. 하나도 남기지 않는 것은 받지 않는다(false) */
export function setExpertDuties(id: string, duties: ExpertDuty[], by: string): boolean {
  const cur = read().find((a) => a.id === id);
  const given = sortDuties(duties);
  if (!cur || cur.state !== "approved" || given.length === 0) return false;

  const next: ExpertAccount = { ...cur, duties: given };
  put({ ...next, counselorId: syncCounselor(next) });
  syncExpertConsole(next);
  recordAction(
    `신청 ${cur.id} · ${cur.profile.name}`,
    "전문가 권한 변경",
    `${dutyText(cur.duties)} → ${dutyText(given)}`,
    by,
  );
  return true;
}

/* ───────────────────────── 프로필 ───────────────────────── */

/** 저장할 꼴로 다듬는다 — 화면의 초안과 저장분을 견줄 때 같은 것을 지나게 한다 */
export function canonProfile(v: ExpertProfile): ExpertProfile {
  return {
    name: v.name.trim(),
    photo: v.photo,
    role: v.role.trim(),
    org: v.org.trim(),
    headline: v.headline.trim(),
    bio: v.bio.trim(),
    career: v.career.map((x) => x.trim()).filter(Boolean),
    tags: v.tags.map((x) => x.trim()).filter(Boolean),
  };
}

/** 본인이 고친 프로필을 저장한다. 상담사면 보호자가 보는 카드도 함께 바뀐다 */
export function saveExpertProfile(id: string, profile: ExpertProfile) {
  const cur = read().find((a) => a.id === id);
  if (!cur) return;
  const next: ExpertAccount = { ...cur, profile: canonProfile(profile) };
  put({ ...next, counselorId: syncCounselor(next) });
}
