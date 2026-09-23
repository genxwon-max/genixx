import type { Metadata } from "next";
import InterviewBooking from "@/components/account/InterviewBooking";

export const metadata: Metadata = {
  title: "면담",
  description: "날짜와 시간을 고르고 상담 전문가를 골라 결과 해석 면담을 신청합니다.",
  robots: { index: false, follow: false },
};

/**
 * 결과 해석 면담 예약 — 회원 존 안에서 연다.
 *
 * 전문가 콘솔의 면담 일정(EXP-06)과는 다른 자리다. 저쪽은 판정이 갈리는 사례를 우리가
 * 골라 부르는 면담이고, 여기는 보호자가 결과지를 들고 신청하는 면담이다.
 */
export default function MyInterviewsPage() {
  return <InterviewBooking />;
}
