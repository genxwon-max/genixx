import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import ResultView from "@/components/exam/ResultView";

export const metadata: Metadata = {
  title: "결과 리포트",
  description: "8재능 팔각형 프로파일과 전문가 평가를 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ResultPage() {
  return (
    <ExamGate>
      <ResultView />
    </ExamGate>
  );
}
