"use client";

import { useSyncExternalStore } from "react";
import { cancelBooking, type Booking } from "./counselStore";

/**
 * 상담 관리 (EXP-06-3) — 상담사가 신청 한 건을 받아서 끝낼 때까지의 자리와 상담일지.
 *
 *   신청 → 확정 → 진행중 → 완료          (거절은 신청에서만 갈린다)
 *
 * 예약(lib/counselStore.ts)은 **보호자가 잡은 자리**이고, 여기 담는 것은 **상담사가 그
 * 자리를 어떻게 다뤘는가**다. 둘을 한 줄에 섞지 않는 까닭은 주인이 다르기 때문이다 —
 * 예약은 보호자가 취소하고, 수락·거절·일지는 상담사가 한다.
 *
 * ── 손대지 않은 신청은 줄이 없다 ──
 * 저장하는 것은 상담사가 무엇인가 한 건뿐이다. 줄이 없으면 「신청」이고, 자동 수락을
 * 켜 둔 상담사라면 「확정」으로 읽는다(statusOf). 신청이 들어올 때마다 줄을 만들어 두면
 * 자동 수락을 켜고 끌 때 이미 만든 줄을 다시 고쳐 써야 한다.
 *
 * ── 거절은 자리를 돌려준다 ──
 * 거절하면 예약도 함께 취소로 돌린다(cancelBooking). 그래야 그 시각이 다른 보호자에게
 * 다시 열린다. 보호자 화면에는 「취소됨」이 아니라 「상담사 사정으로 취소」로 적힌다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 상담일지는 아이에 관한 기록이라, 붙일 때는 상담사
 *   본인과 운영 책임자만 읽는 서버 저장소로 옮기고 열람 기록을 남긴다.
 */

export type CaseStatus = "requested" | "confirmed" | "ongoing" | "done" | "declined" | "canceled";

export const caseStatusLabel: Record<CaseStatus, string> = {
  requested: "신청",
  confirmed: "확정",
  ongoing: "진행중",
  done: "완료",
  declined: "거절",
  canceled: "취소됨",
};

export const caseStatusTone: Record<CaseStatus, string> = {
  requested: "text-amber-700",
  confirmed: "text-soft-primary",
  ongoing: "text-emerald-700",
  done: "text-slate-600",
  declined: "text-slate-400",
  canceled: "text-slate-400",
};

/** 화면 위에 눕히는 네 걸음 — 거절·취소는 걸음이 아니라 갈림이다 */
export const caseSteps: CaseStatus[] = ["requested", "confirmed", "ongoing", "done"];

/** 상담일지 — 칸 셋. 「상담 내용」만 있어도 완료할 수 있다 */
export type CounselLog = {
  /** 무슨 이야기를 나눴는가 */
  summary: string;
  /** 가정·학교에 권한 것 */
  advice: string;
  /** 다음에 볼 것 · 후속 조치 */
  followUp: string;
  savedAt: string;
};

export const blankLog = (): CounselLog => ({ summary: "", advice: "", followUp: "", savedAt: "" });

export type CounselCase = {
  status: Exclude<CaseStatus, "requested" | "canceled">;
  declineReason?: string;
  log?: CounselLog;
  /** 언제 무엇을 했는가 — 최근 것이 앞 */
  history: { at: string; text: string }[];
};

type State = {
  cases: Record<string, CounselCase>;
  /** 상담사마다 — 신청을 자동으로 수락하는가 */
  auto: Record<string, boolean>;
};

/* 시연 계정의 예시 신청(lib/expertAccounts.ts의 demoClients)이 네 자리를 고루 보이게 한다 */
const SEED: State = {
  cases: {
    "CS-DEMO-0002": {
      status: "confirmed",
      history: [{ at: "2026-10-06 09:10", text: "신청을 수락했습니다." }],
    },
    "CS-DEMO-0004": {
      status: "done",
      log: {
        summary:
          "지난 분기와 유형이 달라진 이유를 함께 읽었습니다. 과목 점수는 거의 같고, 서술형에서 근거를 적는 방식이 달라져 유형이 옮겨 간 것으로 보입니다.",
        advice: "유형 이름보다 여섯 가지 사고 능력의 변화를 보시도록 안내했습니다. 주 1회 「왜 그렇게 생각했는지」를 말로 풀어 보게 하는 활동을 권했습니다.",
        followUp: "다음 분기 진단 뒤에 서술형 답안만 다시 견주어 보기로 했습니다.",
        savedAt: "2026-10-02 16:20",
      },
      history: [
        { at: "2026-10-02 16:20", text: "상담일지를 저장하고 상담을 완료했습니다." },
        { at: "2026-10-02 15:00", text: "상담을 시작했습니다." },
        { at: "2026-09-27 10:05", text: "신청을 수락했습니다." },
      ],
    },
  },
  auto: {},
};

const KEY = "genixx.counselCases";
const EVENT = "genixx:counsel-case-change";

let cacheRaw: string | null = null;
let cacheValue: State = SEED;

function read(): State {
  if (typeof window === "undefined") return SEED;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheValue;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<State>) : null;
    cacheValue = saved
      ? { cases: { ...SEED.cases, ...(saved.cases ?? {}) }, auto: saved.auto ?? {} }
      : SEED;
  } catch {
    cacheValue = SEED;
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

/* 서버 스냅숏은 씨앗 그대로 — 늘 같은 참조여야 한다 */
export function useCounselCases(): State {
  return useSyncExternalStore(subscribe, read, () => SEED);
}

/**
 * 예약 한 건이 지금 어느 자리인가.
 *
 * 상담사가 거절한 건은 예약도 취소로 돌아가 있으므로 **거절을 먼저 본다** — 보호자가
 * 취소한 것과 상담사가 거절한 것은 다른 일이다.
 */
export function statusOf(b: Pick<Booking, "id" | "state" | "counselorId">, s: State): CaseStatus {
  const c = s.cases[b.id];
  if (c?.status === "declined") return "declined";
  if (b.state === "canceled") return "canceled";
  if (c) return c.status;
  return s.auto[b.counselorId] ? "confirmed" : "requested";
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function put(id: string, next: Omit<CounselCase, "history">, text: string) {
  const cur = read();
  const history = [{ at: stamp(), text }, ...(cur.cases[id]?.history ?? [])];
  write({ ...cur, cases: { ...cur.cases, [id]: { ...cur.cases[id], ...next, history } } });
}

/** 수락 — 신청 → 확정 */
export function acceptCase(id: string) {
  put(id, { status: "confirmed" }, "신청을 수락했습니다.");
}

/** 거절 — 까닭을 적고, 잡혀 있던 자리를 돌려준다 */
export function declineCase(id: string, reason: string) {
  put(id, { status: "declined", declineReason: reason }, `신청을 거절했습니다 — ${reason}`);
  cancelBooking(id);
}

/** 상담 시작 — 확정 → 진행중. 일지를 쓸 수 있게 된다 */
export function startCase(id: string) {
  put(id, { status: "ongoing" }, "상담을 시작했습니다.");
}

/**
 * 상담일지를 저장한다.
 *
 * finish가 참이면 상담을 완료로 넘긴다. 완료한 뒤에 일지를 고쳐 저장해도 완료는 그대로다 —
 * 오탈자를 고쳤다고 끝난 상담이 진행중으로 돌아가면 안 된다.
 */
export function saveCaseLog(id: string, log: Omit<CounselLog, "savedAt">, finish: boolean) {
  const cur = read().cases[id];
  const done = finish || cur?.status === "done";
  put(
    id,
    {
      status: done ? "done" : "ongoing",
      log: {
        summary: log.summary.trim(),
        advice: log.advice.trim(),
        followUp: log.followUp.trim(),
        savedAt: stamp(),
      },
    },
    cur?.status === "done"
      ? "상담일지를 고쳤습니다."
      : finish
        ? "상담일지를 저장하고 상담을 완료했습니다."
        : "상담일지를 임시 저장했습니다.",
  );
}

/** 자동 수락을 켜고 끈다 — 켜면 손대지 않은 신청이 곧바로 확정으로 읽힌다 */
export function setAutoAccept(counselorId: string, on: boolean) {
  const cur = read();
  write({ ...cur, auto: { ...cur.auto, [counselorId]: on } });
}
