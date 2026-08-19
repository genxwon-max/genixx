import { PageHead } from "@/components/admin/Parts";
import OrgTable from "@/components/admin/OrgTable";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "기관 · GENIXX 관리자" };

/** ADM-07 기관 — 계약과 응시권 배정 */
export default function OrgsPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 다루는 화면인지는 아래 요약 줄과 표 이름이
          이미 말한다. */}
      <PageHead
        title="기관"
        action={
          <>
            <button type="button" className={a.btnGhost}>
              정산 자료 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              기관 추가하기
            </button>
          </>
        }
      />

      <PermissionGate need="org.manage">
        <OrgTable />
      </PermissionGate>
    </>
  );
}
