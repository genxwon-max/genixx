"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import {
  discountRate,
  paidPrice,
  productKindLabel,
  productKinds,
  productStateLabel,
  productStateOrder,
  useProducts,
  won,
  type Product,
  type ProductState,
} from "@/lib/productStore";
import { detailIsEmpty, detailModeLabel, detailModes } from "@/lib/richText";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * PAY-01 상품 관리 — 파는 것의 목록.
 *
 * 이 화면이 답하는 것은 둘이다. 「지금 무엇을 팔고 있나」와 「아직 못 연 것이 무엇인가」.
 * 그래서 탭을 판매 상태로 두고, 작성 중을 맨 앞에 세운다 — 판매중은 이미 제 일을 하고
 * 있는 줄이고, 손이 가야 하는 것은 아직 못 연 쪽이다.
 *
 * ── 목록에 이미지를 세운 까닭 ──
 * 이 콘솔의 다른 표에는 그림이 없다. 여기만 대표 이미지를 첫 칸에 둔다. 상품은 이름보다
 * 그림으로 먼저 알아보는 것이고, 무엇보다 **그림이 빠진 상품을 찾는 것**이 이 화면에서
 * 자주 하는 일이라서다. 32px 한 칸이면 줄 높이(38px)를 넘지 않는다.
 *
 * ── 값을 두 줄로 적지 않는다 ──
 * 정가와 판매가를 두 칸으로 갈라 세운다. 한 칸에 취소선으로 겹쳐 두면 좁은 화면에서
 * 어느 쪽이 실제로 받는 값인지 흐려진다. 실제로 받는 값(판매가)이 오른쪽이고 굵다.
 */

const stateTone = {
  draft: "muted",
  selling: "ok",
  hidden: "warn",
  ended: "muted",
} as const;

type TabId = "all" | ProductState;

export default function ProductsView() {
  const products = useProducts();
  const [tab, setTab] = useState<TabId>("all");

  /* 기본 줄 차례 — 손이 가야 하는 상태를 위로, 같은 상태끼리는 최근에 고친 것을 위로 */
  const sorted = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          productStateOrder.indexOf(a.state) - productStateOrder.indexOf(b.state) ||
          b.updatedAt.localeCompare(a.updatedAt),
      ),
    [products],
  );

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows: sorted, empty: "등록된 상품이 없습니다. 오른쪽 위에서 만들 수 있습니다." },
      ...productStateOrder.map((s) => ({
        id: s as TabId,
        label: productStateLabel[s],
        rows: sorted.filter((p) => p.state === s),
        empty: `${productStateLabel[s]} 상품이 없습니다.`,
      })),
    ],
    [sorted],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

  const cols = useMemo<Col<Product>[]>(
    () => [
      {
        key: "thumb",
        head: "이미지",
        width: "3.5rem",
        nowrap: true,
        cell: (p) =>
          p.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.thumb}
              alt=""
              className="h-8 w-8 rounded-[3px] border border-(--a2-line) object-cover"
            />
          ) : (
            <span
              aria-label="이미지 없음"
              title="대표 이미지가 없습니다"
              className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-dashed border-(--a2-line) bg-(--a2-raised) a2-t-xs text-(--a2-ink-4)"
            >
              —
            </span>
          ),
      },
      {
        key: "id",
        head: "상품 ID",
        width: "6rem",
        nowrap: true,
        value: (p) => p.id,
        cell: (p) => (
          <Link href={`/admin2/products/${p.id}`} className="a2-mono font-semibold text-(--a2-ink) hover:underline">
            {p.id}
          </Link>
        ),
      },
      {
        key: "name",
        head: "상품명",
        clip: true,
        value: (p) => `${p.name} ${p.summary}`,
        cell: (p) => (
          <span title={p.summary || p.name}>
            <span className="font-semibold text-(--a2-ink)">{p.name}</span>
            {p.summary && <span className="ml-2 a2-t-xs text-(--a2-ink-4)">{p.summary}</span>}
          </span>
        ),
      },
      {
        key: "kind",
        head: "종류",
        width: "5.5rem",
        nowrap: true,
        value: (p) => productKindLabel[p.kind],
        cell: (p) => <Tag>{productKindLabel[p.kind]}</Tag>,
      },
      {
        key: "price",
        head: "정가",
        width: "6.5rem",
        num: true,
        nowrap: true,
        value: (p) => p.price,
        sort: (p) => p.price,
        cell: (p) => <span className="a2-num text-(--a2-ink-3)">{won(p.price)}</span>,
      },
      {
        key: "sale",
        head: "판매가",
        width: "8rem",
        num: true,
        nowrap: true,
        value: (p) => paidPrice(p),
        sort: (p) => paidPrice(p),
        cell: (p) => {
          const rate = discountRate(p);
          return (
            <span className="inline-flex items-baseline justify-end gap-1.5">
              <span className="a2-num font-semibold text-(--a2-ink)">{won(paidPrice(p))}</span>
              {rate != null && (
                <span className="a2-num a2-t-xs font-bold" style={{ color: "var(--a2-danger)" }}>
                  −{rate}%
                </span>
              )}
            </span>
          );
        },
      },
      {
        /* 무엇으로 썼고 얼마나 채웠나. 갈래만 적으면 「마크다운인데 비어 있는 상품」이
           채운 것과 같아 보이고, 분량만 적으면 무엇으로 고치러 들어가야 할지 모른다 */
        key: "detail",
        head: "상세 내용",
        width: "8rem",
        nowrap: true,
        hide: "lg",
        value: (p) => detailModeLabel(p.detailMode),
        sort: (p) => detailModeLabel(p.detailMode),
        cell: (p) => {
          const empty = detailIsEmpty(p.detailMode, p.description, p.detailImages);
          const size =
            p.detailMode === "images"
              ? `${n(p.detailImages.length)}장`
              : `${n(p.description.length)}자`;
          return (
            <span className="inline-flex items-center gap-1.5">
              <Tag>{detailModeLabel(p.detailMode)}</Tag>
              {empty ? (
                <span className="a2-t-xs text-(--a2-ink-4)">비어 있음</span>
              ) : (
                <span className="a2-num a2-t-xs text-(--a2-ink-3)">{size}</span>
              )}
            </span>
          );
        },
      },
      {
        key: "state",
        head: "상태",
        width: "5.5rem",
        nowrap: true,
        value: (p) => productStateLabel[p.state],
        sort: (p) => productStateOrder.indexOf(p.state),
        cell: (p) => <Status tone={stateTone[p.state]}>{productStateLabel[p.state]}</Status>,
      },
      {
        key: "updatedAt",
        head: "고친 때",
        width: "8rem",
        nowrap: true,
        hide: "md",
        value: (p) => p.updatedAt,
        cell: (p) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{p.updatedAt}</span>,
      },
      {
        key: "act",
        head: "관리",
        width: "5rem",
        nowrap: true,
        cell: (p) => (
          <Link href={`/admin2/products/${p.id}`} className="a2-btn a2-btn-sm" aria-label={`${p.name} 수정하기`}>
            수정하기
          </Link>
        ),
      },
    ],
    [],
  );

  /* 상태는 머리의 탭이 맡는다. 여기에는 겹치지 않는 것만 둔다 */
  const filters = useMemo<Filter<Product>[]>(
    () => [
      {
        id: "kind",
        label: "종류",
        options: productKinds
          .filter((k) => rows.some((p) => p.kind === k))
          .map((k) => ({ value: k, label: productKindLabel[k] })),
        match: (p, v) => p.kind === v,
      },
      {
        id: "detailMode",
        label: "상세 편집기",
        options: detailModes
          .filter((m) => rows.some((p) => p.detailMode === m.id))
          .map((m) => ({ value: m.id, label: m.label })),
        match: (p, v) => p.detailMode === v,
      },
      {
        // 그림이 빠진 상품을 찾는 일이 잦다. 파는 화면에서 빈칸으로 나가는 줄이라서다
        id: "thumb",
        label: "대표 이미지",
        options: [{ value: "none", label: "없는 것만" }],
        match: (p, v) => (v === "none" ? !p.thumb : true),
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        title="상품 관리"
        tabsLabel="판매 상태별 조회 조건"
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
          <>
            <Link href="/admin2/payments" className="a2-btn">
              결제 내역
            </Link>
            <Link href="/admin2/products/new" className="a2-btn a2-btn-primary">
              상품 등록
            </Link>
          </>
        }
      />

      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(p) => p.id}
        pageSize={25}
        searchHint="상품명 · 상품 ID · 한 줄 소개"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
