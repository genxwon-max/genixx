import { currentRound, rounds } from "@/lib/admin";
import { PageHead } from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import RoundPlan from "@/components/admin/RoundPlan";
import RoundsTabs from "@/components/admin/RoundsTabs";

export const metadata = { title: "회차 편성 · GENIXX 관리자" };

/**
 * 회차 편성 (ADM-05-4).
 *
 * 정의서에는 ADM-05-1·-2까지만 있어 번호를 새로 딴다 — 응시 화면 보호(ADM-05-3)와
 * 같은 방식이다.
 *
 * 이 화면이 생기기 전에는 「이 회차에 어떤 문항이 나가는가」를 볼 자리가 없었다.
 * 검사지 조립(ADM-04-3)이 그 일을 하고는 있었지만 문항 은행 안에 있어서, 만든
 * 검사지가 어느 회차에 걸렸는지는 목록을 눈으로 훑어야 알 수 있었다. 회차를 여는
 * 일에는 아예 자리가 없었고 상태는 코드에 박힌 글자였다.
 *
 * ⚠ 머리글은 응시 현황·응시 화면 보호와 **똑같이** 둔다. 갈래를 눌렀는데 갈래 줄이
 *   움직이면 다음 갈래를 누르려고 눈과 손이 매번 자리를 다시 찾는다. 회차 고르개도
 *   그래서 머리글이 아니라 갈래 줄 아래에 있다.
 */
export default async function RoundExamPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round: picked } = await searchParams;
  /* 없는 회차를 물어 오면 지금 열려 있는 회차를 보여 준다 — 빈 화면보다 낫다 */
  const round = rounds.find((r) => r.id === picked) ?? currentRound;

  return (
    <>
      <PageHead title="회차" />

      <RoundsTabs />

      <PermissionGate need="round.manage">
        <div id="ADM-05-4" className="scroll-mt-20">
          <RoundPlan roundId={round.id} />
        </div>
      </PermissionGate>
    </>
  );
}
