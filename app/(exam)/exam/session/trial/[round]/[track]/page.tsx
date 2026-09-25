import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TrialSession from "@/components/exam/TrialSession";
import { evalName, isTrackId } from "@/lib/examCatalog";

export async function generateMetadata({
  params,
}: PageProps<"/exam/session/trial/[round]/[track]">): Promise<Metadata> {
  const { round, track } = await params;
  return {
    title: isTrackId(track) ? `${evalName(round, track)} 셋트 문항` : "셋트 문항",
    robots: { index: false, follow: false },
  };
}

/** 셋트 창 — 로그인 없이 연다(ExamGate를 두르지 않는다). 평가 목록이 별도 창으로 띄운다 */
export default async function TrialPage({
  params,
}: PageProps<"/exam/session/trial/[round]/[track]">) {
  const { round, track } = await params;
  if (!isTrackId(track)) notFound();

  return <TrialSession roundId={round} trackId={track} />;
}
