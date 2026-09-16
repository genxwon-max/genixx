import type { Metadata } from "next";
import ChildDetail from "@/components/account/ChildDetail";

export const metadata: Metadata = {
  title: "학생 상세",
  description: "학생 한 명의 등록 정보와 접속코드·응시권·진행 상황. (ACC-03-1)",
  robots: { index: false, follow: false },
};

/** ACC-03-1 학생 상세 — 목록에서 이름을 눌러 들어온다 */
export default async function ChildDetailPage({ params }: PageProps<"/my/children/[id]">) {
  const { id } = await params;
  return <ChildDetail id={id} />;
}
