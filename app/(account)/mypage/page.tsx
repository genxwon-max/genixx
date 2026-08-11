import type { Metadata } from "next";
import MyPage from "@/components/account/MyPage";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "회원정보·동의·수신·결제·탈퇴. (ACC-05)",
  robots: { index: false, follow: false },
};

/** ACC-05 마이페이지 — 학부모·기관 공용 계정 허브 */
export default function MyPageRoute() {
  return <MyPage />;
}
