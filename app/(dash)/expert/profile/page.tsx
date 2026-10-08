import type { Metadata } from "next";
import ExpertProfile from "@/components/expert/ExpertProfile";

export const metadata: Metadata = {
  title: "전문가 내 정보",
  description: "전문가 프로필 — 이름 · 사진 · 연혁 · 소개. (EXP-02)",
  robots: { index: false, follow: false },
};

/** EXP-02 전문가 내 정보 — 본인이 프로필을 고친다. 승인 전에도 열린다 */
export default function ExpertProfilePage() {
  return <ExpertProfile />;
}
