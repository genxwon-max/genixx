import ItemDetail from "@/components/admin/ItemDetail";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "문항 상세 · GENIXX 관리자" };

/** ADM-04-1 문항 상세 — 은행에서 문항 하나를 열어 보는 자리 */
export default async function ItemDetailPage({ params }: PageProps<"/admin/items/[id]">) {
  const { id } = await params;
  return (
    <PermissionGate need={["item.write", "item.review"]}>
      <ItemDetail id={id} />
    </PermissionGate>
  );
}
