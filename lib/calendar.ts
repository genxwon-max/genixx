/**
 * 달력 산술 — 날짜 문자열("2026-09-11")과 시각 문자열("14:00")만 다루는 순수 함수.
 *
 * 면담 일정 콘솔(lib/interviewStore.ts)이 들고 있던 것을 여기로 옮겼다. 회원 존의
 * 면담 예약 화면(/my/interviews)이 같은 산술을 쓰는데, 저 파일을 부르면 전문가 콘솔의
 * 케이스 자료(lib/expertStore.ts)가 통째로 딸려 와 보호자 화면 번들에 실린다. 달력을
 * 두 벌로 베껴 쓰면 어느 날 한쪽만 고쳐져 두 화면의 요일이 갈린다.
 *
 * 저장소도 훅도 없다 — 문자열을 받아 문자열을 돌려줄 뿐이라 서버·브라우저 어디서나
 * 같은 값을 낸다. 시계를 읽는 것은 today() 하나뿐이고, 그 주의는 함수에 적어 두었다.
 */


/* ───────────────────────── 날짜·시각 ─────────────────────────
   ⚠ 이 구역의 어떤 함수도 날짜 문자열을 new Date(s)로 넘기지 않는다.
     new Date("2026-09-11")은 **UTC 자정**으로, new Date("2026-09-11T00:00:00")은
     **로컬 자정**으로 파싱된다. 둘을 섞어 쓰면 UTC+9인 여기서 getDay()가 하루 어긋나
     달력의 요일 머리와 칸이 한 칸씩 밀린다. 날짜 산술은 전부 Date.UTC로만 하고, 시각은
     아예 Date를 만들지 않고 「자정부터의 분」 정수로 다룬다.

     시각을 문자열과 분으로만 다루는 까닭은 회차 편성과 같다 — 브라우저가 어디에 있든
     관리자가 적어 넣은 14:00은 같은 14:00이다. */

/** 한 자리 수에 0을 채운다 — 날짜·시각 문자열을 짓는 모든 곳이 이것을 쓴다 */
export const pad = (n: number) => String(n).padStart(2, "0");

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
