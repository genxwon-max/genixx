/**
 * 대시보드에 올리는 경영 숫자.
 *
 * ⚠ 전부 화면 설계를 위해 지어낸 예시입니다. 실제 집계가 아니며, 화면에도 그렇게
 *   적어 둡니다(components/admin/BusinessMetrics.tsx). 붙일 때는 이 파일을 통째로
 *   집계 API 응답으로 갈아 끼우면 됩니다.
 *
 * 씨앗 고정 난수로 만든다. Math.random()을 쓰면 서버에서 그린 값과 브라우저에서
 * 그린 값이 달라 하이드레이션이 깨진다 — 관리자 목록에서 이미 한 번 겪은 일이다.
 *
 * 「이번 달」도 new Date()로 읽지 않는다. 달이 바뀌는 순간이나 시간대가 다른
 * 기기에서 서버와 브라우저의 기준 달이 갈린다. 지금 회차(lib/admin.ts rounds[0],
 * 2026.08)에 맞춰 못 박아 둔다.
 */

/** 시계열이 끝나는 달 — 지금 회차와 맞춘다 */
export const ANCHOR = { year: 2026, month: 8 };

/** 몇 달치를 보여 주는가 */
const MONTHS = 12;

export type MonthPoint = {
  /** "2026-08" */
  key: string;
  /** "8월" — 축에 적는 짧은 이름 */
  short: string;
  /** "2026년 8월" */
  full: string;
  /** 그달 신규 회원가입 (학부모·교사 합계) */
  signups: number;
  /** 그중 유료 상품을 결제한 수 */
  paid: number;
  /** 그달 결제 금액 (원) */
  revenue: number;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** ANCHOR에서 n달 뒤로 간 달 */
function monthBack(n: number) {
  const zero = ANCHOR.year * 12 + (ANCHOR.month - 1) - n;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

/**
 * 12개월 시계열.
 *
 * 우상향만 그리지 않는다. 실제 서비스는 방학·학기초에 몰리고 중간에 꺾이는 달이
 * 있는데, 매달 오르는 그래프를 그려 두면 화면을 보고 판단하는 연습이 안 된다.
 * 3월(학기초)과 7~8월(방학)에 봉우리를 주고 나머지는 흔들리게 둔다.
 */
export const series: MonthPoint[] = Array.from({ length: MONTHS }, (_, i) => {
  const { year, month } = monthBack(MONTHS - 1 - i);
  const r = rng(year * 100 + month);

  /** 학기초·방학에 몰린다 */
  const season = [3, 7, 8].includes(month) ? 1.35 : [1, 2].includes(month) ? 0.78 : 1;
  /** 열두 달에 걸쳐 완만히 자란다 */
  const growth = 0.62 + (i / (MONTHS - 1)) * 0.62;

  const signups = Math.round((520 + r() * 180) * season * growth);
  /** 전환율 12~19% 사이에서 흔들린다 */
  const paid = Math.round(signups * (0.12 + r() * 0.07));
  /** 객단가 3만 8천 ~ 4만 6천 원 */
  const revenue = Math.round((paid * (38_000 + r() * 8_000)) / 1000) * 1000;

  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    short: `${month}월`,
    full: `${year}년 ${month}월`,
    signups,
    paid,
    revenue,
  };
});

export const thisMonth = series[series.length - 1];
export const lastMonth = series[series.length - 2];

/** 누적 회원 — 시계열 이전에 쌓여 있던 몫을 더한다 */
const CARRIED = 4_820;
export const totalMembers = CARRIED + series.reduce((sum, m) => sum + m.signups, 0);

/** 증감률(%). 지난달이 0이면 계산하지 않는다. */
export function change(now: number, before: number) {
  if (!before) return null;
  return ((now - before) / before) * 100;
}

/** 전환율(%) */
export const conversionRate = (m: MonthPoint) => (m.signups ? (m.paid / m.signups) * 100 : 0);

/** 8,240,000 → "824만" — 관리자 화면에서 원 단위까지 읽을 일은 없다 */
export function won(v: number) {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}
