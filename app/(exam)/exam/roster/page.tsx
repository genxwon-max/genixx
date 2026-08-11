import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import StudentRegistrar from "@/components/exam/StudentRegistrar";

export const metadata: Metadata = {
  title: "학원생 명부 관리",
  description: "학생을 등록하고 접속코드를 발급합니다. (ORG-02)",
  robots: { index: false, follow: false },
};

/**
 * ORG-02 학생 명부.
 * 기관 대시보드의 「개별 등록」·「일괄 등록」 버튼이 ?tab= 으로 갈라 보낸다.
 */
export default async function RosterPage({ searchParams }: PageProps<"/exam/roster">) {
  const { tab } = await searchParams;
  return (
    <ExamGate>
      <StudentRegistrar mode="director" initialTab={tab === "bulk" ? "bulk" : "one"} />
    </ExamGate>
  );
}
