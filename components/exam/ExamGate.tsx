"use client";

import type { ReactNode } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import ExamCatalog from "./ExamCatalog";

/**
 * 로그인하지 않았으면 평가 목록을 **셋트 모드**로 대신 보여준다.
 *
 * 예전에는 여기서 「응시하려면 먼저 로그인해 주세요」 벽을 세웠다. 홈의 「무료 진단
 * 시작하기」를 누른 사람이 문항 하나 보지 못하고 로그인 창부터 만나면 대개 돌아선다.
 * 그래서 가입 없이 평가를 고르고 교과 하나로 1셋트를 풀어 보게 하고(/exam/session/trial),
 * 다 풀면 가입을 권한다 — 진단평가 절차의 둘째·셋째 단계가 이것이다.
 *
 * ── 응시 화면에는 두르지 않는다 ──
 * /exam/session 아래 세 주소(trial · free · paid)는 문 없이 주소만으로 열린다. 셋을 가르는
 * 것이 주소이므로, 어느 갈래를 보고 있는지 알려면 브라우저에 남은 로그인 값이 아니라
 * 주소만 읽으면 된다. 응시 기록은 그대로 계정에 붙고, 명부에 없는 사람은 demo 학생으로
 * 돈다. 가입을 권하는 자리는 이 평가 목록과 셋트 끝 화면이다.
 *
 * 접수·기록·결과·해설은 계정에 붙어야만 뜻이 있는 화면이라 여전히 이 문을 두른다.
 */
export default function ExamGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const session = useSession();

  if (!hydrated) {
    return <div className="py-20 text-center text-[13px] text-exam-muted">확인 중입니다…</div>;
  }

  if (session) return <>{children}</>;

  return <ExamCatalog />;
}
