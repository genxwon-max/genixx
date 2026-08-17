import ReviewCard from "@/components/admin/ReviewCard";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "문항 검수 · GENIXX 관리자" };

/** EXP-03-1 검수 화면 — 문항 하나를 놓고 3단 검수하고 결론을 낸다 */
export default async function ReviewItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGate need="item.review">
      <ReviewCard id={id} />
    </PermissionGate>
  );
}
