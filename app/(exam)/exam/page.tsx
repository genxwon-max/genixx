import type { Metadata } from "next";
import ExamGate from "@/components/exam/ExamGate";
import ExamTake from "@/components/exam/ExamTake";

export const metadata: Metadata = {
  title: "응시하기",
  description: "접수한 평가에 응시합니다.",
  robots: { index: false, follow: false },
};

export default function ExamPage() {
  return (
    // 응시 화면(/exam/session)만 화면 끝까지 쓴다. 탭 화면은 읽는 면이라 좌우를 띄우고
    // 글줄이 지나치게 길어지지 않도록 폭을 묶는다.
    <div className="mx-auto w-full max-w-[1120px] px-6 py-9 md:px-10 md:py-12">
      <ExamGate>
        <ExamTake />
      </ExamGate>
    </div>
  );
}
