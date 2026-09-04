"use client";

import { useMemo, useState } from "react";
import { inquiryStates, type InquiryRow } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { PageHead, Tab } from "@/components/admin2/ui";
import InquiriesTable, { inquiryRows } from "./InquiriesTable";

/**
 * ADM-10 문의의 머리·탭·표.
 *
 * 지표 다섯 칸을 읽기만 하는 띠로 두었을 때는, 「목표 초과 4건」을 보고 나서 그 넷을
 * 찾으러 아래 거르개로 내려가야 했다. 지금은 그 숫자가 곧 조회 조건이다.
 *
 * 「24시간 목표 초과」를 상태 탭 옆에 나란히 둔 것은, 이것이 상태와 다른 축이면서도
 * 이 화면에서 가장 급한 묶음이기 때문이다 — 처리중이든 미배정이든 약속을 이미 깬 줄이다.
 * 축이 섞이지만 탭은 하나만 걸리므로 서로 부딪치지 않는다.
 */

const STATES: InquiryRow["state"][] = ["new", "working", "answered"];

type TabId = "all" | InquiryRow["state"] | "overdue";

export default function InquiriesView() {
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows: inquiryRows, empty: "조건에 맞는 문의가 없습니다." },
      ...STATES.map((s) => ({
        id: s as TabId,
        label: inquiryStates[s].label,
        rows: inquiryRows.filter((i) => i.state === s),
        empty: `${inquiryStates[s].label} 문의가 없습니다.`,
      })),
      {
        id: "overdue" as TabId,
        label: "목표 초과",
        rows: inquiryRows.filter((i) => i.overdue),
        empty: "24시간 목표를 넘긴 문의가 없습니다.",
      },
    ],
    [],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="문의"
        tabsLabel="상태별 조회 조건"
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
      <InquiriesTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
