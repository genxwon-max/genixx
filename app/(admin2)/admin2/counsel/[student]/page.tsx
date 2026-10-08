import CounselDetail from "./CounselDetail";

export const metadata = { title: "내 상담 상세" };

/* EXP-06-3-1 내 상담 상세 — 면담을 신청한 학생 한 사람 */
export default async function Admin2CounselDetailPage({
  params,
}: {
  params: Promise<{ student: string }>;
}) {
  const { student } = await params;
  /* key를 학생 번호로 — 학생만 갈아 끼울 때 앞 학생의 화면이 남지 않게 */
  return <CounselDetail key={student} studentId={student} />;
}
