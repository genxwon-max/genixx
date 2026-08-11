import type { Metadata } from "next";
import SignupType, { type Stage } from "@/components/account/SignupType";
import type { SignupTypeId } from "@/lib/account";

export const metadata: Metadata = {
  title: "회원가입 (시안 1)",
  robots: { index: false, follow: false },
};

/**
 * ACC-01-1 회원 유형 → 가입 수단 — 시안 1
 * ?stage=bucket|method 로 특정 단계를 바로 열 수 있다 (시안 검토·반출용).
 */
export default async function SignupVariantPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; type?: string }>;
}) {
  const { stage, type } = await searchParams;
  const valid: Stage[] = ["bucket", "method"];
  return (
    <SignupType
      variant={1}
      initialStage={valid.includes(stage as Stage) ? (stage as Stage) : "bucket"}
      initialType={(type as SignupTypeId) ?? null}
    />
  );
}
