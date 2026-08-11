import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "분기 규칙 엔진 · GENIXX 관리자" };

/** ADM-06 분기 규칙 엔진 */
export default function Page() {
  return (
    <PermissionGate need="round.manage">
      <StubPage section="rules" />
    </PermissionGate>
  );
}
