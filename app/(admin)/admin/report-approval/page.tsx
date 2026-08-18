import PermissionGate from "@/components/admin/PermissionGate";
import ReportApproval from "@/components/admin/ReportApproval";

export const metadata = { title: "리포트 승인 · GENIXX 관리자" };

/** EXP-08 리포트 승인 — 발행 전에는 보호자 화면에 결과가 보이지 않는다 */
export default function ReportApprovalPage() {
  return (
    <PermissionGate need="report.publish">
      <ReportApproval />
    </PermissionGate>
  );
}
