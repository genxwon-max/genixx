"use client";

import Link from "next/link";
import { n } from "@/lib/admin2";
import { usePendingApprovals } from "@/lib/approvalStore";

/**
 * 회원 화면 머리의 「가입 승인 N」 단추.
 *
 * 이 화면에서 못 하는 일로 나가는 문이지만, 신청이 걸려 있는 동안에는 그쪽이 오늘의
 * 동작이다. 그래서 0이 아닐 때만 주 단추(a2-btn-primary)로 칠한다 — 옆의 「학생·접속코드」와
 * 똑같이 그려 두면 「나가는 문이 둘 있다」까지만 읽히고 어느 쪽이 급한지는 안 읽힌다.
 *
 * 조각을 따로 뗀 까닭은 수가 브라우저 저장소에 있기 때문이다(lib/approvalStore.ts).
 * 서버에서 센 값을 박아 두면 다섯 건을 다 처리하고 돌아온 화면만 계속 5라고 말한다.
 *
 * ⚠ 이 수는 **처리할 신청서**다. 계정 상태가 승인 대기인 교사 수가 아니다 — 눌러서 가는
 *   화면에 서 있는 줄 수, 그리고 기둥의 배지가 이 수와 같아야 한다.
 */
export default function ApprovalsLink() {
  const waiting = usePendingApprovals();

  return (
    <Link href="/admin2/approvals" className={`a2-btn ${waiting ? "a2-btn-primary" : ""}`}>
      가입 승인
      {waiting > 0 && <span className="a2-num">{n(waiting)}</span>}
    </Link>
  );
}
