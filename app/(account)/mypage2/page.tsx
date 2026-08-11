import type { Metadata } from "next";
import MyPage from "@/components/account/MyPage";

export const metadata: Metadata = {
  title: "마이페이지 (시안 2)",
  robots: { index: false, follow: false },
};

/** ACC-05 마이페이지 — 시안 2 · 둥글둥글 */
export default function MyPageVariant2() {
  return <MyPage variant={2} />;
}
