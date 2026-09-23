import type { Metadata } from "next";
import PaymentHub from "@/components/account/PaymentHub";

export const metadata: Metadata = {
  title: "결제",
  description: "테스트를 고르고 결제할 학생을 골라 응시권을 결제합니다. (PAY-03)",
  robots: { index: false, follow: false },
};

/**
 * PAY-03 결제 — 회원 존 안에서 연다.
 *
 * 응시권 결제(/exam/payment)는 응시 존 껍데기를 쓰는 옛 화면이라 상품 목록이 코드에
 * 박혀 있고 학생을 고를 수 없다. 이 자리는 **관리자 차림표를 읽어 아이를 골라** 결제하는
 * 곳이다. 학생 목록에서 체크한 아이가 ?students=로 넘어온다.
 */
export default async function MyPaymentsPage({ searchParams }: PageProps<"/my/payments">) {
  const { students } = await searchParams;
  const initial = (Array.isArray(students) ? students.join(",") : (students ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return <PaymentHub initial={initial} />;
}
