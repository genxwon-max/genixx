import type { Metadata } from "next";
import ExpertSchedule from "@/components/expert/ExpertSchedule";

export const metadata: Metadata = {
  title: "상담 일정",
  description: "상담사가 상담 가능 요일 · 시간 · 방식을 정한다. (EXP-06-4)",
  robots: { index: false, follow: false },
};

/** EXP-06-4 상담 일정 — 상담사 권한을 받은 전문가에게만 열린다 */
export default function ExpertSchedulePage() {
  return <ExpertSchedule />;
}
