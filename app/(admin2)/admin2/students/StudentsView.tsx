"use client";

import { useMemo, useState } from "react";
import { examStateLabel, type ExamState } from "@/lib/adminUsers";
import { n } from "@/lib/admin2";
import { useStudents } from "@/lib/directoryStore";
import { PageHead, Tab } from "@/components/admin2/ui";
import StudentsTable from "./StudentsTable";

/**
 * ADM-02-1 학생·접속코드의 머리·탭·표.
 *
 * 이 화면에서 나오는 질문은 「누가 있나」가 아니라 「코드를 받은 148명 중 아직 안 들어온
 * 사람이 몇인가」다. 그래서 탭을 계정 상태가 아니라 **응시 상태**로, 그것도 미응시 →
 * 응시 중 → 제출 완료 → 리포트 발행이라는 진행 순서 그대로 세운다. 회차 마감 전날 보는
 * 것은 왼쪽 두 탭이고, 마감 뒤에 보는 것은 오른쪽 두 탭이다.
 *
 * 지표를 읽기만 하는 띠로 두었을 때는 「미응시 41명」을 보고 나서 그 마흔하나를 찾으러
 * 아래 거르개로 내려가야 했다. 지금은 숫자가 곧 조회 조건이다.
 *
 * 응시 상태는 학생 상세에서 바뀌는 값이 아니지만, 탭 개수가 목록과 같은 저장소를 봐야
 * 하므로 세는 일도 여기(클라이언트)에서 한다 — 서버에서 세어 박아 두면 상세에서 학년이나
 * 코드를 고치고 돌아온 화면에서 탭만 옛 수로 남는다.
 */

const STAGES: ExamState[] = ["not-started", "in-progress", "submitted", "reported"];

type TabId = "all" | ExamState;

export default function StudentsView() {
  const rows = useStudents();
  const [tab, setTab] = useState<TabId>("all");

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows, empty: "조건에 맞는 학생이 없습니다." },
      ...STAGES.map((s) => ({
        id: s as TabId,
        label: examStateLabel[s].label,
        rows: rows.filter((r) => r.exam === s),
        empty: `${examStateLabel[s].label} 학생이 없습니다.`,
      })),
    ],
    [rows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <>
      <PageHead
        title="학생·접속코드"
        tabsLabel="응시 상태별 조회 조건"
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
      <StudentsTable key={tab} rows={current.rows} empty={current.empty} />
    </>
  );
}
