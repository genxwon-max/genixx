import type { Metadata } from "next";
import SignupEntry from "@/components/account/SignupEntry";

export const metadata: Metadata = {
  title: "회원가입",
  description: "학부모·교사·기관담당자 회원가입. 학생은 독립 가입 경로가 없습니다. (ACC-01)",
};

/** ACC-01 회원가입 */
export default function SignupPage() {
  return <SignupEntry />;
}
