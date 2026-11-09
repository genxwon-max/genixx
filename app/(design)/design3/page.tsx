import type { Metadata } from "next";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록 3",
  robots: { index: false, follow: false },
};

/**
 * 디자인 화면 목록 3 (/design3) — 2026-11-09 학생 홈(/student)을 대시보드로 다시 짠 시안을 따로 모은 곳
 * (사용자 요청). 그 전까지의 디자인은 /design · /design2에 그대로 있다. 이 구역에 두는 화면은
 * lib/designScreens.ts에서 area: "design3"으로 적는다.
 */
export default function Design3IndexPage() {
  return <DesignIndex area="design3" title="디자인 화면 목록 3" />;
}
