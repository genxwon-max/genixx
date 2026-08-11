import type { Metadata } from "next";
import SignupFlow from "@/components/account/SignupFlow";

export const metadata: Metadata = {
  title: "회원가입 · 정보 입력",
  description: "휴대폰 본인확인과 약관 동의. (ACC-01-2)",
  robots: { index: false, follow: false },
};

/** ACC-01-2 정보 입력 — 간편 가입·아이디 가입이 모이는 한 화면 */
export default function SignupJoinPage() {
  return <SignupFlow />;
}
