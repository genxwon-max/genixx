import type { Metadata } from "next";
import StudentInterviews from "@/components/student/StudentInterviews";

export const metadata: Metadata = {
  title: "면담 · 날짜와 시간",
  description: "만 14세 이상 학생이 고른 전문가의 달력에서 면담 날짜와 시간을 고릅니다. (ASM-06 학생)",
  robots: { index: false, follow: false },
};

/** ASM-06(학생) 면담 ② 날짜 · 시간 — 고른 전문가가 없으면 ①로 돌려보낸다 */
export default function StudentInterviewsTimePage() {
  return <StudentInterviews step="time" />;
}
