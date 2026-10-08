import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpertAsEnter } from "@/components/expert/ExpertAs";
import { expertPreviews } from "@/lib/expertAccounts";

export const metadata: Metadata = {
  title: "전문가 화면 — 권한별로 보기",
  robots: { index: false, follow: false },
};

/** 디자인 확인용 — /expert/as/author · reviewer · grader · counselor · pending */
export default async function ExpertAsWhoPage({ params }: { params: Promise<{ who: string }> }) {
  const { who } = await params;
  const hit = expertPreviews.find((p) => p.id === who);
  if (!hit) notFound();
  return <ExpertAsEnter key={hit.id} who={hit.id} />;
}
