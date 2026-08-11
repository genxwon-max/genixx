import type { Metadata } from "next";
import ChildConsent from "@/components/account/ChildConsent";

export const metadata: Metadata = {
  title: "자녀 등록 · 동의",
  description:
    "자녀 등록 흐름의 최선행. 만 14세 기준으로 동의 주체가 갈립니다. (ACC-03-1 · B00)",
  robots: { index: false, follow: false },
};

/** ACC-03-1 법정대리인 동의 (B00) */
export default function ChildConsentPage() {
  return <ChildConsent />;
}
