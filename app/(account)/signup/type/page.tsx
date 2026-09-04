import type { Metadata } from "next";
import SignupType, { type Stage } from "@/components/account/SignupType";
import type { SignupTypeId } from "@/lib/account";

export const metadata: Metadata = {
  title: "회원 유형 선택",
  description: "개인(만 14세 이상 학생 / 학부모·법정대리인) · 기관 2분기. (ACC-01-1)",
  robots: { index: false, follow: false },
};

/**
 * ACC-01-1 회원유형 선택.
 *
 * ?stage=bucket|person|method, ?type=student|parent|org 으로 특정 단계를 바로 열 수 있다.
 * 법정대리인 동의 안내 화면이 「법정대리인 계정으로 자녀 등록하기」를 누를 때
 * ?stage=method&type=parent 로 되돌아오는 자리이기도 하다.
 */
export default async function SignupTypePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; type?: string }>;
}) {
  const { stage, type } = await searchParams;
  const valid: Stage[] = ["bucket", "person", "method"];
  const validTypes: SignupTypeId[] = ["student", "parent", "teacher", "org"];
  return (
    <SignupType
      initialStage={valid.includes(stage as Stage) ? (stage as Stage) : "bucket"}
      initialType={validTypes.includes(type as SignupTypeId) ? (type as SignupTypeId) : null}
    />
  );
}
