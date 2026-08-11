import type { Metadata } from "next";
import OrgHome from "@/components/account/OrgHome";

export const metadata: Metadata = {
  title: "기관 대시보드",
  description: "소속 응시 현황·진척률·미완료자 목록. (ORG-01)",
  robots: { index: false, follow: false },
};

/** ORG-01 기관 대시보드 — 기관담당자·교사가 로그인 후 도착하는 자리 */
export default function OrgPage() {
  return <OrgHome />;
}
