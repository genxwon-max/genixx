"use client";

import type { ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import ExamCatalog from "./ExamCatalog";
import ExamPaper from "./ExamPaper";

/**
 * 로그인하지 않았으면 평가 목록을 **무료 체험 모드**로 대신 보여준다.
 *
 * 예전에는 여기서 「응시하려면 먼저 로그인해 주세요」 벽을 세웠다. 홈의 「무료 학력진단
 * 시작하기」를 누른 사람이 문항 하나 보지 못하고 로그인 창부터 만나면 대개 돌아선다.
 * 그래서 가입 없이 평가를 고르고 과목마다 몇 문항을 풀어 보게 하고(/exam/try), 더 보려는
 * 순간에 가입을 권한다.
 *
 * 응시 기록·결과·해설은 계정에 붙으므로 그 화면들은 여전히 로그인한 사람에게만 연다.
 *
 * `padded` — 응시 화면(/exam/session)처럼 페이지가 여백을 두지 않는 자리에서 켠다.
 */
export default function ExamGate({
  children,
  padded = false,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  const hydrated = useHydrated();
  const session = useSession();

  if (!hydrated) {
    return <div className="py-20 text-center text-[13px] text-exam-muted">확인 중입니다…</div>;
  }

  if (session) return <>{children}</>;

  return padded ? (
    <ExamPaper>
      <ExamCatalog />
    </ExamPaper>
  ) : (
    <ExamCatalog />
  );
}
