import type { Metadata } from "next";
import PaymentHub from "@/components/account/PaymentHub";

export const metadata: Metadata = {
  title: "결제 완료",
  description: "결제와 접수가 끝난 주문을 확인합니다. (PAY-03)",
  robots: { index: false, follow: false },
};

/**
 * PAY-03 결제 완료 — 상품 화면(/my/payments/checkout)에서 결제를 마치면 그 자리를 갈아
 * 끼우는 영수증. ?order=로 주문을 가리키고, 없으면 가장 최근 결제를 세운다.
 */
export default async function MyPaymentsDonePage({ searchParams }: PageProps<"/my/payments/done">) {
  const { order } = await searchParams;
  return <PaymentHub view="done" orderId={Array.isArray(order) ? order[0] : order} />;
}
