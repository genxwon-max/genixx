import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AssessmentRoom from "@/components/exam/AssessmentRoom";
import ExamGate from "@/components/exam/ExamGate";
import { evalName, isTrackId } from "@/lib/examCatalog";
import ExamPaper from "@/components/exam/ExamPaper";

export async function generateMetadata({
  params,
}: PageProps<"/exam/[round]/[track]">): Promise<Metadata> {
  const { round, track } = await params;
  return {
    title: isTrackId(track) ? evalName(round, track) : "평가 응시",
    robots: { index: false, follow: false },
  };
}

export default async function AssessmentRoomPage({ params }: PageProps<"/exam/[round]/[track]">) {
  const { round, track } = await params;
  if (!isTrackId(track)) notFound();

  return (
    <ExamPaper>
      <ExamGate>
        <AssessmentRoom roundId={round} trackId={track} />
      </ExamGate>
    </ExamPaper>
  );
}
