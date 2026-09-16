import type { Metadata } from "next";
import ExamCatalog from "@/components/exam/ExamCatalog";
import ExamGate from "@/components/exam/ExamGate";

export const metadata: Metadata = {
  title: "접수하기",
  description: "회차와 학년을 골라 평가를 접수합니다.",
  robots: { index: false, follow: false },
};

export default function ApplyPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        <ExamCatalog />
      </ExamGate>
    </div>
  );
}
