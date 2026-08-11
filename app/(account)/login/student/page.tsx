import type { Metadata } from "next";
import StudentLogin from "@/components/account/StudentLogin";

export const metadata: Metadata = {
  title: "학생 응시 로그인",
  description:
    "보호자·학원장이 발급한 8자리 접속코드와 생년월일로 응시 화면에 들어갑니다. (ACC-02-1)",
  // 사이트맵 12장 URL 규칙 — "학생 응시 경로는 검색엔진 색인 차단"
  robots: { index: false, follow: false },
};

/** ACC-02-1 학생 응시 로그인 — 저마찰 인증, 결과·개인정보 화면 접근 불가 */
export default function StudentLoginPage() {
  return <StudentLogin />;
}
