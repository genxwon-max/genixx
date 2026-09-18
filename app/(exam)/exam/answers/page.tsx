import type { Metadata } from "next";
import AnswerKey from "@/components/exam/AnswerKey";
import ExamGate from "@/components/exam/ExamGate";
import ExamPaper from "@/components/exam/ExamPaper";

export const metadata: Metadata = {
  title: "정답과 해설",
  description: "응시를 마친 평가의 정답과 내 답을 확인합니다.",
  robots: { index: false, follow: false },
};

export default function AnswersPage() {
  return (
    <ExamPaper>
      <ExamGate>
        <AnswerKey />
      </ExamGate>
    </ExamPaper>
  );
}
