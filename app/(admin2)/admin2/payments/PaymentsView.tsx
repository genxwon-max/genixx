"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import {
  byMethod,
  byProduct,
  monthly,
  netOf,
  payMethods,
  payStateLabel,
  payStateOrder,
  payments,
  summarize,
  type Payment,
  type PayState,
} from "@/lib/payments";
import { won } from "@/lib/productStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * PAY-02 결제 내역 — 얼마가 들어왔나.
 *
 * 이 콘솔의 다른 목록 화면과 성격이 다르다. 저쪽은 「무엇부터 여나」에 답하는 큐이고,
 * 여기는 **읽고 나가는 화면**이다. 줄마다 누를 것이 없다 — 승인·취소·환불은 결제대행사에서
 * 일어나고 여기로는 결과만 넘어온다.
 *
 * 그래서 이 화면만 숫자를 먼저 세운다. 다른 화면에서 지표 띠를 걷어 낸 것은 그 숫자가
 * 「목록으로 가는 문」이었기 때문인데, 여기서는 숫자 자체가 답이다.
 *
 * ── 금액을 셋으로 갈라 읽는다 ──
 *   승인   얼마짜리 거래가 있었나
 *   환불   그중 얼마를 돌려줬나
 *   순매출 실제로 남은 돈 (승인 − 환불)
 * 상태 하나로 계산하지 않는다. 부분환불은 상태가 하나인데 금액이 둘이라, 상태만 보고
 * 더하면 그 건이 전액 매출이 되거나 전액 손실이 된다(lib/payments.ts 머리 주석).
 *
 * ── 기간 탭 ──
 * 상태로 나누지 않고 기간으로 나눈다. 결제 화면에서 먼저 묻는 것은 「이번 달 얼마인가」이고,
 * 상태(취소·환불)는 그 안에서 다시 좁히는 값이라 표의 거르개가 맡는다. 탭을 바꾸면 위의
 * 숫자와 아래 표가 **함께** 그 기간으로 바뀐다 — 지표만 전체 기간이고 표만 이번 달이면
 * 두 수를 견주다가 틀린 결론이 난다.
 */

const stateTone = {
  paid: "ok",
  partial: "warn",
  refunded: "danger",
  canceled: "muted",
} as const;

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 가장 최근 기록의 달 — 「이번 달」의 기준. 오늘 날짜로 잡으면 씨앗이 늘 빈 달이 된다 */
const LATEST = payments[0]?.paidAt.slice(0, 7) ?? "";
const LATEST_YEAR = LATEST.slice(0, 4);

type TabId = "all" | "month" | "year";

/** 막대 한 줄 — 달마다 순매출을 가로로 눕힌다. 라이브러리를 쓰지 않는다(값이 열둘뿐이다) */
function MonthBar({ ym, net, count, max }: { ym: string; net: number; count: number; max: number }) {
  const pct = max > 0 ? Math.round((net / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_7rem_3.5rem] items-center gap-2 py-1">
      <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{ym}</span>
      <span className="a2-bar" role="img" aria-label={`${ym} 순매출 ${won(net)}`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="a2-num a2-t-sm text-right text-(--a2-ink)">{won(net)}</span>
      <span className="a2-num a2-t-xs text-right text-(--a2-ink-4)">{n(count)}건</span>
    </div>
  );
}

export default function PaymentsView() {
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체 기간", rows: payments },
      {
        id: "year" as TabId,
        label: `${LATEST_YEAR}년`,
        rows: payments.filter((p) => p.paidAt.startsWith(LATEST_YEAR)),
      },
      {
        id: "month" as TabId,
        label: `${LATEST.slice(5)}월`,
        rows: payments.filter((p) => p.paidAt.startsWith(LATEST)),
      },
    ],
    [],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

  const sum = useMemo(() => summarize(rows), [rows]);
  const months = useMemo(() => monthly(rows).filter((m) => m.count > 0), [rows]);
  const maxMonth = months.reduce((m, r) => Math.max(m, r.net), 0);
  const products = useMemo(() => byProduct(rows), [rows]);
  const methods = useMemo(() => byMethod(rows), [rows]);

  const cols = useMemo<Col<Payment>[]>(
    () => [
      {
        key: "id",
        head: "결제 ID",
        width: "8.5rem",
        nowrap: true,
        value: (p) => p.id,
        cell: (p) => <span className="a2-mono text-(--a2-ink)">{p.id}</span>,
      },
      {
        key: "paidAt",
        head: "승인 시각",
        width: "9.5rem",
        nowrap: true,
        value: (p) => p.paidAt,
        cell: (p) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{p.paidAt}</span>,
      },
      {
        key: "buyer",
        head: "구매자",
        width: "6.5rem",
        nowrap: true,
        value: (p) => `${p.buyer} ${p.buyerType}`,
        cell: (p) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-(--a2-ink)">{p.buyer}</span>
            <span className="a2-t-xs text-(--a2-ink-4)">{p.buyerType}</span>
          </span>
        ),
      },
      {
        key: "product",
        head: "상품",
        clip: true,
        value: (p) => p.productName,
        cell: (p) => (
          <span title={p.productName}>
            {p.productName}
            {p.qty > 1 && <span className="ml-1.5 a2-num a2-t-xs text-(--a2-ink-4)">×{p.qty}</span>}
          </span>
        ),
      },
      {
        key: "method",
        head: "수단",
        width: "5.5rem",
        nowrap: true,
        hide: "md",
        value: (p) => p.method,
        cell: (p) => <Tag>{p.method}</Tag>,
      },
      {
        key: "amount",
        head: "승인 금액",
        width: "7.5rem",
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
        width: "7.5rem",
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
        width: "7.5rem",
        num: true,
        nowrap: true,
        value: (p) => netOf(p),
        sort: (p) => netOf(p),
        cell: (p) => <span className="a2-num font-semibold text-(--a2-ink)">{won(netOf(p))}</span>,
      },
      {
        key: "state",
        head: "상태",
        width: "6rem",
        nowrap: true,
        value: (p) => payStateLabel[p.state],
        sort: (p) => payStateOrder.indexOf(p.state),
        cell: (p) => <Status tone={stateTone[p.state]}>{payStateLabel[p.state]}</Status>,
      },
      {
        key: "inquiry",
        head: "관련 문의",
        width: "7.5rem",
        nowrap: true,
        hide: "lg",
        value: (p) => p.inquiryId ?? "",
        cell: (p) =>
          p.inquiryId ? (
            /* 환불은 대개 문의에서 넘어온다. 되짚을 수 있게 번호를 함께 적고 그 화면으로 잇는다 */
            <Link href="/admin2/inquiries" className="a2-mono a2-t-sm text-(--a2-ink-2) hover:underline">
              {p.inquiryId}
            </Link>
          ) : (
            dash
          ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<Payment>[]>(
    () => [
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
        options: payMethods
          .filter((m) => rows.some((p) => p.method === m))
          .map((m) => ({ value: m, label: m })),
        match: (p, v) => p.method === v,
      },
      {
        id: "buyerType",
        label: "구매자",
        options: [
          { value: "개인", label: "개인" },
          { value: "기관", label: "기관" },
        ],
        match: (p, v) => p.buyerType === v,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        title="결제 내역"
        tabsLabel="기간별 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
        actions={
          <Link href="/admin2/products" className="a2-btn">
            상품 관리
          </Link>
        }
      />

      {/* ① 얼마가 들어왔나 — 이 화면의 답 */}
      <div className="a2-stats border-b border-(--a2-line) sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">순매출</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{won(sum.net)}</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">승인 {won(sum.gross)} − 환불 {won(sum.refund)}</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">결제 건수</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{n(sum.count)}</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">이 중 무료 {n(sum.freeCount)}건</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">건당 평균</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{won(sum.avg)}</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">0원 건은 빼고 셉니다</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">환불 합계</p>
          <p className="mt-1 a2-metric" style={{ color: sum.refund > 0 ? "var(--a2-danger)" : undefined }}>
            {won(sum.refund)}
          </p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">부분환불 포함</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">환불률</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{sum.refundRate}%</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">환불 ÷ 승인 금액</p>
        </div>
      </div>

      <Body>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ② 어떻게 흘러왔나 */}
          <Panel title="달별 순매출" meta={`${months.length}개월`}>
            {months.length === 0 ? (
              <p className="a2-t-sm text-(--a2-ink-3)">이 기간에 기록이 없습니다.</p>
            ) : (
              <div className="flex flex-col">
                {months.map((m) => (
                  <MonthBar key={m.ym} ym={m.ym} net={m.net} count={m.count} max={maxMonth} />
                ))}
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-3">
            {/* ③ 무엇이 팔렸나 */}
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

            {/* ④ 어떻게 냈나 */}
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

      {/* ⑤ 한 건씩 되짚기. 줄 수는 여기서만 적는다 — 위 지표는 기간 전체이고 이 수는
          거르개까지 걸고 난 뒤의 줄이라 서로 다른 값이다 */}
      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(p) => p.id}
        pageSize={25}
        searchHint="결제 ID · 상품 · 구매자 · 수단"
        empty="조건에 맞는 결제가 없습니다."
      />
    </>
  );
}
