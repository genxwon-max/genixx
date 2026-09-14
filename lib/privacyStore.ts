"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parents, students, type UserState } from "./adminUsers";

/**
 * 동의와 개인정보 (ADM-10).
 *
 * 아동 데이터를 다루는 서비스라 이 화면이 없으면 안 된다. 정의서가 세 갈래로 잡아 둔
 * 것 중 앞의 둘이 여기다 — **동의 이력 조회**와 **파기 스케줄러**. 나머지 하나(개인정보
 * 접근 감사)는 이미 감사 로그(ADM-11)가 맡고 있다.
 *
 * ── 동의를 넷으로 가른다 ──
 *   개인정보 수집·이용   서비스를 쓰려면 반드시 있어야 한다
 *   법정대리인 동의      **만 14세 미만에만** 필요하다. 없으면 아이 프로필이 안 열린다
 *   민감정보(진단 결과)  검사 결과와 관찰 기록을 만들고 보관하는 데 대한 동의
 *   마케팅 수신          없어도 서비스는 그대로 굴러간다
 *
 * 하나로 뭉쳐 「동의함」으로 두지 않는다. 철회는 갈래마다 따로 들어오고(마케팅만 끊는
 * 사람이 대부분이다), 무엇을 철회했는지에 따라 파기할 것이 달라진다.
 *
 * ── 파기는 두 갈래로 들어온다 ──
 *   보관기간 도래   탈퇴·마지막 접속에서 정한 만료일이 지나면 **자동**으로 큐에 선다
 *   철회 요청       정보주체가 철회하면 **즉시** 큐에 선다. 기다릴 근거가 없다
 *
 * 큐에 서는 것과 지우는 것은 가른다. 지우는 순간 되돌릴 수 없고, 「누가 언제 무엇을
 * 지웠나」가 남아야 처리 결과를 통지할 수 있다. 자동 파기를 켜 두어도 **실행은 사람이**
 * 누른다 — 켜 두는 것은 「도래분을 자동으로 큐에 세운다」까지다.
 *
 * 실행한 파기는 **그 회원의 이력에 한 줄로 선다**(historyOf). 감사 로그에는 「9월 정기
 * 파기 6건」처럼 한 번의 조작이 한 줄로 남으므로, 「이 사람이 언제 왜 지워졌나」를 묻는
 * 자리에서는 그것만으로 답이 안 된다 — 물어 오는 쪽은 늘 사람 하나를 짚어서 묻는다.
 *
 * ⚠ 회원 명부는 씨앗이고(lib/adminUsers.ts) 이 저장소는 그 위에 **우리가 한 일**만 덮는다.
 *   붙일 때는 동의 이력 API로 갈아 끼운다.
 */

/* ───────────────────────── 동의 ───────────────────────── */

export type ConsentKind = "personal" | "guardian" | "sensitive" | "marketing";

export const consentKinds: { id: ConsentKind; label: string; short: string; required: boolean }[] = [
  { id: "personal", label: "개인정보 수집·이용", short: "개인정보", required: true },
  { id: "guardian", label: "법정대리인 동의", short: "법정대리인", required: true },
  { id: "sensitive", label: "민감정보(진단 결과)", short: "민감정보", required: true },
  { id: "marketing", label: "마케팅 수신", short: "마케팅", required: false },
];

export const consentLabel = (id: ConsentKind) =>
  consentKinds.find((k) => k.id === id)?.label ?? id;

export type ConsentState = "granted" | "withdrawn" | "none";

export const consentStateLabel: Record<ConsentState, string> = {
  granted: "동의",
  withdrawn: "철회",
  none: "미동의",
};

/** 동의 한 건이 언제 어떻게 들어왔나 — 증빙으로 그대로 내보내는 값이다 */
export type ConsentLog = {
  kind: ConsentKind;
  state: Exclude<ConsentState, "none">;
  at: string;
  /** 누가 눌렀나 — 본인 또는 법정대리인 이름 */
  by: string;
  /** 어느 화면·경로로 받았나 */
  via: string;
};

/* ───────────────────────── 파기 ───────────────────────── */

export type PurgeReason = "expired" | "withdrawn";

export const purgeReasonLabel: Record<PurgeReason, string> = {
  expired: "보관기간 도래",
  withdrawn: "철회 요청",
};

export type PurgeState = "none" | "queued" | "done";

export const purgeStateLabel: Record<PurgeState, string> = {
  none: "해당 없음",
  queued: "파기 대기",
  done: "파기 완료",
};

/* ───────────────────────── 한 줄 ───────────────────────── */

export type PrivacyRow = {
  id: string;
  name: string;
  kind: "학부모" | "학생";
  state: UserState;
  joinedAt: string;
  /** 만 14세 미만인가 — 법정대리인 동의가 필요한 기준 */
  minor: boolean;
  consents: Record<ConsentKind, ConsentState>;
  log: ConsentLog[];
  /** 보관 만료일 (YYYY-MM-DD) — 이 날이 지나면 자동으로 파기 큐에 선다 */
  keepUntil: string;
  purge: PurgeState;
  purgeReason: PurgeReason | null;
  /** 파기 예정일 — 철회는 요청 그날, 만료는 keepUntil */
  purgeDue: string | null;
  purgedAt: string | null;
  purgedBy: string | null;
  /** 왜 지웠나 — 실행할 때 적은 까닭 그대로 */
  purgedWhy: string | null;
};

/* ───────────────────────── 씨앗 ───────────────────────── */

/** 정한 날에서 며칠 뒤 (YYYY-MM-DD) */
function plus(day: string, days: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** 두 날 사이의 날수 */
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * 씨앗이 아는 「오늘」 — 명부에 적힌 가장 늦은 날.
 *
 * 명부는 시계를 읽지 않고 못 박은 날에서 며칠씩 떨어뜨려 사람을 짓는다(adminUsers.ts).
 * 그 위에 동의·철회를 얹을 때 가입일에서 무작정 며칠을 더하면 **아직 오지 않은 날에
 * 「철회했다」가 적힌다**. 그러면 오늘 실행한 파기가 내년 날짜의 철회 밑으로 깔려,
 * 이력을 한 줄기로 세운 까닭(철회 바로 아래 그 파기)이 그대로 뒤집힌다.
 */
const NOW = (() => {
  let max = "";
  for (const p of parents) {
    if (p.joinedAt > max) max = p.joinedAt;
    if (p.lastSeen > max) max = p.lastSeen;
  }
  for (const s of students) if (s.joinedAt > max) max = s.joinedAt;
  return max;
})();

/**
 * 가입일에서 며칠 뒤 — 다만 씨앗의 오늘을 넘지 않는다.
 *
 * 넘칠 때 그날로 몰아 두면 여러 사람이 같은 날 철회한 꼴이 되므로, 남은 날 안으로
 * 접어 넣어 흩는다. 시계를 읽지 않으므로 씨앗은 늘 같은 꼴로 나온다.
 */
function within(from: string, days: number) {
  const span = daysBetween(from, NOW);
  if (span <= 0) return from;
  return plus(from, days % span);
}

/** 씨앗을 늘 같은 꼴로 짓는 난수 — 화면을 다시 열 때마다 사람이 바뀌면 안 된다 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * 회원 명부에서 동의·보관 줄을 짓는다.
 *
 * 보관기간은 **탈퇴 회원 30일 · 그 밖에는 가입 3년**으로 잡는다. 실제 기준은 개인정보
 * 처리방침이 정하는 값이고, 여기서는 화면이 「도래한 것 / 아직 남은 것」 둘 다 보이도록
 * 눈금만 맞춘다.
 */
function build(): PrivacyRow[] {
  const r = rng(20260907);
  const rows: PrivacyRow[] = [];

  for (const p of parents) {
    const withdrawn = p.state === "withdrawn";
    const roll = r();
    /* 마케팅만 끊은 사람이 가장 많다 — 실제로도 그렇고, 갈래를 나눈 까닭이기도 하다 */
    const marketing: ConsentState = roll > 0.55 ? "granted" : roll > 0.15 ? "withdrawn" : "none";
    /* 탈퇴와 동의 철회는 다른 일이다. 탈퇴는 계정을 닫는 것이고 보관기간이 지나야
       지운다(30일). 철회는 「지금 지워 달라」라 기다릴 근거가 없다 — 둘을 한 값으로
       묶으면 파기 큐에 「보관기간 도래」가 영영 안 선다 */
    const pulled = r() > 0.94;

    const log: ConsentLog[] = [
      { kind: "personal", state: "granted", at: `${p.joinedAt} 09:12`, by: p.name, via: "가입 · 약관 동의" },
      { kind: "sensitive", state: "granted", at: `${p.joinedAt} 09:12`, by: p.name, via: "가입 · 약관 동의" },
    ];
    if (marketing !== "none") {
      log.push({
        kind: "marketing",
        state: "granted",
        at: `${p.joinedAt} 09:12`,
        by: p.name,
        via: "가입 · 선택 동의",
      });
    }
    if (marketing === "withdrawn") {
      log.push({
        kind: "marketing",
        state: "withdrawn",
        at: `${within(p.joinedAt, 40 + Math.floor(r() * 200))} 20:31`,
        by: p.name,
        via: "마이페이지 · 수신 설정",
      });
    }
    if (pulled) {
      const at = `${within(p.joinedAt, 120 + Math.floor(r() * 260))} 14:05`;
      log.push({ kind: "personal", state: "withdrawn", at, by: p.name, via: "1:1 문의 · 파기 요청" });
      log.push({ kind: "sensitive", state: "withdrawn", at, by: p.name, via: "1:1 문의 · 파기 요청" });
    }

    const keepUntil = withdrawn ? plus(p.lastSeen, 30) : plus(p.joinedAt, 1095);
    rows.push({
      id: p.id,
      name: p.name,
      kind: "학부모",
      state: p.state,
      joinedAt: p.joinedAt,
      minor: false,
      consents: {
        personal: pulled ? "withdrawn" : "granted",
        /* 학부모 본인에게는 법정대리인 동의라는 것이 없다 */
        guardian: "none",
        sensitive: pulled ? "withdrawn" : "granted",
        marketing,
      },
      log: log.sort((a, b) => a.at.localeCompare(b.at)),
      keepUntil,
      purge: "none",
      purgeReason: null,
      purgeDue: null,
      purgedAt: null,
      purgedBy: null,
      purgedWhy: null,
    });
  }

  for (const s of students) {
    /* 학년으로 만 14세 미만을 가른다 — 초등은 전부 미만이라 법정대리인 동의가 필수다 */
    const minor = !s.grade.startsWith("중") && !s.grade.startsWith("고");
    const guardianOk = minor ? (r() > 0.06 ? "granted" : "none") : "none";
    const log: ConsentLog[] = [
      {
        kind: "personal",
        state: "granted",
        at: `${s.joinedAt} 10:20`,
        by: minor ? s.guardian : s.name,
        /* 법정대리인 동의를 못 받은 아이는 그 경로를 적을 수 없다 — 적어 두면 위 경고와
           기록이 어긋나고, 어긋난 기록은 증빙 구실을 못 한다 */
        via: !minor ? "가입 · 약관 동의" : guardianOk === "granted" ? "자녀 등록 · 법정대리인 동의" : "자녀 등록",
      },
      { kind: "sensitive", state: "granted", at: `${s.joinedAt} 10:20`, by: minor ? s.guardian : s.name, via: "자녀 등록" },
    ];
    if (guardianOk === "granted") {
      log.push({
        kind: "guardian",
        state: "granted",
        at: `${s.joinedAt} 10:20`,
        by: s.guardian,
        via: "자녀 등록 · 본인확인",
      });
    }

    rows.push({
      id: s.id,
      name: s.name,
      kind: "학생",
      state: "active",
      joinedAt: s.joinedAt,
      minor,
      consents: {
        personal: "granted",
        guardian: guardianOk,
        sensitive: "granted",
        marketing: "none",
      },
      log: log.sort((a, b) => a.at.localeCompare(b.at)),
      keepUntil: plus(s.joinedAt, 1095),
      purge: "none",
      purgeReason: null,
      purgeDue: null,
      purgedAt: null,
      purgedBy: null,
      purgedWhy: null,
    });
  }

  return rows;
}

const SEED = build();

/* ───────────────────────── 저장소 ───────────────────────── */

/** 우리가 한 일 — 파기를 실행했는가, 자동 큐를 켜 두었는가 */
export type PurgeWork = { at: string; by: string; reason: PurgeReason; why: string };
export type Privacy = {
  /** 자동 파기 — 켜 두면 만료일이 지난 줄이 파기 대기로 선다 */
  auto: boolean;
  done: Record<string, PurgeWork>;
};

const KEY = "genixx.privacy";
const EVENT = "genixx:privacy-change";
const EMPTY: Privacy = { auto: true, done: {} };

let cacheRaw: string | null = null;
let cacheValue: Privacy = EMPTY;

function read(): Privacy {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<Privacy>) : null;
    /* 까닭은 뒤늦게 붙인 칸이다 — 그 전에 지운 줄이 그대로 남아 있으므로 갖출 것을 못
       갖춘 줄은 버리고, 까닭만 없는 줄은 빈 까닭으로 읽는다.
       꼴까지 보는 까닭은 이 값이 브라우저 저장소에서 오기 때문이다. 있기만 하고 꼴이
       다른 값(숫자로 든 시각, 모르는 갈래)을 그대로 들이면 그리는 자리에서 터진다 —
       개인정보 화면 둘이 통째로 닫히느니 그 한 줄을 못 본 것으로 둔다 */
    const done: Record<string, PurgeWork> = {};
    for (const [id, v] of Object.entries(
      (saved?.done ?? {}) as Record<string, Partial<PurgeWork> | null>,
    )) {
      if (typeof v?.at !== "string" || !v.at) continue;
      if (typeof v.by !== "string" || !v.by) continue;
      if (v.reason !== "expired" && v.reason !== "withdrawn") continue;
      done[id] = { at: v.at, by: v.by, reason: v.reason, why: typeof v.why === "string" ? v.why : "" };
    }
    cacheValue = saved ? { auto: saved.auto ?? true, done } : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Privacy) {
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

function useWork(): Privacy {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** 오늘 (YYYY-MM-DD) */
export function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 씨앗 위에 파기 실행을 덮고, 큐에 설 것을 셈한다.
 *
 * 큐는 저장하지 않는다 — 「철회했는가」와 「만료일이 지났는가」에서 그때그때 나오는
 * 값이라, 따로 담아 두면 원본이 바뀌었는데 큐만 옛 상태로 남는 날이 온다.
 */
function apply(rows: PrivacyRow[], work: Privacy, now: string): PrivacyRow[] {
  return rows.map((v) => {
    const done = work.done[v.id];
    if (done) {
      return {
        ...v,
        purge: "done" as PurgeState,
        purgeReason: done.reason,
        purgeDue: done.at.slice(0, 10),
        purgedAt: done.at,
        purgedBy: done.by,
        purgedWhy: done.why || null,
      };
    }
    /* 철회가 먼저다 — 철회한 사람을 만료일까지 들고 있을 근거가 없다 */
    const pulled = v.consents.personal === "withdrawn" || v.consents.sensitive === "withdrawn";
    if (pulled) {
      const at = v.log.find((l) => l.state === "withdrawn" && l.kind !== "marketing")?.at ?? now;
      return { ...v, purge: "queued", purgeReason: "withdrawn", purgeDue: at.slice(0, 10) };
    }
    if (work.auto && v.keepUntil <= now) {
      return { ...v, purge: "queued", purgeReason: "expired", purgeDue: v.keepUntil };
    }
    return v;
  });
}

export function usePrivacy(): { rows: PrivacyRow[]; auto: boolean } {
  const work = useWork();
  const now = today();
  const rows = useMemo(() => apply(SEED, work, now), [work, now]);
  return { rows, auto: work.auto };
}

/** 자동 파기를 켜고 끈다 — 켜 두는 것은 「도래분을 큐에 세운다」까지다 */
export function setAutoPurge(on: boolean) {
  write({ ...read(), auto: on });
}

/**
 * 파기를 실행한다 — **되돌릴 수 없다**.
 *
 * 누가 언제 무엇을 왜 지웠는지가 남아야 처리 결과를 통지할 수 있다. 큐에 선 것만 지운다.
 */
export function purge(ids: { id: string; reason: PurgeReason }[], by: string, why: string) {
  if (ids.length === 0) return;
  const cur = read();
  const d = new Date();
  const p2 = (v: number) => String(v).padStart(2, "0");
  const at = `${today()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const done = { ...cur.done };
  for (const v of ids) done[v.id] = { at, by, reason: v.reason, why: why.trim() };
  write({ ...cur, done });
}

/* ───────────────────────── 이력 ───────────────────────── */

export type PrivacyEventState = "granted" | "withdrawn" | "purged";

export const eventStateLabel: Record<PrivacyEventState, string> = {
  granted: "동의",
  withdrawn: "철회",
  purged: "파기",
};

/** 이 회원에게 일어난 일 한 줄 — 동의도 파기도 같은 줄기에 선다 */
export type PrivacyEvent = {
  at: string;
  /** 무엇에 대한 일인가 — 동의 갈래 이름 또는 「개인정보 파기」 */
  what: string;
  state: PrivacyEventState;
  by: string;
  /** 어느 화면으로 받았나 · 왜 지웠나 */
  via: string;
};

/**
 * 동의와 파기를 한 줄기로 펴 최근 것부터 돌려준다.
 *
 * 둘을 따로 두면 「철회했는데 아직 안 지웠나」를 두 표를 번갈아 보며 맞춰야 한다.
 * 한 줄기로 세우면 철회 → 파기가 위아래로 붙어 그 자리에서 읽힌다.
 */
export function historyOf(row: PrivacyRow): PrivacyEvent[] {
  const out: PrivacyEvent[] = row.log.map((l) => ({
    at: l.at,
    what: consentLabel(l.kind),
    state: l.state,
    by: l.by,
    via: l.via,
  }));

  if (row.purge === "done" && row.purgedAt) {
    const why = row.purgedWhy?.trim();
    const reason = row.purgeReason ? purgeReasonLabel[row.purgeReason] : "";
    out.push({
      at: row.purgedAt,
      what: "개인정보 파기",
      state: "purged",
      by: row.purgedBy || "운영자",
      via: [reason, why].filter(Boolean).join(" · "),
    });
  }

  /* 같은 시각이 흔하다(가입할 때 세 갈래를 한 번에 누른다) — 그럴 때는 담긴 차례를
     뒤집어 세운다. 값만으로 정렬하면 다시 그릴 때마다 줄 차례가 흔들려 보인다 */
  return out
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.at.localeCompare(a.e.at) || b.i - a.i)
    .map((v) => v.e);
}

/** 화면 머리에 세우는 수 */
export function countPrivacy(rows: PrivacyRow[]) {
  const queued = rows.filter((v) => v.purge === "queued");
  return {
    total: rows.length,
    /* 필수 동의 셋 중 하나라도 철회했으면 「철회」로 센다 */
    withdrawn: rows.filter((v) =>
      consentKinds.some((k) => k.required && v.consents[k.id] === "withdrawn"),
    ).length,
    /** 만 14세 미만인데 법정대리인 동의가 없는 줄 — 프로필이 안 열려야 하는 아이들 */
    guardianMissing: rows.filter((v) => v.minor && v.consents.guardian !== "granted").length,
    queued: queued.length,
    queuedExpired: queued.filter((v) => v.purgeReason === "expired").length,
    queuedWithdrawn: queued.filter((v) => v.purgeReason === "withdrawn").length,
    done: rows.filter((v) => v.purge === "done").length,
  };
}
