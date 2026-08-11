import type { Metadata } from "next";
import SignupType from "@/components/account/SignupType";

export const metadata: Metadata = {
  title: "회원 유형 선택",
  description: "학부모 / 교사 / 기관담당자 3분기. (ACC-01-1)",
  robots: { index: false, follow: false },
};

/** ACC-01-1 회원유형 선택 */
export default function SignupTypePage() {
  return <SignupType />;
}
