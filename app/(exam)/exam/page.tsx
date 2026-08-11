import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import StatusTable from "@/components/exam/StatusTable";

export const metadata: Metadata = {
  title: "응시 현황",
  description: "회차별 평가 응시와 설문 제출 현황을 확인합니다.",
  robots: { index: false, follow: false },
};

export default function ExamPage() {
  return (
    <ExamGate>
      <StatusTable />
    </ExamGate>
  );
}
