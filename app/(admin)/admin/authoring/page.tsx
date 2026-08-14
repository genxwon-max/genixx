import ItemList from "@/components/admin/ItemList";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "출제 워크벤치 · GENIXX 관리자" };

/** EXP-02 출제 워크벤치 — 문항 목록 */
export default function AuthoringPage() {
  return (
    <PermissionGate need="item.write">
      <ItemList />
    </PermissionGate>
  );
}
