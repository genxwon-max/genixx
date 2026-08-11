import PermissionGate from "@/components/admin/PermissionGate";
import StubPage from "@/components/admin/StubPage";

export const metadata = { title: "콘텐츠 · GENIXX 관리자" };

export default function ContentPage() {
  return (
    <PermissionGate need="content.publish">
      <StubPage section="content" />
    </PermissionGate>
  );
}
