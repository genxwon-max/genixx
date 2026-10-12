/**
 * 개인정보 스케줄러의 값 — 언제 파기 대기에 올리는가.
 *
 * 시스템 > 스케줄러(ADM-13-2)가 정하고, 개인정보 관리(ADM-10)와 개인정보 파기(ADM-10-1)가
 * 읽는다. 파기 대기에 오르는 날이 여기서 나온다 — 보관기간을 줄이면 대기에 오르는 줄이 늘고,
 * 늘리면 줄어든다. 지우는 일은 여전히 사람이 한다.
 *
 * ⚠ 실제 기준은 개인정보 처리방침이 정한다. 이 값을 바꾸면 처리방침도 같은 기간이어야 한다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 저장소(lib/privacyStore.ts)와 화면 조각, 디자인
 *   보기가 함께 읽는다.
 */

/** 어느 보관기간이 걸리는가 — 탈퇴한 회원(left)인가 그 밖의 회원(member)인가 */
export type KeepKind = "left" | "member";

export type KeepPolicy = {
  /** 탈퇴한 회원 — 탈퇴하고 며칠 뒤에 파기 대기에 올리는가 */
  leftDays: number;
  /** 그 밖의 회원 — 가입하고 몇 해 뒤에 파기 대기에 올리는가 */
  memberYears: number;
};

/** 스케줄러가 드는 값 전부 — 자동 파기를 켰는가와 보관기간 */
export type PurgePolicy = { auto: boolean } & KeepPolicy;

export const defaultKeep: KeepPolicy = { leftDays: 30, memberYears: 3 };

/** 고를 수 있는 보관기간 */
export const leftDayChoices = [7, 14, 30, 60, 90, 180];
export const memberYearChoices = [1, 2, 3, 5];

export const validKeep = (k: Partial<KeepPolicy> | undefined | null): k is KeepPolicy =>
  !!k &&
  Number.isInteger(k.leftDays) &&
  (k.leftDays as number) > 0 &&
  Number.isInteger(k.memberYears) &&
  (k.memberYears as number) > 0;

/** 「탈퇴 30일 뒤 · 가입 3년 뒤」 — 보관기간을 한마디로 */
export const keepText = (k: KeepPolicy) => `탈퇴 ${k.leftDays}일 뒤 · 가입 ${k.memberYears}년 뒤`;

/* ───────────────────────── 파기 ─────────────────────────
   파기는 두 길로 들어온다.
     보관기간 도래   만료일이 지나면 자동으로 대기에 오른다(자동 파기를 켜 두었을 때)
     철회 요청       정보주체가 철회하면 그날 대기에 오른다. 스케줄러와 상관없다 */

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
