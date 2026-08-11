import type { Metadata } from "next";
import ParentHome from "@/components/account/ParentHome";

export const metadata: Metadata = {
  title: "내 페이지",
  description: "자녀의 진단 진행 상황과 다음 할 일. (ACC-03)",
  robots: { index: false, follow: false },
};

/** 학부모 홈 — 로그인 후 도착하는 자리 */
export default function MyPage() {
  return <ParentHome />;
}
