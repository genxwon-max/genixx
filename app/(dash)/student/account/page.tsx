import type { Metadata } from "next";
import StudentAccount from "@/components/student/StudentAccount";

export const metadata: Metadata = {
  title: "내 정보",
  description: "이름·학교·접속코드를 확인합니다. (ACC-04 학생)",
  robots: { index: false, follow: false },
};

export default function StudentAccountPage() {
  return <StudentAccount />;
}
