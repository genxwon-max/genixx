import type { Metadata } from "next";
import InterviewBooking from "@/components/account/InterviewBooking";

export const metadata: Metadata = {
  title: "면담 · 전문가 선택",
  description: "결과지를 함께 읽을 상담 전문가를 고릅니다.",
  robots: { index: false, follow: false },
};

/** 결과 해석 면담 ② 상담 전문가 — ①에서 고른 학생이 없으면 ①로 돌려보낸다 */
export default function MyInterviewsCounselorPage() {
  return <InterviewBooking step="counselor" />;
}
