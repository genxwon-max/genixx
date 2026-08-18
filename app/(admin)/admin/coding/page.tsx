import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import CodingBench from "@/components/admin/CodingBench";

export const metadata = { title: "개방형 코딩 워크벤치 · GENIXX 관리자" };

/** EXP-05 개방형 코딩 — AI 전수 코딩, 사람은 표본 검증 */
export default function CodingPage() {
  return (
    <>
      <PageHead
        title="개방형 코딩 워크벤치"
        lead="소개·에피소드 같은 개방형 응답에 부호를 붙입니다. AI가 전수로 붙이고 사람은 표본을 확인합니다."
      />
      <PermissionGate need="grade.review">
        <CodingBench />
      </PermissionGate>
    </>
  );
}
