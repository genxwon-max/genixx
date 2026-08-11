import type { Metadata } from "next";
import MyPage from "@/components/account/MyPage";

export const metadata: Metadata = {
  title: "마이페이지 (시안 1)",
  robots: { index: false, follow: false },
};

/** ACC-05 마이페이지 — 시안 1 · 전문가 */
export default function MyPageVariant1() {
  return <MyPage variant={1} />;
}
