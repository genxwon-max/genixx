import type { Metadata } from "next";
import ChildImport from "@/components/account/ChildImport";

export const metadata: Metadata = {
  title: "자녀 일괄 등록",
  description: "엑셀·CSV로 여러 명을 한 번에 등록합니다. (ACC-03-2)",
  robots: { index: false, follow: false },
};

/** ACC-03-2 자녀 일괄 등록 */
export default function ChildImportPage() {
  return <ChildImport />;
}
