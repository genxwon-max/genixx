import type { Metadata } from "next";
import PaymentHub from "@/components/account/PaymentHub";

export const metadata: Metadata = {
  title: "결제 · 상품 고르기",
  description: "고른 학생의 학년에 열린 진단과 상품을 고르고 결제합니다. (PAY-03)",
  robots: { index: false, follow: false },
};

/**
 * PAY-03 결제 ② 상품 고르기 · 결제 — 결제(/my/payments)에서 학생을 고르고 「다음」을 누르면
 * 서는 화면.
 *
 * 고른 아이는 저장소(lib/flowDraft.ts)에서 이어 받는다. 학생 목록에서 체크한 아이가
 * ?students=로 넘어오면 그 아이가 먼저다. 고른 아이 없이 들어오면 ①로 돌려보낸다.
 */
export default async function MyPaymentsCheckoutPage({
  searchParams,
}: PageProps<"/my/payments/checkout">) {
  const { students } = await searchParams;
  const seed = (Array.isArray(students) ? students.join(",") : (students ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return <PaymentHub view="checkout" seed={seed.length > 0 ? seed : undefined} />;
}
