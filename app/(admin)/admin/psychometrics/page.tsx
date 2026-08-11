import StubPage from "@/components/admin/StubPage";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "심리측정 분석 · GENIXX 관리자" };

/** ADM-07 심리측정 분석 */
export default function Page() {
  return (
    <PermissionGate need="psychometrics.read">
      <StubPage section="psychometrics" />
    </PermissionGate>
  );
}
