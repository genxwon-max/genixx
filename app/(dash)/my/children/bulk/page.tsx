import type { Metadata } from "next";
import BulkRegister from "@/components/account/BulkRegister";

export const metadata: Metadata = {
  title: "학생 일괄 등록",
  description: "여러 아이를 한 번에 등록하고 아이마다 접속코드를 받습니다. (ACC-03)",
  robots: { index: false, follow: false },
};

/** ACC-03 학생 일괄 등록 ① 명단 입력 */
export default function BulkRegisterPage() {
  return <BulkRegister />;
}
