import type { Metadata } from "next";
import ExpertAsIndex from "@/components/expert/ExpertAs";

export const metadata: Metadata = {
  title: "전문가 화면 — 권한별로 보기",
  robots: { index: false, follow: false },
};

/** 디자인 확인용 — 권한별 전문가 화면으로 들어가는 주소 목록 */
export default function ExpertAsPage() {
  return <ExpertAsIndex />;
}
