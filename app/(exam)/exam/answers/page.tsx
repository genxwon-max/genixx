import type { Metadata } from "next";
import AnswerKey from "@/components/exam/AnswerKey";
import ExamGate from "@/components/exam/ExamGate";

export const metadata: Metadata = {
  title: "정답과 해설",
  description: "응시를 마친 평가의 정답과 내 답을 확인합니다.",
  robots: { index: false, follow: false },
};

export default function AnswersPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        <AnswerKey />
      </ExamGate>
    </div>
  );
}
