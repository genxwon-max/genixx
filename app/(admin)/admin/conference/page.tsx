import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ConferencePanel from "@/components/admin/ConferencePanel";

export const metadata = { title: "판정 협진 · GENIXX 관리자" };

/** EXP-07 판정 협진 — 네 정보원을 함께 놓고 사람이 확정한다 */
export default function ConferencePage() {
  return (
    <>
      <PageHead
        title="판정 협진"
        lead="지필·설문·관찰·면담을 한 화면에 놓고 판정을 확정합니다. 의사 협진처럼 여러 분야가 함께 보고, 경계선 사례는 유보합니다."
      />
      <PermissionGate need="grade.review">
        <ConferencePanel />
      </PermissionGate>
    </>
  );
}
