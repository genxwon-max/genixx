import ReviewList from "@/components/admin/ReviewList";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "검수 워크벤치 · GENIXX 관리자" };

/** EXP-03 검수 워크벤치 — 검수 대기 목록 */
export default function ReviewPage() {
  return (
    <PermissionGate need="item.review">
      <ReviewList />
    </PermissionGate>
  );
}
