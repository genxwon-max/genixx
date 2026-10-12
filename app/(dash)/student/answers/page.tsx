import type { Metadata } from "next";
import StudentAnswers from "@/components/student/StudentAnswers";

export const metadata: Metadata = {
  title: "정답과 해설",
  description: "최종 제출을 마친 진단의 정답과 내 답을 확인합니다.",
  robots: { index: false, follow: false },
};

/** 접수한 진단 목록 — 최종 제출을 마친 줄을 누르면 그 진단의 정답(/student/answers/2026-3/e4)으로 들어간다 */
export default function StudentAnswersPage() {
  return <StudentAnswers />;
}
