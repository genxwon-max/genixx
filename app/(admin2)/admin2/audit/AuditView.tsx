"use client";

import { useMemo, useState } from "react";
import { auditLog } from "@/lib/admin";
import { n } from "@/lib/admin2";
import { PageHead, Tab } from "@/components/admin2/ui";
import AuditTable from "./AuditTable";

/**
 * ADM-11 감사 로그의 머리·탭·표.
 *
 * 이 화면에 오는 길은 둘이다. ① 사고나 문의가 생겨 「누가 언제 이걸 만졌나」를 되짚는다.
 * ② 점검 때 「개인정보를 본 기록이 전건 남아 있나」를 확인한다. 그 둘이 그대로 탭 셋이다 —
 * 전체는 규모고, 개인정보 열람은 약속이고, 그 외는 「사유 없이 일어난 일」이다.
 *
 * 예전에는 제목 아래 한 줄에 그 숫자 둘을 적어 두기만 했다. 「개인정보 열람 31건」을
 * 읽고 나서 그 서른하나를 보려면 아래 거르개를 다시 열어야 했으므로, 숫자를 곧 조회
 * 조건으로 만든다.
 *
 * 사유가 적힌 줄 = 개인정보에 닿은 줄. 판정 기준을 탭과 표에서 같게 쓴다(reason 한 칸).
 */

type TabId = "all" | "pii" | "rest";

export default function AuditView() {
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows: auditLog, empty: "조건에 맞는 기록이 없습니다." },
      {
        id: "pii" as TabId,
        label: "개인정보 열람",
        rows: auditLog.filter((l) => l.reason !== null),
        empty: "개인정보 열람 기록이 없습니다.",
      },
      {
        id: "rest" as TabId,
        label: "그 외",
        rows: auditLog.filter((l) => l.reason === null),
        empty: "개인정보에 닿지 않은 기록이 없습니다.",
      },
    ],
    [],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="감사 로그"
        tabsLabel="기록 종류별 조회 조건"
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
      <AuditTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
