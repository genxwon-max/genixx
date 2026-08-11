import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "리포트 승인 · GENIXX 관리자" };

/** EXP-08 리포트 승인 */
export default function Page() {
  return (
    <PermissionGate need="report.publish">
      <StubPage section="report-approval" />
    </PermissionGate>
  );
}
