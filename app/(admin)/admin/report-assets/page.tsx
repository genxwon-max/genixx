import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "리포트 자산 · GENIXX 관리자" };

/** ADM-08 리포트 자산 */
export default function Page() {
  return (
    <PermissionGate need="report.publish">
      <StubPage section="report-assets" />
    </PermissionGate>
  );
}
