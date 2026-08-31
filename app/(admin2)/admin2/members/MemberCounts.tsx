"use client";

import { n } from "@/lib/admin2";
import { useParents, useTeachers } from "@/lib/directoryStore";

/**
 * 회원 화면 머리의 숫자 셋.
 *
 * 서버에서 세어 박아 두면 상세 화면에서 교사 하나를 정지·탈퇴시키고 돌아왔을 때 머리의
 * 「교사 승인 대기」만 옛 수로 남는다. 고친 값은 브라우저 저장소에 있으므로 여기서 센다.
 *
 * ⚠ 셋째 수의 이름은 반드시 「교사 승인 대기」다. 이것은 **계정 상태가 승인 대기인 교사
 *   계정 수**이고, 오른쪽 단추와 왼쪽 기둥의 「가입 승인 5」는 **처리할 신청서 수**다.
 *   둘 다 「승인 대기」로 적었더니 한 줄 안에서 같은 말이 다른 수가 되었다.
 */
export default function MemberCounts() {
  const parents = useParents();
  const teachers = useTeachers();
  const waiting = teachers.filter((t) => t.state === "pending").length;

  return (
    <>
      <span>
        학부모 <span className="a2-num text-(--a2-ink-2)">{n(parents.length)}</span>
      </span>
      <span aria-hidden>·</span>
      <span>
        교사 <span className="a2-num text-(--a2-ink-2)">{n(teachers.length)}</span>
      </span>
      <span aria-hidden>·</span>
      {/* 앞의 둘은 규모, 이것만 오늘 손이 가야 하는 수다. 셋을 같은 회색으로 적어 두면
          그 구분이 화면에서 사라진다 — 0이면 할 일이 아니므로 색도 빼고 회색으로 둔다 */}
      <span>
        교사 승인 대기{" "}
        <span className="a2-num" style={{ color: waiting ? "var(--a2-warn)" : "var(--a2-ink-2)" }}>
          {n(waiting)}
        </span>
      </span>
    </>
  );
}
