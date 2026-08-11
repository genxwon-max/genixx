import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import AuditLog from "@/components/admin/AuditLog";
import * as a from "@/components/admin/ui";

export const metadata = { title: "개인정보·감사 로그 · GENIXX 관리자" };

export default function AuditPage() {
  return (
    <>
      <PageHead
        id="ADM-11"
        title="개인정보 · 감사 로그"
        lead="누가 언제 무엇을 봤는지 전부 남습니다. 보호자가 요청하면 이 기록을 그대로 보여 드립니다."
        action={
          <button type="button" className={a.btnGhost}>
            기록 내려받기
          </button>
        }
      />
      <PermissionGate need="audit.read">
        <AuditLog />
      </PermissionGate>
    </>
  );
}
