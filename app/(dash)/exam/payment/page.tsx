import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import PaymentForm from "@/components/account/PaymentForm";

export const metadata: Metadata = {
  title: "응시권 결제",
  description: "응시권을 선택하고 결제합니다. (PAY-03)",
  robots: { index: false, follow: false },
};

export default function PaymentPage() {
  return (
    <ExamGate>
      <PaymentForm />
    </ExamGate>
  );
}
