import type { Metadata } from "next";
import StudentInterviews from "@/components/student/StudentInterviews";

export const metadata: Metadata = {
  title: "면담 · 결제",
  description: "만 14세 이상 학생이 면담 방식을 고르고 결제해 면담을 확정합니다. (ASM-06 학생)",
  robots: { index: false, follow: false },
};

/** ASM-06(학생) 면담 ③ 방식 · 결제 — 앞에서 고른 것이 비어 있으면 그 걸음으로 돌려보낸다 */
export default function StudentInterviewsPayPage() {
  return <StudentInterviews step="pay" />;
}
