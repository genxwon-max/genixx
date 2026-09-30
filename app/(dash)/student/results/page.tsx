import type { Metadata } from "next";
import StudentResults from "@/components/student/StudentResults";

export const metadata: Metadata = {
  title: "진단 결과",
  description: "접수한 진단마다 결과가 어디까지 왔는지 보고, 발행된 결과지를 엽니다. (RPT-01)",
  robots: { index: false, follow: false },
};

/**
 * 진단 결과 (/student/results) — 진단마다 한 줄. 발행된 줄을 누르면 결과지
 * (/student/results/2026-3/e4)로 들어간다. 학생은 자기 것만 본다 — 볼 대상은 세션이 정한다.
 */
export default function StudentResultsPage() {
  return <StudentResults />;
}
