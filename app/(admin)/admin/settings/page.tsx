import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "시스템 설정 · GENIXX 관리자" };

/** ADM-13 시스템 설정 */
export default function Page() {
  return (
    <PermissionGate need="system.manage">
      <StubPage section="settings" />
    </PermissionGate>
  );
}
