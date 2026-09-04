"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { staffDirectory } from "@/lib/adminUsers";
import { n } from "@/lib/admin2";
import { PageHead, Tab } from "@/components/admin2/ui";
import StaffTable from "./StaffTable";

/**
 * ADM-03 운영자 목록의 머리·탭·표.
 *
 * 예전에는 제목 아래 한 줄에 숫자 넷(계정·최고권한·2단계 미설정·정지·휴면)을 적어 두었다.
 * 그 넷을 읽고 나서 「2단계 미설정 3」에 해당하는 셋을 찾으려면 아래 거르개를 다시 열어야
 * 했다. 지금은 그 숫자가 곧 조회 조건이다.
 *
 * 탭 축이 둘로 섞인다. 활성·정지/휴면은 계정 상태이고 2단계 미설정은 설정값이다. 둘을
 * 한 줄에 세운 것은 이 화면에서 실제로 묶어 보는 방식이 그 둘뿐이기 때문이다 — 규모를
 * 볼 때는 상태로, 오늘 할 일을 볼 때는 2단계로 본다. 탭은 하나만 걸리므로 부딪치지 않는다.
 *
 * 최고권한은 탭에 두지 않았다. 역할은 넷이고 그중 하나만 탭으로 올리면 나머지 셋을 볼
 * 길이 사라진다. 역할은 표의 거르개가 넷 다 들고 있다.
 */

type TabId = "all" | "active" | "off" | "mfa";

export default function StaffView() {
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      {
        id: "all" as TabId,
        label: "전체",
        rows: staffDirectory,
        empty: "조건에 맞는 운영자가 없습니다.",
      },
      {
        id: "active" as TabId,
        label: "활성",
        rows: staffDirectory.filter((s) => s.state === "active"),
        empty: "활성 계정이 없습니다.",
      },
      {
        id: "off" as TabId,
        label: "정지·휴면",
        rows: staffDirectory.filter((s) => s.state !== "active"),
        empty: "정지·휴면 계정이 없습니다.",
      },
      {
        id: "mfa" as TabId,
        label: "2단계 미설정",
        rows: staffDirectory.filter((s) => !s.mfa),
        empty: "2단계 인증을 끈 계정이 없습니다.",
      },
    ],
    [],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="운영자·권한"
        tabsLabel="계정 상태별 조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
          />
        ))}
        actions={
          /* 이 화면에서 못 하는 일로 나가는 문 하나. 계정을 만졌으면 그 기록이 어디에
             남는지가 바로 다음 질문이라 감사 로그를 붙였다. 동작하지 않는 「운영자 추가」
             같은 단추는 두지 않았다 */
          <Link href="/admin2/audit" className="a2-btn">
            감사 로그
          </Link>
        }
      />
      <StaffTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
