import type { Metadata } from "next";
import Home4 from "@/components/design4/Home4";

export const metadata: Metadata = {
  title: "홈페이지 시안 4 · 로그인 뒤",
  robots: { index: false, follow: false },
};

/**
 * 홈페이지 시안 4 · 로그인 뒤 (/design4/home/member) — 2026-11-16 요청.
 * 로그인 전 첫 화면과 같고, 오른쪽 상자가 회원 상자로 · 머리띠 단추가 이름 · 내 페이지 · 로그아웃으로 바뀐다.
 */
export default function Design4HomeMemberPage() {
  return <Home4 member />;
}
