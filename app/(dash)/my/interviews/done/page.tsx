import type { Metadata } from "next";
import InterviewBooking from "@/components/account/InterviewBooking";

export const metadata: Metadata = {
  title: "면담 신청 완료",
  description: "결제와 함께 확정된 면담을 확인합니다.",
  robots: { index: false, follow: false },
};

/**
 * 결과 해석 면담 신청 완료 — 결제(/my/interviews/pay)를 마치면 그 자리를 갈아 끼우는 영수증.
 * ?order=로 주문을 가리키고, 없으면 가장 최근 면담 결제를 세운다.
 */
export default async function MyInterviewsDonePage({
  searchParams,
}: PageProps<"/my/interviews/done">) {
  const { order } = await searchParams;
  return <InterviewBooking step="done" orderId={Array.isArray(order) ? order[0] : order} />;
}
