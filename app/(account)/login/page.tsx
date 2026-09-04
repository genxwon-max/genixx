import type { Metadata } from "next";
import LoginPanel from "@/components/account/LoginPanel";

export const metadata: Metadata = { title: "로그인" };

/**
 * ACC-02 로그인.
 * ?view=id 로 아이디 폼을 펼친 상태를 바로 열 수 있다 (검토·반출용).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <LoginPanel initialById={view === "id"} />;
}
