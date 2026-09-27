import type { Metadata } from "next";
import { Suspense } from "react";
import ResultView from "@/components/exam/ResultView";

export const metadata: Metadata = {
  title: "응시 결과",
  description: "8재능 팔각형 프로파일과 전문가 평가를 확인합니다. (RPT-01)",
  robots: { index: false, follow: false },
};

/**
 * 응시 결과 (/student/results).
 *
 * 리포트 화면은 보호자·기관과 같은 것(ResultView)을 쓰고 껍데기만 학생 레일이다. 볼 대상은
 * 세션이 정하므로 ?student= 를 붙이지 않는다 — 학생은 자기 것만 본다.
 * (useSearchParams가 안에 있어 경계는 그대로 둔다)
 */
export default function StudentResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-[13px] text-soft-muted">
          결과를 불러오는 중입니다…
        </div>
      }
    >
      <ResultView />
    </Suspense>
  );
}
