import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ConferencePanel from "@/components/admin/ConferencePanel";

export const metadata = { title: "판정 협진 · GENIXX 관리자" };

/** EXP-07 판정 협진 — 네 정보원을 함께 놓고 사람이 확정한다 */
export default function ConferencePage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 구역 이름과 표가
          이미 말한다. */}
      <PageHead title="판정 협진" />
      <PermissionGate need="grade.review">
        <ConferencePanel />
      </PermissionGate>
    </>
  );
}
