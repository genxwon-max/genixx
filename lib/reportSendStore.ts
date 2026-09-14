"use client";

import { useMemo, useSyncExternalStore } from "react";
import { publishReport, reportCheck, useReports, type ReportDoc } from "./reportStore";
import { axes } from "./result";

/**
 * 리포트 발송 (EXP-08).
 *
 * 리포트가 조립되면 「검토 대기」로 선다. 거기서 보호자 화면으로 나가기까지 사람이 하는
 * 일이 둘이다 — **확인**하고 **보낸다.** 여태 저장소에는 앞엣것만 있었고(publishReport)
 * 보내는 일은 아무 데도 없었다.
 *
 * ── 왜 예약이 필요한가 ──
 * 회차가 끝나면 리포트가 한꺼번에 쏟아진다. 그것을 다 확인하고 한날에 보내면 그날 문의가
 * 몰려 고객지원이 막히고, 하나씩 보내면 「누구까지 보냈더라」를 사람이 외워야 한다.
 * 날짜를 걸어 두면 확인은 오늘 하고 나가는 것은 나눠 나간다.
 *
 * ⚠ 보내는 것과 발행은 **같은 일이다.** 보호자 화면이 열리는 순간이 곧 보낸 순간이라,
 *   여기서 보낼 때 lib/reportStore.ts의 publishReport를 함께 부른다. 둘을 따로 두면
 *   「보냈는데 안 보이는」 또는 「안 보냈는데 보이는」 상태가 생긴다.
 *
 * ⚠ 예약은 이 콘솔이 **지키지 않는다.** 날짜가 되면 저절로 나가는 일은 서버가 할 일이고,
 *   여기는 그 날짜를 적어 두는 자리다. 시안에서는 예약일이 지난 것을 목록이 「보낼 때가
 *   지났습니다」로 세워 사람이 누르게 한다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 발송 API로 갈아 끼운다 — 그때 메일·알림도
 *   이 자리에서 함께 부른다.
 */

/* ── 날짜 ──
   lib/interviewStore.ts에 같은 셈이 있지만 가져다 쓰지 않는다. 리포트가 면담 저장소를
   물면 둘 중 하나를 고칠 때마다 다른 하나를 열어 봐야 한다 — 세 줄짜리 셈이라 여기 둔다. */

const pad = (n: number) => String(n).padStart(2, "0");

/** 오늘 — "2026-09-09". 부르는 쪽은 useHydrated() 뒤에만 쓴다 */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 날짜 산술은 UTC로만 — new Date("2026-09-11")이 UTC 자정으로 파싱되는 것과 섞지 않는다 */
const dayNum = (s: string) =>
  Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));

export function addDays(s: string, n: number) {
  const d = new Date(dayNum(s) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const diffDays = (a: string, b: string) => Math.round((dayNum(b) - dayNum(a)) / 86_400_000);

/* ───────────────────────── 값 ───────────────────────── */

export type SendAction = "send" | "policy";

export const sendActions: Record<SendAction, string> = {
  send: "발송",
  policy: "스케줄러",
};

export type SendLog = { at: string; by: string; action: SendAction; text: string };

/** 리포트 한 건에 덮는 값 — 언제 보냈는가. 예약은 줄마다 걸지 않는다(아래 SendPolicy) */
export type SendPlan = {
  id: string;
  sentAt?: string;
  sentBy?: string;
  log: SendLog[];
};

/**
 * 리포트 스케줄러 — 화면 하나에 걸리는 **정책**.
 *
 * 줄마다 날짜를 거는 것을 걷어 냈다. 실제로 하는 일은 「이 회차 리포트는 조립하고 며칠 뒤에
 * 내보낸다」 한 줄인데, 그것을 스무 줄에 스무 번 거는 것은 같은 결정을 스무 번 되풀이하는
 * 일이다. 게다가 줄마다 다른 날짜가 걸리면 「누구는 왜 빨리 받았나」에 답할 수 없다.
 *
 * 일수로 든다. 「1주일 뒤」·「2주 뒤」는 7과 14를 사람이 부르는 이름일 뿐이라, 3일이 필요한
 * 회차가 오면 그 이름이 막는다.
 */
export type SendPolicy = {
  /** 조립하고 며칠 뒤에 보내는가 */
  days: number;
  /** 언제 누가 정했나 — 화면이 「지금 이렇게 걸려 있다」를 적는 데 쓴다 */
  at?: string;
  by?: string;
};

export const defaultPolicy: SendPolicy = { days: 7 };

/** 스케줄러가 미리 세워 두는 일수 — 그 밖의 값은 칸에 직접 친다 */
export const dayPresets = [3, 7, 14, 21];

export type Plans = {
  sent: Record<string, SendPlan>;
  policy?: SendPolicy;
};

const EMPTY: Plans = { sent: {} };

/** 목록이 보는 한 줄 */
export type SendRow = ReportDoc & {
  /** 스케줄러가 정한 나갈 날 — 조립일 + 정책 일수 */
  sendOn: string;
  sentAt: string | null;
  sentBy: string | null;
  send: "waiting" | "sent";
  /** 나갈 날까지 며칠. 지났으면 음수. 시계를 읽기 전이면 null */
  daysLeft: number | null;
  /** 나갈 날이 되었는데 아직 안 나간 것 */
  due: boolean;
  /**
   * 라벨링 점검에 걸린 말의 수.
   *
   * ⚠ 이름을 blocks로 두지 못한다. SendRow는 ReportDoc을 넓힌 꼴이라 저쪽의 blocks
   *   (블록 배열)와 부딪쳐 ReportBlock[] & number라는 아무도 만들 수 없는 타입이 된다.
   *
   * 막는 말이 하나라도 있으면 발행이 거부되므로(lib/reportStore.ts의 publishReport) 보낼
   * 수도 없다. 목록이 그것을 미리 세워 두지 않으면, 보내기를 눌러 놓고 아무 일도 일어나지
   * 않는 줄을 만나게 된다.
   */
  banned: number;
  cautions: number;
  /**
   * 발송 기록.
   *
   * ⚠ 이름을 log로 두지 못한다. SendRow는 ReportDoc을 넓힌 꼴이라 저쪽의 log
   *   (조립·발행 기록)와 부딪쳐, 둘이 겹친 타입에서 action 칸이 사라진다. 무엇보다
   *   **두 기록은 출처가 다르다** — 저쪽은 조립기와 발행이 적고 이쪽은 사람이 예약하고
   *   보낸 자취다. 섞지 않고 화면에서도 나눠 세운다.
   */
  sendLog: SendLog[];
};

/* ───────────────────────── 저장소 ───────────────────────── */

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
    cacheValue = raw ? { ...EMPTY, ...(JSON.parse(raw) as Plans) } : EMPTY;
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

function stamp() {
  const d = new Date();
  return `${today()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function patch(id: string, change: Partial<SendPlan>, entry: Omit<SendLog, "at">) {
  const cur = read();
  const was = cur.sent[id] ?? { id, log: [] };
  write({
    ...cur,
    sent: {
      ...cur.sent,
      [id]: { ...was, ...change, log: [{ ...entry, at: stamp() }, ...was.log].slice(0, 20) },
    },
  });
}

/* ───────────────────────── 읽는 길 ───────────────────────── */

function rowOf(doc: ReportDoc, plans: Plans, policy: SendPolicy, now: string): SendRow {
  const p = plans.sent[doc.id];
  /* 이미 발행된 리포트는 나간 것으로 본다 — 씨앗에 published가 있을 수 있고,
     저쪽에서 발행한 것이 여기서 「아직 안 보냄」으로 서면 두 화면이 다른 말을 한다 */
  const sent = p?.sentAt ?? (doc.state === "published" ? (doc.publishedAt ?? "") : null);
  /* 나갈 날은 저장하지 않고 늘 계산한다 — 스케줄러를 옮기면 모든 줄이 함께 움직여야 하는데,
     줄마다 날짜를 굳혀 두면 옛 정책으로 잡힌 날이 그대로 남는다 */
  const sendOn = addDays(doc.assembledAt.slice(0, 10), policy.days);
  const daysLeft = now ? diffDays(now, sendOn) : null;
  const found = reportCheck(doc);

  return {
    ...doc,
    sendOn,
    sentAt: sent || null,
    sentBy: p?.sentBy ?? doc.publishedBy ?? null,
    send: sent ? "sent" : "waiting",
    daysLeft,
    due: !sent && daysLeft !== null && daysLeft <= 0,
    banned: found.filter((f) => f.tone === "block").length,
    cautions: found.filter((f) => f.tone === "warn").length,
    sendLog: p?.log ?? [],
  };
}

/**
 * 발송 목록.
 *
 * **평가를 마친 회원만 선다.** 리포트는 응시가 끝나야 조립되므로(lib/reportStore.ts의
 * ensureReport) 이 목록에 있다는 것이 곧 「평가를 마쳤다」는 뜻이다 — 따로 거를 것이 없다.
 * 아직 안 본 아이는 여기 아예 없다.
 */
export function useSendRows(now: string): SendRow[] {
  const docs = useReports();
  const plans = usePlans();
  const policy = plans.policy ?? defaultPolicy;
  return useMemo(() => {
    return docs
      .map((d) => rowOf(d, plans, policy, now))
      .sort((a, b) => {
        /* 나갈 때가 된 것이 맨 위 → 기다리는 것(가까운 날부터) → 이미 나간 것.
           화면이 「오늘 뭘 해야 하나」를 대신 정해 준다 */
        const rank = (r: SendRow) => (r.due ? 0 : r.send === "waiting" ? 1 : 2);
        return (
          rank(a) - rank(b) ||
          a.sendOn.localeCompare(b.sendOn) ||
          a.student.localeCompare(b.student, "ko-KR")
        );
      });
  }, [docs, plans, policy, now]);
}

export function useSendRow(id: string, now: string): SendRow | null {
  return useSendRows(now).find((r) => r.id === id) ?? null;
}

/** 지금 걸려 있는 스케줄러 */
export function useSendPolicy(): SendPolicy {
  return usePlans().policy ?? defaultPolicy;
}

/* ───────────────────────── 쓰는 길 ───────────────────────── */

/**
 * 스케줄러를 정한다 — 조립하고 며칠 뒤에 보낼지.
 *
 * 아직 안 나간 **모든** 리포트의 날짜가 함께 움직인다. 이미 보낸 것은 그대로다 —
 * 나간 리포트를 뒤에서 되돌릴 수는 없다.
 */
export function savePolicy(days: number, by: string): boolean {
  if (!Number.isInteger(days) || days < 0 || days > 90) return false;
  const cur = read();
  write({ ...cur, policy: { days, at: stamp(), by } });
  return true;
}

/**
 * 지금 보낸다.
 *
 * 보내는 순간 보호자 화면이 열린다. 그래서 발행(publishReport)을 **여기서 함께** 부른다 —
 * 화면이 둘을 따로 부르게 두면 언젠가 한쪽만 불러, 보냈다고 적혀 있는데 보호자에게는 안
 * 보이는 리포트가 생긴다.
 *
 * ⚠ 발행이 **먼저**다. publishReport는 라벨링 점검에 막는 말이 있으면 null을 돌려주고
 *   아무것도 하지 않는다(헌장 7조). 「보냄」을 먼저 적어 두면 그 거부를 못 보고, 목록에는
 *   나갔다고 서 있는데 보호자 화면은 닫혀 있는 리포트가 생긴다. 저쪽이 받아 준 뒤에 적는다.
 */
export function sendNow(row: SendRow, by: string): boolean {
  if (row.send === "sent") return false;
  if (publishReport(row.id, by, "리포트 발송") === null) return false;
  patch(
    row.id,
    { sentAt: stamp(), sentBy: by },
    {
      by,
      action: "send",
      text: row.due ? "보낼 때가 되어 보냈습니다" : `예정일(${row.sendOn})보다 먼저 보냈습니다`,
    },
  );
  return true;
}

/* ───────────────────────── 평가 정보 ─────────────────────────
   ReportDoc에는 축 점수가 **없다.** 조립할 때 블록의 evidence 칸에 「언어 78 · 수리·논리 71」
   같은 한 줄로 굳혀 넣었을 뿐이다. 상세 화면이 「이 아이가 무엇을 어떻게 봤나」를 보이려면
   그 줄에서 도로 뽑아내야 한다.

   ⚠ 점수를 다시 계산하지 않는다. lib/result.ts의 scoreAxes는 ExamRecord(응답 원본)를
     받는데 리포트에는 그것이 없고, 있다 해도 조립할 때 본 값과 지금 계산한 값이 갈리면
     블록의 근거가 거짓이 된다. **조립기가 본 값**을 그대로 보이는 것이 옳다. */

export type AxisScore = { label: string; score: number };

/* 긴 이름부터 본다 — 「수리」가 「수리·논리」보다 먼저 걸리면 이름이 반토막 난다 */
const AXIS_LABELS = axes.map((a) => a.label).sort((a, b) => b.length - a.length);

/**
 * 블록의 근거 줄에서 축 점수를 긁어모은다.
 *
 * ⚠ 토막으로 쪼개지 않고 **축 이름을 앵커로 건다.** 근거 줄의 꼴이 한결같지 않기 때문이다 —
 *
 *   「언어 78 · 수리·논리 71」        이름 + 숫자
 *   「자연·탐구 축 74」               이름과 숫자 사이에 「축」이 낀다
 *   「언어 78 · 서술형 3문항 …」      점수가 아닌 토막이 섞인다
 *   「응답 시간 12분(제한 40분)」     숫자만 보면 점수로 먹힌다
 *   「초등 3~4학년군」                 마찬가지
 *
 * 토막을 가르는 방식으로는 둘째 줄을 놓치고 넷째·다섯째를 잘못 먹는다. 아는 축 이름 뒤에
 * 붙은 숫자만 보면 다섯 가지가 한 번에 걸러진다.
 */
export function axisScoresOf(doc: ReportDoc): AxisScore[] {
  const out: AxisScore[] = [];
  for (const b of doc.blocks) {
    for (const label of AXIS_LABELS) {
      if (out.some((x) => x.label === label)) continue;
      const m = new RegExp(`${label}\\s*(?:축\\s*)?(\\d{1,3})(?!\\d)`).exec(b.evidence);
      if (!m) continue;
      const score = Number(m[1]);
      if (score > 100) continue;
      out.push({ label, score });
    }
  }
  /* 큰 것부터 — 화면이 「무엇이 강한가」를 위에서부터 읽게 한다 */
  return out.sort((x, y) => y.score - x.score);
}

/** 2026 파일럿에서 재지 않는 축 — 「미측정」을 저점수로 오독하지 않게 이름으로 세운다 */
export const unmeasuredAxes = axes.filter((a) => !a.subject).map((a) => a.label);
