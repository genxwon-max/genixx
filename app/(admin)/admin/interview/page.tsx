import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import InterviewBench from "@/components/admin/InterviewBench";

export const metadata = { title: "면담 워크벤치 · GENIXX 관리자" };

/** EXP-06 면담 워크벤치 — 지필로 재지 못한 것을 직접 묻는다 */
export default function InterviewPage() {
  return (
    <>
      <PageHead
        title="면담 워크벤치"
        lead="면담 대상을 규칙으로 뽑고, 고정된 질문으로 묻고, 전사한 내용을 사람이 코딩해 확정합니다."
      />
      <PermissionGate need="grade.review">
        <InterviewBench />
      </PermissionGate>
    </>
  );
}
