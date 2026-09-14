"use client";

import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { useApprovals } from "@/lib/approvalStore";
import { PageHead, Tab } from "@/components/admin2/ui";
import ApprovalsTable from "./ApprovalsTable";

/**
 * ADM-02-2 가입 승인의 머리·탭·표.
 *
 * 탭은 **처리 상태** 한 축만 쓴다. 예전에는 종류(교사·기관)와 자동 점검 경고를 같은
 * 줄에 섞어 세웠는데, 처리 결과가 생기고 나니 「대기가 몇 건인가」가 이 화면에서 가장
 * 먼저 답해야 할 질문이 되었다. 종류와 경고는 표의 거르개로 내렸다 — 축이 다른 것을
 * 한 줄에 세우면 탭이 하나만 걸리는 탓에 「교사이면서 대기」를 고를 수가 없다.
 *
 * 기본 탭이 「대기」인 까닭은 이 화면이 명부가 아니라 큐이기 때문이다. 처리한 건은
 * 사라지지 않고 승인됨·반려됨 탭에 남는다(lib/approvalStore.ts).
 */

type TabId = "pending" | "approved" | "rejected" | "all";

export default function ApprovalsView() {
  const rows = useApprovals();
  const [tab, setTab] = useState<TabId>("pending");

  const tabs = useMemo(
    () => [
      {
        id: "pending" as TabId,
        label: "대기",
        rows: rows.filter((a) => a.state === "pending"),
        empty: "대기 중인 신청이 없습니다. 들어온 신청을 모두 처리했습니다.",
      },
      {
        id: "approved" as TabId,
        label: "승인됨",
        rows: rows.filter((a) => a.state === "approved"),
        empty: "승인한 신청이 없습니다.",
      },
      {
        id: "rejected" as TabId,
        label: "반려됨",
        rows: rows.filter((a) => a.state === "rejected"),
        empty: "반려한 신청이 없습니다.",
      },
      { id: "all" as TabId, label: "전체", rows, empty: "들어온 신청이 없습니다." },
    ],
    [rows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="가입 승인"
        tabsLabel="처리 상태별 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
      />
      {/* key를 탭으로 준다. 붙이지 않으면 앞 탭에서 3쪽을 보던 상태가 그대로 남아,
          두 줄짜리 탭으로 옮겼을 때 빈 화면이 뜬다 */}
      <ApprovalsTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
