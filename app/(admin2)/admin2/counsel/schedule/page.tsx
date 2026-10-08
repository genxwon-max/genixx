import CounselSchedule from "./CounselSchedule";

export const metadata = { title: "내 상담 일정" };

/* EXP-06-4 내 상담 일정 — 상담사가 상담 가능 요일 · 시간 · 방식을 정한다 */
export default function Admin2CounselSchedulePage() {
  return <CounselSchedule />;
}
