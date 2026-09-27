import type { Metadata } from "next";
import StudentPayments from "@/components/student/StudentPayments";

export const metadata: Metadata = {
  title: "결제",
  description: "만 14세 이상 학생이 자기 응시권과 면담을 결제합니다. (PAY-03 학생)",
  robots: { index: false, follow: false },
};

/**
 * PAY-03(학생) 결제 — 만 14세 이상 학생 대시보드에만 서는 자리.
 *
 * 보호자 결제(/my/payments)와 판은 같고 세우는 학생만 다르다. 만 14세 미만 학생은 이
 * 주소에 들어와도 까닭만 읽고 돌아간다 — 나이 갈래는 화면 쪽에서 본다(StudentPayments).
 */
export default function StudentPaymentsPage() {
  return <StudentPayments />;
}
