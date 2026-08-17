import ItemGenerator from "@/components/admin/ItemGenerator";
import PermissionGate from "@/components/admin/PermissionGate";

export const metadata = { title: "AI 문항 초안 생성 · GENIXX 관리자" };

/**
 * EXP-02-2 AI 문항 초안 생성.
 *
 * /admin/authoring/[id]와 같은 자리에 있지만 정적 경로라 이쪽이 먼저 잡힌다.
 * 「generate」라는 id를 가진 문항이 생기면 충돌하는데, 문항 id는 IT-로 시작하므로
 * 그럴 일이 없다.
 */
export default function GeneratePage() {
  return (
    <PermissionGate need="item.write">
      <ItemGenerator />
    </PermissionGate>
  );
}
