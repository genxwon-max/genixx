import type { Metadata } from "next";
import StudentExams from "@/components/student/StudentExams";

export const metadata: Metadata = {
  title: "평가 보기",
  description: "국어·수학·과학을 이 화면에서 바로 응시합니다. (ASM-01)",
  robots: { index: false, follow: false },
};

export default function StudentExamsPage() {
  return <StudentExams />;
}
