import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ApprovalList from "@/components/admin/ApprovalList";

export const metadata = { title: "가입 승인 대기 · GENIXX 관리자" };

export default function ApprovalsPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 요약 줄과 표가
          이미 말한다. */}
      <PageHead title="가입 승인 대기" />
      <PermissionGate need="member.approve">
        <ApprovalList />
      </PermissionGate>
    </>
  );
}
