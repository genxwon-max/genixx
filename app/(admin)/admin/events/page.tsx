import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "이벤트 로그 · GENIXX 관리자" };

/** ADM-11 이벤트 로그 */
export default function Page() {
  return (
    <PermissionGate need="audit.read">
      <StubPage section="events" />
    </PermissionGate>
  );
}
