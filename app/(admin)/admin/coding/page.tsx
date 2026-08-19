import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import CodingBench from "@/components/admin/CodingBench";

export const metadata = { title: "개방형 코딩 워크벤치 · GENIXX 관리자" };

/** EXP-05 개방형 코딩 — AI 전수 코딩, 사람은 표본 검증 */
export default function CodingPage() {
  return (
    <>
      {/* 설명 줄을 두지 않는다. 무엇을 하는 화면인지는 아래 구역 이름과 표가
          이미 말한다. */}
      <PageHead title="개방형 코딩 워크벤치" />
      <PermissionGate need="grade.review">
        <CodingBench />
      </PermissionGate>
    </>
  );
}
