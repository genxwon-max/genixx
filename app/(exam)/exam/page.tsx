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
    // 응시 화면(/exam/session)만 화면 끝까지 쓴다. 현황은 읽는 면이라 좌우를 띄우고
    // 글줄이 지나치게 길어지지 않도록 폭을 묶는다.
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        <StatusTable />
      </ExamGate>
    </div>
  );
}
