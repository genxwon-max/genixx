import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExpertWork from "@/components/expert/ExpertWork";

export const metadata: Metadata = {
  title: "전문가 작업 화면",
  robots: { index: false, follow: false },
};

const works = ["authoring", "review", "grading", "counsel"] as const;

/** 전문가가 받은 권한으로 운영 콘솔의 작업 화면(문항 출제 · 문항 검토 · 진단 채점)에 들어간다 */
export default async function ExpertWorkPage({ params }: { params: Promise<{ work: string }> }) {
  const { work } = await params;
  const hit = works.find((w) => w === work);
  if (!hit) notFound();
  return <ExpertWork key={hit} work={hit} />;
}
