import Link from "next/link";
import PermissionGate from "@/components/admin/PermissionGate";
import ScreenGuardPanel from "@/components/admin/ScreenGuardPanel";
import { PageHead } from "@/components/admin/Parts";
import * as a from "@/components/admin/ui";

export const metadata = { title: "응시 화면 보호 · GENIXX 관리자" };

/**
 * 응시 화면 보호 (ADM-05-3).
 *
 * 원래 문항 은행(ADM-04-4) 안에 있었다. 바꾸는 것이 문항이 아니라 응시 환경이라
 * 회차 쪽으로 옮겼다 — 제한 시간·자동 제출과 같은 자리에 있어야 「이번 회차의 응시
 * 조건」을 한 번에 볼 수 있다.
 *
 * 정의서에는 ADM-05-1·-2까지만 있어 번호를 새로 딴다. 설문 원본(ADM-14)에서 이미
 * 같은 방식으로 번호를 딴 적이 있다.
 */
export default function RoundSecurityPage() {
  return (
    <>
      <PageHead
        title="응시 화면 보호"
        lead="응시 화면에서 문항이 밖으로 나가는 것을 늦추는 장치입니다. 켜고 끄면 곧바로 적용되고, 바꾼 까닭이 기록에 남습니다."
        action={
          <Link href="/admin/rounds" className={a.btnGhost}>
            ← 회차 · 응시 현황
          </Link>
        }
      />

      <PermissionGate need="round.manage">
        <div id="ADM-05-3" className="scroll-mt-20">
          <ScreenGuardPanel />
        </div>
      </PermissionGate>
    </>
  );
}
