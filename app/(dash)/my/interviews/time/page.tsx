import type { Metadata } from "next";
import InterviewBooking from "@/components/account/InterviewBooking";

export const metadata: Metadata = {
  title: "면담 · 날짜와 시간",
  description: "고른 전문가의 달력에서 면담 날짜와 시간을 고릅니다.",
  robots: { index: false, follow: false },
};

/** 결과 해석 면담 ③ 날짜 · 시간 — 앞에서 고른 학생·전문가가 없으면 그 걸음으로 돌려보낸다 */
export default function MyInterviewsTimePage() {
  return <InterviewBooking step="time" />;
}
