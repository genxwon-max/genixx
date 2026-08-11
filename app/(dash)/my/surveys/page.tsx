import type { Metadata } from "next";
import SurveyHub from "@/components/account/SurveyHub";

export const metadata: Metadata = {
  title: "설문",
  description: "학생별 설문 제출 현황과 작성 링크.",
  robots: { index: false, follow: false },
};

/**
 * 설문 현황 — 대시보드 안에서 연다.
 *
 * 누가 아직 안 냈는지 훑는 일은 다른 화면과 오가며 하게 되므로 껍데기를 유지한다.
 * 문항 작성만 새 창(/survey/[role])으로 띄운다 — 답만 쓰는 화면이라 레일·헤더가
 * 없는 편이 낫다.
 */
export default function SurveysPage() {
  return <SurveyHub />;
}
