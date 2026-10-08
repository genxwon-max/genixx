import type { Metadata } from "next";
import ExpertHome from "@/components/expert/ExpertHome";

export const metadata: Metadata = {
  title: "전문가 홈",
  description: "전문가 회원의 가입 승인 상태 · 받은 권한 · 다가오는 면담. (EXP-01)",
  robots: { index: false, follow: false },
};

/** EXP-01 전문가 홈 — 전문가가 로그인·가입 후 도착하는 자리. 승인 전에는 승인 진행 상태가 선다 */
export default function ExpertPage() {
  return <ExpertHome />;
}
