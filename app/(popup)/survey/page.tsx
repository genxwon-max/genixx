import type { Metadata } from "next";
import SurveyHub from "@/components/account/SurveyHub";

export const metadata: Metadata = {
  title: "설문",
  description: "학생별 설문 제출 현황과 작성 링크.",
  robots: { index: false, follow: false },
};

/**
 * 설문 고르는 자리 — 팝업 창으로 뜬다.
 *
 * 대시보드 레일의 「설문」이 이 주소를 새 창으로 연다. 응시가 학생 화면에서 따로
 * 열리듯, 설문도 답만 쓰는 창에서 하는 편이 낫다. 여기서 학생과 응답자를 고르면
 * 같은 창이 문항 화면(/survey/[role])으로 넘어간다.
 */
export default function SurveyIndexPage() {
  return (
    <div className="mx-auto w-full max-w-[42rem] px-5 py-8">
      <SurveyHub />
    </div>
  );
}
