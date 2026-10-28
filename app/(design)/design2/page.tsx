import type { Metadata } from "next";
import DesignIndex from "@/components/design/DesignIndex";

export const metadata: Metadata = {
  title: "디자인 화면 목록 2",
  robots: { index: false, follow: false },
};

/**
 * 디자인 화면 목록 2 (/design2) — 2026-10-28 수정분만 따로 모은 곳(사용자 요청). 원안지 양식(10.22)에 맞춘
 * 문항 상세와, 같은 날 요청한 응시 화면의 문항 체크 · 문항 이동판.
 *
 * 그 전까지의 디자인은 /design에 그대로 있다. 이 구역에 두는 화면은 lib/designScreens.ts에서
 * area: "design2"로 적는다.
 */
export default function Design2IndexPage() {
  /* 제목 뒤의 「— 10월 28일 수정분」과 소개 글은 걷었다(사용자 지시) — 화면 목록만 둔다 */
  return <DesignIndex area="design2" title="디자인 화면 목록 2" />;
}
