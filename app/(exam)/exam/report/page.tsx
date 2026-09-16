import type { Metadata } from "next";
import { Suspense } from "react";
import ExamGate from "@/components/exam/ExamGate";
import ReportList from "@/components/exam/ReportList";

export const metadata: Metadata = {
  title: "결과보기",
  description: "접수한 평가의 결과 리포트를 확인합니다.",
  robots: { index: false, follow: false },
};

/**
 * 결과보기 탭 — 학생이 응시 존 안에서 보는 결과.
 *
 * 보호자·기관은 회원 대시보드의 /exam/result?student= 로 본다. 리포트 화면(ResultView)은
 * 같고 껍데기만 다르다 — 학생에게는 대시보드 메뉴가 아니라 접수·응시와 같은 메뉴 줄이 맞다.
 */
export default function ReportPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        {/* 펼친 리포트(ResultView)가 ?student= 를 읽는다 — useSearchParams는 경계가 있어야 한다 */}
        <Suspense
          fallback={
            <div className="py-20 text-center text-[13px] text-soft-muted">
              결과를 불러오는 중입니다…
            </div>
          }
        >
          <ReportList />
        </Suspense>
      </ExamGate>
    </div>
  );
}
