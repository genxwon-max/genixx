import type { Metadata } from "next";
import ChildList from "@/components/account/ChildList";

export const metadata: Metadata = {
  title: "학생 프로필",
  description: "다학생 지원. 프로필 단위로 응시·리포트 이력이 귀속됩니다. (ACC-03)",
  robots: { index: false, follow: false },
};

/** ACC-03 학생(학생) 프로필 관리 */
export default function ChildrenPage() {
  return <ChildList />;
}
