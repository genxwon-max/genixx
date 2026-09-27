"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  counselFee,
  counselors as counselorSeed,
  SPANS,
  type CounselFees,
  type CounselMode,
  type Counselor,
  type CounselTopic,
  type Span,
} from "./counselors";
import { personById, type Person } from "./people";

/**
 * EXP-06-2 상담사 관리 — 면담을 맡는 사람과 그 사람의 근무·값.
 *
 * lib/counselors.ts는 **그 일의 규칙**을 들고 있다(30분 눈금, 60분은 두 칸, 물음 넷).
 * 규칙은 코드에 있어야 하는 것이고 명단은 사람이 고쳐야 하는 것이다 — 상담사 한 사람이
 * 요일을 바꿀 때마다 배포를 해야 하는 화면은 운영에 쓸 수 없다. 그래서 규칙은 저쪽에
 * 두고, 「누가 · 언제 · 얼마에」만 이 저장소로 내린다.
 *
 * ── 사람을 두 벌로 들지 않는다 ──
 * 이름·직함·경력은 참여진(lib/people.ts)이 주인이다. 이 저장소의 프로필 칸은 **비어
 * 있는 것이 정상**이고, 비어 있으면 참여진의 값을 그대로 쓴다. 채우면 그 칸만 덮는다.
 *
 * 참여진에 없는 번호(관리자가 새로 더한 상담사)는 덮을 원본이 없으므로 이름만은 반드시
 * 채워야 목록에 선다 — 이름 없는 줄을 세우면 보호자 화면에 빈 카드가 뜬다.
 *
 * ── 값 ──
 * 기본값은 길이 둘(30분·60분)뿐이고, 사람마다 덮을 수 있다(lib/counselors.ts의 feeFor).
 * 왜 기본이 길이뿐인지는 저쪽 주석에 적어 두었다.
 *
 * ── 지우기와 내리기 ──
 * 지우면 그 사람에게 잡힌 예약(lib/counselStore.ts)이 이름 없는 줄이 된다. 그래서 목록에
 * 안 세우는 길(shown)을 먼저 둔다 — 내려 두면 새 예약은 안 들어오고 지난 예약은 그대로
 * 이름을 찾는다.
 *
 * ⚠ 브라우저 저장소에만 남는다(다른 콘솔 저장소와 같다). 붙일 때는 상담사 API로 갈아
 *   끼우고, 서버 렌더가 첫 화면을 그리도록 옮긴다.
 */

/* ───────────────────────── 한 줄 ───────────────────────── */

/** 참여진에서 가져오지 않고 이 저장소가 직접 드는 프로필 칸 — 비우면 참여진 값을 쓴다 */
export type CounselorProfile = {
  name: string;
  role: string;
  org: string;
  headline: string;
  bio: string;
  tags: string[];
  career: string[];
  duty: string[];
};

export type CounselorRow = CounselorProfile & {
  /** 참여진의 id를 그대로 쓴다(kim-jiwon). 새로 더한 사람은 CSL-0001 */
  id: string;
  focus: string;
  topics: CounselTopic[];
  spans: Span[];
  /** 길이별로 따로 매긴 값. 비우면 기본값을 그대로 받는다 */
  fees: Partial<Record<Span, number>>;
  modes: CounselMode[];
  /** 면담을 받는 요일. 0=일 … 6=토 */
  days: number[];
  from: string;
  to: string;
  off: [string, string];
  /** 보호자·학생 화면의 목록에 세우는가 */
  shown: boolean;
};

export type CounselorState = {
  /** 길이별 기본 값 */
  fees: CounselFees;
  rows: CounselorRow[];
};

const blankProfile = (): CounselorProfile => ({
  name: "",
  role: "",
  org: "",
  headline: "",
  bio: "",
  tags: [],
  career: [],
  duty: [],
});

/**
 * 씨앗 한 줄 — 프로필 칸은 **비워 둔다.**
 *
 * 저 일곱은 참여진에 있는 사람이라 이름·경력을 여기 베껴 두면 두 벌이 된다. 확정 명단이
 * 들어와 참여진이 갈릴 때, 베껴 둔 쪽만 옛 이름으로 남는 일이 실제로 이런 자리에서 난다.
 */
const seedRow = (c: Counselor): CounselorRow => ({
  ...blankProfile(),
  id: c.id,
  focus: c.focus,
  topics: [...c.topics],
  spans: [...c.spans],
  fees: {},
  modes: [...c.modes],
  days: [...c.days],
  from: c.from,
  to: c.to,
  off: [c.off[0], c.off[1]],
  shown: true,
});

const SEED: CounselorState = {
  fees: counselFee,
  rows: counselorSeed.map(seedRow),
};

/* ───────────────────────── 줄을 사람으로 ───────────────────────── */

/**
 * 저장된 줄 하나를 화면이 쓰는 상담사로 편다.
 *
 * 이름이 없으면 null이다 — 참여진에도 없고 여기에도 안 적힌 사람은 카드에 그릴 것이
 * 없다. 조용히 빼는 쪽이 「이름 없는 전문가」를 세우는 것보다 낫다(씨앗의 같은 규칙).
 */
export function resolveCounselor(row: CounselorRow): Counselor | null {
  const p = personById(row.id);
  const name = row.name.trim() || p?.name || "";
  if (!name) return null;

  const pick = (mine: string, theirs: string | undefined) => mine.trim() || theirs || "";
  const pickList = (mine: string[], theirs: string[] | undefined) =>
    mine.length > 0 ? mine : (theirs ?? []);

  const person: Person = {
    id: row.id,
    name,
    role: pick(row.role, p?.role),
    /* 참여진에 없는 사람은 평가·채점 갈래로 둔다 — 면담을 맡는 일이 그 갈래다 */
    group: p?.group ?? "assess",
    org: pick(row.org, p?.org),
    headline: pick(row.headline, p?.headline),
    tags: pickList(row.tags, p?.tags),
    bio: pick(row.bio, p?.bio),
    career: pickList(row.career, p?.career),
    /* 연구 실적은 이 화면에서 받지 않는다 — 면담을 고르는 데 쓰이지 않는 칸이다 */
    works: p?.works ?? [],
    duty: pickList(row.duty, p?.duty),
  };

  return {
    id: row.id,
    person,
    focus: row.focus,
    topics: row.topics,
    spans: row.spans,
    fees: row.fees,
    modes: row.modes,
    days: row.days,
    from: row.from,
    to: row.to,
    off: row.off,
  };
}

/** 목록에 세울 수 있는 줄만 편다. 차례는 저장된 차례 그대로 */
const resolveAll = (rows: CounselorRow[]): Counselor[] =>
  rows.flatMap((r) => {
    const one = resolveCounselor(r);
    return one ? [one] : [];
  });

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.counselors";
const EVENT = "genixx:counselors-change";

/**
 * 저장분 한 벌에서 **편 목록까지 함께** 들고 다닌다.
 *
 * 훅이 편 목록을 제 안에서 만들면 그릴 때마다 새 배열이 되어 화면이 끝없이 돌고, 모듈
 * 바깥의 캐시 변수를 읽으면 하이드레이션 때 서버가 그린 씨앗과 브라우저가 읽은 저장분이
 * 갈린다(useSyncExternalStore는 첫 렌더에 서버 스냅숏을 쓴다). 스냅숏 하나에 다 담아
 * 두면 둘 다 풀린다 — 훅은 돌려받은 것에서 꺼내 쓰기만 한다.
 */
type Snapshot = CounselorState & {
  /** 이름을 찾을 수 있는 사람 전부 — 내려 둔 사람까지 */
  list: Counselor[];
  /** 새로 고를 수 있는 사람 — 내려 둔 사람은 빠진다 */
  shown: Counselor[];
};

function snapshotOf(state: CounselorState): Snapshot {
  const list = resolveAll(state.rows);
  const on = new Set(state.rows.filter((r) => r.shown).map((r) => r.id));
  return { ...state, list, shown: list.filter((c) => on.has(c.id)) };
}

/* 서버 스냅숏은 늘 같은 참조여야 한다 — 새 것을 돌려주면 구독이 끝없이 다시 그린다 */
const SEED_SNAP = snapshotOf(SEED);

let cacheRaw: string | null = null;
let cacheValue: Snapshot = SEED_SNAP;

/** 옛 저장분·손으로 고친 저장분을 한 꼴로 맞춘다 */
function normalize(saved: Partial<CounselorState>): CounselorState {
  const rows = (saved.rows ?? SEED.rows).map(
    (r): CounselorRow => ({
      ...blankProfile(),
      ...r,
      topics: r.topics ?? [],
      /* 길이가 하나도 없으면 30분만 받는 것으로 읽는다 — 빈 배열은 「예약할 수 없는
         상담사」라, 목록에 서 있는데 달력이 통째로 잠긴 사람이 된다 */
      spans: r.spans && r.spans.length > 0 ? SPANS.filter((s) => r.spans.includes(s)) : [30],
      fees: r.fees ?? {},
      modes: r.modes && r.modes.length > 0 ? r.modes : ["video"],
      days: r.days ?? [],
      off: r.off ?? ["12:30", "13:30"],
      shown: r.shown ?? true,
    }),
  );
  return { fees: { ...SEED.fees, ...(saved.fees ?? {}) }, rows };
}

function read(): Snapshot {
  if (typeof window === "undefined") return SEED_SNAP;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? snapshotOf(normalize(JSON.parse(raw) as Partial<CounselorState>)) : SEED_SNAP;
  } catch {
    cacheValue = SEED_SNAP;
  }
  return cacheValue;
}

/** 담을 때는 **날것 두 칸만** 담는다 — 편 목록(list·shown)은 읽을 때 다시 만든다 */
function write(next: CounselorState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ fees: next.fees, rows: next.rows }));
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

/** 한 벌을 통째로 — 아래 훅들이 여기서 꺼내 쓴다 */
const useSnapshot = () => useSyncExternalStore(subscribe, read, () => SEED_SNAP);

/** 관리자 목록이 읽는 날것 — 내려 둔 줄과 이름 없는 줄도 그대로 있다 */
export const useCounselorRows = (): CounselorRow[] => useSnapshot().rows;

/** 길이별 기본 값 */
export const useCounselFees = (): CounselFees => useSnapshot().fees;

/**
 * 화면이 쓰는 상담사 전부 — **내려 둔 사람까지.**
 *
 * 지난 예약의 이름을 찾는 자리(내 면담 목록·취소 물음)가 이 목록을 본다. 내려 둔 사람을
 * 빼 버리면 그 사람에게 잡아 두었던 면담이 「담당 전문가」로만 남는다.
 */
export const useAllCounselors = (): Counselor[] => useSnapshot().list;

/** 새로 고를 수 있는 상담사 — 내려 둔 사람은 빠진다 */
export const useCounselors = (): Counselor[] => useSnapshot().shown;

/** 훅 밖에서 읽는다 — 예약을 저장하기 직전에 상담사를 다시 확인하는 자리(counselStore) */
export const getCounselors = (): Counselor[] => read().list;

export function getCounselFees(): CounselFees {
  return read().fees;
}

/* ───────────────────────── 고치기 ───────────────────────── */

/** 다음 번호 — 지운 번호는 다시 쓰지 않는다 */
function nextId(rows: CounselorRow[]) {
  const max = rows.reduce((m, r) => {
    const n = Number(/^CSL-(\d+)$/.exec(r.id)?.[1] ?? 0);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `CSL-${String(max + 1).padStart(4, "0")}`;
}

/**
 * 새 줄 — **내려 둔 채로** 만든다.
 *
 * 만드는 즉시 보호자 목록에 서면, 근무 요일도 값도 정하지 않은 사람이 달력에 뜬다.
 * 채운 뒤에 노출을 켜는 것이 순서다.
 */
export function blankCounselorRow(rows: CounselorRow[]): CounselorRow {
  return {
    ...blankProfile(),
    id: nextId(rows),
    focus: "",
    topics: ["report"],
    spans: [30],
    fees: {},
    modes: ["video"],
    days: [1, 3, 5],
    from: "10:00",
    to: "17:00",
    off: ["12:30", "13:30"],
    shown: false,
  };
}

/** 있으면 갈아 끼우고 없으면 뒤에 붙인다 — 차례가 곧 목록에 서는 차례다 */
export function saveCounselor(next: CounselorRow) {
  const cur = read();
  const one = canonRow(next);
  const has = cur.rows.some((r) => r.id === next.id);
  write({
    ...cur,
    rows: has ? cur.rows.map((r) => (r.id === next.id ? one : r)) : [...cur.rows, one],
  });
}

/**
 * 저장할 꼴로 다듬는다 — **저장한 뒤에 읽어 오는 값과 같아야 한다.**
 *
 * 화면이 든 초안과 저장분을 견주어 「고친 것이 남았는가」를 셈하므로, 저장할 때만 조용히
 * 다듬으면 그 둘이 영영 어긋난다 — 줄 끝 빈 칸 하나로 저장 줄이 계속 켜져 있고, 저장을
 * 눌러도 내려오지 않는다(lib/roundPlanStore.ts의 canonNote와 같은 까닭). 그래서 이
 * 함수를 밖으로 내고, 폼이 저장하기 전에 같은 것을 지나게 한다.
 */
export function canonRow(row: CounselorRow): CounselorRow {
  return {
    ...row,
    name: row.name.trim(),
    role: row.role.trim(),
    org: row.org.trim(),
    headline: row.headline.trim(),
    bio: row.bio.trim(),
    focus: row.focus.trim(),
    tags: row.tags.map((v) => v.trim()).filter(Boolean),
    career: row.career.map((v) => v.trim()).filter(Boolean),
    duty: row.duty.map((v) => v.trim()).filter(Boolean),
    spans: SPANS.filter((s) => row.spans.includes(s)),
    days: [...row.days].sort((a, b) => a - b),
  };
}

/** 노출만 켜고 끈다 — 목록에서 바로 누르는 스위치 */
export function setCounselorShown(id: string, shown: boolean) {
  const cur = read();
  write({ ...cur, rows: cur.rows.map((r) => (r.id === id ? { ...r, shown } : r)) });
}

export function removeCounselor(id: string) {
  const cur = read();
  write({ ...cur, rows: cur.rows.filter((r) => r.id !== id) });
}

export function setCounselFees(fees: CounselFees) {
  const cur = read();
  write({ ...cur, fees });
}

/** 시연용 — 명단을 씨앗으로 되돌린다 */
export function clearCounselors() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

/* ───────────────────────── 읽기 편의 ───────────────────────── */

/** 이 길이를 받는 사람이 몇인가 — 차림표가 「이 길이를 받는 전문가 N명」으로 쓴다 */
export const countBySpan = (list: Counselor[], span: Span) =>
  list.filter((c) => c.spans.includes(span)).length;

/**
 * 이 길이의 값 폭 — 사람마다 값을 덮어 두었을 때 차림표가 「6만원부터」로 적기 위해.
 *
 * 아무도 덮지 않았으면 min과 max가 같다. 그때는 화면이 한 값만 적는다.
 */
export function feeRange(list: Counselor[], span: Span, fees: CounselFees) {
  const vals = list.filter((c) => c.spans.includes(span)).map((c) => c.fees?.[span] ?? fees[span]);
  if (vals.length === 0) return { min: fees[span], max: fees[span] };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

/** 관리자 목록이 한 줄로 적는 이름 — 프로필 칸이 비어 있으면 참여진 값 */
export const nameOf = (row: CounselorRow) => row.name.trim() || personById(row.id)?.name || "";

export const roleOf = (row: CounselorRow) => row.role.trim() || personById(row.id)?.role || "";

/** 이 줄이 참여진에서 값을 받아 오는가 — 관리자 폼이 자리표시 글로 그 값을 보여 준다 */
export const personOf = (id: string) => personById(id) ?? null;

/** 한 사람만 — 관리자 상세가 주소의 번호로 찾는다 */
export function useCounselorRow(id: string): CounselorRow | null {
  const rows = useCounselorRows();
  return useMemo(() => rows.find((r) => r.id === id) ?? null, [rows, id]);
}
