import type { Metadata } from "next";
import ChildNew from "@/components/account/ChildNew";

export const metadata: Metadata = {
  title: "자녀 등록 · 아이 정보",
  description: "학년·지역·학교유형 + 가정 내 주사용 언어. (ACC-03-2 · B01~B10)",
  robots: { index: false, follow: false },
};

/** ACC-03-2 기본정보 입력 */
export default function ChildNewPage() {
  return <ChildNew />;
}
