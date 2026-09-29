import type { Metadata } from "next";
import ChildNew from "@/components/account/ChildNew";

export const metadata: Metadata = {
  title: "학생 등록",
  description: "기본정보 입력부터 접속코드 발급까지 한 폼에서. (ACC-03 · B01~B10)",
  robots: { index: false, follow: false },
};

/** ACC-03 학생 등록 — 기본정보 + 코드 발급 */
export default function ChildNewPage() {
  return <ChildNew />;
}
