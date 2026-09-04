"use client";

import { useSyncExternalStore } from "react";
import { approvals, type Approval } from "./admin";
import { recordAction } from "./adminStore";

/**
 * 가입 신청의 처리 결과 (ADM-02-2).
 *
 * 신청서 자체는 씨앗(lib/admin.ts approvals)이고 여기 담기는 것은 **사람이 내린 결론**
 * 뿐이다 — 승인인가 반려인가, 무슨 까닭으로, 언제, 누가. 회원·학생·기관의 고친 값을
 * 담는 방식(lib/directoryStore.ts)과 같은 꼴이다.
 *
 * ⚠ 결론을 내려도 줄을 목록에서 지우지 않는다. 상태만 바꾸고 그대로 세워 둔다 —
 *   사라지면 방금 무엇을 했는지 확인할 자리가 없어지고, 「어제 반려한 그 건」을 다시
 *   찾을 수도 없다. 대신 기본 탭을 「대기」로 두어 오늘 할 일만 먼저 보이게 한다.
 *
 * ⚠ 되돌리기는 두지 않는다. 승인은 계정을 열어 주는 일이고 반려는 신청자에게 통지가
 *   나가는 일이라, 화면에서 조용히 물릴 수 있는 동작이 아니다. 잘못 눌렀으면 회원
 *   상세에서 계정을 정지하거나 신청자에게 다시 신청을 받는다.
 */

export type Verdict = "approved" | "rejected";

export type Decision = {
  verdict: Verdict;
  reason: string;
  at: string;
  by: string;
};

export type Decisions = Record<string, Decision>;

/** 씨앗 신청서 + 이 브라우저가 내린 결론 */
export type ApprovalRow = Approval & {
  state: "pending" | Verdict;
  decision?: Decision;
};

export const verdictLabel: Record<ApprovalRow["state"], string> = {
  pending: "대기",
  approved: "승인됨",
  rejected: "반려됨",
};

/** 흔한 까닭을 미리 골라 둔다. 강제하지 않는 것은 계정 조치(lib/admin.ts userActions)와 같다 */
export const decisionReasons: Record<Verdict, string[]> = {
  approved: [
    "제출 증빙 확인 완료",
    "유선으로 소속 확인 완료",
    "이미 계약된 기관의 추가 담당자",
    "기관 대표가 직접 확인해 줌",
  ],
  rejected: [
    "제출 증빙이 확인되지 않음",
    "증빙과 신청 정보가 일치하지 않음",
    "필수 서류 미제출",
    "기관의 실재가 확인되지 않음",
    "본인 확인 실패",
  ],
};

const KEY = "genixx.approvalDecisions";
const EVENT = "genixx:approval-change";

const EMPTY: Decisions = {};

let cacheRaw: string | null = null;
let cacheValue: Decisions = EMPTY;

function read(): Decisions {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as Decisions) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Decisions) {
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

/* 서버 스냅샷은 매번 같은 참조여야 한다. 새 배열을 돌려주면 React가 무한 루프로 본다 */
const SEED_ROWS: ApprovalRow[] = approvals.map((a) => ({ ...a, state: "pending" as const }));

function rowsOf(d: Decisions): ApprovalRow[] {
  if (d === EMPTY) return SEED_ROWS;
  return approvals.map((a) => {
    const decision = d[a.id];
    return decision ? { ...a, state: decision.verdict, decision } : { ...a, state: "pending" };
  });
}

let rowsRaw: Decisions = EMPTY;
let rowsValue: ApprovalRow[] = SEED_ROWS;

function readRows(): ApprovalRow[] {
  const d = read();
  if (d !== rowsRaw) {
    rowsRaw = d;
    rowsValue = rowsOf(d);
  }
  return rowsValue;
}

export function useApprovals(): ApprovalRow[] {
  return useSyncExternalStore(subscribe, readRows, () => SEED_ROWS);
}

/** 기둥의 배지와 회원 화면 단추가 읽는 수 — 아직 처리하지 않은 것만 센다 */
export function usePendingApprovals(): number {
  return useApprovals().filter((a) => a.state === "pending").length;
}

export function useApproval(id: string): ApprovalRow | null {
  return useApprovals().find((a) => a.id === id) ?? null;
}

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 결론을 내리고 감사 기록에 남긴다.
 *
 * 기록의 대상 이름은 「신청 AP-2608-031 · 김하늘」처럼 번호와 사람 이름을 함께 적는다 —
 * 번호만 남기면 기록을 읽는 사람이 어느 건인지 다시 목록을 열어 봐야 한다.
 */
export function decideApproval(
  row: ApprovalRow,
  verdict: Verdict,
  reason: string,
  by: string,
): Decision {
  const decision: Decision = { verdict, reason, at: stamp(), by };
  write({ ...read(), [row.id]: decision });
  recordAction(
    `신청 ${row.id} · ${row.name}`,
    verdict === "approved" ? "가입 승인" : "가입 반려",
    reason,
    by,
  );
  return decision;
}
