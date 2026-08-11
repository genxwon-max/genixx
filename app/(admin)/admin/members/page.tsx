import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import MemberTable from "@/components/admin/MemberTable";
import * as a from "@/components/admin/ui";

export const metadata = { title: "회원 · GENIXX 관리자" };

export default function MembersPage() {
  return (
    <>
      <PageHead
        id="ADM-02-1"
        title="회원"
        lead="학부모·교사·기관·학생 본인 계정을 함께 봅니다. 연락처는 가려서 보여 주고, 전체를 보려면 사유를 남겨야 합니다."
        action={
          <>
            <button type="button" className={a.btnGhost}>
              목록 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              회원 찾기
            </button>
          </>
        }
      />

      <PermissionGate need="member.read">
        <MemberTable />
      </PermissionGate>
    </>
  );
}
