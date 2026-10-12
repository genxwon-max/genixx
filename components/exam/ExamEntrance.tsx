"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/authStore";
import { useHydrated } from "@/lib/examStore";
import ExamCatalog from "./ExamCatalog";
import StudentOnly from "./StudentOnly";

/**
 * 응시 존의 문 (/exam) — 홈의 「무료 진단 시작하기」가 닿는 자리.
 *
 * 누가 왔는지에 따라 셋으로 갈린다.
 *
 *   로그인하지 않은 사람   「진단 둘러보기」를 편다. 가입 없이 진단을 골라 1셋트를 풀어 본다
 *   학생                  자기 대시보드의 「내 진단」으로 보낸다
 *   보호자 · 기관          응시할 사람이 아니다 — 학생 관리로 가는 길을 적는다
 *
 * 예전에는 이 주소가 「응시하기」 탭이었고, 그 옆에 접수하기 · 정답과 해설 · 결과보기 탭이
 * 나란히 있었다. 학생 대시보드에도 같은 일을 하는 화면(내 진단 · 진단 결과)이 있어 한 가지
 * 일에 자리가 둘이었다. 넷을 모두 대시보드로 모으고, 응시 존에는 **문항을 푸는 창과 가입 전
 * 사람이 보는 화면**만 남겼다.
 */
export default function ExamEntrance() {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const student = session?.role === "student";

  useEffect(() => {
    if (hydrated && student) router.replace("/student/exams");
  }, [hydrated, student, router]);

  if (!hydrated || student) {
    return (
      <div className="py-20 text-center text-[13px] text-exam-muted">
        {hydrated ? "내 진단으로 이동합니다…" : "확인 중입니다…"}
      </div>
    );
  }

  if (session) return <StudentOnly role={session.role} />;

  return <ExamCatalog />;
}
