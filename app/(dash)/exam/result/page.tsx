import type { Metadata } from "next";
import { Suspense } from "react";
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
      {/* 누구의 결과인지 ?student= 로 받는다 — useSearchParams는 경계가 있어야 한다 */}
      <Suspense
        fallback={
          <div className="container-x py-20 text-center text-[13px] text-soft-muted">
            결과를 불러오는 중입니다…
          </div>
        }
      >
        <ResultView />
      </Suspense>
    </ExamGate>
  );
}
