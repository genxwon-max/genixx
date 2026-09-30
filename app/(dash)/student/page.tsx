import type { Metadata } from "next";
import StudentHome from "@/components/student/StudentHome";

export const metadata: Metadata = {
  title: "학생 홈",
  description: "내 진단과 진행 상황, 다음 할 일. (ACC-03 학생)",
  robots: { index: false, follow: false },
};

/** 학생 홈 (/student) — 접속코드로 들어온 학생이 도착하는 자리 */
export default function StudentHomePage() {
  return <StudentHome />;
}
