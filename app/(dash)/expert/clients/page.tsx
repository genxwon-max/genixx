import type { Metadata } from "next";
import ExpertClients from "@/components/expert/ExpertClients";

export const metadata: Metadata = {
  title: "상담 관리",
  description: "상담사에게 들어온 면담 신청 — 수락 · 거절 · 상담일지. (EXP-06-3)",
  robots: { index: false, follow: false },
};

/** EXP-06-3 상담 관리 — 상담사 권한을 받은 전문가에게만 열린다 */
export default function ExpertClientsPage() {
  return <ExpertClients />;
}
