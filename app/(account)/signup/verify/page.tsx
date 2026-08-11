import type { Metadata } from "next";
import SignupVerify from "@/components/account/SignupVerify";

export const metadata: Metadata = {
  title: "본인확인",
  description: "휴대폰 또는 간편인증. 법정대리인 신원 확인의 근거가 됩니다. (ACC-01-2)",
  robots: { index: false, follow: false },
};

/** ACC-01-2 본인확인 */
export default function SignupVerifyPage() {
  return <SignupVerify />;
}
