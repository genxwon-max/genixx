import type { Metadata } from "next";
import StudentApply from "@/components/student/StudentApply";

export const metadata: Metadata = {
  title: "진단 접수",
  description: "분기와 학년을 골라 진단을 접수합니다.",
  robots: { index: false, follow: false },
};

/**
 * 진단 접수 — 학생 대시보드에서 진단을 골라 접수한다.
 * 접수 확인 · 완료 창은 주소가 들고 있다(/student/apply?apply=2026-3&track=e3).
 */
export default function StudentApplyPage() {
  return <StudentApply />;
}
