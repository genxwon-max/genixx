import type { Metadata } from "next";
import StudentInterviews from "@/components/student/StudentInterviews";

export const metadata: Metadata = {
  title: "면담 신청 완료",
  description: "만 14세 이상 학생이 신청한 면담을 확인합니다. (ASM-06 학생)",
  robots: { index: false, follow: false },
};

/** ASM-06(학생) 면담 신청 완료 — ?order=로 주문을 가리키고, 없으면 가장 최근 면담 결제 */
export default async function StudentInterviewsDonePage({
  searchParams,
}: PageProps<"/student/interviews/done">) {
  const { order } = await searchParams;
  return <StudentInterviews step="done" orderId={Array.isArray(order) ? order[0] : order} />;
}
