"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/authStore";
import SectionTitle from "@/components/exam/SectionTitle";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import {
  btnDisabled,
  btnGhost,
  btnPrimary,
  eyebrow,
  govTable,
  panel,
  td,
  tdStrong,
  th,
} from "@/components/exam/ui";

const products = [
  {
    id: "pilot",
    name: "2026 파일럿 응시권",
    desc: "국어(언어)·수학·과학 3과목 + 결과 리포트",
    price: 0,
    badge: "파일럿 무료",
  },
  {
    id: "single",
    name: "재능진단 단품",
    desc: "재능진단 1단계 + 결과 리포트 1회",
    price: 89000,
    badge: "정식 서비스 예정",
  },
  {
    id: "package",
    name: "진단 + 해석 상담 패키지",
    desc: "재능진단 1단계 + 인증 전문가 1:1 해석 상담 1회",
    price: 149000,
    badge: "정식 서비스 예정",
  },
];

const methods = [
  { id: "card", label: "신용·체크카드" },
  { id: "kakao", label: "카카오페이" },
  { id: "naver", label: "네이버페이" },
  { id: "transfer", label: "계좌이체" },
];

const won = (n: number) => (n === 0 ? "0원" : `${n.toLocaleString("ko-KR")}원`);

export default function PaymentForm() {
  const session = useSession();
  const [product, setProduct] = useState(products[0].id);
  const [method, setMethod] = useState(methods[0].id);
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);

  const picked = products.find((p) => p.id === product)!;
  const orderNo = `GX${new Date().getFullYear()}-000148`;

  if (done) {
    return (
      <div className="container-x py-16">
        <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-6 text-[22px] font-black text-exam-text">결제가 완료되었습니다</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
            주문번호 <b className="tabular-nums text-exam-text">{orderNo}</b> · {picked.name} ·{" "}
            {won(picked.price)}
            <br />
            영수증은 등록하신 이메일로 발송됩니다.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/exam" className={btnPrimary}>
              응시 현황으로
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/" className={btnGhost}>
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8 md:py-10">
      <div className="border-b-2 border-exam-text/80 pb-5">
        <p className={eyebrow}>PAY-03 · 결제</p>
        <h1 className="mt-2.5 text-[24px] font-black tracking-tight text-exam-text md:text-[28px]">
          응시권 결제
        </h1>
        <p className="mt-2 text-[12px] text-exam-muted">
          주문자 {session?.name ?? "-"} · 주문번호 {orderNo}
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <section>
            <SectionTitle note="2026 파일럿 회차는 전면 무료입니다. 정식 상품은 파일럿 종료 후 오픈됩니다.">
              상품 선택
            </SectionTitle>
            <ul className="space-y-2">
              {products.map((p) => {
                const on = product === p.id;
                return (
                  <li key={p.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-4 rounded-md border p-5 transition-colors ${
                        on ? "border-brand-700 bg-brand-50" : "border-exam-line bg-exam-panel hover:border-brand-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="product"
                        checked={on}
                        onChange={() => setProduct(p.id)}
                        className="mt-1 h-4 w-4 accent-[#1b2a6b]"
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-black text-exam-text">{p.name}</span>
                          <span className="rounded border border-exam-line px-2 py-0.5 text-[11px] font-bold text-exam-muted">
                            {p.badge}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-[13px] text-exam-muted">{p.desc}</span>
                      </span>
                      <span className="text-[16px] font-black tabular-nums text-exam-text">
                        {won(p.price)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-8">
            <SectionTitle>결제 수단</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-4">
              {methods.map((m) => {
                const on = method === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-3.5 text-[13px] font-bold transition-colors ${
                      on
                        ? "border-brand-700 bg-brand-50 text-exam-text"
                        : "border-exam-line bg-exam-panel text-exam-muted hover:border-brand-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      checked={on}
                      onChange={() => setMethod(m.id)}
                      className="sr-only"
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-exam-muted">
              시연용 화면입니다. 실제 결제창은 열리지 않으며 카드번호 등 결제 정보는 입력받지
              않습니다.
            </p>
          </section>
        </div>

        {/* 결제 요약 */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className={panel}>
            <div className="border-b border-exam-line px-5 py-4">
              <p className={eyebrow}>결제 금액</p>
            </div>
            <table className={govTable}>
              <tbody>
                <tr>
                  <th className={`${th} text-left`}>상품</th>
                  <td className={`${td} text-right`}>{picked.name}</td>
                </tr>
                <tr>
                  <th className={`${th} text-left`}>정가</th>
                  <td className={`${td} text-right tabular-nums`}>{won(picked.price)}</td>
                </tr>
                <tr>
                  <th className={`${th} text-left`}>할인</th>
                  <td className={`${td} text-right tabular-nums`}>0원</td>
                </tr>
                <tr>
                  <th className={`${th} text-left`}>최종 결제금액</th>
                  <td className={`${tdStrong} text-right tabular-nums`}>{won(picked.price)}</td>
                </tr>
              </tbody>
            </table>

            <div className="px-5 py-4">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1b2a6b]"
                />
                <span className="text-[12px] leading-relaxed text-exam-muted">
                  <b className="text-exam-text">(필수)</b> 결제 내용과{" "}
                  <Link href="/legal/refund" className="underline">
                    환불·청약철회 규정
                  </Link>
                  을 확인했습니다.
                </span>
              </label>

              <button
                type="button"
                onClick={() => agree && setDone(true)}
                aria-disabled={!agree}
                className={`mt-4 w-full ${agree ? btnPrimary : btnDisabled}`}
              >
                {picked.price === 0 ? "무료로 신청하기" : `${won(picked.price)} 결제하기`}
              </button>
              <p className="mt-2.5 text-[11px] leading-relaxed text-exam-muted">
                리포트 발행 전에는 전액 환불됩니다. 발행 후에는 디지털 콘텐츠 제공 완료로 환불이
                제한됩니다.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
