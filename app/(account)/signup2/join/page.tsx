import type { Metadata } from "next";
import SignupFlow from "@/components/account/SignupFlow";

export const metadata: Metadata = {
  title: "가입 정보 입력 (시안 2)",
  robots: { index: false, follow: false },
};

/** ACC-01 가입 정보 입력 — 시안 2(둥글둥글). 간편·아이디 가입이 함께 쓴다. */
export default function SignupJoinPage() {
  return <SignupFlow variant={2} />;
}
