"use client";

import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { useHydrated } from "@/lib/examStore";
import { deskLabel, isOverdue, sortDesk, today, useInterviewDesk } from "@/lib/interviewStore";
import { PageHead, Tab } from "@/components/admin2/ui";
import InterviewList, { type ListTab } from "./InterviewList";

/**
 * EXP-06 면담 신청 — 목록.
 *
 * 문의(ADM-10)와 같은 골격이다. 상태 탭 한 줄 + 급한 파생 묶음 하나(문의의 「목표 초과」
 * 자리에 「지난 일정」) + 표 한 장, Body 없이 판 끝까지 붙여 내보낸다.
 *
 * 「지난 일정」은 상태와 다른 축이지만 이 화면에서 가장 급한 묶음이라 같은 줄에 세운다 —
 * 날짜가 지났는데 그대로 남아 있다는 것은 상대가 그 시각에 기다렸다는 뜻이다. 반려는 탭을
 * 만들지 않는다. 되돌아볼 일이 드물어 전체 탭에 회색 상태로 서는 것으로 족하고, 탭이
 * 일곱이 되면 좁은 화면에서 한 줄에 안 들어간다.
 *
 * 지표 띠를 두지 않았다. 탭이 이미 같은 숫자를 여섯 칸으로 세고 있고, 탭은 누르면 표가
 * 좁아지지만 지표는 안 좁아진다 — 같은 값이 한 화면에 두 번 서면 어느 쪽을 눌러야 하는지
 * 한 박자 멈춘다.
 *
 * ⚠ 상태 거르개를 표에 두지 않는다. 탭이 이미 그 조건이고, 같은 조건을 두 군데서 걸면
 *   서로 부딪친다.
 *
 * ⚠ 머리에 「면담 일정」으로 건너가는 단추를 두지 않는다. 기둥의 「면담 관리」 그룹에 두
 *   화면이 나란히 서 있어 한 번에 닿는다 — 같은 자리로 가는 길을 둘 만들면 어느 쪽이
 *   제 길인지 묻게 된다. 날짜를 짚어 건너가는 길(「달력에서 보기」)만 상세에 남긴다.
 *
 * ⚠ 오늘 날짜는 useHydrated() 뒤에만 쓴다. 서버가 그린 것과 첫 클라이언트 렌더가 갈리면
 *   하이드레이션이 어긋나므로, 그전에는 빈 문자열로 두어 아무것도 「지남」이 되지 않게
 *   한다. 한 프레임 뒤에 채워지고 그때 순서도 함께 맞는다.
 */
export default function InterviewsView() {
  const [tab, setTab] = useState<ListTab>("all");
  const hydrated = useHydrated();
  const now = hydrated ? today() : "";

  const desk = useInterviewDesk();
  const rows = useMemo(() => sortDesk(desk, now), [desk, now]);

  const tabs = useMemo(
    () => [
      { id: "all" as ListTab, label: "전체", rows },
      {
        id: "applied" as ListTab,
        label: deskLabel.applied,
        rows: rows.filter((r) => r.state === "applied"),
      },
      {
        id: "queued" as ListTab,
        label: deskLabel.queued,
        rows: rows.filter((r) => r.state === "queued"),
      },
      {
        id: "scheduled" as ListTab,
        label: deskLabel.scheduled,
        rows: rows.filter((r) => r.state === "scheduled" && !isOverdue(r, now)),
      },
      { id: "overdue" as ListTab, label: "지난 일정", rows: rows.filter((r) => isOverdue(r, now)) },
      {
        id: "done" as ListTab,
        label: "마친 것",
        rows: rows.filter((r) => r.state === "recorded" || r.state === "coded"),
      },
    ],
    [rows, now],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="면담 신청"
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
      <InterviewList tab={current.id} rows={current.rows} now={now} />
    </>
  );
}
