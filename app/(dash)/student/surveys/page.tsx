import type { Metadata } from "next";
import StudentSurveys from "@/components/student/StudentSurveys";

export const metadata: Metadata = {
  title: "내 설문",
  description: "학생 본인이 내는 설문과 제출 현황. (ASM-04)",
  robots: { index: false, follow: false },
};

export default function StudentSurveysPage() {
  return <StudentSurveys />;
}
