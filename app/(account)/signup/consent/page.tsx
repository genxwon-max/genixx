import type { Metadata } from "next";
import SignupConsent from "@/components/account/SignupConsent";

export const metadata: Metadata = {
  title: "약관·동의",
  description: "목적별 분리 동의. 미동의 시에도 최소 응시 경로를 제공합니다. (ACC-01-3)",
  robots: { index: false, follow: false },
};

/** ACC-01-3 약관·동의 (분리) */
export default function SignupConsentPage() {
  return <SignupConsent />;
}
