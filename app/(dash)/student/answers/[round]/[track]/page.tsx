import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentAnswerDetail } from "@/components/student/StudentAnswers";
import { evalName, isTrackId } from "@/lib/examCatalog";

export async function generateMetadata({
  params,
}: PageProps<"/student/answers/[round]/[track]">): Promise<Metadata> {
  const { round, track } = await params;
  return {
    title: isTrackId(track) ? `${evalName(round, track)} 정답과 해설` : "정답과 해설",
    robots: { index: false, follow: false },
  };
}

/**
 * 진단 한 건의 정답과 해설 — 「정답과 해설」 목록에서 최종 제출을 마친 줄을 누르면 온다.
 * 이 학생이 접수한 진단인지, 최종 제출을 마쳤는지는 화면이 기록에서 확인한다.
 */
export default async function StudentAnswerPage({
  params,
}: PageProps<"/student/answers/[round]/[track]">) {
  const { round, track } = await params;
  if (!isTrackId(track)) notFound();

  return <StudentAnswerDetail round={round} track={track} />;
}
