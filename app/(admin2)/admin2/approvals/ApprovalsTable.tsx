"use client";

import Link from "next/link";
import { useMemo } from "react";
import { approvalTone } from "@/lib/admin2";
import { verdictLabel, type ApprovalRow } from "@/lib/approvalStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-02-2 가입 승인 목록의 표.
 *
 * 한동안 줄마다 판(Panel)을 세웠다. 다섯 줄뿐이고 한 건에서 읽을 것이 길다는 이유였는데,
 * 그러면 이 화면이 할 수 있는 일이 「위에서 아래로 다섯 장 읽기」뿐이 된다 — 검색도
 * 정렬도 처리 상태별 조회도 붙일 자리가 없었다. 신청이 스무 건만 되어도 스크롤로 답이
 * 없어지고, 무엇보다 콘솔의 다른 열두 화면과 손이 가는 자리가 달랐다.
 *
 * 그래서 표로 돌린다. 한 건에서 길게 읽어야 하는 것(신청 내용·제출 증빙·자동 점검 사유)은
 * 상세 화면(ADM-02-2-1)이 맡고, 여기서는 **어느 건을 열지** 고르는 데 필요한 것만 세운다.
 *
 * ── 자동 점검 칸 ──
 * 경고 문장을 그대로 싣지 않고 있음/없음만 세운다. 문장은 줄마다 길이가 달라 말줄임이
 * 되는데, 반쯤 잘린 경고는 읽어도 판단이 서지 않아 결국 상세를 열게 된다. 「경고」라는
 * 사실만 알면 어느 건을 먼저 열지가 정해지고, 왜인지는 그 화면에서 온전히 읽는다.
 * 없을 때도 빈칸으로 두지 않는다 — 비어 있으면 점검을 통과한 건지 안 돌린 건지 모른다.
 */

const kindLabel = { teacher: "교사", org: "기관" } as const;

export default function ApprovalsTable({ rows, empty }: { rows: ApprovalRow[]; empty: string }) {
  const cols = useMemo<Col<ApprovalRow>[]>(
    () => [
      {
        key: "id",
        head: "신청 ID",
        width: "8.5rem",
        nowrap: true,
        value: (a) => a.id,
        cell: (a) => (
          <Link
            href={`/admin2/approvals/${a.id}`}
            className="a2-mono font-semibold text-(--a2-ink) hover:underline"
          >
            {a.id}
          </Link>
        ),
      },
      {
        key: "kind",
        head: "종류",
        width: "4rem",
        nowrap: true,
        value: (a) => kindLabel[a.kind],
        cell: (a) => <Tag>{kindLabel[a.kind]}</Tag>,
      },
      {
        key: "name",
        head: "신청자",
        width: "5.5rem",
        nowrap: true,
        value: (a) => a.name,
        cell: (a) => <span className="a2-td-key">{a.name}</span>,
      },
      {
        key: "org",
        head: "소속",
        clip: true,
        value: (a) => a.org,
        cell: (a) => (
          <span title={a.org} className="text-(--a2-ink-2)">
            {a.org}
          </span>
        ),
      },
      {
        key: "warning",
        head: "자동 점검",
        width: "6rem",
        nowrap: true,
        value: (a) => (a.warning ? "경고" : "이상 없음"),
        cell: (a) =>
          a.warning ? (
            <span title={a.warning}>
              <Status tone="warn">경고</Status>
            </span>
          ) : (
            <Status tone="muted">이상 없음</Status>
          ),
      },
      {
        key: "requestedAt",
        head: "신청 시각",
        width: "7rem",
        nowrap: true,
        hide: "md",
        value: (a) => a.requestedAt,
        cell: (a) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{a.requestedAt}</span>,
      },
      {
        key: "state",
        head: "처리 상태",
        width: "6rem",
        nowrap: true,
        value: (a) => verdictLabel[a.state],
        cell: (a) => (
          <span title={a.decision ? `${a.decision.at} · ${a.decision.by}` : undefined}>
            <Status tone={approvalTone[a.state]}>{verdictLabel[a.state]}</Status>
          </span>
        ),
      },
      {
        key: "act",
        head: "관리",
        width: "6rem",
        nowrap: true,
        cell: (a) => (
          <Link
            href={`/admin2/approvals/${a.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${a.id} 상세보기`}
          >
            상세보기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<ApprovalRow>[]>(
    () => [
      {
        id: "kind",
        label: "종류",
        options: [
          { value: "teacher", label: kindLabel.teacher },
          { value: "org", label: kindLabel.org },
        ],
        match: (a, v) => a.kind === v,
      },
      {
        id: "warning",
        label: "자동 점검",
        options: [
          { value: "warned", label: "경고 있음" },
          { value: "clean", label: "이상 없음" },
        ],
        match: (a, v) => (v === "warned" ? !!a.warning : !a.warning),
      },
    ],
    [],
  );

  return (
    <DataTable
      rows={rows}
      cols={cols}
      filters={filters}
      getKey={(a) => a.id}
      searchHint="신청 ID · 신청자 · 소속"
      empty={empty}
    />
  );
}
