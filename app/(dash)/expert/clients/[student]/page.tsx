import type { Metadata } from "next";
import { ExpertClientDetail } from "@/components/expert/ExpertClients";

export const metadata: Metadata = {
  title: "학생 정보",
  description: "면담을 신청한 학생의 정보와 진단 보고서. (EXP-06-3-1)",
  robots: { index: false, follow: false },
};

/** EXP-06-3-1 면담을 신청한 학생 한 사람 — 학생 정보 · 면담 신청 · 진단 보고서 */
export default async function ExpertClientPage({
  params,
}: {
  params: Promise<{ student: string }>;
}) {
  const { student } = await params;
  /* key를 학생 번호로 — 같은 경로 꼴에서 학생만 갈아 끼울 때 앞 학생의 화면이 남지 않게 */
  return <ExpertClientDetail key={student} studentId={student} />;
}
