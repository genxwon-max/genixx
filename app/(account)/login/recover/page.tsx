import type { Metadata } from "next";
import RecoverPanel from "@/components/account/RecoverPanel";

export const metadata: Metadata = {
  title: "계정 찾기",
  description: "가입한 이메일 또는 휴대폰 번호로 계정을 찾습니다. (ACC-02-2)",
  robots: { index: false, follow: false },
};

/**
 * ACC-02-2 아이디·비밀번호 찾기.
 * ?tab=pw 로 비밀번호 찾기 쪽을 펼친 채로 연다. 로그인 화면 아래
 * 「아이디 찾기 | 비밀번호 찾기」 두 링크가 각각 제 탭으로 들어온다.
 */
export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <RecoverPanel initialTab={tab === "pw" ? "pw" : "id"} />;
}
