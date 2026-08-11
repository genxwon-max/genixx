import type { Metadata } from "next";
import SurveyHub from "@/components/account/SurveyHub";

export const metadata: Metadata = {
  title: "설문",
  description: "학생별 설문 제출 현황과 작성 링크.",
  robots: { index: false, follow: false },
};

/** 설문 현황 — 작성은 팝업(/survey/[role])에서 한다 */
export default function SurveysPage() {
  return <SurveyHub />;
}
