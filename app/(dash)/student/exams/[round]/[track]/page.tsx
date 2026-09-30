import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudentExamDetail from "@/components/student/StudentExamDetail";
import { evalName, isTrackId } from "@/lib/examCatalog";

export async function generateMetadata({
  params,
}: PageProps<"/student/exams/[round]/[track]">): Promise<Metadata> {
  const { round, track } = await params;
  return {
    title: isTrackId(track) ? evalName(round, track) : "내 진단",
    robots: { index: false, follow: false },
  };
}

/**
 * 진단 한 건 — 「내 진단」 목록에서 줄을 누르면 온다. 주소가 회차 × 학년을 가리킨다
 * (응시 존의 /exam/2026-3/e4와 같은 꼴). 이 학생이 접수한 진단인지는 화면이 명부에서 확인한다.
 */
export default async function StudentExamPage({
  params,
}: PageProps<"/student/exams/[round]/[track]">) {
  const { round, track } = await params;
  if (!isTrackId(track)) notFound();

  return <StudentExamDetail round={round} track={track} />;
}
