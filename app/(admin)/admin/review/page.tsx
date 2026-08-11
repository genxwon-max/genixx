import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "검수 워크벤치 · GENIXX 관리자" };

/** EXP-03 검수 워크벤치 */
export default function Page() {
  return (
    <PermissionGate need="item.review">
      <StubPage section="review" />
    </PermissionGate>
  );
}
