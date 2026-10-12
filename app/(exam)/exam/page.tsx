import type { Metadata } from "next";
import ExamEntrance from "@/components/exam/ExamEntrance";
import ExamPaper from "@/components/exam/ExamPaper";

export const metadata: Metadata = {
  title: "진단 둘러보기",
  description: "회원가입 없이 진단을 골라 1셋트를 풀어 봅니다.",
  robots: { index: false, follow: false },
};

/**
 * 응시 존의 첫 화면 — 로그인하지 않은 사람에게는 진단 목록을, 학생에게는 자기 대시보드로
 * 가는 길을 연다(ExamEntrance). 접수 · 응시 · 정답과 해설 · 결과는 학생 대시보드에 있다.
 */
export default function ExamPage() {
  return (
    // 응시 화면(/exam/session)만 화면 끝까지 쓴다. 이 화면은 읽는 면이라 좌우를 띄우고
    // 글줄이 지나치게 길어지지 않도록 폭을 묶는다.
    <ExamPaper>
      <ExamEntrance />
    </ExamPaper>
  );
}
