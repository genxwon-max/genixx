"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import { nowStamp, type SendRow } from "@/lib/reportRelease";
import { useAutoRelease, useSendPolicy, useSendRows } from "@/lib/reportSendStore";
import { canOpen, useScreenAccess, visibleScreens } from "@/lib/screenAccessStore";
import ReportBoard, { type BoardTab } from "@/components/admin2/ReportBoard";
import { PageHead, SeedNote } from "@/components/admin2/ui";

/**
 * EXP-08 리포트 승인 — 목록.
 *
 * 화면은 components/admin2/ReportBoard.tsx가 그린다. 여기서는 값을 읽고 저장한다.
 *
 *   리포트    채점이 끝난 답안지마다 한 건(lib/reportStore.ts)
 *   스케줄러  채점이 끝나고 며칠 뒤 몇 시에 발행할지(lib/reportSendStore.ts) — 읽기만 한다.
 *             고치는 자리는 시스템 > 스케줄러(/admin2/schedulers)다
 *
 * 화면이 열릴 때 발행 전 리포트를 지금 조립 규칙으로 맞추고, 예정일이 지난 리포트를 발행으로
 * 적는다(useAutoRelease) — 서버가 할 일을 시안에서 대신하는 자리다.
 */

const hrefOf = (r: SendRow) => `/admin2/reports/approval/${r.id}`;

const SCHEDULERS = "/admin2/schedulers";

export default function ApprovalView() {
  const [tab, setTab] = useState<BoardTab>("wait");
  const hydrated = useHydrated();
  const now = hydrated ? nowStamp() : "";
  const prefs = useAdminPrefs();
  /* 스케줄러 화면을 열 수 있는 사람에게만 「스케줄러에서 변경」을 보인다 — 눌러 놓고 「권한이
     없습니다」를 만나게 하지 않는다 */
  const access = useScreenAccess();
  const screens = visibleScreens(access, {
    loginId: prefs.loginId,
    super: prefs.role === "super",
  });

  useAutoRelease();
  const rows = useSendRows(now);
  const policy = useSendPolicy();

  /* 오늘을 읽기 전에는 표를 그리지 않는다. 3회차의 채점 완료일은 오늘에서 거꾸로 세는 값이라,
     그 전에 그리면 날짜가 빈 표와 틀린 건수가 한 번 보였다가 바뀐다 */
  if (!hydrated) return <PageHead title="리포트 승인" />;

  return (
    <ReportBoard
      rows={rows}
      policy={policy}
      tab={tab}
      onTab={setTab}
      hrefOf={hrefOf}
      schedulerHref={canOpen(screens, SCHEDULERS) ? SCHEDULERS : undefined}
    >
      <SeedNote>
        리포트와 스케줄러의 값은 이 브라우저에만 저장됩니다(lib/reportStore.ts ·
        lib/reportSendStore.ts). 시안에는 서버가 없어, 이 화면을 열 때 예정 시각이 지난 리포트를
        발행으로 적습니다 — 붙일 때는 서버의 예약 작업이 정해 둔 시각에 내보냅니다. 3회차의
        채점 완료일은 열 때마다 오늘을 기준으로 다시 셉니다. 이 브라우저에서 학생이 직접 응시해
        낸 진단은 회원 채점과 이어져 있지 않아, 최종 제출한 때를 채점 완료로 봅니다. 리포트의
        글은 답안지의 채점 결과를 조립 규칙으로 조립한 것이고, 회원 이름과 답안은 화면 설계를 위한
        예시입니다.
      </SeedNote>
    </ReportBoard>
  );
}
