import type { Metadata } from "next";
import SignupDone from "@/components/account/SignupDone";

export const metadata: Metadata = {
  title: "가입 완료",
  description: "회원가입이 끝났습니다. 로그인하면 자녀 등록으로 이어집니다. (ACC-01-3)",
  robots: { index: false, follow: false },
};

/** ACC-01-3 가입 완료 — 학부모 경로. 세션은 여기서 만들지 않고 로그인을 권한다 */
export default function SignupDonePage() {
  return <SignupDone />;
}
