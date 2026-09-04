import type { Metadata } from "next";
import GuardianRequestScreen from "@/components/account/GuardianRequest";

export const metadata: Metadata = {
  title: "법정대리인 동의 요청",
  description:
    "만 14세 미만 학생은 단독으로 가입을 완료할 수 없습니다. 법정대리인 동의 경로로 이어집니다. (ACC-01-1a)",
  robots: { index: false, follow: false },
};

/** ACC-01-1a 만 14세 미만 학생 — 학생 단독가입 중단 후 법정대리인 동의 요청 */
export default function SignupGuardianPage() {
  return <GuardianRequestScreen />;
}
