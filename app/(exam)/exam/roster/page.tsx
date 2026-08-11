import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import StudentRegistrar from "@/components/exam/StudentRegistrar";

export const metadata: Metadata = {
  title: "학원생 명부 관리",
  description: "학생을 등록하고 접속코드를 발급합니다. (ORG-02)",
  robots: { index: false, follow: false },
};

export default function RosterPage() {
  return (
    <ExamGate>
      <StudentRegistrar mode="director" />
    </ExamGate>
  );
}
