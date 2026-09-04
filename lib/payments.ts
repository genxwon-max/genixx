/**
 * PAY-02 결제 — 들어온 돈의 기록.
 *
 * 이 콘솔에서 결제는 **읽기만 한다.** 승인·취소·환불은 결제대행사(PG)에서 일어나고
 * 여기로는 그 결과가 넘어올 뿐이라, 고치는 함수를 두지 않는다. 저장소(localStorage)로
 * 내리지 않은 까닭도 그것이다 — 이 화면에서 바꿀 수 있는 값이 하나도 없다.
 *
 * ── 금액을 셋으로 갈라 든다 ──
 *   amount    승인된 금액. 취소되어도 이 값은 남는다 — 「얼마짜리 거래였나」이므로.
 *   refunded  돌려준 금액. 부분환불이면 amount보다 작다.
 *   순매출     amount - refunded. 통계에서 「실제로 남은 돈」은 언제나 이 값이다.
 *
 * 상태 하나로 금액을 계산하지 않는다. 부분환불은 상태가 하나인데 금액이 둘이라,
 * 상태만 보고 더하면 부분환불 건이 전액 매출이 되거나 전액 손실이 된다.
 *
 * ⚠ 아래 기록은 전부 화면 설계를 위해 지어낸 값이다. 구매자 이름은 만들 때부터 가려
 *   두었다 — 관리자 화면 설계본에 온전한 개인 이름이 남아 있을 이유가 없다.
 */

export type PayState = "paid" | "canceled" | "partial" | "refunded";

export const payStateLabel: Record<PayState, string> = {
  paid: "결제 완료",
  canceled: "결제 취소",
  partial: "부분 환불",
  refunded: "전액 환불",
};

/** 상태 차례 — 정상 → 부분 → 전액 → 취소. 돈이 빠져나간 정도 순이다 */
export const payStateOrder: PayState[] = ["paid", "partial", "refunded", "canceled"];

export type PayMethod = "카드" | "간편결제" | "계좌이체" | "가상계좌" | "무료";

export const payMethods: PayMethod[] = ["카드", "간편결제", "계좌이체", "가상계좌", "무료"];

export type Payment = {
  id: string;
  /** 승인 시각 */
  paidAt: string;
  /** 가려진 구매자 이름 */
  buyer: string;
  buyerType: "개인" | "기관";
  productId: string;
  productName: string;
  qty: number;
  /** 승인 금액 */
  amount: number;
  /** 돌려준 금액. 0이면 환불 없음 */
  refunded: number;
  method: PayMethod;
  state: PayState;
  /** 환불이 문의에서 넘어왔으면 그 문의 번호 — 되짚을 수 있게 함께 적는다 */
  inquiryId?: string;
};

/* ───────────────────────── 지어낸 기록 만들기 ─────────────────────────
   Math.random을 쓰지 않는다. 페이지를 열 때마다 숫자가 바뀌면 서버가 그린 화면과
   브라우저가 그린 화면이 달라지고(hydration), 시연 중에 같은 화면을 두 번 보여 줄 수도
   없다. 씨앗 하나로 도는 선형합동생성기를 두고 값을 못 박는다. */

let seed = 20260811;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const CATALOG = [
  { id: "PRD-0002", name: "재능진단 종합 리포트", price: 39000, weight: 46 },
  { id: "PRD-0003", name: "심화진단 + 리포트 묶음", price: 99000, weight: 22 },
  { id: "PRD-0004", name: "기관 응시권 100석 팩", price: 900000, weight: 8 },
  { id: "PRD-0001", name: "TalentMe 학력진단 응시권 1회", price: 0, weight: 24 },
] as const;

/** 무게를 펼친 뽑기 통 — 리포트가 가장 많이 팔리고 기관 팩이 가장 드물다 */
const BOWL = CATALOG.flatMap((c) => Array.from({ length: c.weight }, () => c));

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"];

/** 열두 달치. 뒤로 갈수록 건수가 는다 — 서비스가 자라는 모양을 화면에서 보려고 */
const MONTHS = [
  { ym: "2025-09", n: 4 },
  { ym: "2025-10", n: 6 },
  { ym: "2025-11", n: 7 },
  { ym: "2025-12", n: 9 },
  { ym: "2026-01", n: 8 },
  { ym: "2026-02", n: 11 },
  { ym: "2026-03", n: 14 },
  { ym: "2026-04", n: 13 },
  { ym: "2026-05", n: 16 },
  { ym: "2026-06", n: 18 },
  { ym: "2026-07", n: 21 },
  { ym: "2026-08", n: 12 },
];

function build(): Payment[] {
  const rows: Payment[] = [];
  let no = 0;

  for (const m of MONTHS) {
    for (let i = 0; i < m.n; i += 1) {
      no += 1;
      const item = pick(BOWL);
      const qty = item.id === "PRD-0004" ? 1 : between(1, 2);
      const amount = item.price * qty;
      const free = amount === 0;
      const org = item.id === "PRD-0004";

      /* 상태 — 스물에 열아홉은 정상이다. 환불을 더 섞으면 화면은 화려해지지만 실제
         결제 화면과 닮지 않게 되고, 환불률 지표가 무슨 뜻인지도 흐려진다. 실서비스의
         환불률은 대개 한 자릿수 앞쪽이라, 그 언저리로 떨어지게 눈금을 잡았다 */
      const dice = rnd();
      let state: PayState = "paid";
      let refunded = 0;
      if (!free && dice > 0.985) {
        state = "canceled";
        refunded = amount;
      } else if (!free && dice > 0.972) {
        state = "refunded";
        refunded = amount;
      } else if (!free && dice > 0.952) {
        state = "partial";
        refunded = Math.round((amount * between(3, 6)) / 10 / 1000) * 1000;
      }

      const day = between(1, 28);
      const hour = between(9, 21);
      const min = between(0, 59);
      const p = (v: number) => String(v).padStart(2, "0");

      rows.push({
        id: `PY-${m.ym.replace("-", "")}${p(day)}${p(no % 100)}`,
        paidAt: `${m.ym}-${p(day)} ${p(hour)}:${p(min)}`,
        buyer: `${pick(SURNAMES)}****`,
        buyerType: org ? "기관" : "개인",
        productId: item.id,
        productName: item.name,
        qty,
        amount,
        refunded,
        method: free ? "무료" : org ? pick(["계좌이체", "가상계좌"] as const) : pick(["카드", "카드", "간편결제", "계좌이체"] as const),
        state,
        ...(state === "partial" || state === "refunded" ? { inquiryId: `IQ-${m.ym.replace("-", "")}${p(day)}` } : {}),
      });
    }
  }

  /* 최근 것이 위로. 결제 화면을 여는 사람이 먼저 찾는 것은 언제나 방금 들어온 건이다 */
  return rows.sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export const payments: Payment[] = build();

/* ───────────────────────── 통계 ─────────────────────────
   화면이 아니라 여기서 센다. 같은 수를 두 화면(대시보드·결제)이 쓰게 될 때 각자 세면
   반드시 어긋나고, 어긋난 뒤에는 둘 다 못 믿게 된다. */

/** 실제로 남은 돈 */
export const netOf = (p: Payment) => p.amount - p.refunded;

export type PaySummary = {
  /** 승인 금액 합계 */
  gross: number;
  /** 환불 합계 */
  refund: number;
  /** 순매출 = 승인 − 환불 */
  net: number;
  count: number;
  /** 결제 건당 평균 순매출. 0원 건(무료)은 빼고 센다 — 넣으면 평균이 실제보다 낮게 잡힌다 */
  avg: number;
  /** 환불률 = 환불 ÷ 승인 */
  refundRate: number;
  /** 0원 결제 건수 — 파일럿 무료분 */
  freeCount: number;
};

export function summarize(rows: Payment[]): PaySummary {
  const gross = rows.reduce((s, p) => s + p.amount, 0);
  const refund = rows.reduce((s, p) => s + p.refunded, 0);
  const paidRows = rows.filter((p) => p.amount > 0);
  const net = gross - refund;
  return {
    gross,
    refund,
    net,
    count: rows.length,
    avg: paidRows.length ? Math.round(paidRows.reduce((s, p) => s + netOf(p), 0) / paidRows.length) : 0,
    refundRate: gross > 0 ? Math.round((refund / gross) * 1000) / 10 : 0,
    freeCount: rows.length - paidRows.length,
  };
}

/** 달마다 순매출과 건수. 기록이 없는 달도 빈칸으로 세운다 — 빠지면 추이가 끊긴 줄 모른다 */
export function monthly(rows: Payment[]) {
  const map = new Map<string, { net: number; count: number }>();
  for (const m of MONTHS) map.set(m.ym, { net: 0, count: 0 });
  for (const p of rows) {
    const ym = p.paidAt.slice(0, 7);
    const cur = map.get(ym) ?? { net: 0, count: 0 };
    cur.net += netOf(p);
    cur.count += 1;
    map.set(ym, cur);
  }
  return [...map.entries()].map(([ym, v]) => ({ ym, ...v }));
}

/** 상품별 순매출 — 많이 판 것이 위로 */
export function byProduct(rows: Payment[]) {
  const map = new Map<string, { name: string; net: number; count: number; qty: number }>();
  for (const p of rows) {
    const cur = map.get(p.productId) ?? { name: p.productName, net: 0, count: 0, qty: 0 };
    cur.net += netOf(p);
    cur.count += 1;
    cur.qty += p.qty;
    map.set(p.productId, cur);
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.net - a.net || b.count - a.count);
}

/** 결제 수단별 건수와 순매출 */
export function byMethod(rows: Payment[]) {
  return payMethods
    .map((m) => {
      const mine = rows.filter((p) => p.method === m);
      return { method: m, count: mine.length, net: mine.reduce((s, p) => s + netOf(p), 0) };
    })
    .filter((r) => r.count > 0);
}
