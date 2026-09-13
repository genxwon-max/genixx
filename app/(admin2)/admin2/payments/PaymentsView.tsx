"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import {
  ALL_TIME,
  THIS_MONTH,
  THIS_YEAR,
  byMethod,
  byProduct,
  firstYm,
  growth,
  inPeriod,
  monthly,
  netOf,
  payMethods,
  payStateLabel,
  payStateOrder,
  payments,
  periodLabel,
  prevPeriod,
  samePeriod,
  summarize,
  thisYm,
  ymInPeriod,
  type Payment,
  type PayState,
  type Period,
} from "@/lib/payments";
import { won } from "@/lib/productStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";

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
 * ── 답은 하나다: 이 기간에 얼마가 남았나 ──
 * 한동안 22px 지표 다섯(순매출·건수·평균·환불·환불률)을 같은 무게로 눕혀 두었다. 다섯이
 * 나란히 서면 어느 것이 이 화면의 답이고 어느 것이 곁들이인지가 안 읽힌다 — 처음 여는
 * 사람은 왼쪽 끝의 순매출과 오른쪽 끝의 환불률을 같은 크기로 마주하고, 둘 중 무엇을
 * 봐야 하는지 화면이 말해 주지 않았다.
 *
 * 순매출 하나만 28px로 올리고(.a2-metric-lg) 나머지는 22px에 둔다. 환불률은 제 칸을 잃고
 * 환불 금액의 곁줄로 내려간다 — 「환불 82만 원(3.3%)」은 한 칸이면 되는 말이었다.
 *
 * 큰 숫자 옆에는 늘 **무엇의 값인지**와 **얼마나 늘었는지**를 붙인다.
 *   「2026년 8월 순매출 · 24,180,000원 · ▲12.4% 2026년 7월 대비」
 * 금액만 크게 세우면 그 수가 이번 달인지 전체인지가 조회 줄까지 올라가야 알 수 있다.
 *
 * ── 기간은 조회 조건이다 ──
 * 탭 셋(전체 기간 · 올해 · 이번 달)으로 두었었다. 늘 최신 달을 기준으로 잡히는 값이라
 * **지난해 어느 달**을 보려면 길이 없었다 — 「2025년 11월 얼마였나」가 결제 화면에서 가장
 * 자주 나오는 물음인데도 그렇다. 연도와 달을 고르는 조회 조건으로 바꿨다.
 *
 * 그런데 고르개 둘만 남기니 이번에는 가장 흔한 물음(「이번 달 얼마」)이 두 번 돌리는 일이
 * 됐다. 미리 고른 것 셋(이번 달 · 올해 · 전체 기간)을 고르개 앞에 세운다. 누르면 고르개
 * 두 개가 그 값으로 함께 움직이므로, 지금 무엇을 보고 있는지는 여전히 한 곳에서 읽힌다.
 *
 * 고르면 바로 걸린다. 표의 검색 조건(DataTable)이 「검색을 눌러야」인 것은 글자를 치는
 * 칸 때문이고, 여기는 고르개뿐이라 누를 것을 하나 더 두면 손만 는다.
 *
 * 달 차림표는 **그 해에 실제로 기록이 있는 달**만 낸다. 골라도 0건이 나오는 선택지를
 * 섞어 두면 거르개 전체를 못 믿게 된다(DataTable의 거르개와 같은 규칙).
 *
 * ── 지표와 표는 함께 움직이고, 추이만 서 있는다 ──
 * 조건을 바꾸면 위의 숫자와 아래 표가 **함께** 그 기간으로 바뀐다 — 지표만 전체 기간이고
 * 표만 이번 달이면 두 수를 견주다가 틀린 결론이 난다.
 *
 * 「달별 순매출」만 예외로 열두 달을 그대로 세워 둔다. 이 판이 답하는 것은 금액이 아니라
 * **흐름**인데, 8월을 고른 순간 막대가 하나만 남으면 그 판은 위의 큰 숫자를 한 번 더
 * 적은 것이 된다. 대신 고른 기간에 드는 달을 면으로 칠해, 위의 숫자가 이 추이의 어디를
 * 가리키는지 눈으로 잇는다. 예외라는 것은 판 제목 옆에 적어 둔다 — 적어 두지 않으면
 * 「지표는 8월인데 막대는 열둘」이 그냥 어긋난 화면으로 읽힌다.
 */

const stateTone = {
  paid: "ok",
  partial: "warn",
  refunded: "danger",
  canceled: "muted",
} as const;

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 미리 고른 기간 — 결제 화면에서 열에 아홉은 이 셋 중 하나를 묻는다 */
const PRESETS: { label: string; period: Period }[] = [
  { label: "이번 달", period: THIS_MONTH },
  { label: "올해", period: THIS_YEAR },
  { label: "전체 기간", period: ALL_TIME },
];

/** 기록이 있는 달 전부 (YYYY-MM) — 차림표는 여기서만 뽑는다 */
const YMS = [...new Set(payments.map((p) => p.paidAt.slice(0, 7)))].sort().reverse();
/** 기록이 있는 해, 최근 것부터 */
const YEARS = [...new Set(YMS.map((ym) => ym.slice(0, 4)))];
/** 그 해에 기록이 있는 달. 연도를 안 고르면 열두 달 중 어느 해든 기록이 있는 달 */
const monthsIn = (year: string) =>
  [...new Set(YMS.filter((ym) => !year || ym.startsWith(year)).map((ym) => ym.slice(5)))].sort();

/* 달별 추이는 조회 기간을 타지 않으므로(머리 주석) 화면 밖에서 한 번만 센다.
   기록이 없는 달은 빼되 0건인 달을 채워 넣지는 않는다 — monthly가 열두 달을 다 세운다 */
const MONTH_SERIES = monthly(payments).filter((m) => m.count > 0);
const MONTH_MAX = MONTH_SERIES.reduce((m, r) => Math.max(m, r.net), 0);
/** 기록이 걸쳐 있는 범위 — 「전체 기간」이 몇 달치인지는 이 말이 답한다 */
const SPAN_TEXT = `${firstYm.slice(0, 4)}년 ${Number(firstYm.slice(5))}월 – ${thisYm.slice(0, 4)}년 ${Number(thisYm.slice(5))}월 · ${MONTH_SERIES.length}개월`;

/** 막대 한 줄 — 달마다 순매출을 가로로 눕힌다. 라이브러리를 쓰지 않는다(값이 열둘뿐이다) */
function MonthRow({
  ym,
  net,
  count,
  on,
  current,
  onPick,
}: {
  ym: string;
  net: number;
  count: number;
  /** 지금 고른 기간에 드는 달 */
  on: boolean;
  /** 이번 달 */
  current: boolean;
  onPick: () => void;
}) {
  const pct = MONTH_MAX > 0 ? Math.round((net / MONTH_MAX) * 100) : 0;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      /* 「이번 달」 표를 담느라 첫 칸이 넓어진 만큼 금액·건수 칸을 줄여, 고정 칸 합계를
         표시를 달기 전(4.5+7+3.5rem)과 같은 15rem에 묶어 둔다.

         좁은 화면(640px 미만)에서는 막대와 건수를 걷고 달·금액 둘만 남긴다. 15rem을 그대로
         두면 막대가 제 최소 너비(48px)에 걸려 칸끼리 겹치고, 금액이 막대 위에 얹혀 인쇄된
         것처럼 보인다. 걷는 것이 막대인 까닭은 그것이 곁들이이기 때문이다 — 이 줄이 답하는
         것은 금액이고, 막대는 그 금액을 옆 달과 견주게 도와줄 뿐이다.
         숨긴 칸은 격자에서 아예 빠지므로(display:none) 남은 둘이 앞 두 칸으로 당겨진다 */
      className="a2-mrow grid-cols-[6.25rem_minmax(0,1fr)] sm:grid-cols-[6.25rem_minmax(0,1fr)_6rem_2.75rem]"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{ym}</span>
        {current && <span className="a2-t-xs font-bold text-(--a2-accent-2)">이번 달</span>}
      </span>
      {/* 막대에는 읽어 줄 것을 달지 않는다 — 금액과 건수가 같은 줄에 글자로 서 있다 */}
      <span className="hidden a2-bar sm:block" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="a2-num a2-t-sm text-right text-(--a2-ink)">{won(net)}</span>
      <span className="hidden a2-num a2-t-xs text-right text-(--a2-ink-4) sm:block">{n(count)}건</span>
    </button>
  );
}

/** 곁들이는 지표 한 칸 — 22px. 큰 숫자(순매출) 옆에 나란히 서는 것들 */
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

export default function PaymentsView() {
  /* 빈 값이 「전체」다(lib/payments.ts의 Period) */
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const period: Period = { year, month };
  /* 기간을 좁혔는가. 「전체 기간」은 열두 달이 다 드는 것이라 추이에서 칠하지 않는다 —
     전부 칠하면 아무것도 안 칠한 것과 같은데 판만 파래져서 정작 막대가 안 읽힌다 */
  const narrowed = year !== "" || month !== "";

  const pick = (p: Period) => {
    setYear(p.year);
    setMonth(p.month);
  };

  /* 고를 수 있는 달 — 아래 달별 추이의 MONTH_SERIES와 다른 것이라 이름을 가른다 */
  const monthOpts = monthsIn(year);

  /* 손으로 memo하지 않는다 — 백 몇 줄을 거르는 일이고, 나머지는 컴파일러가 맡는다.
     여기에 useMemo를 두면 아래 셈들(summarize·byProduct…)의 memo까지 컴파일러가 통째로
     건너뛴다(react-hooks/preserve-manual-memoization).

     ⚠ 기간 꾸러미를 걸러내는 함수 **안에서** 짓는다. 위의 period를 그대로 넘기면 컴파일러가
       그 꾸러미를 「나중에 바뀔 수 있는 것」으로 보고 rows에 걸린 memo를 전부 포기한다 —
       화면에 보이는 값은 같지만 이 화면의 memo가 통째로 사라진다. */
  const rows = payments.filter((p) => inPeriod(p, { year, month }));

  /* 견줄 앞 기간. 전체 기간과 「해마다 N월」은 짝이 없어 null이 온다.
     null일 때 빈 배열을 따로 만들지 않고 아무 줄도 들지 않는 조건으로 거른다 — 삼항으로
     가르면 그 갈래가 렌더마다 새 배열이 되어 같은 일이 벌어진다. 앞 기간이 있으면 연도는
     반드시 차 있으므로(prevPeriod), 빈 연도가 곧 「짝이 없음」이다. */
  const prev = prevPeriod({ year, month });
  const prevYear = prev?.year ?? "";
  const prevMonth = prev?.month ?? "";
  const prevRows = payments.filter((p) => prevYear !== "" && inPeriod(p, { year: prevYear, month: prevMonth }));

  const sum = useMemo(() => summarize(rows), [rows]);
  /* 이 하나만 손 memo를 두지 않는다 — prevPeriod가 낸 값에서 뽑은 줄이라 컴파일러가
     그 꾸러미의 속을 못 보고, useMemo를 걸면 위 셈들의 memo까지 함께 풀린다 */
  const prevNet = summarize(prevRows).net;
  const delta = prev ? growth(sum.net, prevNet) : null;
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
        actions={
          <Link href="/admin2/products" className="a2-btn">
            상품 관리
          </Link>
        }
      />

      {/* 기간 조회 조건 — 표 위의 조회 줄(DataTable)과 같은 꼴로 세운다.
          이름표를 왼쪽에 두는 것도 같은 까닭이다: 세우기 전에는 고르개 둘이 지표 띠
          바로 위에 떠 있어, 처음 여는 사람이 그것을 지표의 일부로 읽는다 */}
      <div className="a2-toolbar">
        <span className="a2-query-label a2-label">조회 기간</span>

        {/* 미리 고른 것 셋. 눌린 것은 콘솔의 다른 단추 무리와 같은 꼴로 표시한다
            (a2-btn-primary + aria-pressed — 면담 달력·보고서 승인과 같다) */}
        {PRESETS.map((p) => {
          const on = samePeriod(period, p.period);
          return (
            <button
              key={p.label}
              type="button"
              className={`a2-btn a2-btn-sm ${on ? "a2-btn-primary" : ""}`}
              aria-pressed={on}
              onClick={() => pick(p.period)}
            >
              {p.label}
            </button>
          );
        })}

        <span aria-hidden className="mx-1 h-5 w-px bg-(--a2-line)" />

        <select
          className="a2-select w-auto"
          aria-label="연도"
          value={year}
          onChange={(e) => {
            const next = e.target.value;
            setYear(next);
            /* 고른 달이 그 해에 없으면 달을 푼다 — 남겨 두면 0건짜리 화면이 되고,
               사람은 「그 해에 결제가 없었다」로 읽는다 */
            if (month && !monthsIn(next).includes(month)) setMonth("");
          }}
        >
          <option value="">연도 전체</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>

        <select
          className="a2-select w-auto"
          aria-label="달"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">달 전체</option>
          {monthOpts.map((m) => (
            <option key={m} value={m}>
              {Number(m)}월
            </option>
          ))}
        </select>

        <span className="ml-auto a2-t-xs text-(--a2-ink-4)">
          결제 <span className="a2-num text-(--a2-ink-2)">{n(rows.length)}</span>건
        </span>
      </div>

      {/* ① 얼마가 남았나 — 이 화면의 답.
          순매출만 28px로 세우고 나머지 셋은 22px에 둔다. 다섯을 같은 크기로 눕히면
          어느 것이 답인지 화면이 말해 주지 않는다(머리 주석).

          좁은 화면에서는 둘이 아니라 **셋**으로 접는다. 둘로 접으면 곁들이 셋이 2+1로 갈려
          마지막 줄에 빈 칸이 하나 남고, 칸 사이 선을 띠 바탕색으로 긋는 꼴(.a2-stats)이라
          그 빈 자리가 회색 덩어리로 보인다 */}
      <div className="a2-stats border-b border-(--a2-line) sm:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <div className="bg-(--a2-panel) p-4 sm:col-span-3 xl:col-span-1">
          {/* 무엇의 값인지를 숫자 위에 적는다. 「순매출」만 적어 두면 그 수가 이번 달인지
              전체인지를 알려고 조회 줄까지 눈이 올라간다 */}
          <p className="a2-label">{periodLabel(period)} 순매출</p>

          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="a2-metric-lg text-(--a2-ink)">{won(sum.net)}</span>
            {delta != null && prev ? (
              <span className="flex items-baseline gap-1.5">
                {/* 화살표와 부호를 함께 적는다 — 색만 바뀌면 흑백 인쇄와 색약에서 사라진다 */}
                <span
                  className="a2-num a2-t-md font-bold"
                  style={{ color: delta >= 0 ? "var(--a2-ok)" : "var(--a2-danger)" }}
                >
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
                <span className="a2-t-xs text-(--a2-ink-4)">{periodLabel(prev)} 대비</span>
              </span>
            ) : prev ? (
              <span className="a2-t-xs text-(--a2-ink-4)">{periodLabel(prev)}에는 기록이 없습니다</span>
            ) : (
              !month && <span className="a2-t-xs text-(--a2-ink-4)">{SPAN_TEXT}</span>
            )}
          </p>

          {/* 순매출이 무슨 돈인지를 낱말로 적는다. 「승인 − 환불」이라는 식만 적어 두면
              그 뺄셈이 무엇을 뜻하는지는 이 화면을 처음 여는 사람이 알 수 없다.
              환불이 없는 기간에 「환불 0원을 빼고」라 적지 않는다 — 없는 일을 뺐다고 쓰면
              그 줄을 읽는 사람이 0원짜리 환불 건을 찾으러 표로 내려간다 */}
          <p className="mt-1.5 a2-t-xs text-(--a2-ink-4)">
            {sum.refund > 0 ? (
              <>
                승인 <span className="a2-num text-(--a2-ink-3)">{won(sum.gross)}</span>에서 환불{" "}
                <span className="a2-num text-(--a2-ink-3)">{won(sum.refund)}</span>을 빼고 남은 돈입니다.
              </>
            ) : (
              <>
                승인 <span className="a2-num text-(--a2-ink-3)">{won(sum.gross)}</span>이 환불 없이 그대로
                남았습니다.
              </>
            )}
          </p>
        </div>

        <Stat
          label="결제 건수"
          value={n(sum.count)}
          sub={sum.freeCount > 0 ? `이 중 무료 ${n(sum.freeCount)}건` : "무료 건 없음"}
        />
        <Stat label="건당 평균" value={won(sum.avg)} sub="0원 건은 빼고 셉니다" />
        {/* 환불률은 제 칸을 잃고 여기 곁줄로 내려왔다 — 「환불 82만 원(3.3%)」은 한 칸이면
            되는 말이라, 22px 칸을 하나 더 세울 값이 아니었다 */}
        <Stat
          label="환불 합계"
          value={won(sum.refund)}
          tone={sum.refund > 0 ? "var(--a2-danger)" : undefined}
          sub={sum.refund > 0 ? `승인 금액의 ${sum.refundRate}% · 부분환불 포함` : "이 기간에 환불이 없습니다"}
        />
      </div>

      <Body>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* ② 어떻게 흘러왔나 — 이 판만 조회 기간을 타지 않는다(머리 주석) */}
          <Panel title="달별 순매출" meta="열두 달 전부 · 눌러서 그 달만 보기">
            {MONTH_SERIES.length === 0 ? (
              <p className="a2-t-sm text-(--a2-ink-3)">아직 기록이 없습니다.</p>
            ) : (
              <div className="flex flex-col">
                {MONTH_SERIES.map((m) => (
                  <MonthRow
                    key={m.ym}
                    ym={m.ym}
                    net={m.net}
                    count={m.count}
                    on={narrowed && ymInPeriod(m.ym, { year, month })}
                    current={m.ym === thisYm}
                    onPick={() => pick({ year: m.ym.slice(0, 4), month: m.ym.slice(5) })}
                  />
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
        /* 기간이 바뀌면 표를 새로 세운다 — 쪽 번호와 걸어 둔 거르개가 앞 기간의 것으로
           남아 있으면 「3쪽인데 0줄」이 뜬다 */
        key={`${year}-${month}`}
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
