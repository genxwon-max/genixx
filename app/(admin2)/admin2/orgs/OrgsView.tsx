"use client";

import { useMemo, useState } from "react";
import { contractLabel, type OrgRow } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { useOrgs } from "@/lib/directoryStore";
import { PageHead, Tab } from "@/components/admin2/ui";
import OrgsTable from "./OrgsTable";

/**
 * ADM-07 기관 화면의 머리·탭·표.
 *
 * 셋을 한 클라이언트 조각에 묶은 까닭은 하나다 — 탭 개수가 **계약 상태별 기관 수**이고,
 * 계약 상태는 기관 상세(ORG-02-1)에서 고치는 값이다. 서버에서 세어 박아 두면 한 곳을
 * 만료로 돌려놓고 돌아온 화면에서 「계약중 26곳」만 옛 수로 남는다.
 *
 * 예전에는 그 넷을 읽기만 하는 지표 띠로 두었다. 「만료 3곳」을 보고 나서 그 셋을 찾으러
 * 아래 거르개로 내려가야 했으므로, 지금은 숫자가 곧 조회 조건이다. 그래서 표의 계약
 * 거르개는 걷어 냈다 — 같은 조건을 두 군데서 걸면 서로 부딪친다.
 *
 * 탭은 **계약 상태 한 축**만 쓴다. 한동안 「응시권 90%↑」를 그 옆에 함께 세웠는데,
 * 계약 상태는 「이 기관이 살아 있는가」이고 응시권 소진은 「자리가 모자란가」라 축이
 * 다르다. 탭은 하나만 걸리므로 「계약중이면서 자리가 모자란 곳」을 고를 수가 없었다.
 * 표에서 응시권 칸까지 걷어 낸 지금은 그 탭으로 좁혀 놓고도 어느 곳이 몇 %인지 볼 수
 * 없어, 남겨 둘 이유가 사라졌다. 자리 문제는 상세의 응시권 판에서 본다.
 *
 * page.tsx에는 문서 제목만 남는다.
 */

const CONTRACTS = ["active", "trial", "expired"] as const;

type TabId = "all" | OrgRow["contract"];

export default function OrgsView() {
  const orgs = useOrgs();
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows: orgs, empty: "조건에 맞는 기관이 없습니다." },
      ...CONTRACTS.map((c) => ({
        id: c as TabId,
        label: contractLabel[c].label,
        rows: orgs.filter((o) => o.contract === c),
        empty: `${contractLabel[c].label} 기관이 없습니다.`,
      })),
    ],
    [orgs],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="기관"
        tabsLabel="계약 상태별 조회 조건"
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
      <OrgsTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
