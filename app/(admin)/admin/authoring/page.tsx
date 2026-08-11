import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "출제 워크벤치 · GENIXX 관리자" };

/** EXP-02 출제 워크벤치 */
export default function Page() {
  return (
    <PermissionGate need="item.write">
      <StubPage section="authoring" />
    </PermissionGate>
  );
}
