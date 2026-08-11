import type { Metadata } from "next";
import StudentsScreen from "@/components/account/StudentsScreen";

export const metadata: Metadata = {
  title: "학생 등록",
  description: "학생을 등록하고 접속코드를 발급합니다.",
  robots: { index: false, follow: false },
};

/**
 * 학생 명부·등록. 대시보드의 「개별 등록」·「일괄 등록」 버튼이 ?tab= 으로 갈라 보낸다.
 * 예전 /exam/roster를 회원 존으로 들여온 자리다.
 */
export default async function StudentsPage({ searchParams }: PageProps<"/my/students">) {
  const { tab } = await searchParams;
  return <StudentsScreen tab={tab === "bulk" ? "bulk" : "one"} />;
}
