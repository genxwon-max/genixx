"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { caseStatusLabel, type CaseStatus } from "@/lib/counselCaseStore";
import { counselModes, spanLabel } from "@/lib/counselors";
import DataTable, { type Col } from "@/components/admin2/DataTable";
import { PageHead, Status, Tab, Tag } from "@/components/admin2/ui";
import { bookerText, dayLabel, isDead, useMyBookings, type ClientBooking } from "@/components/expert/me";
import { caseTone, NotCounselor, useConsoleCounselor } from "./shared";

/**
 * EXP-06-3 내 상담 — 상담사에게 들어온 면담 신청.
 *
 * 신청 한 건이 한 줄이다. 탭은 **처리 상태** 한 축만 쓰고, 기본은 「신청」이다 — 이 화면에
 * 들어온 사람이 가장 먼저 할 일이 수락할지 정하는 것이기 때문이다. 줄을 누르면 그 학생의
 * 상세로 가서 수락 · 거절하고 상담일지를 쓴다.
 *
 * 목록에는 고르는 데 필요한 칸만 세운다(일시 · 학생 · 신청자 · 방식 · 상태). 상담 목적과
 * 학생 정보는 상세에서 본다.
 */

type TabId = "requested" | "confirmed" | "ongoing" | "done" | "all";
const tabIds: TabId[] = ["requested", "confirmed", "ongoing", "done", "all"];

export default function CounselList() {
  const account = useConsoleCounselor();
  const rows = useMyBookings(account);
  const [tab, setTab] = useState<TabId>("requested");

  const cols = useMemo<Col<ClientBooking>[]>(
    () => [
      {
        key: "when",
        head: "일시",
        width: "9.5rem",
        nowrap: true,
        value: (b) => `${b.date} ${b.start}`,
        /* 줄을 누르면 이 링크가 대신 눌린다(DataTable의 rowLink). 거절 · 취소된 줄은 열 곳이 없다 */
        cell: (b) =>
          isDead(b.status) ? (
            <span className="a2-mono text-(--a2-ink-4)">
              {dayLabel(b.date)} {b.start}
            </span>
          ) : (
            <Link
              href={`/admin2/counsel/${b.studentId}`}
              className="a2-mono font-semibold text-(--a2-ink)"
            >
              {dayLabel(b.date)} {b.start}
            </Link>
          ),
      },
      {
        key: "student",
        head: "학생",
        nowrap: true,
        value: (b) => b.studentName,
        cell: (b) => (
          <span className="flex items-center gap-1.5">
            <span className="a2-td-key">{b.studentName}</span>
            {b.demo && <Tag>예시</Tag>}
          </span>
        ),
      },
      {
        key: "booker",
        head: "신청자",
        clip: true,
        value: (b) => bookerText(b),
        cell: (b) => <span className="text-(--a2-ink-2)">{bookerText(b)}</span>,
      },
      {
        key: "mode",
        head: "방식",
        width: "7rem",
        nowrap: true,
        hide: "md",
        value: (b) => `${counselModes[b.mode]} ${spanLabel(b.span)}`,
        cell: (b) => (
          <span className="a2-t-sm text-(--a2-ink-3)">
            {counselModes[b.mode]} · {spanLabel(b.span)}
          </span>
        ),
      },
      {
        key: "status",
        head: "상태",
        width: "5rem",
        nowrap: true,
        value: (b) => caseStatusLabel[b.status],
        cell: (b) => <Status tone={caseTone[b.status]}>{caseStatusLabel[b.status]}</Status>,
      },
      {
        key: "note",
        head: "상담 목적",
        detail: true,
        value: (b) => b.note,
        cell: (b) => b.note,
      },
    ],
    [],
  );

  if (!account) return <NotCounselor title="내 상담" />;

  const of = (id: TabId) => (id === "all" ? rows : rows.filter((b) => b.status === (id as CaseStatus)));
  const current = of(tab);

  return (
    <>
      <PageHead
        title="내 상담"
        tabsLabel="처리 상태별 조회 조건"
        tabs={tabIds.map((id) => (
          <Tab
            key={id}
            label={id === "all" ? "전체" : caseStatusLabel[id]}
            count={n(of(id).length)}
            active={tab === id}
            onClick={() => setTab(id)}
          />
        ))}
      />
      {/* key를 탭으로 준다 — 앞 탭에서 보던 쪽 번호가 다음 탭에 남지 않게 */}
      <DataTable
        key={tab}
        rows={current}
        cols={cols}
        getKey={(b) => b.id}
        rowLink
        searchHint="학생 · 신청자"
        empty={
          tab === "requested"
            ? "수락을 기다리는 신청이 없습니다."
            : "이 상태의 상담이 없습니다."
        }
      />
    </>
  );
}
