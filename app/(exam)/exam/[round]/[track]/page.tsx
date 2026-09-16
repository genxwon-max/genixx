import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AssessmentRoom from "@/components/exam/AssessmentRoom";
import ExamGate from "@/components/exam/ExamGate";
import { evalName, isTrackId } from "@/lib/examCatalog";

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
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        <AssessmentRoom roundId={round} trackId={track} />
      </ExamGate>
    </div>
  );
}
