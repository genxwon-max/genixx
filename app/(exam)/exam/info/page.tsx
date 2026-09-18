import type { Metadata } from "next";
import ExamInfo from "@/components/exam/ExamInfo";
import ExamPaper from "@/components/exam/ExamPaper";

export const metadata: Metadata = {
  title: "시험 안내",
  description: "접수부터 결과까지 응시 순서와 규정을 안내합니다.",
  robots: { index: false, follow: false },
};

/** 시험 안내 — 로그인 없이도 읽는다 */
export default function ExamInfoPage() {
  return (
    <ExamPaper>
      <ExamInfo />
    </ExamPaper>
  );
}
