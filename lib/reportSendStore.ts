"use client";

import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "./examStore";
import { getReports, releaseReports, syncWaitingReports, useReports } from "./reportStore";
import {
  AUTO_BY,
  defaultPolicy,
  hourOf,
  nowStamp,
  policyFullText,
  sendRowOf,
  sortSendRows,
  validDays,
  validHour,
  type SendPolicy,
  type SendRow,
} from "./reportRelease";

/**
 * 리포트 발행 (EXP-08) — 스케줄러의 값을 들고, 예정일이 된 리포트를 내보낸다.
 *
 * 셈(언제 목록에 오르고 언제 나가는가)은 lib/reportRelease.ts에 있다. 여기는 그 셈에 넣을
 * 값(스케줄러의 일수와 시각)을 저장하고, 화면이 부르는 동작을 둔다. 값을 고치는 화면은
 * 시스템 > 스케줄러(ADM-13-2) 하나다 — 리포트 승인은 지금 값을 읽기만 한다.
 *
 * ── 리포트는 저절로 나간다 ──
 * 예전에는 예정일이 된 리포트를 목록 맨 위에 세워 사람이 하나씩 눌러 보냈다. 회차가 끝나면
 * 리포트가 한꺼번에 쏟아지는데, 날짜를 정해 놓고도 그날 다시 스무 번을 눌러야 했다. 이제
 * 스케줄러가 정한 날이 되면 저절로 나간다. 사람은 그 전에 읽고 고치거나, 먼저 내보내고 싶은
 * 리포트에 들어가 「지금 발행」을 누른다.
 *
 * ⚠ 예정일에 실제로 내보내는 일은 **서버가 할 일**이다. 시안에는 서버가 없어, 리포트를
 *   읽는 화면이 열릴 때 예정일이 지난 것을 찾아 발행으로 적는다(아래 releaseDue). 붙일 때는
 *   서버의 예약 작업이 그 일을 하고, 발행과 함께 메일 · 알림도 거기서 부른다.
 *
 * ⚠ 브라우저 저장소에만 남는다.
 */

/* ───────────────────────── 저장소 — 스케줄러의 값 ───────────────────────── */

type Plans = { policy?: SendPolicy };

const EMPTY: Plans = {};

const KEY = "genixx.report-send";
const EVENT = "genixx:report-send-change";

let cacheRaw: string | null = null;
let cacheValue: Plans = EMPTY;

function read(): Plans {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    /* 예전에는 리포트마다 보낸 기록(sent)도 여기 두었다. 이제 발행은 리포트 쪽에만 적는다
       (lib/reportStore.ts) — 남아 있는 옛 값은 읽지 않는다 */
    const policy = raw ? (JSON.parse(raw) as Plans).policy : undefined;
    /* 시각은 뒤늦게 붙은 값이다 — 일수만 저장해 둔 브라우저에서는 기본 시각으로 읽는다 */
    cacheValue =
      policy && validDays(policy.days) ? { policy: { ...policy, hour: hourOf(policy) } } : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: Plans) {
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

function usePlans(): Plans {
  /* ⚠ 서버 스냅숏은 모듈 상수를 돌려준다 — 새 객체를 만들면 렌더마다 참조가 달라진다 */
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/* ───────────────────────── 읽는 길 ───────────────────────── */

/** 지금 걸려 있는 스케줄러 */
export function useSendPolicy(): SendPolicy {
  return usePlans().policy ?? defaultPolicy;
}

/**
 * 리포트 목록 — **채점이 끝난 답안지의 리포트만 선다.**
 *
 * 리포트는 채점이 끝나야 만들어지므로(lib/reportStore.ts) 이 목록에 있다는 것이 곧 「채점을
 * 마쳤다」는 뜻이다. 채점 중인 답안지는 여기 아예 없어서 따로 거를 것이 없다.
 */
export function useSendRows(now: string): SendRow[] {
  const docs = useReports();
  const policy = useSendPolicy();
  return useMemo(
    () => sortSendRows(docs.map((d) => sendRowOf(d, policy, now))),
    [docs, policy, now],
  );
}

export function useSendRow(id: string, now: string): SendRow | null {
  return useSendRows(now).find((r) => r.id === id) ?? null;
}

/* ───────────────────────── 쓰는 길 ───────────────────────── */

/**
 * 예정일이 된 리포트를 발행한다 — 서버의 예약 작업이 할 일을 시안에서 대신한다.
 *
 * 발행한 시각은 **예정된 시각**으로 적는다. 화면을 사흘 뒤에 열었다고 그 리포트가 사흘 늦게
 * 나간 것이 아니다 — 서버가 있었으면 제때 나갔다. 다만 예정된 시각이 지난 뒤에야 나갈 수
 * 있게 된 것(스케줄러를 줄였다 · 막던 표현을 고쳤다)은 지금 시각으로 적는다.
 *
 * 검토가 필요한 표현이 남은 리포트는 내보내지 않는다. 그런 줄은 「확인 필요」에 남는다.
 *
 * 내보내기 전에 발행 전 리포트를 **지금 규칙으로 다시 조립한다**(lib/reportStore.ts의
 * syncWaitingReports). 조립 규칙이나 해석 템플릿을 고친 것이 기다리던 리포트에 걸리는 자리가
 * 여기다 — 고친 사람은 고쳤다고 믿는데 옛 글이 나가는 일이 없게 한다.
 */
export function releaseDue(now: string): number {
  if (!now || typeof window === "undefined") return 0;
  syncWaitingReports(now);
  const policy = read().policy ?? defaultPolicy;
  const due = getReports()
    .map((d) => sendRowOf(d, policy, now))
    .filter((r) => r.due && !r.stop && r.releaseAt);
  if (due.length === 0) return 0;

  const note = `${policyFullText(policy)} 자동 발행`;
  return releaseReports(
    due.map((r) => {
      /* 스케줄러를 고친 때와 이 리포트에 마지막으로 손댄 때 — 둘 다 예정 시각보다 앞이어야 제때다 */
      const last = r.log[r.log.length - 1]?.at ?? "";
      const onTime = r.releaseAt! >= (policy.at ?? "") && r.releaseAt! >= last;
      return { id: r.id, at: onTime ? r.releaseAt! : now, note };
    }),
    AUTO_BY,
    now.slice(0, 10),
  ).length;
}

/**
 * 리포트를 읽는 화면이 열릴 때 발행 전 리포트를 지금 규칙으로 맞추고, 예정일이 된 것을
 * 내보낸다 — 콘솔의 리포트 승인과, 결과를 보는 회원 대시보드가 건다.
 *
 * **열릴 때 한 번만** 한다. 화면을 보는 동안 값이 바뀔 때마다 훑으면, 막던 표현을 고치고
 * 저장한 그 자리에서 리포트가 나가 버린다 — 고친 사람이 다시 읽어 볼 틈이 없다.
 *
 * 화면이 그려지기 전에(layout effect) 한다. 그린 뒤에 하면 예정일이 지난 줄이 「발행 예정」에
 * 한 번 보였다가 「발행 완료」로 옮겨 간다.
 */
export function useAutoRelease() {
  const hydrated = useHydrated();
  useLayoutEffect(() => {
    if (hydrated) releaseDue(nowStamp());
  }, [hydrated]);
}

/**
 * 스케줄러를 정한다 — 채점이 끝나고 며칠 뒤 몇 시에 발행할지.
 *
 * 아직 나가지 않은 **모든** 리포트의 예정일이 함께 움직인다. 이미 발행한 것은 그대로다 —
 * 나간 리포트를 뒤에서 되돌릴 수는 없다. 당겨서 예정 시각이 이미 지나게 된 리포트는 저장하는
 * 순간 나간다(화면이 저장 전에 몇 건인지 적어 보인다).
 */
export function savePolicy(next: { days: number; hour: number }, by: string): boolean {
  if (!validDays(next.days) || !validHour(next.hour)) return false;
  const now = nowStamp();
  write({ ...read(), policy: { days: next.days, hour: next.hour, at: now, by } });
  releaseDue(now);
  return true;
}

/**
 * 지금 발행한다 — 예정일을 기다리지 않고 사람이 내보낸다.
 *
 * 발행하는 순간 보호자 화면이 열린다. 라벨링 점검에 막는 말이 있으면 거부된다(헌장 7조) —
 * 그때는 false를 돌려주고 아무것도 적지 않는다.
 */
export function sendNow(row: SendRow, by: string): boolean {
  if (row.send === "sent") return false;
  const now = nowStamp();
  const note =
    row.sendOn && row.sendOn > now.slice(0, 10)
      ? `예정일(${row.sendOn})보다 먼저 발행`
      : "직접 발행";
  return releaseReports([{ id: row.id, at: now, note }], by, now.slice(0, 10)).length > 0;
}
