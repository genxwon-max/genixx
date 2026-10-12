"use client";

import Link from "next/link";
import { useMemo } from "react";
import { n } from "@/lib/admin2";
import {
  dueText,
  hourLabel,
  hourOf,
  policyFullText,
  type SendPolicy,
  type SendRow,
} from "@/lib/reportRelease";
import DataTable, { type Col, type Filter } from "./DataTable";
import { FormRow, PageHead, Status, Tab } from "./ui";

/**
 * EXP-08 리포트 승인 — 목록.
 *
 * 채점이 끝난 답안지의 리포트가 여기에 오르고, 스케줄러가 정한 날이 되면 저절로 발행된다.
 * 사람이 이 화면에서 하는 일은 둘이다 — 곧 나갈 리포트를 미리 읽고, 자동 발행에서 빠진
 * 것을 고친다.
 *
 * ── 스케줄러는 값만 적는다 ──
 * 목록 위 한 줄에 지금 걸린 값(「채점 완료 7일 뒤 오전 9시」)이 적혀 있다. 발행 칸의 날짜가
 * 어디서 나왔는지를 이 화면에서 알아야 하기 때문이다. 고치는 자리는 시스템 > 스케줄러
 * (components/admin2/SchedulerBoard.tsx) 하나다 — 개인정보 스케줄러와 함께 그곳에 모여 있고,
 * 이 줄의 단추가 그리로 간다. 한동안 이 줄에서 바로 골라 저장했는데, 스케줄러가 화면마다
 * 흩어져 「무엇이 저절로 돌아가는가」를 한눈에 볼 수 없었다.
 *
 * ── 줄에는 단추를 두지 않는다 ──
 * 줄에서 할 수 있는 일은 「열어 본다」 하나다. 발행은 그 아이 하나를 붙들고 보는 자리(상세)
 * 에서만 한다 — 스무 줄을 훑다가 손이 미끄러져 리포트가 나가면 안 된다.
 *
 * 값을 읽고 저장하는 일은 부르는 쪽이 한다. 실제 화면(app/(admin2)/…/ApprovalView.tsx)은
 * 저장소를, 디자인 보기는 적어 둔 예시를 넘긴다.
 */

export type BoardTab = "wait" | "check" | "sent" | "all";

const EMPTY: Record<BoardTab, string> = {
  wait: "발행을 기다리는 리포트가 없습니다. 채점이 끝난 답안지의 리포트가 여기에 표시됩니다.",
  check: "확인이 필요한 리포트가 없습니다.",
  sent: "아직 발행한 리포트가 없습니다.",
  all: "조건에 맞는 리포트가 없습니다.",
};

/** 아직 나가지 않은 줄의 발행 칸 아랫줄 — 언제 나가는가, 또는 왜 안 나가는가 */
function waitNote(r: SendRow, policy: SendPolicy) {
  const left = dueText(r.daysLeft);
  if (r.stop) return left ? `자동 발행 보류 · ${left}` : "자동 발행 보류";
  return r.daysLeft === 0 ? `오늘 ${hourLabel(hourOf(policy))}` : left;
}

export default function ReportBoard({
  rows,
  policy,
  tab,
  onTab,
  hrefOf,
  schedulerHref,
  children,
}: {
  rows: SendRow[];
  policy: SendPolicy;
  tab: BoardTab;
  onTab: (tab: BoardTab) => void;
  /** 줄을 누르면 가는 곳 — 그 리포트의 상세 */
  hrefOf: (row: SendRow) => string;
  /**
   * 스케줄러를 고치는 화면(시스템 > 스케줄러). 그 화면을 열 수 없는 사람에게는 넘기지 않는다 —
   * 값은 그대로 보이고 「스케줄러에서 변경」 단추만 빠진다.
   */
  schedulerHref?: string;
  /** 표 아래에 붙일 것 — 예시 자료 고지 */
  children?: React.ReactNode;
}) {
  const tabs = useMemo(
    () => [
      {
        id: "wait" as BoardTab,
        label: "발행 예정",
        rows: rows.filter((r) => r.send === "waiting" && !r.stop),
      },
      {
        id: "check" as BoardTab,
        label: "확인 필요",
        rows: rows.filter((r) => r.send === "waiting" && !!r.stop),
      },
      { id: "sent" as BoardTab, label: "발행 완료", rows: rows.filter((r) => r.send === "sent") },
      { id: "all" as BoardTab, label: "전체", rows },
    ],
    [rows],
  );
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const cols: Col<SendRow>[] = useMemo(
    () => [
      {
        key: "student",
        head: "회원",
        width: "9rem",
        nowrap: true,
        value: (r) => `${r.student} ${r.grade}`,
        sort: (r) => r.student,
        /* 줄을 누르면 이 링크가 대신 눌린다(DataTable의 rowLink) */
        cell: (r) => (
          <Link href={hrefOf(r)} className="font-semibold text-(--a2-ink)">
            {r.student}
            <span className="mt-0.5 block a2-t-xs font-normal text-(--a2-ink-3)">{r.grade}</span>
          </Link>
        ),
      },
      {
        key: "id",
        detail: true,
        head: "리포트",
        value: (r) => r.id,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.id}</span>,
      },
      {
        key: "round",
        head: "진단명",
        width: "10.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => r.round,
        cell: (r) => <span className="a2-t-sm text-(--a2-ink)">{r.round}</span>,
      },
      {
        key: "type",
        head: "재능 유형",
        width: "100%",
        clip: true,
        value: (r) => `${r.typeCode} ${r.typeName}`,
        cell: (r) => (
          <>
            <span className="a2-t-sm text-(--a2-ink)">{r.typeName}</span>
            <span className="mt-0.5 block a2-mono a2-t-xs text-(--a2-ink-3)">{r.typeCode}</span>
          </>
        ),
      },
      {
        /* 예정일을 여기서부터 센다 — 발행 칸의 날짜가 어디서 나왔는지가 옆 칸에 있어야 한다 */
        key: "graded",
        head: "채점 완료",
        width: "6.5rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.gradedOn ?? "",
        cell: (r) => <span className="a2-mono a2-t-sm">{r.gradedOn ?? ""}</span>,
      },
      {
        key: "check",
        head: "검토",
        width: "6.5rem",
        nowrap: true,
        value: (r) => (r.banned ? "검토필요" : r.cautions ? "검토중" : "완료"),
        cell: (r) =>
          r.banned ? (
            <Status tone="danger">검토필요 {r.banned}</Status>
          ) : r.cautions ? (
            <Status tone="warn">검토중 {r.cautions}</Status>
          ) : (
            <Status tone="ok">완료</Status>
          ),
      },
      {
        key: "send",
        head: "발행",
        width: "10rem",
        nowrap: true,
        value: (r) =>
          r.send === "sent"
            ? `${r.auto ? "자동 발행" : "직접 발행"} ${r.sentAt ?? ""}`
            : `${r.sendOn ?? ""} ${waitNote(r, policy)}`,
        sort: (r) => r.sentAt ?? r.sendOn ?? "",
        cell: (r) =>
          r.send === "sent" ? (
            <>
              <Status tone="muted">{r.auto ? "자동 발행" : "직접 발행"}</Status>
              <span className="mt-0.5 block a2-mono a2-t-xs text-(--a2-ink-3)">{r.sentAt}</span>
            </>
          ) : (
            <>
              <span className="a2-mono a2-t-sm">{r.sendOn ?? ""}</span>
              {/* 상태 색을 이 칸에 또 쓰지 않는다. 검토 칸과 양쪽에 색이 서면 한 줄에 색점이
                  둘이 되어, 정작 손이 가야 하는 검토 쪽이 안 읽힌다 */}
              <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">
                {waitNote(r, policy)}
              </span>
            </>
          ),
      },
    ],
    [hrefOf, policy],
  );

  const filters: Filter<SendRow>[] = useMemo(
    () => [
      {
        id: "round",
        label: "진단",
        options: [...new Set(rows.map((r) => r.round))]
          .sort()
          .reverse()
          .map((v) => ({ value: v, label: v })),
        match: (r, v) => r.round === v,
      },
      {
        id: "check",
        label: "검토",
        options: [
          { value: "block", label: "검토필요" },
          { value: "warn", label: "검토중" },
          { value: "ok", label: "완료" },
        ],
        match: (r, v) =>
          v === "block"
            ? r.banned > 0
            : v === "warn"
              ? !r.banned && r.cautions > 0
              : !r.banned && !r.cautions,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead title="리포트 승인" />

      {/* 지금 걸린 스케줄러 — 읽기만 한다. 고치는 자리는 시스템 > 스케줄러다 */}
      <div className="a2-form" style={{ borderTop: 0 }}>
        <FormRow
          label="리포트 스케줄러"
          hint="채점이 끝난 답안지의 리포트만 목록에 표시됩니다. 예정일 전에 내보내려면 리포트에 들어가 「지금 발행」을 누릅니다."
        >
          <span className="a2-t-sm text-(--a2-ink-2)">
            <b className="text-(--a2-ink)">{policyFullText(policy)}</b>
            {policy.days === 0 ? " 자동으로 발행됩니다." : "에 자동으로 발행됩니다."}
          </span>
          {schedulerHref && (
            <Link href={schedulerHref} className="a2-btn a2-btn-sm ml-auto">
              스케줄러에서 변경
            </Link>
          )}
        </FormRow>
      </div>

      <div
        role="group"
        aria-label="발행 상태별 조회 조건"
        className="a2-tabs border-b border-(--a2-line)"
      >
        {tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={current.id === t.id}
            onClick={() => onTab(t.id)}
          />
        ))}
      </div>

      <DataTable
        key={current.id}
        rows={current.rows}
        cols={cols}
        getKey={(r) => r.id}
        rowLink
        filters={filters}
        showCount={false}
        searchHint="회원 이름 · 리포트 번호 검색"
        empty={EMPTY[current.id]}
      />

      {children}
    </>
  );
}
