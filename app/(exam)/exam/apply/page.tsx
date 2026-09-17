import type { Metadata } from "next";
import ExamCatalog from "@/components/exam/ExamCatalog";
import ExamGate from "@/components/exam/ExamGate";
import ExamPaper from "@/components/exam/ExamPaper";

export const metadata: Metadata = {
  title: "접수하기",
  description: "회차와 학년을 골라 평가를 접수합니다.",
  robots: { index: false, follow: false },
};

export default function ApplyPage() {
  return (
    <ExamPaper>
      <ExamGate>
        <ExamCatalog />
      </ExamGate>
    </ExamPaper>
  );
}
