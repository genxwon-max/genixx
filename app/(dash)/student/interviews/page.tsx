import type { Metadata } from "next";
import StudentInterviews from "@/components/student/StudentInterviews";

export const metadata: Metadata = {
  title: "면담",
  description: "만 14세 이상 학생이 결과 해석 면담을 직접 신청합니다. (ASM-06 학생)",
  robots: { index: false, follow: false },
};

/**
 * ASM-06(학생) 면담 ① 전문가 선택 — 만 14세 이상 학생 대시보드에만 서는 자리. 신청한 면담
 * 내역도 여기 쌓인다. 다음 걸음은 /time → /pay → /done이다.
 *
 * ?span=30 · 60으로 길이를 들고 올 수 있다 — 학생 결제 화면의 면담 차림표에서 넘어오는
 * 길이다(/student/payments?tab=counsel → CounselPayPanel의 zone).
 */
export default async function StudentInterviewsPage({
  searchParams,
}: PageProps<"/student/interviews">) {
  const { span } = await searchParams;
  const picked = Number(Array.isArray(span) ? span[0] : span);
  return <StudentInterviews initialSpan={picked === 30 || picked === 60 ? picked : undefined} />;
}
