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
 *
 * ?span=30 · 60으로 길이를 들고 올 수 있다 — 결제 화면의 면담 차림표에서 넘어오는 길이다.
 */
export default async function MyInterviewsPage({ searchParams }: PageProps<"/my/interviews">) {
  const { span } = await searchParams;
  const picked = Number(Array.isArray(span) ? span[0] : span);
  return <InterviewBooking initialSpan={picked === 30 || picked === 60 ? picked : undefined} />;
}
