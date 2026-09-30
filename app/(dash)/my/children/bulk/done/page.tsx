import type { Metadata } from "next";
import BulkDone from "@/components/account/BulkDone";

export const metadata: Metadata = {
  title: "접속코드 받기",
  description: "일괄 등록한 아이들의 접속코드를 확인하고 전달합니다. (ACC-03)",
  robots: { index: false, follow: false },
};

/** ACC-03 학생 일괄 등록 ② 접속코드 받기 */
export default function BulkDonePage() {
  return <BulkDone />;
}
