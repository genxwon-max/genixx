import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ScoringBench from "@/components/admin/ScoringBench";

export const metadata = { title: "채점 워크벤치 · GENIXX 관리자" };

/** EXP-04 채점 워크벤치 — AI가 전수로 매기고 사람이 확정한다 */
export default function ScoringPage() {
  return (
    <>
      <PageHead
        title="채점 워크벤치"
        lead="서술형 응답에 AI가 1차로 매긴 값을 사람이 루브릭으로 확정합니다. 확신도가 낮은 건은 자동으로 사람에게 넘어옵니다."
      />
      <PermissionGate need="grade.review">
        <ScoringBench />
      </PermissionGate>
    </>
  );
}
