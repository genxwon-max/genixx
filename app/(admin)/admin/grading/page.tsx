import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import GradingQueue from "@/components/admin/GradingQueue";

export const metadata = { title: "채점·판정 큐 · GENIXX 관리자" };

export default function GradingPage() {
  return (
    <>
      <PageHead
        id="ADM-06"
        title="채점·판정 큐"
        lead="AI가 1차로 낸 값을 사람이 확인하고 확정하는 곳입니다. 확정하기 전에는 어떤 결과도 보호자에게 보이지 않습니다."
      />
      <PermissionGate need="grade.review">
        <GradingQueue />
      </PermissionGate>
    </>
  );
}
