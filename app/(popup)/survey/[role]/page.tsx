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
  return <SurveyForm config={surveys[role]} studentId={studentId} />;
}
