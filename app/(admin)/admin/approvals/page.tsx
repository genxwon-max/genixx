import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ApprovalList from "@/components/admin/ApprovalList";

export const metadata = { title: "가입 승인 대기 · GENIXX 관리자" };

export default function ApprovalsPage() {
  return (
    <>
      <PageHead
        id="ADM-02-2"
        title="가입 승인 대기"
        lead="교사와 기관은 소속을 확인한 뒤에 계정을 열어 드립니다. 승인 전에는 학생 자료를 전혀 볼 수 없습니다."
      />
      <PermissionGate need="member.approve">
        <ApprovalList />
      </PermissionGate>
    </>
  );
}
