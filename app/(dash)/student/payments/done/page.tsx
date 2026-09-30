import type { Metadata } from "next";
import StudentPayments from "@/components/student/StudentPayments";

export const metadata: Metadata = {
  title: "결제 완료",
  description: "만 14세 이상 학생이 결제한 주문을 확인합니다. (PAY-03 학생)",
  robots: { index: false, follow: false },
};

/** PAY-03(학생) 결제 완료 — ?order=로 주문을 가리키고, 없으면 가장 최근 결제 */
export default async function StudentPaymentsDonePage({
  searchParams,
}: PageProps<"/student/payments/done">) {
  const { order } = await searchParams;
  return (
    <StudentPayments view="done" orderId={Array.isArray(order) ? order[0] : order} />
  );
}
