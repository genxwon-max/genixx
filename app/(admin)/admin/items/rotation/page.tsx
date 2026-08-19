import Link from "next/link";
import AnchorStatus from "@/components/admin/AnchorStatus";
import ItemsTabs from "@/components/admin/ItemsTabs";
import PermissionGate from "@/components/admin/PermissionGate";
import RotationPanel from "@/components/admin/RotationPanel";
import { AnchorSection, PageHead } from "@/components/admin/Parts";
import * as a from "@/components/admin/ui";

export const metadata = { title: "문항 회전 · GENIXX 관리자" };

/**
 * 문항 회전 · 앵커 (ADM-04-4 · ADM-04-2).
 *
 * 둘을 한 화면에 둔 것은 같은 질문의 앞뒤이기 때문이다 — 「이 문항을 다음 회차에도
 * 넣어도 되는가」. 보통 문항은 되풀이하면 답이 돌아 빼야 하고, 앵커는 반대로 되풀이해
 * 넣어야 회차 사이를 견줄 수 있다. 회전표에서 앵커만 빠지는 까닭이 바로 아래 구역에
 * 적혀 있어야 한다.
 *
 * 화면 보호(복사·오른쪽 단추 차단)는 여기 없다. 응시 환경을 바꾸는 일이라
 * /admin/rounds/security로 옮겼다.
 *
 * ⚠ 머리글은 문항 목록·검사지 조립과 **글자까지 똑같이** 둔다. 갈래를 눌렀는데 갈래
 *   줄이 위아래로 움직이면 다음 갈래를 누르려고 눈과 손이 매번 자리를 다시 찾는다.
 */
export default function ItemRotationPage() {
  return (
    <>
      <PageHead
        title="문항 은행"
        lead="검수를 지나 확정된 문항이 모이는 자리입니다. 만들고 고치는 일은 출제 워크벤치에서 합니다."
        action={
          <Link href="/admin/authoring" className={a.btnPrimary}>
            출제 워크벤치에서 새로 만들기 →
          </Link>
        }
      />

      <PermissionGate need="item.review">
        <ItemsTabs />

        <p className={`${a.bodyText} mb-5`}>
          같은 문항이 같은 자리에 계속 나오면 몇 회차 만에 답이 돕니다. 그때부터 그 문항은
          아이의 힘이 아니라 정보를 잽니다.
        </p>

        <AnchorSection
          id="ADM-04-4"
          title="노출 이력"
          lead="확정된 검사지에서 읽어 옵니다. 한계에 닿은 문항은 다음 회차에 한 번 쉬게 합니다."
        >
          <RotationPanel />
        </AnchorSection>

        <div className="mt-10">
          <AnchorSection
            id="ADM-04-2"
            title="앵커 문항"
            lead="회차가 달라도 같은 잣대로 재려면, 공개하지 않고 오래 쓰는 기준 문항이 필요합니다. 두 회차에 똑같이 들어간 문항이 있어야 점수를 견줄 수 있습니다(등화)."
          >
            <AnchorStatus />
          </AnchorSection>
        </div>

        <p className="mt-8 adm-t-sm text-exam-muted">
          응시 화면에서 복사·오른쪽 단추를 막는 설정은{" "}
          <Link
            href="/admin/rounds/security"
            className="font-bold text-brand-700 underline underline-offset-4"
          >
            회차 · 응시 화면 보호
          </Link>
          에 있습니다. 문항을 지키는 진짜 대비책은 차단이 아니라 위의 회전입니다.
        </p>
      </PermissionGate>
    </>
  );
}
