"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import {
  byMethod,
  byProduct,
  growth,
  netOf,
  payMethods,
  payStateLabel,
  payStateOrder,
  summarize,
  type PayMethod,
  type PayState,
  type Payment,
} from "@/lib/payments";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, SeedNote, Status, Tab, Tag } from "@/components/admin2/ui";
import ConsoleFrame from "../ConsoleFrame";

/**
 * 결제 내역 · 면담 구분 (실제 주소 /admin2/payments · WBS K.2.3 「결제 관리: 상담 유형 추가」) — 디자인.
 *
 * 지금의 결제 내역(app/(admin2)/admin2/payments/PaymentsView.tsx)을 값만 적어 넣은 사본으로 옮기고
 * 면담 결제를 더했다. 읽고 나가는 화면이라는 점은 그대로다 — 결제마다 누를 것이 없고, 환불은
 * 결제대행사에서 일어나 결과만 넘어온다.
 *
 * ── 더한 것 ──
 *  · 머리 아래 탭 「전체 · 진단 · 면담」. 탭을 고르면 지표 · 판 · 표가 함께 그 구분으로 바뀐다
 *    (조회 기간과 같은 규칙). 탭 옆의 수는 고른 기간의 결제 건수다.
 *  · 표의 「구분」 칸과 대조용 번호 둘 — 주문 번호(회원 화면과 영수증에 적히는 번호)와 면담 번호.
 *    대조용 번호는 관련 문의와 함께 표 오른쪽 끝에 모았다.
 *  · 「구분별 합계」 판. 이 판만 탭을 바꿔도 진단과 면담을 둘 다 보여 준다 — 면담이 그 기간
 *    순매출의 얼마인지가 이 판의 답이다.
 *  · 상품별 순매출에 면담 상품 둘(30분 · 60분). 면담 상품은 「면담 상품」 화면에서 관리하므로
 *    머리에 그 화면으로 가는 단추를 하나 더했다.
 *
 * 면담을 취소해 환불하면 그 결제의 환불 금액과 상태가 바뀐다. 문의를 거치지 않은 환불이라
 * 관련 문의 칸은 비어 있다.
 *
 * ── 예시 기록 ──
 * 이번 달(2026-10-01 ~ 10-11) 결제 242건을 적어 두었다. 건수는 운영 지표 · 면담 상품 화면의 예시에
 * 맞췄다 — 면담 30분 42건 · 60분 31건(여기에 취소해 환불한 2건이 더 있다), 진단 유료 결제 143건.
 * 지난 달들은 합계만 적었다. Math.random은 쓰지 않는다 — 열 때마다 값이 바뀌면 같은 주소가 같은
 * 화면이 아니게 된다.
 */

const to = designLinks("payments-counsel");
const AT = "/admin2/payments";
const noop = () => {};
const n = (v: number) => v.toLocaleString("ko-KR");
const won = (v: number) => `${n(v)}원`;
const pad = (v: number, len = 2) => String(v).padStart(len, "0");

type Kind = "진단" | "면담";

/** 결제 한 건 — 실제 화면의 기록(lib/payments.ts)에 구분 · 주문 번호 · 면담 번호를 더했다 */
type Pay = Payment & {
  kind: Kind;
  /** 회원 화면과 영수증에 적히는 주문 번호 */
  order: string;
  /** 면담 결제이면 그 면담의 번호 */
  counselId?: string;
};

/* ───────────────────────── 예시 기록 ───────────────────────── */

/** 상품 — 진단 넷은 지금 결제 내역의 예시 그대로, 면담 둘은 면담 상품 화면(L.2.11)의 것이다 */
const catalog = {
  r: { kind: "진단", id: "PRD-0002", name: "재능진단 종합 리포트", price: 39000 },
  b: { kind: "진단", id: "PRD-0003", name: "심화진단 + 리포트 묶음", price: 99000 },
  o: { kind: "진단", id: "PRD-0004", name: "기관 응시권 100석 팩", price: 900000 },
  f: { kind: "진단", id: "PRD-0001", name: "TalentMe 학력진단 응시권 1회", price: 0 },
  "3": { kind: "면담", id: "CP-01", name: "결과 해석 면담 30분", price: 60000 },
  "6": { kind: "면담", id: "CP-02", name: "결과 해석 면담 60분", price: 100000 },
} as const;

/**
 * 날마다 들어온 결제를 시각 차례로 적은 것 — 글자 하나가 결제 한 건이다.
 * 3 · 6 면담 30분 · 60분 / r 리포트 / b 묶음 / o 기관 팩 / f 무료 응시권. 대문자(R · B)는 2명분이다.
 */
const days: [date: string, tape: string][] = [
  ["2026-10-01", "36r3363r6rb3fr6Rr3br6rf3rBr6R3rbf6r3Rrb63rfr6bR3r"],
  ["2026-10-02", "r3bf6rR3r6o3rbf3R6r3rb6fr3Rr"],
  ["2026-10-03", "rf3rb6Rr3rfb6r3Rr"],
  ["2026-10-04", "r6br3rfR6rb3rr"],
  ["2026-10-05", "r3bf6rR3rb6rB3rf6rbR3rrr"],
  ["2026-10-06", "rf3Rb6r3frbR3r6frb3Rrrr"],
  ["2026-10-07", "r3bfr6oRr3rB6fr3rbRrr"],
  ["2026-10-08", "rr3fb6rR3rrf6br3Rrrr"],
  ["2026-10-09", "rf6br3Rrf6rb3Rrr"],
  ["2026-10-10", "r3fbr6RrB3rfr6bRrr"],
  ["2026-10-11", "rf3r6bR3r6r3"],
];

/** 환불 · 취소, 그리고 다른 디자인 화면과 같은 한 건 — 결제 ID로 덮어쓴다 */
const patch: Record<string, Partial<Pay>> = {
  /* 면담 결과 기록 화면(CS-2610-0012 · 주문 GX2026-000149)의 그 결제 */
  "PY-2026100109": { paidAt: "2026-10-01 10:05" },
  /* 예약을 취소한 면담 — 문의를 거치지 않아 관련 문의가 없다 */
  "PY-2026101014": { state: "refunded", refunded: 100000 },
  "PY-2026100809": { state: "partial", refunded: 30000 },
  /* 진단 — 문의로 들어온 환불 둘과 결제 취소 하나 */
  "PY-2026101007": { state: "partial", refunded: 39000, inquiryId: "IQ-26101103" },
  "PY-2026100703": { state: "refunded", refunded: 99000, inquiryId: "IQ-26100802" },
  "PY-2026100501": { state: "canceled", refunded: 39000 },
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"];
const PAID_BY: PayMethod[] = ["카드", "간편결제", "카드", "계좌이체"];
/** 면담 번호는 신청할 때 정해진다 — 결제 전에 그만둔 신청과 다른 디자인 화면의 예시(0019 · 0021)는 이 표에 없다 */
const NO_PAYMENT = new Set([2, 5, 7, 9, 11, 19, 21]);

function build(): Pay[] {
  const rows: Pay[] = [];
  let counselNo = 0;
  days.forEach(([date, tape], d) => {
    /* 하루 결제를 07:30부터 23:20까지 고르게 놓는다. 마지막 날(오늘)은 오전까지만 있다 */
    const today = d === days.length - 1;
    const from = today ? 460 : 450;
    const span = today ? 192 : 950;
    tape.split("").forEach((ch, k) => {
      const i = rows.length;
      const item = catalog[ch.toLowerCase() as keyof typeof catalog];
      const qty = ch === "R" || ch === "B" ? 2 : 1;
      const min = from + Math.floor((k * span) / (tape.length - 1)) + ((k * 7) % 5);
      const id = `PY-${date.replace(/-/g, "")}${pad(k + 1)}`;
      if (item.kind === "면담") {
        counselNo += 1;
        while (NO_PAYMENT.has(counselNo)) counselNo += 1;
      }
      rows.push({
        id,
        /* 주문 번호는 결제를 시작할 때 매겨져, 결제를 마치지 않은 주문만큼 번호가 빈다 */
        order: `GX2026-${pad(139 + i + Math.floor(i / 4), 6)}`,
        paidAt: `${date} ${pad(Math.floor(min / 60))}:${pad(min % 60)}`,
        kind: item.kind,
        buyer: `${SURNAMES[(i * 7 + 4) % 12]}****`,
        buyerType: ch === "o" ? "기관" : "개인",
        productId: item.id,
        productName: item.name,
        qty,
        amount: item.price * qty,
        refunded: 0,
        method: ch === "f" ? "무료" : ch === "o" ? "가상계좌" : PAID_BY[i % 4],
        state: "paid",
        ...(item.kind === "면담" ? { counselId: `CS-2610-${pad(counselNo, 4)}` } : {}),
        ...patch[id],
      });
    });
  });
  /* 최근 것이 위로 */
  return rows.reverse();
}

const all = build();

type Sum = { net: number; count: number };
const sumOf = (rows: Pay[]): Sum => ({ net: rows.reduce((s, p) => s + netOf(p), 0), count: rows.length });

const THIS_YM = "2026-10";

/** 달마다 순매출과 건수. 지난 달은 합계만 적어 두고, 이번 달은 위 기록에서 센다. 면담 결제는 2026-05부터 있다 */
const months: { ym: string; exam: Sum; counsel: Sum }[] = [
  ...(
    [
      ["2025-11", 351000, 8, 0, 0],
      ["2025-12", 507000, 12, 0, 0],
      ["2026-01", 1563000, 14, 0, 0],
      ["2026-02", 819000, 18, 0, 0],
      ["2026-03", 1131000, 25, 0, 0],
      ["2026-04", 2343000, 31, 0, 0],
      ["2026-05", 1989000, 42, 600000, 8],
      ["2026-06", 3987000, 63, 1080000, 14],
      ["2026-07", 4836000, 97, 2000000, 26],
      ["2026-08", 6747000, 116, 2860000, 37],
      ["2026-09", 8247000, 139, 4000000, 52],
    ] as [string, number, number, number, number][]
  ).map(([ym, examNet, examCount, counselNet, counselCount]) => ({
    ym,
    exam: { net: examNet, count: examCount },
    counsel: { net: counselNet, count: counselCount },
  })),
  {
    ym: THIS_YM,
    exam: sumOf(all.filter((p) => p.kind === "진단")),
    counsel: sumOf(all.filter((p) => p.kind === "면담")),
  },
];

/** 그 달의 값을 구분에 맞춰 꺼낸다 — 구분이 없으면 둘을 더한다 */
const pick = (m: (typeof months)[number], kind: Kind | null): Sum =>
  kind === "진단"
    ? m.exam
    : kind === "면담"
      ? m.counsel
      : { net: m.exam.net + m.counsel.net, count: m.exam.count + m.counsel.count };

const labelOf = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;

/* ───────────────────────── 표 ───────────────────────── */

const stateTone = { paid: "ok", partial: "warn", refunded: "danger", canceled: "muted" } as const;
const dash = <span className="text-(--a2-ink-4)">—</span>;

const cols: Col<Pay>[] = [
  {
    key: "id",
    head: "결제 ID",
    width: "8rem",
    nowrap: true,
    value: (p) => p.id,
    cell: (p) => <span className="a2-mono text-(--a2-ink)">{p.id}</span>,
  },
  {
    key: "paidAt",
    head: "승인 시각",
    width: "9rem",
    nowrap: true,
    value: (p) => p.paidAt,
    cell: (p) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{p.paidAt}</span>,
  },
  {
    key: "kind",
    head: "구분",
    width: "4rem",
    nowrap: true,
    value: (p) => p.kind,
    cell: (p) => <Tag accent={p.kind === "면담"}>{p.kind}</Tag>,
  },
  {
    key: "buyer",
    head: "구매자",
    width: "6rem",
    nowrap: true,
    value: (p) => `${p.buyer} ${p.buyerType}`,
    cell: (p) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-(--a2-ink)">{p.buyer}</span>
        <span className="a2-t-xs text-(--a2-ink-4)">{p.buyerType}</span>
      </span>
    ),
  },
  /* 상품은 자르지 않는다. 좁은 화면에서 이름이 말줄임으로 사라지면 면담 결제인지를 읽을 수 없다 —
     표가 화면보다 넓어지면 오른쪽의 대조용 번호부터 가로로 밀린다 */
  {
    key: "product",
    head: "상품",
    nowrap: true,
    value: (p) => p.productName,
    cell: (p) => (
      <span>
        {p.productName}
        {p.qty > 1 && <span className="ml-1.5 a2-num a2-t-xs text-(--a2-ink-4)">×{p.qty}</span>}
      </span>
    ),
  },
  {
    key: "method",
    head: "수단",
    width: "5rem",
    nowrap: true,
    hide: "md",
    value: (p) => p.method,
    cell: (p) => <Tag>{p.method}</Tag>,
  },
  {
    key: "amount",
    head: "승인 금액",
    width: "6.5rem",
    num: true,
    nowrap: true,
    value: (p) => p.amount,
    sort: (p) => p.amount,
    cell: (p) =>
      p.amount > 0 ? (
        <span className="a2-num text-(--a2-ink-3)">{won(p.amount)}</span>
      ) : (
        <span className="a2-t-sm text-(--a2-ink-4)">무료</span>
      ),
  },
  {
    key: "refunded",
    head: "환불",
    width: "6.5rem",
    num: true,
    nowrap: true,
    value: (p) => p.refunded,
    sort: (p) => p.refunded,
    cell: (p) =>
      p.refunded > 0 ? (
        <span className="a2-num" style={{ color: "var(--a2-danger)" }}>
          −{won(p.refunded)}
        </span>
      ) : (
        dash
      ),
  },
  {
    key: "net",
    head: "순매출",
    width: "6.5rem",
    num: true,
    nowrap: true,
    value: (p) => netOf(p),
    sort: (p) => netOf(p),
    cell: (p) => <span className="a2-num font-semibold text-(--a2-ink)">{won(netOf(p))}</span>,
  },
  {
    key: "state",
    head: "상태",
    width: "5.5rem",
    nowrap: true,
    value: (p) => payStateLabel[p.state],
    sort: (p) => payStateOrder.indexOf(p.state),
    cell: (p) => <Status tone={stateTone[p.state]}>{payStateLabel[p.state]}</Status>,
  },
  /* ── 대조용 번호 셋 — 평소에는 읽지 않다가 회원이 번호를 들고 물어 올 때 찾는 값이라 끝에 둔다 ── */
  {
    key: "order",
    head: "주문 번호",
    width: "7.5rem",
    nowrap: true,
    hide: "lg",
    value: (p) => p.order,
    cell: (p) => <span className="a2-mono a2-t-sm text-(--a2-ink-2)">{p.order}</span>,
  },
  {
    key: "counsel",
    head: "면담 번호",
    width: "7.5rem",
    nowrap: true,
    hide: "lg",
    value: (p) => p.counselId ?? "",
    cell: (p) =>
      p.counselId ? (
        /* 어느 면담의 결제인지 되짚을 수 있게 면담 신청 화면으로 잇는다 */
        <Link href="/admin2/interviews" className="a2-mono a2-t-sm text-(--a2-ink-2) hover:underline">
          {p.counselId}
        </Link>
      ) : (
        dash
      ),
  },
  {
    key: "inquiry",
    head: "관련 문의",
    width: "7rem",
    nowrap: true,
    hide: "lg",
    value: (p) => p.inquiryId ?? "",
    cell: (p) =>
      p.inquiryId ? (
        <Link href="/admin2/inquiries" className="a2-mono a2-t-sm text-(--a2-ink-2) hover:underline">
          {p.inquiryId}
        </Link>
      ) : (
        dash
      ),
  },
];

/* ───────────────────────── 조각 ───────────────────────── */

/** 구분 탭 — 상태마다 주소가 달라 단추가 아니라 링크로 둔다. 모양은 콘솔의 탭(.a2-tab) 그대로다 */
function TabLink({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="a2-tab"
      style={
        active ? { borderBottomColor: "var(--a2-accent)", color: "var(--a2-accent-2)", fontWeight: 700 } : undefined
      }
    >
      {label}
      <span className="a2-tab-n" style={active ? { color: "var(--a2-accent-2)" } : undefined}>
        {n(count)}
      </span>
    </Link>
  );
}

/** 곁들이는 지표 한 칸 — 큰 숫자(순매출) 옆에 나란히 놓인다 */
function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub: string }) {
  return (
    <div className="bg-(--a2-panel) p-3">
      <p className="a2-label">{label}</p>
      <p className="mt-1 a2-metric" style={{ color: tone ?? "var(--a2-ink)" }}>
        {value}
      </p>
      <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">{sub}</p>
    </div>
  );
}

/* ───────────────────────── 화면 ───────────────────────── */

export default function PaymentsCounsel({ state }: { state: string }) {
  /* 빈 상태는 면담 결제가 시작되기 전의 달(2026년 4월)을 고른 화면이다 */
  const empty = state === "counsel/empty";
  const kind: Kind | null = state === "exam" ? "진단" : state.startsWith("counsel") ? "면담" : null;
  const ym = empty ? "2026-04" : THIS_YM;
  const at = months.findIndex((m) => m.ym === ym);
  const month = months[at];
  const prev = months[at - 1];

  const rows = empty ? [] : kind ? all.filter((p) => p.kind === kind) : all;
  const sum = summarize(rows);
  const delta = growth(sum.net, pick(prev, kind).net);
  const products = byProduct(rows);
  const methods = byMethod(rows);

  /* 월별 추이는 조회 기간을 타지 않고 구분만 탄다. 기록이 없는 달은 뺀다 */
  const series = months.map((m) => ({ ym: m.ym, ...pick(m, kind) })).filter((m) => m.count > 0);
  const seriesMax = series.reduce((max, m) => Math.max(max, m.net), 0);

  /* 구분별 합계는 탭과 상관없이 그 기간의 둘을 다 보여 준다 */
  const whole = month.exam.net + month.counsel.net;
  const split = (["진단", "면담"] as Kind[]).map((k) => {
    const v = pick(month, k);
    return { kind: k, ...v, share: whole ? Math.round((v.net / whole) * 1000) / 10 : 0 };
  });

  /* 조건의 선택지는 지금 표에 실제로 있는 값만 낸다 — 골라도 0건인 선택지를 두지 않는다 */
  const filters: Filter<Pay>[] = [
    {
      id: "state",
      label: "상태",
      options: payStateOrder
        .filter((s) => rows.some((p) => p.state === s))
        .map((s) => ({ value: s, label: payStateLabel[s] })),
      match: (p, v) => p.state === (v as PayState),
    },
    {
      id: "method",
      label: "수단",
      options: payMethods.filter((m) => rows.some((p) => p.method === m)).map((m) => ({ value: m, label: m })),
      match: (p, v) => p.method === v,
    },
    {
      id: "buyerType",
      label: "구매자",
      options: (["개인", "기관"] as const)
        .filter((b) => rows.some((p) => p.buyerType === b))
        .map((b) => ({ value: b, label: b })),
      match: (p, v) => p.buyerType === v,
    },
  ];

  return (
    <ConsoleFrame at={AT}>
      <PageHead
        title="결제 내역"
        actions={
          <>
            <Link href="/admin2/products" className="a2-btn">
              상품 관리
            </Link>
            <Link href="/design/admin2/consult-products" className="a2-btn">
              면담 상품
            </Link>
          </>
        }
        tabsLabel="구분별 조회 조건"
        tabs={
          empty ? (
            /* 이 기간의 전체 · 진단 화면은 디자인에 없어 두 탭은 눌러도 바뀌지 않는다 */
            <>
              <Tab label="전체" count={n(pick(month, null).count)} active={false} onClick={noop} />
              <Tab label="진단" count={n(month.exam.count)} active={false} onClick={noop} />
              <TabLink href={to("counsel/empty")} label="면담" count={0} active />
            </>
          ) : (
            <>
              <TabLink href={to()} label="전체" count={pick(month, null).count} active={kind === null} />
              <TabLink href={to("exam")} label="진단" count={month.exam.count} active={kind === "진단"} />
              <TabLink href={to("counsel")} label="면담" count={month.counsel.count} active={kind === "면담"} />
            </>
          )
        }
      />

      {/* 기간 조회 조건 — 실제 화면과 같은 꼴. 디자인에서는 「이번 달」을 골라 둔 채로 굳혔다 */}
      <div key={`period-${state}`} className="a2-toolbar">
        <span className="a2-query-label a2-label">조회 기간</span>
        {empty ? (
          <Link href={to("counsel")} className="a2-btn a2-btn-sm">
            이번 달
          </Link>
        ) : (
          <button type="button" className="a2-btn a2-btn-sm a2-btn-primary" aria-pressed>
            이번 달
          </button>
        )}
        <button type="button" className="a2-btn a2-btn-sm" aria-pressed={false}>
          올해
        </button>
        <button type="button" className="a2-btn a2-btn-sm" aria-pressed={false}>
          전체 기간
        </button>

        <span aria-hidden className="mx-1 h-5 w-px bg-(--a2-line)" />

        <select className="a2-select w-auto" aria-label="연도" defaultValue="2026">
          <option value="">연도 전체</option>
          <option value="2026">2026년</option>
          <option value="2025">2025년</option>
        </select>
        <select className="a2-select w-auto" aria-label="월" defaultValue={ym.slice(5)}>
          <option value="">월 전체</option>
          {months
            .filter((m) => m.ym.startsWith("2026"))
            .map((m) => (
              <option key={m.ym} value={m.ym.slice(5)}>
                {Number(m.ym.slice(5))}월
              </option>
            ))}
        </select>

        <span className="ml-auto a2-t-xs text-(--a2-ink-4)">
          결제 <span className="a2-num text-(--a2-ink-2)">{n(rows.length)}</span>건
        </span>
      </div>

      {/* ① 얼마가 남았나 — 탭을 고르면 이 숫자도 그 구분의 값이 된다 */}
      <div className="a2-stats border-b border-(--a2-line) sm:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="bg-(--a2-panel) p-4 sm:col-span-3 xl:col-span-1">
          <p className="a2-label">
            {labelOf(ym)} {kind ? `${kind} ` : ""}순매출
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="a2-metric-lg text-(--a2-ink)">{won(sum.net)}</span>
            {delta != null && (
              <span className="flex items-baseline gap-1.5">
                <span
                  className="a2-num a2-t-md font-bold"
                  style={{ color: delta >= 0 ? "var(--a2-ok)" : "var(--a2-danger)" }}
                >
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
                <span className="a2-t-xs text-(--a2-ink-4)">{labelOf(prev.ym)} 대비</span>
              </span>
            )}
          </p>
          <p className="mt-1.5 a2-t-xs text-(--a2-ink-4)">
            {empty ? (
              <>이 기간에 결제된 면담이 없습니다. 면담 결제는 2026년 5월부터 기록이 있습니다.</>
            ) : (
              <>
                승인 <span className="a2-num text-(--a2-ink-3)">{won(sum.gross)}</span>에서 환불{" "}
                <span className="a2-num text-(--a2-ink-3)">{won(sum.refund)}</span>을 뺀 금액입니다.
              </>
            )}
          </p>
        </div>

        <Stat
          label="결제 건수"
          value={n(sum.count)}
          sub={sum.freeCount > 0 ? `이 중 무료 ${n(sum.freeCount)}건` : "무료 건 없음"}
        />
        <Stat
          label="건당 평균"
          value={empty ? "—" : won(sum.avg)}
          sub={empty ? "결제가 없어 계산하지 않습니다" : "0원 건은 빼고 셉니다"}
        />
        <Stat
          label="환불 합계"
          value={won(sum.refund)}
          tone={sum.refund > 0 ? "var(--a2-danger)" : undefined}
          sub={sum.refund > 0 ? `승인 금액의 ${sum.refundRate}% · 부분환불 포함` : "이 기간에 환불이 없습니다"}
        />
      </div>

      <Body>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {/* ② 어떻게 흘러왔나 — 조회 기간은 타지 않고 구분만 탄다 */}
            <Panel
              title="월별 순매출"
              meta={
                kind === "면담"
                  ? "면담 결제가 시작된 2026-05부터 · 눌러서 그 달만 보기"
                  : "열두 달 전부 · 눌러서 그 달만 보기"
              }
            >
              <div className="flex flex-col">
                {series.map((m) => (
                  <button
                    key={m.ym}
                    type="button"
                    aria-pressed={m.ym === ym}
                    className="a2-mrow grid-cols-[6.25rem_minmax(0,1fr)] sm:grid-cols-[6.25rem_minmax(0,1fr)_6rem_2.75rem]"
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{m.ym}</span>
                      {m.ym === THIS_YM && <span className="a2-t-xs font-bold text-(--a2-accent-2)">이번 달</span>}
                    </span>
                    <span className="hidden a2-bar sm:block" aria-hidden>
                      <span style={{ width: `${seriesMax ? Math.round((m.net / seriesMax) * 100) : 0}%` }} />
                    </span>
                    <span className="a2-num a2-t-sm text-right text-(--a2-ink)">{won(m.net)}</span>
                    <span className="hidden a2-num a2-t-xs text-right text-(--a2-ink-4) sm:block">
                      {n(m.count)}건
                    </span>
                  </button>
                ))}
              </div>
            </Panel>

            {/* ③ 진단과 면담이 얼마씩인가 — 새로 더한 판 */}
            <Panel title="구분별 합계" meta={`${labelOf(ym)} · 탭을 바꿔도 둘 다 표시`}>
              <ul className="flex flex-col gap-0.5">
                {split.map((s) => (
                  <li
                    key={s.kind}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_6rem] items-center gap-2 px-1.5 py-1 sm:grid-cols-[3rem_minmax(0,1fr)_6rem_2.75rem_3rem]"
                    style={s.kind === kind ? { background: "var(--a2-accent-soft)", borderRadius: 3 } : undefined}
                  >
                    <Tag accent={s.kind === "면담"}>{s.kind}</Tag>
                    <span className="a2-bar" aria-hidden>
                      <span style={{ width: `${s.share}%` }} />
                    </span>
                    <span className="a2-num a2-t-sm text-right font-semibold text-(--a2-ink)">{won(s.net)}</span>
                    <span className="hidden a2-num a2-t-xs text-right text-(--a2-ink-4) sm:block">
                      {n(s.count)}건
                    </span>
                    <span className="hidden a2-num a2-t-xs text-right text-(--a2-ink-3) sm:block">
                      {s.share.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="flex flex-col gap-3">
            {/* ④ 무엇이 팔렸나 — 면담 상품 둘이 함께 놓인다 */}
            <Panel title="상품별 순매출" meta="많이 판 것부터">
              {products.length === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">이 기간에 기록이 없습니다.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-(--a2-line)">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0">
                      <span className="min-w-0 truncate a2-t-sm text-(--a2-ink)" title={p.name}>
                        {p.name}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="a2-num a2-t-sm font-semibold text-(--a2-ink)">{won(p.net)}</span>
                        <span className="ml-2 a2-num a2-t-xs text-(--a2-ink-4)">{n(p.count)}건</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ⑤ 어떻게 냈나 */}
            <Panel title="결제 수단" meta="건수 · 순매출">
              {methods.length === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">이 기간에 기록이 없습니다.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-(--a2-line)">
                  {methods.map((m) => (
                    <li key={m.method} className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0">
                      <span className="a2-t-sm text-(--a2-ink)">{m.method}</span>
                      <span className="shrink-0 text-right">
                        <span className="a2-num a2-t-sm text-(--a2-ink)">{won(m.net)}</span>
                        <span className="ml-2 a2-num a2-t-xs text-(--a2-ink-4)">{n(m.count)}건</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </Body>

      {/* ⑥ 한 건씩 되짚기. 탭이 바뀌면 표를 새로 그린다 — 쪽 번호와 걸어 둔 조건이 앞 탭의 것으로 남지 않게 */}
      <DataTable
        key={`rows-${state}`}
        rows={rows}
        /* 진단만 볼 때는 면담 번호 칸이 전부 비므로 뺀다 */
        cols={kind === "진단" ? cols.filter((c) => c.key !== "counsel") : cols}
        filters={filters}
        getKey={(p) => p.id}
        pageSize={25}
        searchHint="결제 ID · 주문 번호 · 상품 · 구매자"
        empty={
          empty
            ? `${labelOf(ym)}에는 면담 결제가 없습니다. 조회 기간을 바꿔 주세요.`
            : "조건에 맞는 결제가 없습니다."
        }
      />

      <SeedNote>
        면담을 취소해 환불하면 그 결제의 환불 금액과 상태가 바뀝니다. 이 화면의 결제 기록과 금액은 화면
        설계를 위한 예시입니다.
      </SeedNote>
    </ConsoleFrame>
  );
}
