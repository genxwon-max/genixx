"use client";

import { useMemo, useState } from "react";
import { caseStates, type CaseState, type GradingCase } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { PageHead, Tab } from "@/components/admin2/ui";
import QueueTable from "./QueueTable";

/**
 * EXP-07 판정 큐의 머리·탭·표.
 *
 * 지표 넉 칸(전체·AI·검토중·회의)을 읽기만 하는 띠로 두었을 때는, 「검토중 6건」을 보고
 * 나서 그 여섯을 찾으러 아래 거르개로 다시 내려가야 했다. 지금은 그 숫자가 곧 조회
 * 조건이다 — 누르면 표가 그 상태만 남는다.
 *
 * 그래서 표의 상태 거르개는 뺐다. 같은 조건을 두 군데서 걸면 탭에서 「회의」를 고른 채
 * 거르개에서 「AI 분석 완료」를 고르는 순간 0줄이 나오고, 사람은 어느 쪽이 이겼는지 모른다.
 * 탭이 상태를 맡고, 거르개는 신뢰도·검토자처럼 상태와 겹치지 않는 것만 맡는다.
 */

const STATES: CaseState[] = ["ai", "review", "conference", "confirmed", "published"];

type TabId = "all" | CaseState;

export default function QueueView({ rows }: { rows: GradingCase[] }) {
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      {
        id: "all" as TabId,
        label: "전체",
        rows,
        empty: "조건에 맞는 케이스가 없습니다.",
      },
      ...STATES.map((s) => ({
        id: s as TabId,
        label: caseStates[s].label,
        rows: rows.filter((c) => c.state === s),
        empty: `${caseStates[s].label} 케이스가 없습니다.`,
      })),
    ],
    [rows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="판정 큐"
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
      {/* 탭을 바꾸면 표를 새로 세운다 — 걸어 둔 검색어·거르개는 그 목록에 맞춰 다시 고르는
          것이 맞다. 조건은 위에 그대로 적혀 있는데 왜 0줄인지는 안 적혀 있기 때문이다 */}
      <QueueTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
