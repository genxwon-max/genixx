import type { Metadata } from "next";
import LoginPanel from "@/components/account/LoginPanel";

export const metadata: Metadata = {
  title: "로그인 (시안 1)",
  robots: { index: false, follow: false },
};

/**
 * ACC-02 로그인 — 시안 1
 * ?view=email 로 이메일 폼을 펼친 상태를 바로 열 수 있다 (시안 검토·반출용).
 */
export default async function LoginVariantPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <LoginPanel variant={1} initialByEmail={view === "email"} />;
}
