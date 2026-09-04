import type { Metadata } from "next";
import StudentLink from "@/components/account/StudentLink";

export const metadata: Metadata = {
  title: "기관·평가코드 연결",
  description: "학생 본인 가입 후 기관코드 또는 평가코드를 연결합니다. (ACC-01-5)",
  robots: { index: false, follow: false },
};

/** ACC-01-5 학생 본인 가입 완료 → 기관코드·평가코드 입력 → 응시 */
export default function SignupLinkPage() {
  return <StudentLink />;
}
