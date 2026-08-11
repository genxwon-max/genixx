import PermissionGate from "@/components/admin/PermissionGate";
import StubPage from "@/components/admin/StubPage";

export const metadata = { title: "결제·정산 · GENIXX 관리자" };

export default function BillingPage() {
  return (
    <PermissionGate need="billing.read">
      <StubPage section="billing" />
    </PermissionGate>
  );
}
