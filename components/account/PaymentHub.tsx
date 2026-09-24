"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/examStore";
import { orderMethods, orderWon, useOrders, type Order } from "@/lib/orderStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { eyebrow } from "@/components/exam/ui";
import CounselPayPanel from "./CounselPayPanel";
import ExamPayPanel from "./ExamPayPanel";
import { card, listTd, listTh } from "./ui";

/**
 * PAY-03 결제 (/my/payments) — 파는 것이 두 갈래다.
 *
 *   진단평가  열려 있는 평가를 골라, 그 평가를 볼 학생을 고르고 결제한다. 결제와 동시에
 *             접수까지 끝나 학생 화면에 그 평가가 올라온다.
 *   면담      30분 · 60분 차림표. 결제는 전문가·날짜·시각을 고른 예약 화면에서 한다.
 *
 * ── 왜 한 화면에 두 갈래인가 ──
 * 보호자가 돈을 쓰는 자리는 이 둘뿐이고, 둘을 메뉴로 갈라 두면 「내가 뭘 결제했더라」를
 * 두 곳에서 물어야 한다. 갈래는 탭으로 나누되 **결제 내역은 한 장부**다.
 *
 * ── 두 갈래가 결제를 서로 다른 자리에서 하는 까닭 ──
 * 응시권은 무엇을 사는지가 결제 순간에 다 정해진다(어느 평가 · 어느 아이). 면담은 사람과
 * 시각이 정해져야 값이 뜻을 갖는다 — 자리를 잡지 않은 권을 먼저 팔면 쓸 수 없는 권이
 * 남는다. 그래서 면담 판은 차림표만 펴고 예약 화면으로 넘긴다.
 *
 * ⚠ 시연 화면이다. 실제 결제창은 열리지 않고 기록은 브라우저에만 남는다(lib/orderStore.ts).
 */

type Tab = "exam" | "counsel";

const tabs: { id: Tab; label: string; note: string }[] = [
  { id: "exam", label: "진단평가", note: "평가를 골라 학생 앞으로 접수합니다" },
  { id: "counsel", label: "면담", note: "30분 · 60분 1:1 결과 해석 면담" },
];

/** 면담 결제인가 — 주문 번호가 아니라 상품 번호로 가른다(CS-30 · CS-60) */
const isCounsel = (o: Order) => o.productId.startsWith("CS-");

export default function PaymentHub({
  /** 학생 목록에서 체크해 넘어온 아이 — /my/payments?students=S-1,S-2 */
  initial = [],
  variant = 2,
}: {
  initial?: string[];
  variant?: Variant;
}) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const orders = useOrders();
  const [tab, setTab] = useState<Tab>("exam");

  /* 내역은 한 장부이되, 보고 있는 갈래만 세운다 — 면담을 보러 온 사람에게 응시권 줄까지
     같이 세우면 무엇을 확인하러 왔는지가 흐려진다 */
  const rows = orders.filter((o) => (tab === "counsel" ? isCounsel(o) : !isCounsel(o)));

  return (
    <>
      <header className="mb-5 border-b border-soft-line pb-5">
        <p className={eyebrow}>진단평가 · 면담</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          결제
        </h1>
        <p className={`mt-2 text-[13px] leading-[1.7] ${t.muted}`}>
          응시권과 면담을 이 자리에서 결제합니다. 결제하신 내역은 갈래마다 아래에 쌓입니다.
        </p>
      </header>

      {/* 갈래 — 탭 */}
      <div role="tablist" aria-label="결제 갈래" className="mb-6 flex gap-2">
        {tabs.map((v) => {
          const on = tab === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(v.id)}
              className={`flex-1 rounded-[14px] border px-4 py-3.5 text-left transition-colors sm:flex-none sm:min-w-[13rem] ${
                on
                  ? "border-soft-primary bg-soft-primary-soft"
                  : "border-soft-line bg-white hover:border-soft-primary"
              }`}
            >
              <span
                className={`block text-[15px] font-bold ${on ? "text-soft-primary" : "text-soft-ink"}`}
              >
                {v.label}
              </span>
              <span className="mt-0.5 block text-[12px] text-soft-muted">{v.note}</span>
            </button>
          );
        })}
      </div>

      {tab === "exam" ? (
        <ExamPayPanel initial={initial} variant={variant} />
      ) : (
        <CounselPayPanel variant={variant} />
      )}

      {/* 결제 내역 — 보고 있는 갈래만 */}
      <section className="mt-10">
        <SectionTitle note="이 브라우저에서 한 결제가 쌓입니다.">
          {tab === "counsel" ? "면담 결제 내역" : "진단평가 결제 내역"}
        </SectionTitle>

        {/* 줄이 없으면 표를 세우지 않는다 — 가로로 긴 표 한가운데 적은 글은 좁은 화면에서
            화면 밖에 놓여, 빈 상자만 보인다 */}
        {!hydrated || rows.length === 0 ? (
          <p className={`${card} px-5 py-12 text-center text-[13px] text-soft-muted`}>
            {!hydrated
              ? "확인 중입니다…"
              : tab === "counsel"
                ? "아직 결제한 면담이 없습니다."
                : "아직 결제한 평가가 없습니다."}
          </p>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[40rem] border-collapse">
              <caption className="sr-only">지난 결제 내역</caption>
              <thead>
                <tr>
                  <th className={listTh}>주문번호</th>
                  <th className={listTh}>결제일</th>
                  <th className={listTh}>상품</th>
                  <th className={listTh}>학생</th>
                  <th className={listTh}>수단</th>
                  <th className={listTh}>금액</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className={`${listTd} tabular-nums`}>{o.id}</td>
                    <td className={`${listTd} tabular-nums`}>{o.paidAt}</td>
                    <td className={`${listTd} text-left text-soft-ink`}>
                      {o.productName}
                      {/* 한 벌이 아니면 몇 벌인지 적는다 — 면담 두 자리를 한 번에 사면
                          금액만 보고는 두 배로 낸 것처럼 읽힌다 */}
                      {o.qty > 1 && (
                        <span className="mt-0.5 block text-[12px] tabular-nums text-soft-muted">
                          {orderWon(o.unit)} × {o.qty}
                        </span>
                      )}
                    </td>
                    <td className={`${listTd} text-left`}>
                      {o.students.map((s) => s.name).join(" · ")}
                    </td>
                    <td className={listTd}>{orderMethods[o.method]}</td>
                    <td className={`${listTd} font-semibold tabular-nums text-soft-ink`}>
                      {orderWon(o.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "counsel" && rows.length > 0 && (
          <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
            잡아 둔 면담 일정과 취소는{" "}
            <Link href="/my/interviews" className="font-semibold text-soft-primary hover:underline">
              면담
            </Link>{" "}
            화면에서 보실 수 있습니다.
          </p>
        )}
      </section>
    </>
  );
}
