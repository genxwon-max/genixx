"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  dayPresets,
  savePolicy,
  today,
  useSendPolicy,
  useSendRows,
  type SendRow,
} from "@/lib/reportSendStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, SeedNote, Status, Tab } from "@/components/admin2/ui";

/**
 * EXP-08 리포트 승인 — 목록.
 *
 * ── 줄에서 단추를 걷어 냈다 ──
 * 「1주일 뒤 · 2주 뒤 · 지금 보내기」를 줄마다 세웠더니 표가 단추밭이 되었고, 무엇보다
 * **되돌릴 수 없는 발송이 훑는 자리에 서 있었다.** 스무 줄을 훑다가 손이 미끄러지면 그
 * 아이에게 리포트가 나간다. 줄에서 할 수 있는 일은 「상세보기」 하나로 두고, 보내는 일은
 * 그 아이 하나를 붙들고 보는 자리에서만 한다.
 *
 * 예약도 줄에서 걷었다. 실제로 하는 결정은 「이 회차는 조립하고 며칠 뒤에 내보낸다」 한
 * 줄인데, 그것을 스무 줄에 스무 번 거는 것은 같은 결정을 스무 번 되풀이하는 일이다.
 * 화면 머리의 **리포트 스케줄러** 하나가 그 결정을 든다.
 *
 * ⚠ 나갈 날은 저장하지 않고 조립일 + 정책 일수로 늘 계산한다. 스케줄러를 옮기면 아직
 *   안 나간 줄이 전부 함께 움직인다 — 굳혀 두면 옛 정책으로 잡힌 날이 남는다.
 */

type TabId = "due" | "waiting" | "sent" | "all";

const EMPTY: Record<TabId, string> = {
  due: "보낼 차례가 된 리포트가 없습니다.",
  waiting: "기다리는 리포트가 없습니다.",
  sent: "아직 내보낸 리포트가 없습니다.",
  all: "조건에 맞는 리포트가 없습니다.",
};

export default function ApprovalView() {
  const [tab, setTab] = useState<TabId>("due");
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const now = hydrated ? today() : "";
  const by = useAdminPrefs().staffName || "운영자";

  const rows = useSendRows(now);
  const policy = useSendPolicy();

  const tabs = useMemo(
    () => [
      { id: "due" as TabId, label: "보낼 차례", rows: rows.filter((r) => r.due) },
      {
        id: "waiting" as TabId,
        label: "기다리는 중",
        rows: rows.filter((r) => r.send === "waiting" && !r.due),
      },
      { id: "sent" as TabId, label: "보냄", rows: rows.filter((r) => r.send === "sent") },
      { id: "all" as TabId, label: "전체", rows },
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
        cell: (r) => (
          <Link
            href={`/admin2/reports/approval/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {r.student}
            <span className="mt-0.5 block a2-t-xs font-normal text-(--a2-ink-3)">{r.grade}</span>
          </Link>
        ),
      },
      {
        key: "id",
        head: "리포트",
        width: "8.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => r.id,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.id}</span>,
      },
      {
        key: "type",
        head: "재능 유형",
        width: "11rem",
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
        key: "assembled",
        head: "조립",
        width: "6.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => r.assembledAt,
        cell: (r) => <span className="a2-mono a2-t-sm">{r.assembledAt.slice(0, 10)}</span>,
      },
      {
        key: "check",
        head: "검토",
        width: "6.5rem",
        nowrap: true,
        value: (r) => (r.banned ? "검토필요" : r.cautions ? "검토중" : "완료"),
        /* 손으로 글자만 세우던 것을 Status로 되돌렸다. 알약을 걷어 내는 일을 이 칸에서만
           하다가 콘솔 전체로 옮겼고(ui.tsx의 Status), 이제 저 조각이 내는 것이 곧 글자다 —
           여기만 제 손으로 색을 고르면 같은 뜻이 화면마다 다른 색으로 선다 */
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
        head: "발송",
        width: "10rem",
        nowrap: true,
        value: (r) => r.sentAt ?? r.sendOn,
        sort: (r) => r.sentAt ?? r.sendOn,
        cell: (r) =>
          r.send === "sent" ? (
            <>
              <Status tone="muted">보냄</Status>
              <span className="mt-0.5 block a2-mono a2-t-xs text-(--a2-ink-3)">{r.sentAt}</span>
            </>
          ) : (
            <>
              <span className="a2-mono a2-t-sm">{r.sendOn}</span>
              {/* 「때가 됨」 배지를 걷었다. 상태 알약이 검토 칸과 발송 칸 양쪽에 서니
                  한 줄에 색점이 둘이 되어, 정작 손이 가야 하는 검토 쪽이 안 읽혔다.
                  지났다는 사실은 날 수로만 적는다 — 음수 대신 「n일 지남」으로 */}
              <span className="mt-0.5 block a2-t-xs text-(--a2-ink-3)">
                {r.daysLeft == null
                  ? ""
                  : r.daysLeft < 0
                    ? `${-r.daysLeft}일 지남`
                    : r.daysLeft === 0
                      ? "오늘"
                      : `${r.daysLeft}일 뒤`}
              </span>
            </>
          ),
      },
      {
        key: "act",
        head: "",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/reports/approval/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${r.student} 리포트 상세보기`}
          >
            상세보기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters: Filter<SendRow>[] = useMemo(
    () => [
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
    [],
  );

  return (
    <>
      <PageHead
        title="리포트 승인"
        actions={
          <button type="button" className="a2-btn" onClick={() => setOpen(true)}>
            리포트 스케줄러
            <span className="a2-mono a2-t-xs text-(--a2-ink-3)">조립 +{policy.days}일</span>
          </button>
        }
        tabsLabel="발송 상태별 조회 조건"
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

      <DataTable
        key={tab}
        rows={current.rows}
        cols={cols}
        getKey={(r) => r.id}
        filters={filters}
        showCount={false}
        searchHint="회원 이름 · 리포트 번호 검색"
        empty={EMPTY[current.id]}
      />

      {open && <Scheduler days={policy.days} by={by} onClose={() => setOpen(false)} />}

      <SeedNote>
        리포트와 발송 기록은 이 브라우저에만 저장됩니다(lib/reportStore.ts ·
        lib/reportSendStore.ts). 예정일이 되어도 저절로 나가지는 않습니다 — 붙일 때 발송
        API가 그 일을 맡습니다. 사람 데이터는 전부 화면 설계를 위한 예시입니다.
      </SeedNote>
    </>
  );
}

/**
 * 리포트 스케줄러.
 *
 * 조립하고 며칠 뒤에 내보낼지를 **일수 하나**로 든다. 「1주일 뒤」·「2주 뒤」는 7과 14를
 * 사람이 부르는 이름일 뿐이라 미리 세운 단추로 두고, 3일이나 10일이 필요한 회차는 칸에
 * 직접 친다 — 이름으로만 두면 그 회차에서 막힌다.
 *
 * ⚠ 저장하면 아직 안 나간 **모든** 리포트의 예정일이 함께 움직인다. 되돌릴 수 있는 값이라
 *   묻지 않고 저장하되, 몇 건이 움직이는지는 저장 전에 적는다.
 */
function Scheduler({
  days,
  by,
  onClose,
}: {
  days: number;
  by: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(days));
  const v = Number(draft);
  const ok = Number.isInteger(v) && v >= 0 && v <= 90;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a2-sched-title"
        className="a2-panel w-full max-w-[28rem] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="a2-sched-title" className="a2-h">
          리포트 스케줄러
        </h2>
        <p className="mt-2 a2-t-sm text-(--a2-ink-2)">
          리포트를 조립하고 며칠 뒤에 회원에게 보낼지 정합니다.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {dayPresets.map((d) => (
            <button
              key={d}
              type="button"
              className={`a2-btn a2-btn-sm ${v === d ? "a2-btn-primary" : ""}`}
              aria-pressed={v === d}
              onClick={() => setDraft(String(d))}
            >
              {d === 7 ? "1주일 뒤" : d === 14 ? "2주 뒤" : d === 21 ? "3주 뒤" : `${d}일 뒤`}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="a2-label">직접</span>
          <input
            type="number"
            className="a2-input a2-mono"
            style={{ maxWidth: "6rem" }}
            aria-label="발송까지 일수"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <span className="a2-t-sm text-(--a2-ink-2)">일 뒤</span>
        </div>

        {!ok && (
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>0일에서 90일 사이의 정수로 적어 주세요.</span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-1.5">
          <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
            아직 안 나간 리포트의 예정일이 함께 움직입니다.
          </span>
          <button type="button" className="a2-btn" onClick={onClose}>
            그만두기
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!ok}
            onClick={() => {
              if (savePolicy(v, by)) onClose();
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
