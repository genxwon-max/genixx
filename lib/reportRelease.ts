import { labelCheck } from "./labelCheck";
import type { ReportDoc } from "./reportStore";
import { axes } from "./result";

/**
 * 리포트 발행의 셈 (EXP-08) — 언제 목록에 오르고, 언제 나가는가.
 *
 *   채점 완료   회원 채점에서 답안지 한 장을 끝까지 확인하면 리포트가 만들어져 목록에 오른다
 *   자동 발행   채점이 끝난 날 + 스케줄러의 일수가 되면 정해 둔 시각에 저절로 나간다
 *   지금 발행   그 전에 내보내려면 리포트에 들어가 사람이 누른다
 *
 * 스케줄러가 드는 값은 **일수와 시각**이다(시스템 > 스케줄러에서 정한다). 리포트마다 날짜를
 * 따로 걸지 않는다 — 같은 결정을 스무 번 되풀이하게 되고, 「누구는 왜 빨리 받았나」에 답할 수
 * 없다.
 *
 * 자동 발행에서 빠지는 리포트가 있다. 검토가 필요한 표현(lib/labelCheck.ts의 막는 말)이 남아
 * 있으면 예정일이 지나도 나가지 않고 「확인 필요」에 남는다. 사람이 고쳐야 나간다.
 *
 * ⚠ 예정일은 저장하지 않고 늘 계산한다. 스케줄러를 바꾸면 아직 나가지 않은 리포트의 예정일이
 *   함께 움직여야 하는데, 리포트마다 날짜를 적어 두면 옛 일수로 잡힌 날이 남는다.
 *
 * ⚠ 지시자("use client")를 붙이지 않는다. 실제 화면의 저장소(lib/reportSendStore.ts)와 디자인
 *   보기가 같은 셈을 쓴다.
 */

/* ───────────────────────── 날짜 ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** 지금 — "2026-10-12 14:05". 부르는 쪽은 하이드레이션 뒤에만 쓴다 */
export function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 날짜 산술은 UTC로만 — new Date("2026-09-11")이 UTC 자정으로 파싱되는 것과 섞지 않는다 */
const dayNum = (s: string) =>
  Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));

export function addDays(s: string, n: number) {
  const d = new Date(dayNum(s) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const diffDays = (a: string, b: string) => Math.round((dayNum(b) - dayNum(a)) / 86_400_000);

/* ───────────────────────── 스케줄러 ───────────────────────── */

/** 자동 발행이 나가는 시각의 기본값 — 오전 9시. 밤사이에 알림이 가지 않게 아침으로 잡는다 */
export const RELEASE_HOUR = 9;

/** 자동으로 발행한 리포트에 「누가」로 적히는 이름 */
export const AUTO_BY = "리포트 스케줄러";

export type SendPolicy = {
  /** 채점이 끝나고 며칠 뒤에 발행하는가 */
  days: number;
  /** 그날 몇 시에 발행하는가(0~23). 없으면 오전 9시다 */
  hour?: number;
  /** 언제 누가 정했나 */
  at?: string;
  by?: string;
};

export const defaultPolicy: SendPolicy = { days: 7, hour: RELEASE_HOUR };

/** 고를 수 있는 일수 — 0은 채점이 끝나는 대로 바로 나간다 */
export const MAX_DAYS = 30;
export const dayChoices = Array.from({ length: MAX_DAYS + 1 }, (_, i) => i);

/** 고를 수 있는 시각 — 오전 7시부터 오후 9시까지. 한밤에 결과 알림이 가지 않게 한다 */
export const hourChoices = Array.from({ length: 15 }, (_, i) => i + 7);

export const validDays = (v: number) => Number.isInteger(v) && v >= 0 && v <= 90;
export const validHour = (v: number) => Number.isInteger(v) && v >= 0 && v <= 23;

/** 이 스케줄러의 발행 시각 */
export const hourOf = (policy: SendPolicy) =>
  policy.hour !== undefined && validHour(policy.hour) ? policy.hour : RELEASE_HOUR;

/** 시각을 말로 — 「오전 9시」 · 「낮 12시」 · 「오후 2시」 */
export const hourLabel = (hour: number) =>
  hour === 0
    ? "밤 12시"
    : hour < 12
      ? `오전 ${hour}시`
      : hour === 12
        ? "낮 12시"
        : `오후 ${hour - 12}시`;

/** 「채점 완료 7일 뒤」 — 스케줄러가 정한 일수를 한마디로 */
export const policyText = (days: number) =>
  days === 0 ? "채점이 끝나는 대로" : `채점 완료 ${days}일 뒤`;

/** 「채점 완료 7일 뒤 오전 9시」 — 스케줄러가 정한 것 전부를 한마디로 */
export const policyFullText = (policy: SendPolicy) =>
  policy.days === 0 ? policyText(0) : `${policyText(policy.days)} ${hourLabel(hourOf(policy))}`;

/* ───────────────────────── 목록의 한 줄 ───────────────────────── */

export type SendRow = ReportDoc & {
  /** 채점이 끝난 날 — 시계를 읽기 전의 씨앗이면 null */
  gradedOn: string | null;
  /** 발행 예정일 — 채점 완료일 + 스케줄러의 일수 */
  sendOn: string | null;
  /** 자동 발행이 나가는 시각 — "2026-10-19 09:00" */
  releaseAt: string | null;
  sentAt: string | null;
  sentBy: string | null;
  /** 스케줄러가 발행했는가 — 아니면 사람이 직접 발행한 것이다 */
  auto: boolean;
  send: "waiting" | "sent";
  /** 예정일까지 며칠. 지났으면 음수. 시계를 읽기 전이면 null */
  daysLeft: number | null;
  /** 자동 발행 시각이 지났는데 아직 나가지 않은 것 */
  due: boolean;
  /**
   * 라벨링 점검에 걸린 말의 수.
   *
   * ⚠ 이름을 blocks로 두지 못한다. SendRow는 ReportDoc을 넓힌 꼴이라 저쪽의 blocks
   *   (블록 배열)와 부딪쳐 ReportBlock[] & number라는 아무도 만들 수 없는 타입이 된다.
   */
  banned: number;
  cautions: number;
  /**
   * 자동 발행에서 빠지는 사유 — 없으면 예정일에 저절로 나간다.
   *   banned  검토가 필요한 표현이 남아 있다. 막는 말이 하나라도 있으면 발행 자체가 거부된다
   *   hold    사람이 보류해 두었다
   */
  stop: "banned" | "hold" | null;
};

/**
 * 씨앗의 「며칠 전」을 오늘에서 센 날짜로 바꾼다.
 *
 * 채점이 한창인 회차의 씨앗은 채점 완료일을 날짜가 아니라 「며칠 전」으로 든다(ReportDoc의
 * gradedAgo). 날짜로 박아 두면 한 주만 지나도 전부 예정일을 넘겨, 「발행 예정」이 빈 화면만
 * 남는다. 조립 시각과 기록의 빈 시각도 같은 날로 채운다 — 리포트는 채점이 끝날 때 만들어진다.
 *
 * 발행하는 순간 이 값으로 굳힌다(lib/reportStore.ts의 releaseReports). 나간 리포트의 날짜가
 * 날마다 하루씩 밀리면 안 된다.
 */
export function resolveDoc(doc: ReportDoc, today: string): ReportDoc {
  if (doc.gradedAt || doc.gradedAgo == null || !today) return doc;
  /* 오늘 채점한 것은 이른 아침으로 — 화면을 연 시각보다 뒤의 시각이 적히지 않게 한다 */
  const clock = doc.gradedAgo === 0 ? "08:40" : clockOf(doc.id);
  const at = `${addDays(today, -doc.gradedAgo)} ${clock}`;
  return {
    ...doc,
    gradedAt: at,
    gradedAgo: undefined,
    assembledAt: at,
    /* 씨앗에서 사람이 고쳐 둔 문단의 시각도 비어 있다 — 같은 날로 채운다 */
    blocks: doc.blocks.map((b) => (b.override && !b.overrideAt ? { ...b, overrideAt: at } : b)),
    log: doc.log.map((l) => (l.at ? l : { ...l, at })),
  };
}

/** 리포트 번호에서 지어내는 시각 — 같은 리포트는 언제 열어도 같은 시각이다 */
function clockOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `${pad(10 + (h % 8))}:${pad(h % 60)}`;
}

/**
 * 자동 발행 시각 — 예정일의 정해 둔 시각.
 * 「채점이 끝나는 대로」(0일)이면 시각을 기다리지 않는다. 채점이 끝난 그때가 발행 시각이다.
 */
export function releaseAtOf(gradedAt: string, policy: SendPolicy) {
  if (policy.days === 0) return gradedAt;
  return `${addDays(gradedAt.slice(0, 10), policy.days)} ${pad(hourOf(policy))}:00`;
}

/** 리포트 한 벌에서 라벨링 점검에 걸린 말 */
function findingsOf(doc: ReportDoc) {
  return doc.blocks.flatMap((b) => labelCheck(b.override ?? b.text));
}

/**
 * 리포트 한 건을 목록의 한 줄로.
 *
 * now는 "2026-10-12 14:05" 꼴이다. 시계를 읽기 전(하이드레이션 전)에는 빈 값을 넘긴다 —
 * 그때는 남은 날을 세지 않는다.
 */
export function sendRowOf(raw: ReportDoc, policy: SendPolicy, now: string): SendRow {
  const today = now.slice(0, 10);
  const doc = resolveDoc(raw, today);
  /* 채점 완료 시각이 없는 것은 이 값이 생기기 전에 만든 리포트다 — 만든 때를 채점 완료로 본다 */
  const gradedAt = doc.gradedAt ?? (doc.gradedAgo == null ? doc.assembledAt : null);
  const gradedOn = gradedAt ? gradedAt.slice(0, 10) : null;
  const sendOn = gradedOn ? addDays(gradedOn, policy.days) : null;
  const releaseAt = gradedAt ? releaseAtOf(gradedAt, policy) : null;
  const sent = doc.state === "published";
  const found = findingsOf(doc);
  const banned = found.filter((f) => f.tone === "block").length;

  return {
    ...doc,
    gradedOn,
    sendOn,
    releaseAt,
    sentAt: sent ? (doc.publishedAt ?? null) : null,
    sentBy: sent ? (doc.publishedBy ?? null) : null,
    auto: sent && doc.publishedBy === AUTO_BY,
    send: sent ? "sent" : "waiting",
    daysLeft: today && sendOn ? diffDays(today, sendOn) : null,
    due: !sent && !!now && !!releaseAt && releaseAt <= now,
    banned,
    cautions: found.filter((f) => f.tone === "warn").length,
    stop: sent ? null : banned > 0 ? "banned" : doc.state === "hold" ? "hold" : null,
  };
}

/**
 * 목록의 차례 — 아직 나가지 않은 것이 위(예정일이 가까운 것부터), 나간 것이 아래(최근 것부터).
 * 화면이 「무엇이 곧 나가나」를 대신 정해 준다.
 */
export function sortSendRows(rows: SendRow[]) {
  return rows.slice().sort((a, b) => {
    if (a.send !== b.send) return a.send === "waiting" ? -1 : 1;
    if (a.send === "waiting") {
      return (
        (a.sendOn ?? "").localeCompare(b.sendOn ?? "") || a.student.localeCompare(b.student, "ko-KR")
      );
    }
    return (
      (b.sentAt ?? "").localeCompare(a.sentAt ?? "") || a.student.localeCompare(b.student, "ko-KR")
    );
  });
}

/** 예정일이 오늘에서 얼마나 떨어져 있나 — 「오늘」 · 「3일 뒤」 · 「2일 전」 */
export function dueText(daysLeft: number | null) {
  if (daysLeft == null) return "";
  if (daysLeft < 0) return `${-daysLeft}일 전`;
  return daysLeft === 0 ? "오늘" : `${daysLeft}일 뒤`;
}

/**
 * 스케줄러를 이렇게 바꾸면 무엇이 달라지는가 — 저장하기 전에 적어 보인다.
 *
 *   moved    예정일이 바뀌는 리포트(아직 나가지 않은 것 전부)
 *   release  새 예정 시각이 이미 지나, 저장하는 순간 나가는 리포트
 */
export function policyEffect(rows: SendRow[], policy: SendPolicy, now: string) {
  const waiting = rows.filter((r) => r.send === "waiting");
  const release = waiting.filter((r) => {
    if (r.stop || !now) return false;
    const gradedAt = r.gradedAt ?? r.assembledAt;
    return !!gradedAt && releaseAtOf(gradedAt, policy) <= now;
  });
  return { moved: waiting.length, release: release.length };
}

/** 다음에 저절로 나가는 것 — 가장 가까운 예정 시각과, 그때 나가는 리포트 수 */
export function nextRelease(rows: SendRow[]) {
  const coming = rows
    .filter((r) => r.send === "waiting" && !r.stop && r.releaseAt)
    .map((r) => r.releaseAt!)
    .sort();
  if (coming.length === 0) return null;
  return { at: coming[0], count: coming.filter((v) => v === coming[0]).length };
}

/* ───────────────────────── 진단 정보 ─────────────────────────
   상세 화면이 「이 아이가 무엇을 어떻게 봤나」를 보일 때 쓰는 축 점수.

   조립이 읽은 값(ReportDoc.facts)을 그대로 쓴다. 그 값이 생기기 전에 만든 리포트에는 축 점수가
   따로 없고, 블록의 근거 칸에 「언어 78 · 수리·논리 71」 같은 한 줄로 굳어 있을 뿐이라 그 줄에서
   도로 뽑아낸다.

   ⚠ 점수를 다시 계산하지 않는다. 조립할 때 본 값과 지금 계산한 값이 갈리면 블록의 근거가
     거짓이 된다. **조립이 본 값**을 그대로 보이는 것이 옳다. */

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
 *   「초등 3~4학년」                 마찬가지
 *
 * 토막을 가르는 방식으로는 둘째 줄을 놓치고 넷째·다섯째를 잘못 먹는다. 아는 축 이름 뒤에
 * 붙은 숫자만 보면 다섯 가지가 한 번에 걸러진다.
 */
export function axisScoresOf(doc: ReportDoc): AxisScore[] {
  if (doc.facts) {
    return doc.facts.scores
      .map((s) => ({ label: axes.find((a) => a.id === s.axis)?.label ?? s.axis, score: s.score }))
      .sort((x, y) => y.score - x.score);
  }
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
