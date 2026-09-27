import type { Metadata } from "next";
import StudentExams from "@/components/student/StudentExams";

export const metadata: Metadata = {
  title: "내 평가",
  description: "접수한 평가와 응시 상태. 평가 페이지로 건너갑니다. (ASM-01)",
  robots: { index: false, follow: false },
};

export default function StudentExamsPage() {
  return <StudentExams />;
}
