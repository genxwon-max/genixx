"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/examStore";
import { orderMethods, orderWon, useOrders, type Order } from "@/lib/orderStore";
import type { Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import CounselPayPanel from "./CounselPayPanel";
import ExamPayPanel, { PayDone } from "./ExamPayPanel";
import { card, listTd, listTh } from "./ui";

/**
 * PAY-03 결제 (/my/payments) — 파는 것이 두 갈래다.
 *
 *   진단평가  열려 있는 평가를 골라, 그 평가를 볼 학생을 고르고 결제한다. 결제와 동시에
 *             접수까지 끝나 학생 화면에 그 평가가 올라온다.
 *   면담      30분 · 60분 차림표. 결제는 전문가·날짜·시각을 고른 예약 화면에서 한다.
 *
 * ── 화면마다 주소가 따로다 ──
 *   /my/payments              진단평가 ① 학생 선택 · 결제 내역
 *   /my/payments?tab=counsel  면담 차림표 · 면담 결제 내역
 *   /my/payments/checkout     진단평가 ② 상품 고르기 · 결제
 *   /my/payments/done         결제 완료
 * 화면 하나하나를 주소로 가리켜 디자인으로 넘길 수 있게 갈래 탭도 링크로 둔다.
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
 * ── 학생이 자기 몫을 살 때 ──
 * 만 14세 이상 학생은 이 판을 자기 자리(/student/payments)에서 연다. 그때 selfId가
 * 넘어오고, 세우는 학생과 쌓는 내역이 **자기 것 하나로** 좁혀진다. 한 브라우저에 형제의
 * 주문이 함께 남아 있을 때 남의 결제가 내 장부에 서지 않게 하려고 걸러 둔다. 고를 아이가
 * 자기 하나라 진단평가 갈래는 학생 걸음 없이 곧바로 상품 화면이다.
 *
 * ⚠ 시연 화면이다. 실제 결제창은 열리지 않고 기록은 브라우저에만 남는다(lib/orderStore.ts).
 */

export type PayTab = "exam" | "counsel";

const tabs: { id: PayTab; label: string }[] = [
  { id: "exam", label: "재능 진단" },
  { id: "counsel", label: "면담" },
];

/** 면담 결제인가 — 주문 번호가 아니라 상품 번호로 가른다(CS-30 · CS-60) */
const isCounsel = (o: Order) => o.productId.startsWith("CS-");

export default function PaymentHub({
  /** 이 주소가 세우는 화면 — 결제 첫 화면 · 상품 고르기(/checkout) · 결제 완료(/done) */
  view = "hub",
  /** 첫 화면의 갈래 — /my/payments?tab=counsel */
  tab = "exam",
  /** 주소로 들고 온 아이 — 학생 목록의 「결제 필요」가 /my/payments/checkout?students=S-1 로 보낸다 */
  seed,
  /** 영수증에 세울 주문 — /my/payments/done?order=GX2026-000148 */
  orderId,
  /** 학생 본인이 자기 몫을 결제하는 자리에서 넘어오는 학생 ID(/student/payments) */
  selfId,
  variant = 2,
}: {
  view?: "hub" | "checkout" | "done";
  tab?: PayTab;
  seed?: string[];
  orderId?: string;
  selfId?: string;
  variant?: Variant;
}) {
  const hydrated = useHydrated();
  const orders = useOrders();
  const base = selfId ? "/student/payments" : "/my/payments";

  /* 내역은 한 장부이되, 보고 있는 갈래만 세운다 — 면담을 보러 온 사람에게 응시권 줄까지
     같이 세우면 무엇을 확인하러 왔는지가 흐려진다 */
  const rows = orders.filter(
    (o) =>
      (tab === "counsel" ? isCounsel(o) : !isCounsel(o)) &&
      /* 학생 본인 자리에서는 내 이름이 든 주문만 — 한 브라우저에 형제의 주문이 함께 남는다 */
      (!selfId || o.students.some((s) => s.id === selfId)),
  );

  return (
    <>
      {/* 결제하러 온 화면이라 머리는 제목 한 줄과 갈래 탭만 둔다. 갈래 탭은 작은 밑줄 탭 —
          큰 카드 둘로 세웠더니 상품보다 갈래가 먼저 눈에 들어왔다. 상품 고르기·완료 화면은
          재능 진단 갈래 안의 걸음이라 탭을 세우지 않는다 */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-soft-line">
        <h1 className="pb-3 text-[24px] font-bold tracking-tight text-soft-ink">결제</h1>
        {view === "hub" && (
          <nav aria-label="결제 종류" className="flex gap-5">
            {tabs.map((v) => {
              const on = tab === v.id;
              return (
                <Link
                  key={v.id}
                  href={v.id === "exam" ? base : `${base}?tab=${v.id}`}
                  aria-current={on ? "page" : undefined}
                  className={`-mb-px border-b-2 pb-3 text-[14px] transition-colors ${
                    on
                      ? "border-soft-primary font-bold text-soft-primary"
                      : "border-transparent font-medium text-soft-muted hover:text-soft-ink"
                  }`}
                >
                  {v.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {view === "done" ? (
        <PayDone orderId={orderId} selfId={selfId} variant={variant} />
      ) : view === "checkout" ? (
        <ExamPayPanel step="product" seed={seed} selfId={selfId} variant={variant} />
      ) : tab === "exam" ? (
        <ExamPayPanel step={selfId ? "product" : "student"} selfId={selfId} variant={variant} />
      ) : (
        <CounselPayPanel zone={selfId ? "/student" : "/my"} variant={variant} />
      )}

      {/* 결제 내역 — 첫 화면에만, 보고 있는 갈래만 */}
      {view === "hub" && (
        <section className="mt-10">
          <SectionTitle>{tab === "counsel" ? "면담 결제 내역" : "결제 내역"}</SectionTitle>

          {/* 줄이 없으면 표를 세우지 않는다 — 가로로 긴 표 한가운데 적은 글은 좁은 화면에서
              화면 밖에 놓여, 빈 상자만 보인다 */}
          {!hydrated || rows.length === 0 ? (
            <p className={`${card} px-5 py-12 text-center text-[13px] text-soft-muted`}>
              {!hydrated
                ? "확인 중입니다…"
                : tab === "counsel"
                  ? "아직 결제한 면담이 없습니다."
                  : "아직 결제한 진단이 없습니다."}
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
              <Link
                href={selfId ? "/student/interviews" : "/my/interviews"}
                className="font-semibold text-soft-primary hover:underline"
              >
                면담
              </Link>{" "}
              화면에서 보실 수 있습니다.
            </p>
          )}
        </section>
      )}
    </>
  );
}
