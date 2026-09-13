"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  interviewRequests,
  interviewerByName,
  interviewerOf,
  requestOf,
  type InterviewRequest,
} from "./interviews";
import {
  interviewStateLabel,
  protocol,
  pushInterview,
  scheduleInterview,
  topReason,
  unscheduleInterview,
  useExpert,
  type InterviewCase,
  type InterviewState,
  type PickReason,
} from "./expertStore";

/**
 * 면담 일정을 잡는 자리 (EXP-06).
 *
 * 구식 콘솔(/admin/interview)은 일정을 「2026-08-14 15:00」 같은 한 문자열로 받았다.
 * 사람이 읽기에는 되지만 「그날 세 시에 누가 또 있나」를 물을 수가 없어서, 겹쳐 잡아
 * 놓고 당일에야 알게 된다. 날짜·시각·소요시간·면담원·방식을 각각 제 칸으로 가른다.
 *
 * ── 케이스는 여기로 옮겨 오지 않는다 ──
 * 면담 케이스의 주인은 계속 lib/expertStore.ts다. 여기 담는 것은 **우리가 잡은 일정**과
 * 아직 케이스가 서지 않은 신청의 처리 상태뿐이다. 케이스를 복제해 오면 저쪽에서 코딩을
 * 확정한 건이 여기서는 대기로 남고, 무엇보다 판정 협진의 서명 근거 문자열이 면담 번호를
 * itv=…로 물고 있어(expertStore의 basisOf) 갈라 옮기면 그 고리가 끊긴다.
 *
 * ── 왜 InterviewCase에 칸을 붙이지 않았나 ──
 * expertStore.read()가 { ...SEED, ...JSON.parse(raw) }라 **최상위 키만** 덮는다.
 * interviews 배열은 저장분이 통째로 이기므로, 저기에 minutes·mode를 붙여도 이미
 * genixx.expert를 쓴 브라우저에는 영영 안 나타나고 화면이 undefined를 만난다. 줄 단위로
 * 메우는 장치가 저 파일에는 없다. 그래서 넓히지 않고 **덮는다.**
 *
 * ── 옛 값은 읽을 때 맞춘다 ──
 * scheduledAt을 지우지 않는다. 「YYYY-MM-DD HH:MM」 꼴이면 갈라 읽고, 「일정 조율 중」
 * 같은 말이면 달력에 세우지 않고 원문을 그대로 보인다. 면담원 이름도 명부에서 번호로
 * 되돌린다. 읽을 때 맞추므로 저장소를 옮겨 쓰는 일(migration)이 없다.
 *
 * ── 어디까지 하나 ──
 * 이 콘솔이 맡는 것은 「언제 누구를 누가 만나는가」뿐이다. 프로토콜 일곱 문항을 적고
 * 축을 코딩하는 것은 면담원이 하는 일이고 /admin/interview에 이미 있다 — 같은 값을 두
 * 콘솔이 다른 저장 방식으로 물면 뒤엣것이 이긴다.
 *
 * ⚠ 브라우저 저장소에만 남는다. 붙일 때는 면담 API로 갈아 끼운다 — 그때 일정 안내
 *   (메일·문자)도 setSchedule 자리에서 함께 부른다. 지금은 상세를 보고 사람이 전화를 건다.
 */

/* ───────────────────────── 값의 갈래 ───────────────────────── */

/**
 * 면담 방식 셋.
 *
 * 「대면/비대면」 둘로 접었다가 폈다. 화상과 전화는 준비할 것이 다르다 — 화상은 링크를
 * 미리 보내야 하고 전화는 번호만 있으면 된다. 둘을 한 값으로 묶으면 면담원이 당일에
 * 「이거 화상이었나」를 묻게 된다.
 */
export type InterviewMode = "onsite" | "video" | "phone";

export const interviewModes: Record<InterviewMode, string> = {
  onsite: "대면",
  video: "화상",
  phone: "전화",
};

/**
 * 이 화면이 보는 상태 여섯.
 *
 * expertStore의 InterviewState 넷 앞뒤로 둘을 얹었다 — 앞의 applied는 「신청이 들어왔지만
 * 아직 대상으로 받지 않았다」, 뒤의 declined는 「받지 않기로 했다」다. 저 넷에 이 둘을
 * 섞어 넣지 않은 까닭은 저쪽이 전문가 콘솔과 함께 쓰는 값이어서다 — 거기에 없는 상태를
 * 밀어 넣으면 /admin/interview가 모르는 글자를 그린다.
 *
 * ⚠ 케이스가 선 줄의 상태는 **expertStore가 진다.** 이 저장소가 제 값을 드는 것은 아직
 *   케이스가 없는 신청(applied·declined)뿐이다. 같은 줄의 상태를 두 곳에서 들면 언젠가
 *   둘이 갈린다.
 */
export type DeskState = "applied" | InterviewState | "declined";

/**
 * 상태 이름.
 *
 * 넷은 expertStore의 것을 **그대로 가져다 쓴다.** 여기서 다시 지으면 같은 상태가 두
 * 콘솔에서 다른 이름으로 선다 — queued를 「일정 미정」이라 불러 보았더니 목록의 탭은
 * 「일정 미정」인데 같은 줄의 상태 칸은 「선발됨」이 되었다. 탭 이름도 이 라벨에 맞춘다.
 */
export const deskLabel: Record<DeskState, string> = {
  applied: "신청 접수",
  queued: interviewStateLabel.queued.label,
  scheduled: interviewStateLabel.scheduled.label,
  recorded: interviewStateLabel.recorded.label,
  coded: interviewStateLabel.coded.label,
  declined: "반려",
};

export type InterviewAction = "accept" | "decline" | "schedule" | "move" | "clear";

export const interviewActions: Record<InterviewAction, string> = {
  accept: "대상 확정",
  decline: "반려",
  schedule: "일정 잡음",
  move: "일정 옮김",
  clear: "일정 지움",
};

export type InterviewLog = { at: string; by: string; action: InterviewAction; text: string };

/**
 * 케이스 위에 덮는 값 — 우리가 잡은 일정만.
 *
 * ⚠ 날짜와 시각을 **가른다.** 옛 칸 하나("2026-08-14 15:00" 또는 「일정 조율 중」)로는
 *   달력을 못 그린다. 「그날 세 시에 누가 또 있나」를 물으려면 날짜로 묶고 시각으로
 *   세워야 하고, 「몇 시에 끝나나」를 물으려면 소요시간이 있어야 한다. 회차 편성이
 *   기간을 opensOn·closesOn 두 칸으로 가른 것과 같은 까닭이다.
 *
 * ⚠ 면담원을 **번호로** 든다. 이름 문자열로 들면 동명이인이 서는 날 어느 쪽인지 화면이
 *   고를 수 없다(lib/people.ts에 같은 이름의 자문위원이 있다). 이름은 명부에서 찾아 그린다.
 */
export type InterviewSlot = {
  /** 면담 번호 = InterviewCase.id. 신청도 이 번호를 미리 든다 */
  id: string;
  date?: string;
  start?: string;
  minutes?: number;
  mode?: InterviewMode;
  interviewerId?: string;
  /** 대면이면 방 이름, 화상이면 링크. 전화는 비운다 */
  place?: string;
  /** 면담원에게 넘기는 한 줄 */
  memo?: string;
  /** 아직 케이스가 없는 신청의 처리 상태. 케이스가 서면 이 칸은 더 안 쓴다 */
  reqState?: "applied" | "declined";
  declineWhy?: string;
  log: InterviewLog[];
};

export type Slots = Record<string, InterviewSlot>;

/**
 * 선발 건과 신청 건을 같은 꼴로 편 한 줄 — 화면은 이것만 본다.
 *
 * 두 목록으로 가르지 않는다. 「오늘 잡아야 할 면담」을 두 화면에서 두 번 세게 되고,
 * pickReasons가 자동 선발과 일반 신청(rank 5)을 이미 한 우선순위 표에 세워 두었다.
 */
export type Interview = {
  id: string;
  source: "pick" | "request";
  round: string;
  /**
   * 회차 안 응시번호. **없을 수 있다** — 검사를 치르기 전에 들어온 신청이다.
   *
   * 선발 건에는 늘 있다(응시 자료에서 골라 온 것이므로). 없는 것은 사람이 보내온
   * 신청뿐이고, 그때 사람을 부를 이름은 seatOf가 정한다.
   */
  seat: string | null;
  grade: string;
  state: DeskState;
  /** 선발 사유. 신청 건은 ["request"] 하나 */
  reasons: PickReason[];
  /** 선발만 된 건은 null. 승격된 케이스는 신청 원본을 물고 있다 */
  request: InterviewRequest | null;
  /** 케이스가 이미 서 있는가 — 승격이 필요한지의 기준 */
  hasCase: boolean;
  date: string | null;
  start: string | null;
  /** start + minutes. 저장하지 않고 늘 계산한다 — 둘이 갈리는 날을 만들지 않는다 */
  end: string | null;
  minutes: number;
  mode: InterviewMode | null;
  interviewerId: string | null;
  /** 명부에서 찾은 이름. 명부에 없는 옛 이름이면 그 이름을 그대로 둔다 */
  interviewerName: string | null;
  place: string;
  memo: string;
  /**
   * 옛 scheduledAt이 날짜로 안 읽힌 경우의 원문(「일정 조율 중」).
   * 지우지 않는다 — 원본을 먼저 버리면 무엇이라 적혀 있었는지 댈 자리가 없다.
   */
  rawAt: string | null;
  /** 프로토콜 일곱 가운데 적힌 문항 수. 상세가 읽기로만 그린다 */
  filled: number;
  declineWhy: string;
  log: InterviewLog[];
};

/** 폼이 들고 있는 초안 — useEditDraft가 그대로 이 꼴을 받는다 */
export type SlotDraft = {
  date: string;
  start: string;
  minutes: number;
  mode: InterviewMode;
  interviewerId: string;
  place: string;
  memo: string;
};

/** 저장 전에 짚는 것. blocks면 저장 단추가 잠긴다 */
export type SlotCheck = { tone: "danger" | "warn"; text: string; blocks: boolean };

/* ───────────────────────── 날짜·시각 ─────────────────────────
   ⚠ 이 구역의 어떤 함수도 날짜 문자열을 new Date(s)로 넘기지 않는다.
     new Date("2026-09-11")은 **UTC 자정**으로, new Date("2026-09-11T00:00:00")은
     **로컬 자정**으로 파싱된다. 둘을 섞어 쓰면 UTC+9인 여기서 getDay()가 하루 어긋나
     달력의 요일 머리와 칸이 한 칸씩 밀린다. 날짜 산술은 전부 Date.UTC로만 하고, 시각은
     아예 Date를 만들지 않고 「자정부터의 분」 정수로 다룬다.

     시각을 문자열과 분으로만 다루는 까닭은 회차 편성과 같다 — 브라우저가 어디에 있든
     관리자가 적어 넣은 14:00은 같은 14:00이다. */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-09-11" → UTC 자정 밀리초. 날짜 산술의 유일한 통로다 */
export function dayNum(s: string) {
  return Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
}

/** UTC 자정 밀리초 → "2026-09-11" */
export function fromNum(t: number) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const addDays = (s: string, n: number) => fromNum(dayNum(s) + n * 86_400_000);

/** 0=일 … 6=토 */
export const weekday = (s: string) => new Date(dayNum(s)).getUTCDay();

export const WEEK_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export const weekdayKo = (s: string) => WEEK_KO[weekday(s)];

/** a에서 b까지 며칠. 「신청이 며칠 묵었나」가 쓴다 */
export const diffDays = (a: string, b: string) => Math.round((dayNum(b) - dayNum(a)) / 86_400_000);

/**
 * 오늘 — "2026-09-08".
 *
 * 여기만 시계를 읽는다. 사람이 보는 오늘은 로컬 달력의 오늘이라 getFullYear·getMonth·
 * getDate를 쓴다 — 위의 UTC 산술과 섞이지 않는다. 이 함수는 문자열을 만들어 낼 뿐이고,
 * 그 문자열이 다시 dayNum을 지난다.
 *
 * ⚠ 서버가 그린 값과 첫 클라이언트 렌더가 갈리면 하이드레이션이 어긋난다. 부르는 쪽은
 *   useHydrated() 뒤에만 이 값을 쓰고 그전에는 빈 문자열로 둔다 — 그러면 아무것도
 *   「지남」이 되지 않는다.
 */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── 달 ── */

export const monthOf = (s: string) => s.slice(0, 7);

/** "2026-09" + n달. 12를 넘고 0 밑으로 내려가는 것까지 여기서 한 번만 푼다 */
export function addMonths(ym: string, n: number) {
  const m = Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(5, 7)) - 1) + n;
  return `${Math.floor(m / 12)}-${pad((m % 12) + 1)}`;
}

/** 사람이 읽는 달 — "2026.09" */
export const monthText = (ym: string) => ym.replace("-", ".");

/**
 * 월 격자 42칸. 그 달 1일이 든 주의 일요일부터 여섯 주를 편다.
 *
 * 여섯 주로 못 박는 까닭은 다섯 주와 여섯 주를 오갈 때 판 높이가 한 줄씩 튀기 때문이다 —
 * 달을 넘길 때마다 아래 판이 위아래로 움직이면 훑던 눈이 매번 다시 자리를 잡는다.
 */
export function monthCells(ym: string): string[] {
  const first = `${ym}-01`;
  const start = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** 그 날이 든 주의 일요일. 월 격자가 일요일로 시작하므로 주도 같게 맞춘다 */
export const weekStart = (s: string) => addDays(s, -weekday(s));

export const weekCells = (sunday: string) => Array.from({ length: 7 }, (_, i) => addDays(sunday, i));

/** 사람이 읽는 주 범위 — "2026.09.06 – 09.12" */
export const weekText = (sunday: string) =>
  `${sunday.replace(/-/g, ".")} – ${addDays(sunday, 6).slice(5).replace("-", ".")}`;

/* ── 시각 ── */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "14:00" → 840 */
export const minOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** 840 → "14:00" */
export const timeOf = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** 끝나는 시각. 자정을 넘기는 면담은 없으므로 날짜를 넘기지 않는다 */
export const endOf = (start: string, minutes: number) => timeOf(minOf(start) + minutes);

/** 달력이 그리는 하루의 폭. 상세의 하루 띠와 주 시간표가 같은 값을 쓴다 */
export const DAY_FROM = "09:00";
export const DAY_TO = "20:00";
export const DAY_SPAN = minOf(DAY_TO) - minOf(DAY_FROM);
export const DEFAULT_MINUTES = 40;
export const MINUTE_CHOICES = [30, 40, 50, 60, 90];

/**
 * 옛 scheduledAt을 읽어 준다 — 저장소를 옮겨 쓰는 일(migration)을 만들지 않는다.
 *
 * 씨앗 셋은 "2026-08-14 15:00" 정형이지만 expertStore.scheduleInterview는 아무 문자열이나
 * 받으므로 「일정 조율 중」이 들어 있을 수 있다. 날짜로 안 읽히면 빈 값을 돌려주고, 화면은
 * 원문을 그대로 보인다.
 */
export function splitStamp(v?: string | null): { date?: string; start?: string } {
  if (!v) return {};
  const m = /^(\d{4}-\d{2}-\d{2})[ T](([01]\d|2[0-3]):[0-5]\d)/.exec(v.trim());
  return m ? { date: m[1], start: m[2] } : {};
}

/** 사람이 읽는 일정 한 줄 — 목록의 일정 칸과 상세 판 머리가 같은 글자를 쓴다 */
export function scheduleText(v: Interview): string {
  if (!v.date || !v.start) return "미정";
  return `${v.date.slice(5)}(${weekdayKo(v.date)}) ${v.start} · ${v.minutes}분`;
}

/* ───────────────────────── 씨앗 ─────────────────────────
   ⚠ 시계를 읽지 않는다. 오늘은 2026-09-08(화)이고 2026-3 회차는 응시가 닫혀 채점·면담이
     도는 시점이다. 잡힌 일정은 09-09 ~ 09-16에, 지난 일정 하나는 09-04에 깐다.
     시연 전에 옮길 자리가 여기와 lib/interviews.ts의 appliedAt 둘이다.

   ⚠ 전문가 콘솔 씨앗 세 건(0423 08-14 · 0418 08-16 · 0426 08-19)은 여기 넣지 않는다.
     splitStamp와 interviewerByName이 읽어 오는 것을 실제로 쓰는 자리가 있어야 그 길이
     죽지 않는다 — 그 셋이 8월 격자에 서고 면담원이 이름에서 번호로 되돌려진다.

   ⚠ 같은 면담원이 겹치는 일정을 씨앗에 두지 않는다. 저장이 막는 상태를 씨앗이 들고
     있으면 「이건 되네」로 읽힌다. 겹침은 09-11 정태호 14:20에 하나 더 잡아 보는
     순간 그 자리에서 막힌다. */

const seedLog = (at: string, action: InterviewAction, text: string, by = "정태호"): InterviewLog[] => [
  { at, by, action, text },
];

const SEED_SLOTS: Slots = {
  /* 아직 대상으로 받지 않은 신청 셋 — 기둥 배지의 「3」이 이것이다 */
  "IV-2603-0452": { id: "IV-2603-0452", reqState: "applied", log: [] },
  "IV-2603-0468": { id: "IV-2603-0468", reqState: "applied", log: [] },
  "IV-2603-0475": { id: "IV-2603-0475", reqState: "applied", log: [] },

  /* 앞으로 잡힌 여덟 */
  "IV-2603-0443": {
    id: "IV-2603-0443",
    date: "2026-09-09",
    start: "10:00",
    minutes: 40,
    mode: "video",
    interviewerId: "U-04",
    place: "https://meet.genixx.kr/iv-0443",
    memo: "리포트의 「능력-흥미 불일치」를 어떻게 읽어야 하는지 묻는 신청입니다.",
    log: seedLog("2026-09-01 09:20", "schedule", "2026-09-09 10:00 · 40분 · 정태호 · 화상"),
  },
  "IV-2603-0449": {
    id: "IV-2603-0449",
    date: "2026-09-09",
    start: "14:00",
    minutes: 40,
    mode: "onsite",
    interviewerId: "U-05",
    place: "본원 3층 면담실 A",
    memo: "지문을 못 읽은 것인지 못 푼 것인지 가려야 합니다. 국어 문항을 함께 펴 주세요.",
    log: seedLog("2026-09-01 11:05", "schedule", "2026-09-09 14:00 · 40분 · 이서연 · 대면", "이서연"),
  },
  "IV-2603-0457": {
    id: "IV-2603-0457",
    date: "2026-09-10",
    start: "11:00",
    minutes: 50,
    mode: "onsite",
    interviewerId: "U-05",
    place: "본원 3층 면담실 A",
    memo: "지도교사가 함께 옵니다. 실험 설계 이야기를 먼저 꺼내지 말고 아이 말로 시작해 주세요.",
    log: seedLog("2026-09-02 10:12", "schedule", "2026-09-10 11:00 · 50분 · 이서연 · 대면", "이서연"),
  },
  "IV-2603-0461": {
    id: "IV-2603-0461",
    date: "2026-09-11",
    start: "14:00",
    minutes: 40,
    mode: "onsite",
    interviewerId: "U-04",
    place: "본원 3층 면담실 B",
    memo: "학생-보호자 응답 괴리 건입니다. 어느 항목이 갈렸는지 미리 뽑아 두었습니다.",
    log: seedLog("2026-09-03 09:41", "schedule", "2026-09-11 14:00 · 40분 · 정태호 · 대면"),
  },
  "IV-2603-0464": {
    /* 앞 건에 **잇대어** 잡았다. 붙어 있는 것은 겹침이 아니다 — 연달아 잡는 것은
       실제로 하는 일이라 검사가 이것을 막으면 안 된다 */
    id: "IV-2603-0464",
    date: "2026-09-11",
    start: "15:00",
    minutes: 40,
    mode: "onsite",
    interviewerId: "U-04",
    place: "본원 3층 면담실 B",
    memo: "평일 오후면 언제든 된다고 하셨습니다.",
    log: seedLog("2026-09-03 09:48", "schedule", "2026-09-11 15:00 · 40분 · 정태호 · 대면"),
  },
  "IV-2603-0470": {
    /* 같은 시각대이지만 면담원이 다르다 — 주 시간표에서 좌우로 갈리는 그림 */
    id: "IV-2603-0470",
    date: "2026-09-11",
    start: "14:30",
    minutes: 30,
    mode: "phone",
    interviewerId: "U-42",
    place: "",
    memo: "지방이라 방문이 어렵습니다. 010-8836-2245로 저희가 겁니다.",
    log: seedLog("2026-09-04 13:26", "schedule", "2026-09-11 14:30 · 30분 · 최하윤 · 전화", "최하윤"),
  },
  "IV-2603-0446": {
    id: "IV-2603-0446",
    date: "2026-09-14",
    start: "09:30",
    minutes: 30,
    mode: "phone",
    interviewerId: "U-50",
    place: "",
    memo: "말수가 적은 학생이라 지도교사와 먼저 통화합니다. 학생 면담은 그 뒤에 정합니다.",
    log: seedLog("2026-09-04 16:02", "schedule", "2026-09-14 09:30 · 30분 · 김유진 · 전화", "김유진"),
  },
  "IV-2603-0472": {
    id: "IV-2603-0472",
    date: "2026-09-16",
    start: "16:00",
    minutes: 60,
    mode: "onsite",
    interviewerId: "U-04",
    place: "본원 3층 면담실 A",
    memo: "내년 심화진단까지 함께 묻습니다. 한 시간으로 잡았습니다.",
    log: seedLog("2026-09-05 09:15", "schedule", "2026-09-16 16:00 · 60분 · 정태호 · 대면"),
  },

  /* 날짜가 지났는데 그대로 남은 것 — 목록의 「지난 일정」 탭이 이것을 센다 */
  "IV-2603-0455": {
    id: "IV-2603-0455",
    date: "2026-09-04",
    start: "15:00",
    minutes: 40,
    mode: "onsite",
    interviewerId: "U-42",
    place: "본원 3층 면담실 B",
    memo: "손으로 만드는 것을 재능으로 보는지 묻는 신청입니다. 배제영역 이야기를 준비했습니다.",
    log: seedLog("2026-08-28 14:20", "schedule", "2026-09-04 15:00 · 40분 · 최하윤 · 대면", "최하윤"),
  },

  /* 받지 않기로 한 둘 */
  "IV-2603-0450": {
    id: "IV-2603-0450",
    reqState: "declined",
    declineWhy: "이미 8월에 면담을 마친 아이입니다. 같은 회차에 두 번 잡지 않습니다. 못 여쭌 것은 문의로 받기로 하고 안내했습니다.",
    log: seedLog("2026-08-27 10:08", "decline", "같은 회차에 이미 면담을 마쳤습니다", "이서연"),
  },
  /* 응시번호가 없는 신청(IR-2603-18)의 자리. 열쇠가 응시번호를 물지 않는다 —
     신청 번호를 딴 IV-2603-R18이다(lib/interviews.ts의 caseId 주석) */
  "IV-2603-R18": {
    id: "IV-2603-R18",
    reqState: "declined",
    declineWhy: "응시 기록이 없어 면담 대상이 아닙니다. 다음 회차 접수 안내를 보냈습니다.",
    log: seedLog("2026-08-25 15:44", "decline", "응시 기록이 없습니다", "이서연"),
  },
};

/* ───────────────────────── 저장소 ───────────────────────── */

const KEY = "genixx.interviews";
const EVENT = "genixx:interviews-change";

let cacheRaw: string | null = null;
let cacheValue: Slots = SEED_SLOTS;

function read(): Slots {
  if (typeof window === "undefined") return SEED_SLOTS;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    /* 씨앗 **위에** 덮는다. 열쇠가 면담 번호라 줄 단위로 덮이므로, 뒤에 씨앗 일정이
       늘어나도 이미 저장한 브라우저가 그것을 빠뜨리지 않는다 — expertStore가 배열을
       통째로 덮어 같은 함정에 걸려 있는 것과 반대로 짰다 */
    cacheValue = raw ? { ...SEED_SLOTS, ...(JSON.parse(raw) as Slots) } : SEED_SLOTS;
  } catch {
    cacheValue = SEED_SLOTS;
  }
  return cacheValue;
}

function write(next: Slots) {
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

function useSlots(): Slots {
  /* ⚠ 서버 스냅숏으로 **모듈 상수**를 돌려준다. () => ({})처럼 새 객체를 만들면 렌더마다
     참조가 달라 React가 무한 루프로 본다 */
  return useSyncExternalStore(subscribe, read, () => SEED_SLOTS);
}

function now() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 한 줄을 고친다.
 *
 * ⚠ entry가 **선택**인 까닭 — 메모만 다듬은 저장은 기록하지 않는다. 오탈자를 고칠 때마다
 *   한 줄이 쌓이면 정작 「누가 언제로 옮겼나」가 그 사이에 묻힌다.
 */
function patch(id: string, change: Partial<InterviewSlot>, entry?: Omit<InterviewLog, "at">) {
  const cur = read();
  const was = cur[id] ?? { id, log: [] };
  write({
    ...cur,
    [id]: {
      ...was,
      ...change,
      log: entry ? [{ ...entry, at: now() }, ...was.log].slice(0, 30) : was.log,
    },
  });
}

/* ───────────────────────── 읽는 길 ───────────────────────── */

type Base = {
  id: string;
  source: Interview["source"];
  round: string;
  seat: string | null;
  grade: string;
  reasons: PickReason[];
};

/**
 * 이 줄의 사람을 무엇으로 부르는가.
 *
 * 응시번호가 원칙이다 — 목록은 어깨너머로 가장 잘 보이는 화면이고, 실명 대신 번호로
 * 부르기로 했다(InterviewList 머리 주석). 그런데 검사를 치르기 전에 들어온 신청에는
 * 그 번호가 없다.
 *
 * 없을 때는 **면담 번호**로 부른다. 실명으로 메우지 않는다 — 응시번호를 세우지 않기로
 * 한 까닭이 그대로 남아 있고, 하필 그 줄만 이름이 서면 가려 둔 뜻이 사라진다. 지어낸
 * 번호로 메우지도 않는다 — 없는 응시번호를 화면이 만들어 내면 그 값으로 응시 자료를
 * 찾으러 가는 사람이 생긴다.
 *
 * ⚠ 응시번호 **칸 자체**는 이것을 쓰지 않는다. 그 자리에는 「—」를 세운다 — 면담 번호는
 *   바로 옆 칸(번호)에 이미 서 있어서, 같은 값을 두 칸에 적으면 다른 값처럼 읽힌다.
 *   이것을 쓰는 곳은 이름표·풀이말·달력 조각처럼 부를 것이 하나뿐인 자리다.
 */
export const seatOf = (v: { seat: string | null; id: string }) => v.seat ?? v.id;

/** 케이스 하나(또는 아직 케이스가 없는 신청 하나)를 화면이 보는 꼴로 편다 */
function viewOf(slots: Slots, base: Base, c?: InterviewCase): Interview {
  const s = slots[base.id];
  const old = splitStamp(c?.scheduledAt);

  const date = s?.date ?? old.date ?? null;
  const start = s?.start ?? old.start ?? null;
  const minutes = s?.minutes ?? DEFAULT_MINUTES;

  /* 면담원은 번호가 먼저다. 옛 값은 이름뿐이므로 명부에서 번호로 되돌린다 —
     이 길이 없으면 씨앗 세 건이 겹침 검사와 면담원 거르개에서 통째로 빠진다 */
  const interviewerId = s?.interviewerId ?? interviewerByName(c?.interviewer)?.id ?? null;
  const interviewerName = interviewerOf(interviewerId)?.name ?? c?.interviewer ?? null;

  /*
   * 상태를 읽는 규칙은 이 한 자리에만 둔다.
   *
   *   ① 케이스가 있으면 저쪽이 이긴다. 신청이 승격되면 케이스가 서므로, 전문가 콘솔에서
   *      기록을 마치고 코딩을 확정한 것이 여기서 대기로 남는 일이 없다.
   *   ② 케이스가 없으면 우리 값이다. 다만 **날짜가 잡혀 있으면 그것이 곧 상태다** —
   *      reqState만 보면 씨앗의 잡힌 일정 여덟 건이 「선발됨」으로 서서, 날짜와 면담원이
   *      또렷이 적힌 줄이 「아직 안 잡힌 것」 무리에 섞인다. 목록의 「일정 잡힘」 탭이
   *      0을 말하고 「선발됨」이 14를 말하던 것이 그 탓이었다.
   *   ③ 반려는 날짜보다 앞선다. 반려한 건에 옛 일정이 남아 있어도 되돌아온 것은 아니다.
   */
  const state: DeskState = c
    ? c.state
    : s?.reqState === "declined"
      ? "declined"
      : date && start
        ? "scheduled"
        : (s?.reqState ?? "queued");

  return {
    ...base,
    state,
    request: requestOf(base.id),
    hasCase: !!c,
    date,
    start,
    end: start ? endOf(start, minutes) : null,
    minutes,
    mode: s?.mode ?? null,
    interviewerId,
    interviewerName,
    place: s?.place ?? "",
    memo: s?.memo ?? "",
    rawAt: c?.scheduledAt && !old.date ? c.scheduledAt : null,
    filled: c ? protocol.filter((p) => (c.notes[p.id] ?? "").trim().length > 0).length : 0,
    declineWhy: s?.declineWhy ?? "",
    log: s?.log ?? [],
  };
}

/**
 * 화면이 보는 면담 전부.
 *
 * 케이스 목록(전문가 콘솔의 값)이 앞, 아직 케이스가 안 선 신청이 뒤. 케이스를 복제하지
 * 않으므로 저기서 코딩을 확정한 건이 여기서 대기로 남는 일이 없다.
 *
 * ⚠ 시계를 읽지 않는다. 「지난 일정을 맨 위로」 같은 순서는 오늘을 알아야 하는데, 훅이
 *   그것을 읽으면 서버가 그린 순서와 첫 클라이언트 렌더가 갈린다. 순서는 화면이
 *   하이드레이션 뒤에 sortDesk로 매긴다.
 */
export function useInterviewDesk(): Interview[] {
  const { interviews } = useExpert();
  const slots = useSlots();

  return useMemo(() => {
    const seen = new Set(interviews.map((c) => c.id));
    const picks = interviews.map((c) =>
      viewOf(
        slots,
        {
          id: c.id,
          /* 신청 원장에 같은 번호가 있으면 승격된 건이다 — 출처는 신청 쪽으로 적는다.
             「이 줄이 왜 여기 있나」의 답이 자동 선발과 사람의 신청은 서로 다르다 */
          source: requestOf(c.id) ? "request" : "pick",
          round: "2026-3",
          /* 케이스 쪽 칸은 string이라 빈 문자열이 올 수 있다(응시번호 없이 승격된 건).
             화면이 「없음」과 「빈 값」을 가르지 않아도 되도록 여기서 null로 눕힌다 */
          seat: c.seat || null,
          grade: c.grade,
          reasons: [...c.reasons],
        },
        c,
      ),
    );
    const reqs = interviewRequests
      .filter((r) => !seen.has(r.caseId))
      .map((r) =>
        viewOf(slots, {
          id: r.caseId,
          source: "request",
          round: r.round,
          seat: r.seat,
          grade: r.grade,
          reasons: ["request"],
        }),
      );
    return [...picks, ...reqs];
  }, [interviews, slots]);
}

/** 한 줄. 상세가 쓴다 */
export function useInterview(id: string): Interview | null {
  const rows = useInterviewDesk();
  return rows.find((r) => r.id === id) ?? null;
}

/** 오늘보다 앞인데 아직 안 끝난 것. now가 빈 문자열이면(하이드레이션 전) 아무것도 아니다 */
export const isOverdue = (v: Interview, nowDay: string) =>
  v.state === "scheduled" && !!v.date && !!nowDay && v.date < nowDay;

/** 신청이 며칠 묵었나 */
export const waitedOf = (v: Interview, nowDay: string) =>
  v.request && nowDay ? diffDays(v.request.appliedAt.slice(0, 10), nowDay) : null;

/** 신청에 답하기까지의 목표. 문의의 24시간보다 넉넉한 것은 면담원 일정과 맞춰야 하기 때문이다 */
export const REQUEST_GOAL_DAYS = 3;

/**
 * 기본 순서 — 화면이 「누구부터」를 대신 정해 준다.
 *
 *   ① 지난 일정   상대가 그 시각에 기다렸던 자리다. 늘 맨 위
 *   ② 신청 접수   묵은 것부터
 *   ③ 선발됨      선발 사유 rank 오름차순 — pickReasons가 이미 정한 우선순위를 화면이
 *                 다시 정하지 않는다
 *   ④ 일정 잡힘   가까운 날짜부터
 *   ⑤ 마친 것 ⑥ 반려
 *
 * 사람이 순서를 매기게 두면 목소리 큰 신청이 먼저 올라간다. 자동 정렬의 뜻은 「신청하지
 * 않았지만 꼭 봐야 하는 아이」를 위로 올리는 데 있다(lib/expertStore.ts의 pickReasons).
 */
export function sortDesk(rows: Interview[], nowDay: string): Interview[] {
  const rank = (v: Interview) => {
    if (isOverdue(v, nowDay)) return 0;
    if (v.state === "applied") return 1;
    if (v.state === "queued") return 2;
    if (v.state === "scheduled") return 3;
    if (v.state === "declined") return 5;
    return 4;
  };
  /* 묶음 안의 순서. 묶음마다 세우는 값이 달라 한 줄로 못 적는다 */
  const within = (v: Interview) => {
    if (v.state === "applied") return v.request?.appliedAt ?? "9";
    if (v.state === "queued") return String(topReason(v.reasons).rank);
    return v.date && v.start ? `${v.date} ${v.start}` : "9";
  };
  return [...rows].sort(
    (a, b) => rank(a) - rank(b) || within(a).localeCompare(within(b)) || a.id.localeCompare(b.id),
  );
}

/** 달력이 쓰는 묶음 — 날짜로 갈라 시각 오름차순으로 세운다 */
export function byDay(rows: Interview[]): Record<string, Interview[]> {
  const out: Record<string, Interview[]> = {};
  for (const v of rows) {
    if (!v.date || !v.start) continue;
    (out[v.date] ??= []).push(v);
  }
  for (const d of Object.keys(out)) {
    out[d].sort((a, b) => minOf(a.start!) - minOf(b.start!) || a.id.localeCompare(b.id));
  }
  return out;
}

/** 두 일정이 시간으로 맞물리는가. **붙어 있는 것은 겹치지 않는다** — 14:00–14:40과
    14:40–15:20을 연달아 잡는 것은 실제로 하는 일이다 */
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

/**
 * 한 열 안에서 겹치는 것끼리 묶어 좌우로 나눈다.
 *
 * 열 전체를 최대 겹침 수로 나누지 않는다 — 그러면 한 건뿐인 시각까지 4분의 1 폭으로
 * 그려져 글자가 안 들어간다. 무리가 끊기는 자리에서 그 무리의 폭을 다시 센다.
 */
export function layout(list: Interview[]): { v: Interview; col: number; of: number; clash: boolean }[] {
  const rows = list
    .filter((v) => v.start)
    .map((v) => ({ v, s: minOf(v.start!), e: minOf(v.start!) + v.minutes }))
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const out: { v: Interview; col: number; of: number; clash: boolean }[] = [];
  /* 한 무리 = 서로 이어져 겹치는 덩어리. 무리가 끝나면 그 무리의 열 수로 폭을 매긴다 */
  let group: { v: Interview; col: number }[] = [];
  let colEnd: number[] = [];
  let groupEnd = -1;

  const flush = () => {
    const of = Math.max(1, colEnd.length);
    for (const g of group) {
      out.push({
        v: g.v,
        col: g.col,
        of,
        /* 같은 면담원이 맞물린 것만 사고다. 다른 면담원이 같은 시각인 것은 정상이라
           좌우로 나뉘기만 한다 — 면담실이 여럿이고 화상·전화는 자리를 안 쓴다 */
        clash: group.some(
          (o) =>
            o.v.id !== g.v.id &&
            !!o.v.interviewerId &&
            o.v.interviewerId === g.v.interviewerId &&
            overlaps(
              minOf(g.v.start!),
              minOf(g.v.start!) + g.v.minutes,
              minOf(o.v.start!),
              minOf(o.v.start!) + o.v.minutes,
            ),
        ),
      });
    }
    group = [];
    colEnd = [];
    groupEnd = -1;
  };

  for (const r of rows) {
    if (group.length > 0 && r.s >= groupEnd) flush();
    let col = colEnd.findIndex((e) => e <= r.s);
    if (col === -1) {
      col = colEnd.length;
      colEnd.push(r.e);
    } else {
      colEnd[col] = r.e;
    }
    group.push({ v: r.v, col });
    groupEnd = Math.max(groupEnd, r.e);
  }
  flush();

  return out;
}

/** 그 면담원이 그날 맡은 건수 — 면담원 고르개가 「— 3건」으로 적는다 */
export const loadOf = (rows: Interview[], date: string, interviewerId: string) =>
  rows.filter((v) => v.date === date && v.interviewerId === interviewerId).length;

/** 같은 면담원·같은 날·시간이 맞물리는 것 */
export function clashesOf(rows: Interview[], id: string, v: SlotDraft): Interview[] {
  if (!DATE_RE.test(v.date) || !TIME_RE.test(v.start) || !v.interviewerId) return [];
  const s = minOf(v.start);
  const e = s + v.minutes;
  return rows.filter(
    (o) =>
      o.id !== id &&
      o.date === v.date &&
      !!o.start &&
      o.interviewerId === v.interviewerId &&
      overlaps(s, e, minOf(o.start), minOf(o.start) + o.minutes),
  );
}

/**
 * 그 면담원이 그날 **소요시간만큼** 비어 있는 시작 시각들.
 *
 * 「그 30분이 비었나」가 아니라 「40분이 들어가나」를 본다. 30분 틈에 40분을 놓을 수
 * 있다고 그려 두면 눌러 놓고 나서야 막힌다. 09:00부터 30분 단위로 훑는다.
 */
export function freeOf(
  rows: Interview[],
  date: string,
  interviewerId: string,
  minutes: number,
  exceptId?: string,
): string[] {
  if (!DATE_RE.test(date) || !interviewerId || minutes <= 0) return [];
  const taken = rows
    .filter((o) => o.id !== exceptId && o.date === date && !!o.start && o.interviewerId === interviewerId)
    .map((o) => [minOf(o.start!), minOf(o.start!) + o.minutes] as const);

  const out: string[] = [];
  for (let t = minOf(DAY_FROM); t + minutes <= minOf(DAY_TO); t += 30) {
    if (!taken.some(([s, e]) => overlaps(t, t + minutes, s, e))) out.push(timeOf(t));
  }
  return out;
}

/* ───────────────────────── 검증 ───────────────────────── */

/**
 * 저장 전에 짚는 것 — 막는 것과 알리는 것을 함께 돌려준다.
 *
 * ⚠ 오늘 날짜를 **아예 보지 않는다.** 막지 않는 것은 물론이고 짚지도 않는다.
 *   「오늘보다 앞선 날짜입니다」를 한 줄 띄워 두었는데, 이 자리는 면담원이 종이에 적어 온
 *   지난 면담을 옮겨 적는 자리이기도 하다. 옳게 적고 있는 사람에게 매번 뜨는 경고는
 *   읽히지 않고, 읽히지 않는 경고가 한 줄 서 있으면 그 옆의 진짜 경고까지 같이 흘려진다.
 *   그래서 nowDay를 받지 않는다 — 받아 두면 언젠가 다시 쓰게 된다.
 */
export function checkSlot(rows: Interview[], id: string, v: SlotDraft): SlotCheck[] {
  const out: SlotCheck[] = [];
  const stop = (text: string) => out.push({ tone: "danger", text, blocks: true });
  const note = (text: string) => out.push({ tone: "warn", text, blocks: false });
  /* 지금 고치는 줄. 응시번호로 견주는 검사 둘이 이 값을 쓰므로 한 번만 찾는다 */
  const self = rows.find((r) => r.id === id) ?? null;

  if (!DATE_RE.test(v.date)) stop("날짜를 YYYY-MM-DD로 적어 주세요.");
  if (!TIME_RE.test(v.start)) stop("시작 시각을 HH:MM으로 적어 주세요.");
  if (!(v.minutes >= 10 && v.minutes <= 180)) stop("소요시간을 10분에서 180분 사이로 골라 주세요.");
  if (!v.interviewerId) stop("면담원을 골라야 일정을 잡을 수 있습니다.");
  if (v.mode === "onsite" && !v.place.trim()) stop("면담 장소를 적어 주세요.");
  if (v.mode === "video" && !v.place.trim()) stop("화상 링크를 적어 주세요.");

  if (!DATE_RE.test(v.date) || !TIME_RE.test(v.start)) return out;

  const s = minOf(v.start);
  const e = s + v.minutes;

  for (const c of clashesOf(rows, id, v)) {
    stop(
      `${c.interviewerName ?? "이 면담원"} 면담원이 그 시각에 이미 ${seatOf(c)} 면담이 있습니다(${c.start}–${c.end}).`,
    );
  }

  /* 같은 아이를 하루에 두 번 부르지 않는다 — 면담원이 달라도 막는다.

     ⚠ 응시번호로 같은 아이를 가른다. 그래서 **번호가 없는 줄끼리는 견주지 않는다** —
       null === null이 참이 되면, 아직 검사를 안 치른 신청 둘이 서로 다른 아이인데도
       「그날 이미 면담이 잡혀 있습니다」로 막힌다. 번호가 없는 아이가 같은 사람인지는
       이 자료로는 알 수 없고, 모를 때 막는 쪽이 아니라 여는 쪽에 선다 */
  const twice =
    self?.seat != null
      ? rows.find((o) => o.id !== id && o.date === v.date && o.seat === self.seat && !!o.start)
      : null;
  if (twice) {
    stop(`${seatOf(twice)}은(는) 그날 이미 면담이 잡혀 있습니다(${twice.start} ${twice.interviewerName ?? "면담원 미정"}).`);
  }

  const wd = weekday(v.date);
  if (wd === 0 || wd === 6) note(`${weekdayKo(v.date)}요일입니다. 주말 면담이 맞는지 확인해 주세요.`);
  if (s < minOf(DAY_FROM) || e > minOf(DAY_TO)) {
    note(`${DAY_FROM}–${DAY_TO} 밖입니다. 아이가 학교에 있는 시간은 아닌지 확인해 주세요.`);
  }

  /* 장소는 자유 문자열이라 오타 하나로 갈린다. 막을 만큼 믿을 수 있는 값이 아니라 짚기만 한다 */
  if (v.place.trim() && v.mode === "onsite") {
    const room = rows.find(
      (o) =>
        o.id !== id &&
        o.date === v.date &&
        !!o.start &&
        o.mode === "onsite" &&
        o.place.trim() === v.place.trim() &&
        overlaps(s, e, minOf(o.start), minOf(o.start) + o.minutes),
    );
    if (room) note(`같은 시각 같은 장소(${room.place})에 ${seatOf(room)} 면담이 있습니다.`);
  }

  /* 이 줄이 없으면 달력에서 두 블록이 나란한 것을 보고 사고로 읽는다 */
  const near = rows.filter(
    (o) =>
      o.id !== id &&
      o.date === v.date &&
      !!o.start &&
      !!o.interviewerId &&
      o.interviewerId !== v.interviewerId &&
      overlaps(s, e, minOf(o.start), minOf(o.start) + o.minutes),
  );
  for (const o of near) {
    note(`같은 시각에 ${o.interviewerName} 면담이 있습니다. 면담원이 달라 겹치지 않습니다.`);
  }

  /* 위 「하루에 두 번」과 같은 까닭으로 번호 없는 줄끼리는 견주지 않는다 */
  const done =
    self?.seat != null
      ? rows.find((o) => o.id !== id && o.seat === self.seat && o.state === "coded")
      : null;
  if (done) note(`이 아이는 같은 회차에 이미 면담을 마쳤습니다(${done.id}).`);

  return out;
}

/* ───────────────────────── 쓰는 길 ───────────────────────── */

/** 새로 세우는 케이스 한 줄. 모양은 전문가 콘솔의 것을 그대로 따른다 */
const caseOf = (row: Interview): InterviewCase => ({
  id: row.id,
  /* 전문가 콘솔의 칸은 string이다. 없는 응시번호를 지어 넣지 않고 빈 문자열로 둔다 —
     면담 번호를 넣으면 저쪽 화면이 그것을 응시번호로 읽고, 그 값으로 응시 자료를
     찾으러 간다. 읽어 올 때 viewOf가 다시 null로 눕힌다 */
  seat: row.seat ?? "",
  grade: row.grade,
  reasons: row.reasons.length > 0 ? row.reasons : ["request"],
  state: "queued",
  notes: {},
});

/**
 * 일정을 잡거나 옮긴다 — 저장 단추 하나가 부르는 유일한 함수.
 *
 * 처음 잡는 것과 옮기는 것을 함수로 가르지 않는다. 부르는 쪽이 판단하게 두면 어느 날
 * 옮기기를 잡기로 적어 기록에 「일정 잡음」이 두 번 남는다. 여기서 앞 값을 보고 가른다.
 *
 * ⚠ 저장하지 못하면 false를 돌려준다 — 「저장하고 나가기」가 그것을 본다. 값이 걸러졌는데
 *   화면이 떠나 버리면 사람이 저장했다고 믿는 순간에 고친 것이 통째로 사라진다.
 *
 * ⚠ 아직 케이스가 없는 신청이면 여기서 **먼저 케이스를 세운다.** 일정을 잡는다는 것이 곧
 *   대상으로 받는다는 뜻이라, 「대상 확정」을 따로 누르게 하면 같은 뜻의 단추가 화면에 둘
 *   선다. 케이스 번호는 신청이 이미 들고 있으므로 주소도 열쇠도 안 바뀐다.
 *
 * ⚠ 케이스가 선 뒤에는 expertStore.scheduleInterview를 **같은 자리에서** 부른다. 화면이 두
 *   번 부르게 두면 언젠가 한쪽만 불러, 전문가 콘솔에서는 대기인데 여기서는 잡힌 것으로
 *   보이는 날이 온다. 저쪽은 면담원을 이름 문자열로 받으므로 명부에서 풀어 넘긴다.
 *   소요시간·방식·장소는 넘어가지 않는다 — 저쪽에 그 칸이 없다.
 */
export function setSchedule(
  row: Interview,
  v: SlotDraft,
  rows: Interview[],
  by: string,
  why: string,
): boolean {
  if (checkSlot(rows, row.id, v).some((c) => c.blocks)) return false;

  const name = interviewerOf(v.interviewerId)?.name ?? "";
  const moved = !!row.date && !!row.start && (row.date !== v.date || row.start !== v.start);
  const swapped = !!row.interviewerId && row.interviewerId !== v.interviewerId;

  if (!row.hasCase) pushInterview(caseOf(row), by);

  const text = moved
    ? `${row.date!.slice(5)} ${row.start} → ${v.date.slice(5)} ${v.start}${
        swapped ? ` · 면담원 ${row.interviewerName} → ${name}` : ""
      }${why.trim() ? ` — ${why.trim()}` : ""}`
    : `${v.date} ${v.start} · ${v.minutes}분 · ${name} · ${interviewModes[v.mode]}`;

  patch(
    row.id,
    {
      date: v.date,
      start: v.start,
      minutes: v.minutes,
      mode: v.mode,
      interviewerId: v.interviewerId,
      place: v.place.trim(),
      memo: v.memo,
      /* 반려했던 것을 다시 잡으면 그 표식을 걷는다. 남겨 두면 케이스가 서기 전
         한순간에 「반려」로 보인다 */
      reqState: undefined,
    },
    { by, action: moved ? "move" : "schedule", text },
  );

  scheduleInterview(row.id, `${v.date} ${v.start}`, name, by);
  return true;
}

/**
 * 일정을 지운다 — 값을 비우고 상태를 선발됨으로 되돌린다.
 *
 * 옛 scheduledAt까지 함께 지워야 한다. 우리 쪽 날짜만 비우면 viewOf가 저쪽 문자열을
 * 되읽어 방금 지운 일정이 그대로 다시 선다.
 *
 * 까닭을 다섯 자 이상 받는다. 이미 상대에게 알린 일정이라 「왜 없어졌나」에 답할 자리가
 * 있어야 한다.
 */
export function clearSchedule(row: Interview, by: string, why: string): boolean {
  if (why.trim().length < 5) return false;
  patch(
    row.id,
    { date: undefined, start: undefined, mode: undefined, interviewerId: undefined, place: "" },
    {
      by,
      action: "clear",
      text: `${row.date ?? row.rawAt ?? "일정"} ${row.start ?? ""} 지움 — ${why.trim()}`,
    },
  );
  if (row.hasCase) unscheduleInterview(row.id, by, why.trim());
  return true;
}

/**
 * 신청을 받지 않기로 한다.
 *
 * 까닭 열 자 미만이면 아무것도 하지 않는다 — 반려는 신청자에게 그대로 나가는 말이다.
 *
 * ⚠ 케이스가 이미 선 건에는 쓰지 않는다. 저쪽 상태를 여기서 뒤집을 수 없다.
 */
export function declineRequest(row: Interview, by: string, why: string): boolean {
  if (row.hasCase || why.trim().length < 10) return false;
  patch(
    row.id,
    { reqState: "declined", declineWhy: why.trim() },
    { by, action: "decline", text: why.trim() },
  );
  return true;
}

/**
 * 반려를 무른다 — 잘못 눌렀을 때.
 *
 * 「신청 접수」로 되돌린다. 표식을 아주 지우면 「선발됨」으로 읽히는데, 그것은 **대상으로
 * 받기로 했다**는 뜻이라 우리가 하지 않은 결정이 기록에 남는다. 반려를 무른 것은 아직
 * 답하지 않은 자리로 돌아간 것이지 받아들인 것이 아니다.
 *
 * ⚠ 케이스가 선 건에는 애초에 반려가 걸리지 않으므로(declineRequest) 여기 오는 줄은
 *   언제나 신청이다. 그래서 되돌릴 자리도 applied 하나뿐이다.
 */
export function undoDecline(row: Interview, by: string) {
  patch(
    row.id,
    { reqState: "applied", declineWhy: "" },
    { by, action: "accept", text: "반려를 물러 신청 접수로 되돌렸습니다" },
  );
}
