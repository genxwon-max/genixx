import ItemCard from "@/components/admin/ItemCard";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "문항 카드 · GENIXX 관리자" };

/** EXP-02-1 문항 카드 — 발주서 §3 7항목 */
export default async function ItemCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate need="item.write">
      <ItemCard id={id} />
    </PermissionGate>
  );
}
