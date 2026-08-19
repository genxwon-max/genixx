import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import ScoringBench from "@/components/admin/ScoringBench";

export const metadata = { title: "채점 워크벤치 · GENIXX 관리자" };

/** EXP-04 채점 워크벤치 — AI가 전수로 매기고 사람이 확정한다 */
export default function ScoringPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 큐 제목과 확신도 칸이
          이미 말한다. */}
      <PageHead title="채점 워크벤치" />
      <PermissionGate need="grade.review">
        <ScoringBench />
      </PermissionGate>
    </>
  );
}
