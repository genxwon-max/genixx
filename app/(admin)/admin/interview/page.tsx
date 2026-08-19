import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import InterviewBench from "@/components/admin/InterviewBench";

export const metadata = { title: "면담 워크벤치 · GENIXX 관리자" };

/** EXP-06 면담 워크벤치 — 지필로 재지 못한 것을 직접 묻는다 */
export default function InterviewPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 구역 이름과 표가
          이미 말한다. */}
      <PageHead title="면담 워크벤치" />
      <PermissionGate need="grade.review">
        <InterviewBench />
      </PermissionGate>
    </>
  );
}
