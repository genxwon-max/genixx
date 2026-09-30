import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StudentResultDetail } from "@/components/student/StudentResults";
import { evalName, isTrackId } from "@/lib/examCatalog";

export async function generateMetadata({
  params,
}: PageProps<"/student/results/[round]/[track]">): Promise<Metadata> {
  const { round, track } = await params;
  return {
    title: isTrackId(track) ? `${evalName(round, track)} 결과` : "진단 결과",
    robots: { index: false, follow: false },
  };
}

/**
 * 결과지 한 장 — 「진단 결과」 목록에서 발행된 줄을 누르면 온다.
 * 결과지(ResultView)는 보호자·기관과 같은 것이고 껍데기만 학생 레일이다.
 * (ResultView 안에 useSearchParams가 있어 경계를 둔다)
 */
export default async function StudentResultPage({
  params,
}: PageProps<"/student/results/[round]/[track]">) {
  const { round, track } = await params;
  if (!isTrackId(track)) notFound();

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-[13px] text-soft-muted">
          결과를 불러오는 중입니다…
        </div>
      }
    >
      <StudentResultDetail round={round} track={track} />
    </Suspense>
  );
}
