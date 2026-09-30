import type { Metadata } from "next";
import InterviewBooking from "@/components/account/InterviewBooking";

export const metadata: Metadata = {
  title: "면담 · 결제",
  description: "면담 방식을 고르고 결제해 면담을 확정합니다.",
  robots: { index: false, follow: false },
};

/** 결과 해석 면담 ④ 방식 · 결제 — 앞에서 고른 것이 비어 있으면 그 걸음으로 돌려보낸다 */
export default function MyInterviewsPayPage() {
  return <InterviewBooking step="pay" />;
}
