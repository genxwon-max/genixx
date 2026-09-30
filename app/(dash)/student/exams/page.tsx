import type { Metadata } from "next";
import StudentExams from "@/components/student/StudentExams";

export const metadata: Metadata = {
  title: "내 진단",
  description: "접수한 진단을 한 줄씩 보고, 눌러 들어가 국어·수학·과학을 응시합니다. (ASM-01)",
  robots: { index: false, follow: false },
};

/** 접수한 진단 목록 — 줄을 누르면 진단 한 건(/student/exams/2026-3/e4)으로 들어간다 */
export default function StudentExamsPage() {
  return <StudentExams />;
}
