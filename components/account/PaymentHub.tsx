"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import { orderMethods, orderWon, placeOrder, useOrders, type OrderMethod } from "@/lib/orderStore";
import {
  discountRate,
  paidPrice,
  productKindLabel,
  useProducts,
  type Product,
} from "@/lib/productStore";
import { useRoster } from "@/lib/roster";
import { grantTickets, ticketsLeft, useTickets, walletOf } from "@/lib/ticketStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { CheckIcon } from "@/components/Icons";
import { eyebrow } from "@/components/exam/ui";
import { PickBox } from "./SendCodes";
import { card, listTd, listTh } from "./ui";

/**
 * PAY-03 결제 (/my/payments) — 무엇을, 누구 앞으로.
 *
 * 보호자가 결제에서 정하는 것은 둘뿐이다 — **어느 테스트**를 **어느 아이**에게. 그
 * 둘을 한 화면에 세로로 잇고, 오른쪽에 금액을 붙여 둔다. 상품 고르는 화면과 아이 고르는
 * 화면을 나누면 형제자매가 둘인 집에서 같은 걸음을 두 번 걷게 되고, 두 번째 걸음에서는
 * 무엇을 골랐는지 위에 없다.
 *
 * ── 인원이 곧 수량이다 ──
 * 수량 칸을 두지 않는다. 응시권은 사람 앞으로 발급되는 것이라 「2매」라는 값이 혼자
 * 서면 누구 것인지가 없다. 고른 아이 수가 매수이고, 그 수가 그대로 금액에 곱해진다.
 *
 * ── 차림표는 관리자 것을 그대로 읽는다 ──
 * 파는 것의 목록은 상품 관리(PAY-01, lib/productStore.ts)가 주인이다. 여기에 이름과
 * 가격을 다시 적어 두면 관리자가 값을 내린 날 보호자 화면만 옛 가격으로 남는다.
 * 「판매중」인 것만 세운다 — 숨김·작성 중은 아직 손이 가는 중인 상품이다.
 *
 * ── 결제하고 나면 응시권이 는다 ──
 * 응시권 갈래(응시권·묶음)를 산 결제는 고른 아이의 지갑(lib/ticketStore.ts)에 한 매씩
 * 얹는다. 리포트처럼 발급할 것이 없는 상품은 내역만 남는다 — 사 놓고 아무 일도 일어나지
 * 않으면 보호자는 결제가 된 것인지 물어야 한다.
 *
 * ⚠ 시연 화면이다. 실제 결제창은 열리지 않고 카드번호 같은 결제 정보도 받지 않는다.
 *   기록은 브라우저에만 남는다(lib/orderStore.ts).
 */

/** 이 갈래를 사면 응시권이 발급된다 */
const grantsTicket = (p: Product) => p.kind === "assessment" || p.kind === "bundle";

const methodOrder: OrderMethod[] = ["card", "kakao", "naver", "transfer"];

/** 정가 표기 — 0원짜리 파일럿 응시권이 「0원」으로 서면 값을 못 정한 것처럼 보인다 */
const priceText = (v: number) => (v === 0 ? "무료" : `${v.toLocaleString("ko-KR")}원`);

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
  const session = useSession();
  const roster = useRoster();
  const products = useProducts();
  const tickets = useTickets();
  const orders = useOrders();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = useMemo(
    () => roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent")),
    [roster, isOrg],
  );

  const selling = useMemo(() => products.filter((p) => p.state === "selling"), [products]);

  const [productId, setProductId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const [method, setMethod] = useState<OrderMethod>("card");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  /* 고른 상품이 목록에서 사라졌을 수 있다(관리자가 내림). 없으면 첫 줄로 돌린다 */
  const product = selling.find((p) => p.id === productId) ?? selling[0] ?? null;

  const chosen = mine.filter((s) => picked.has(s.id));
  const unit = product ? paidPrice(product) : 0;
  const total = unit * chosen.length;
  const canPay = !!product && chosen.length > 0 && agree;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allPicked = mine.length > 0 && mine.every((s) => picked.has(s.id));

  function pay() {
    if (!product || chosen.length === 0) return;
    const order = placeOrder({
      productId: product.id,
      productName: product.name,
      grantsTicket: grantsTicket(product),
      students: chosen.map((s) => ({ id: s.id, name: s.name })),
      unit,
      method,
    });
    /* 발급은 결제가 적힌 다음에 한다 — 먼저 얹고 기록이 실패하면 어디서 온 응시권인지 모른다 */
    if (order.grantsTicket) for (const s of chosen) grantTickets(s.id, 1);
    setDone(order.id);
  }

  const paidOrder = done ? orders.find((o) => o.id === done) ?? null : null;

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>응시권 · 리포트</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          결제
        </h1>
        <p className={`mt-2 text-[13px] leading-[1.7] ${t.muted}`}>
          테스트를 고르고, 누구 앞으로 결제할지 고르시면 됩니다. 응시권은 결제와 동시에 고른
          학생에게 한 매씩 발급되고, 접수는 학생이 자기 화면에서 합니다.
        </p>
      </header>

      {paidOrder ? (
        /* 결제가 끝난 뒤 — 흐름을 걷고 영수증만 남긴다. 아래 내역은 그대로 둔다 */
        <section className={`${card} p-7 text-center sm:p-9`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[20px] font-bold text-soft-ink">결제가 완료되었습니다</h2>
          <p className="mt-2.5 text-[13.5px] leading-[1.8] text-soft-muted">
            주문번호 <b className="tabular-nums text-soft-ink">{paidOrder.id}</b> ·{" "}
            {paidOrder.productName} · {orderWon(paidOrder.amount)}
            <br />
            {paidOrder.students.map((s) => s.name).join(" · ")} · 총{" "}
            {paidOrder.students.length}명
            {paidOrder.grantsTicket && " · 응시권 1매씩 발급"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/my/children" className={t.btnAction}>
              학생 목록으로
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setPicked(new Set());
                setAgree(false);
              }}
              className={t.btnOutline}
            >
              다른 결제 하기
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div>
            {/* ① 테스트 */}
            <section>
              <SectionTitle note="상품과 가격은 운영자가 정한 차림표를 그대로 보여 드립니다.">
                테스트 고르기
              </SectionTitle>

              {selling.length === 0 ? (
                <p className={`${card} px-5 py-8 text-center text-[13px] text-soft-muted`}>
                  지금 판매 중인 상품이 없습니다. 회차가 열리면 이 자리에 올라옵니다.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {selling.map((p) => {
                    const on = product?.id === p.id;
                    const off = discountRate(p);
                    return (
                      <li key={p.id}>
                        <label className={`${t.pick} ${on ? t.pickOn : t.pickOff} cursor-pointer`}>
                          <span className="flex items-start gap-3.5">
                            <input
                              type="radio"
                              name="product"
                              checked={on}
                              onChange={() => setProductId(p.id)}
                              className="mt-1 h-4 w-4 accent-[#365eef]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-[15px] font-bold text-soft-ink">
                                  {p.name}
                                </span>
                                <span className="rounded-full border border-soft-line px-2 py-0.5 text-[11.5px] font-semibold text-soft-muted">
                                  {productKindLabel[p.kind]}
                                </span>
                              </span>
                              <span className="mt-1.5 block text-[13px] leading-[1.7] text-soft-muted">
                                {p.summary}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {off !== null && (
                                <span className="block text-[12px] text-slate-400 line-through tabular-nums">
                                  {priceText(p.price)}
                                </span>
                              )}
                              <span className="text-[16px] font-bold tabular-nums text-soft-ink">
                                {priceText(paidPrice(p))}
                              </span>
                              {off !== null && (
                                <span className="ml-1.5 text-[12.5px] font-bold text-soft-primary">
                                  {off}%
                                </span>
                              )}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ② 학생 */}
            <section className="mt-8">
              <SectionTitle
                note="고른 사람 수가 그대로 매수이자 결제 인원입니다."
                right={
                  mine.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPicked(allPicked ? new Set() : new Set(mine.map((s) => s.id)))
                      }
                      className="text-[13px] font-semibold text-soft-primary hover:underline"
                    >
                      {allPicked ? "전체 해제" : "전체 선택"}
                    </button>
                  )
                }
              >
                결제할 학생
              </SectionTitle>

              <div className={`${card} overflow-x-auto`}>
                <table className="w-full min-w-[26rem] border-collapse">
                  <caption className="sr-only">결제할 학생 고르기</caption>
                  <colgroup>
                    <col className="w-[3rem]" />
                    <col className="w-[28%]" />
                    <col />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={listTh}>
                        <span className="sr-only">선택</span>
                      </th>
                      <th className={listTh}>이름</th>
                      <th className={listTh}>학교 · 학년</th>
                      <th className={listTh}>남은 응시권</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hydrated ? (
                      <tr>
                        <td colSpan={4} className={`${listTd} py-12`}>
                          확인 중입니다…
                        </td>
                      </tr>
                    ) : mine.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={`${listTd} py-12`}>
                          <p className="text-[15px] font-bold text-soft-ink">
                            아직 등록된 학생이 없습니다
                          </p>
                          <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
                            응시권은 학생 앞으로 발급됩니다. 학생을 먼저 등록해 주세요.
                          </p>
                          <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
                            등록하러 가기
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      mine.map((s) => {
                        const on = picked.has(s.id);
                        const left = ticketsLeft(walletOf(tickets, s.id));
                        return (
                          <tr
                            key={s.id}
                            className={on ? "bg-soft-primary-soft/60" : undefined}
                            onClick={() => toggle(s.id)}
                          >
                            {/* 줄 전체가 눌리는 자리라, 체크상자에서는 클릭을 위로 올리지
                                않는다 — 그대로 두면 한 번 누를 때 두 번 뒤집혀 아무 일도
                                일어나지 않는다 */}
                            <td className={listTd} onClick={(e) => e.stopPropagation()}>
                              <PickBox
                                checked={on}
                                onChange={() => toggle(s.id)}
                                label={`${s.name} 선택`}
                              />
                            </td>
                            <td className={`${listTd} text-left text-[14px] font-bold text-soft-ink`}>
                              {s.name}
                            </td>
                            <td className={`${listTd} text-left`}>
                              {s.school ?? "—"}
                              {s.grade && <span className="ml-1.5">{s.grade}</span>}
                            </td>
                            <td className={`${listTd} tabular-nums`}>
                              <span className={left === 0 ? "font-semibold text-rose-600" : ""}>
                                {left}매
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ③ 결제 수단 */}
            <section className="mt-8">
              <SectionTitle>결제 수단</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-4">
                {methodOrder.map((m) => {
                  const on = method === m;
                  return (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center justify-center rounded-[12px] border px-3 py-3.5 text-[13.5px] font-semibold transition-colors ${
                        on
                          ? "border-soft-primary bg-soft-primary-soft text-soft-ink"
                          : "border-soft-line bg-white text-soft-muted hover:border-soft-primary"
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        checked={on}
                        onChange={() => setMethod(m)}
                        className="sr-only"
                      />
                      {orderMethods[m]}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[12.5px] leading-[1.7] text-soft-muted">
                시연용 화면이라 실제 결제창은 열리지 않으며, 카드번호 등 결제 정보는 이 화면이
                받지 않습니다.
              </p>
            </section>
          </div>

          {/* 결제 요약 — 넓은 화면에서는 따라다닌다 */}
          <aside className="lg:sticky lg:top-[5rem] lg:self-start">
            <div className={card}>
              <p className="border-b border-soft-line px-5 py-4 text-[14px] font-bold text-soft-ink">
                결제 금액
              </p>
              <dl className="space-y-2.5 px-5 py-4 text-[13.5px]">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-soft-muted">상품</dt>
                  <dd className="text-right font-semibold text-soft-ink">
                    {product?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-soft-muted">한 사람 몫</dt>
                  <dd className="tabular-nums text-soft-ink">{priceText(unit)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-soft-muted">인원</dt>
                  <dd className="tabular-nums text-soft-ink">{chosen.length}명</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="font-semibold text-soft-ink">최종 결제금액</dt>
                  <dd className="text-[17px] font-bold tabular-nums text-soft-ink">
                    {priceText(total)}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-slate-100 px-5 py-4">
                {chosen.length > 0 && (
                  <p className="mb-3 text-[12.5px] leading-[1.7] text-soft-muted">
                    {chosen.map((s) => s.name).join(" · ")}
                    {product && grantsTicket(product) && " 앞으로 응시권 1매씩 발급됩니다."}
                  </p>
                )}
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#365eef]"
                  />
                  <span className="text-[12.5px] leading-[1.7] text-soft-muted">
                    <b className="text-soft-ink">(필수)</b> 결제 내용과{" "}
                    <Link href="/legal/refund" className="underline">
                      환불·청약철회 규정
                    </Link>
                    을 확인했습니다.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={pay}
                  disabled={!canPay}
                  className={`${t.btnPrimary} mt-4`}
                >
                  {chosen.length === 0
                    ? "학생을 골라 주세요"
                    : total === 0
                      ? `${chosen.length}명 무료로 신청하기`
                      : `${priceText(total)} 결제하기`}
                </button>
                <p className="mt-2.5 text-[11.5px] leading-[1.7] text-soft-muted">
                  리포트 발행 전에는 전액 환불됩니다. 발행 후에는 디지털 콘텐츠 제공 완료로
                  환불이 제한됩니다.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 결제 내역 — 이 브라우저에 남은 것만 */}
      <section className="mt-10">
        <SectionTitle note="이 화면에서 한 결제가 쌓입니다.">결제 내역</SectionTitle>
        {/* 줄이 없으면 표를 세우지 않는다 — 가로로 긴 표 한가운데 적은 글은 좁은 화면에서
            화면 밖에 놓여, 빈 상자만 보인다 */}
        {!hydrated || orders.length === 0 ? (
          <p className={`${card} px-5 py-12 text-center text-[13px] text-soft-muted`}>
            {hydrated ? "아직 결제한 내역이 없습니다." : "확인 중입니다…"}
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
                {orders.map((o) => (
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
      </section>
    </>
  );
}
