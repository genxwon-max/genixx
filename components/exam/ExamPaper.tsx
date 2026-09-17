import type { ReactNode } from "react";

/**
 * 응시 존 페이지의 본문 판 (접수하기 · 응시하기 · 정답과 해설 · 결과보기 · 안내).
 *
 * 바깥 바탕(exam-bg)은 그대로 두고, 제목 · 걸러보기 · 목록을 흰 판 하나에 담는다. 판은
 * 순백이 아니라 한 톤 가라앉힌 흰색(exam-paper)이다 — 오래 보는 목록이 눈부시지 않게.
 */
export default function ExamPaper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-5 md:px-6 md:py-8">
      <div className="rounded-[12px] bg-exam-paper px-5 py-8 shadow-[0_1px_3px_rgba(26,34,66,0.06)] ring-1 ring-exam-line/60 md:px-10 md:py-12">
        {children}
      </div>
    </div>
  );
}
