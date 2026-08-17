import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SurveyForm from "@/components/exam/SurveyForm";
import { isSurveyKey, surveys } from "@/lib/survey";

export function generateStaticParams() {
  return [{ role: "mother" }, { role: "father" }, { role: "teacher" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/survey/[role]">): Promise<Metadata> {
  const { role } = await params;
  const cfg = isSurveyKey(role) ? surveys[role] : null;
  return {
    title: cfg ? cfg.title : "설문",
    robots: { index: false, follow: false },
  };
}

export default async function SurveyPopupPage({
  params,
  searchParams,
}: PageProps<"/survey/[role]">) {
  const { role } = await params;
  const { student } = await searchParams;
  if (!isSurveyKey(role)) notFound();

  const studentId = typeof student === "string" && student ? student : "demo";
  /* 문항은 서버가 아니라 설문 저장소가 준다. 여기서는 어느 설문인지만 넘긴다 —
     관리자가 발행한 판이 곧바로 이 창에 뜨게 하기 위해서다. */
  return <SurveyForm surveyKey={role} studentId={studentId} />;
}
