import type { Metadata } from "next";
import ExamSession from "@/components/exam/ExamSession";
import { FREE_LIMIT_MIN, FREE_TOTAL } from "@/lib/exam";

export const metadata: Metadata = {
  title: "무료시험 응시",
  description: `무료시험 ${FREE_TOTAL}문항을 한 번에 응시하는 화면입니다. 제한 시간 ${FREE_LIMIT_MIN}분.`,
  robots: { index: false, follow: false },
};

/**
 * 무료시험 응시 창 (/exam/session/free).
 *
 * 유료시험(/exam/session/paid/[과목])과 달리 주소에 과목이 없다. 무료시험은 국어 4 ·
 * 수학 8 · 과학 8을 **한 번에 이어서** 푸는 시험 하나라, 들어가기 전에 고를 것이 없다.
 * 화면은 유료시험과 같은 것을 쓰고, 무엇을 한 판으로 세는지만 다르다(ExamScope).
 *
 * ── 로그인 문을 두지 않는다 ──
 * 응시 기록은 계정에 붙지만(명부에 없으면 demo 학생으로 돈다), 화면 자체는 주소만으로
 * 열린다. 가입을 권하는 자리는 평가 목록과 셋트 끝 화면이다.
 */
export default function FreeExamPage() {
  return <ExamSession scope={{ kind: "free" }} />;
}
