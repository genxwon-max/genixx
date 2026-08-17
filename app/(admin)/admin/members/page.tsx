import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import UserDirectory from "@/components/admin/UserDirectory";
import * as a from "@/components/admin/ui";

export const metadata = { title: "사용자 · GENIXX 관리자" };

export default function MembersPage() {
  return (
    <>
      <PageHead
        id="ADM-02"
        title="사용자"
        lead="학부모·학생·교사·기관을 갈래별로 봅니다. 연락처는 가려서 보여 주고, 전체를 보려면 사유를 남겨야 합니다."
        action={
          <button type="button" className={a.btnGhost}>
            목록 내려받기
          </button>
        }
      />

      <PermissionGate need="member.read">
        <UserDirectory />
      </PermissionGate>
    </>
  );
}
