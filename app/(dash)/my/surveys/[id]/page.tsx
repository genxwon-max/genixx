import type { Metadata } from "next";
import SurveyDetail from "@/components/account/SurveyDetail";

export const metadata: Metadata = {
  title: "학생 설문",
  description: "어머니·아버지·교사 설문을 문자로 보내거나 지금 작성합니다. (ASM-05)",
  robots: { index: false, follow: false },
};

/** ASM-05 학생 한 명의 설문 — 목록에서 「설문 관리」로 들어온다 */
export default async function SurveyDetailPage({ params }: PageProps<"/my/surveys/[id]">) {
  const { id } = await params;
  return <SurveyDetail id={id} />;
}
