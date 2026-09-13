"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import {
  consentKinds,
  consentStateLabel,
  countPrivacy,
  purgeReasonLabel,
  purgeStateLabel,
  today,
  usePrivacy,
  type ConsentKind,
  type PrivacyRow,
} from "@/lib/privacyStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Tab } from "@/components/admin2/ui";

/**
 * ADM-10 개인정보 관리 — 누가 무엇에 동의했고, 무엇을 언제 지우는가.
 *
 * 아동 데이터를 다루는 서비스라 이 화면이 없으면 안 된다. 여태 콘솔에는 감사 로그(누가
 * 무엇을 열람했나)만 있었고, **동의 자체**와 **파기**를 볼 자리가 없었다 — 철회 요청이
 * 1:1 문의로 들어오면 그 건을 손으로 처리하고 아무 데도 안 남았다.
 *
 * ── 지우는 일은 여기 없다 ──
 * 파기 스케줄러는 제 화면(ADM-10-1)으로 나갔다. 여기는 명부라 회원을 찾으러 매일 열고,
 * 저기는 되돌릴 수 없는 단추가 있어 지울 때만 연다 — 한 장에 같이 두면 훑으러 온 사람이
 * 늘 그 단추 옆을 지난다. 이 화면은 상태만 적고(파기 칸), 누르는 자리는 넘긴다.
 *
 * ── 철회는 기다리지 않는다 ──
 * 보관기간 도래는 만료일에 서고, 철회 요청은 **요청 그날** 선다. 철회한 사람을 만료일까지
 * 들고 있을 근거가 없다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 동의 넷을 한 칸에 — 갈래마다 점 하나. 색만으로 가르지 않고 글자를 함께 적는다 */
function ConsentDots({ row }: { row: PrivacyRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {consentKinds.map((k) => {
        const v = row.consents[k.id];
        /* 학부모에게 법정대리인 동의는 없는 칸이다 — 「미동의」로 적으면 빠뜨린 것으로 읽힌다 */
        if (v === "none" && (k.id === "guardian" ? !row.minor : !k.required)) return null;
        const bad = v === "withdrawn" || (v === "none" && k.required);
        return (
          <span key={k.id} className="a2-t-xs" style={{ color: bad ? "var(--a2-danger)" : "var(--a2-ink-3)" }}>
            {k.short} {consentStateLabel[v]}
          </span>
        );
      })}
    </span>
  );
}

type TabId = "all" | "withdrawn" | "guardian";

export default function PrivacyView() {
  const { rows } = usePrivacy();
  const [tab, setTab] = useState<TabId>("all");

  const c = useMemo(() => countPrivacy(rows), [rows]);
  const now = today();

  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows, empty: "회원이 없습니다." },
      {
        id: "withdrawn" as TabId,
        label: "동의 철회",
        rows: rows.filter((v) =>
          consentKinds.some((k) => k.required && v.consents[k.id] === "withdrawn"),
        ),
        empty: "필수 동의를 철회한 회원이 없습니다.",
      },
      {
        id: "guardian" as TabId,
        label: "법정대리인 없음",
        rows: rows.filter((v) => v.minor && v.consents.guardian !== "granted"),
        empty: "법정대리인 동의가 빠진 아이가 없습니다.",
      },
    ],
    [rows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const cols = useMemo<Col<PrivacyRow>[]>(
    () => [
      {
        key: "id",
        head: "회원 ID",
        width: "8rem",
        nowrap: true,
        value: (v) => v.id,
        cell: (v) => <span className="a2-mono text-(--a2-ink)">{v.id}</span>,
      },
      {
        key: "name",
        head: "이름",
        width: "7rem",
        nowrap: true,
        value: (v) => `${v.name} ${v.kind}`,
        cell: (v) => (
          <span className="inline-flex items-center gap-1.5">
            <Link
              href={`/admin2/privacy/${v.id}`}
              className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            >
              {v.name}
            </Link>
            <span className="a2-t-xs text-(--a2-ink-4)">{v.kind}</span>
            {v.minor && <span className="a2-t-xs text-(--a2-ink-4)">만 14세 미만</span>}
          </span>
        ),
      },
      {
        key: "consents",
        head: "동의",
        width: "100%",
        value: (v) =>
          consentKinds.map((k) => `${k.short} ${consentStateLabel[v.consents[k.id]]}`).join(" "),
        cell: (v) => <ConsentDots row={v} />,
      },
      {
        key: "keepUntil",
        head: "보관 만료",
        width: "7.5rem",
        nowrap: true,
        value: (v) => v.keepUntil,
        cell: (v) => (
          <span
            className="a2-mono a2-t-sm"
            style={{ color: v.keepUntil <= now ? "var(--a2-danger)" : "var(--a2-ink-3)" }}
          >
            {v.keepUntil}
          </span>
        ),
      },
      {
        key: "purge",
        head: "파기",
        width: "9rem",
        nowrap: true,
        value: (v) => `${purgeStateLabel[v.purge]} ${v.purgeReason ? purgeReasonLabel[v.purgeReason] : ""}`,
        /* 상태 딱지(Status)를 쓰지 않는다 — 바로 옆 동의 칸이 글자만으로 적고 있어서,
           한 줄에 딱지와 맨글자가 섞이면 딱지 쪽만 눈에 튄다. 색과 글자로 충분하다 */
        cell: (v) =>
          v.purge === "none" ? (
            dash
          ) : (
            <span className="inline-flex flex-col">
              <span
                className="a2-t-xs font-semibold"
                style={{ color: v.purge === "done" ? "var(--a2-ink-3)" : "var(--a2-warn)" }}
              >
                {purgeStateLabel[v.purge]}
              </span>
              <span className="a2-t-xs text-(--a2-ink-4)">
                {v.purgeReason ? purgeReasonLabel[v.purgeReason] : ""}
                {v.purgedAt ? ` · ${v.purgedAt}` : v.purgeDue ? ` · ${v.purgeDue}` : ""}
              </span>
            </span>
          ),
      },
      {
        /* 동의 이력 전건은 여기 다 못 들어간다 — 갈래 넷에 시각·누가·경로까지라
           한 줄로 펴면 표가 옆으로 넘어간다. 상세에서 본다 */
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (v) => (
          <Link
            href={`/admin2/privacy/${v.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${v.name} 동의 이력`}
          >
            이력
          </Link>
        ),
      },
    ],
    [now],
  );

  const filters = useMemo<Filter<PrivacyRow>[]>(
    () => [
      {
        id: "kind",
        label: "유형",
        options: [
          { value: "학부모", label: "학부모" },
          { value: "학생", label: "학생" },
        ],
        match: (v, x) => v.kind === x,
      },
      {
        id: "consent",
        label: "동의",
        options: consentKinds.map((k) => ({ value: k.id, label: `${k.short} 철회` })),
        match: (v, x) => v.consents[x as ConsentKind] === "withdrawn",
      },
    ],
    [],
  );

  return (
    <>
      <PageHead
        title="개인정보 관리"
        actions={
          /* 지우는 자리로 나가는 문. 대기 건수를 달아 두어야 「지금 할 일이 있나」를
             여기서 알고 넘어간다 — 숫자가 없으면 열어 보고 빈 표를 만나는 일이 잦다 */
          <Link href="/admin2/privacy/purge" className="a2-btn">
            파기 스케줄러{c.queued > 0 ? ` ${n(c.queued)}` : ""}
          </Link>
        }
        tabsLabel="조회 조건"
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

      {/* 먼저 답해야 하는 넷 */}
      <div className="a2-stats border-b border-(--a2-line) sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">동의 보유</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{n(c.total - c.withdrawn)}</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">전체 {n(c.total)}명</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">필수 동의 철회</p>
          <p className="mt-1 a2-metric" style={{ color: c.withdrawn > 0 ? "var(--a2-danger)" : undefined }}>
            {n(c.withdrawn)}
          </p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">즉시 파기 대상</p>
        </div>
        <div className="bg-(--a2-panel) p-3">
          <p className="a2-label">법정대리인 없음</p>
          <p className="mt-1 a2-metric" style={{ color: c.guardianMissing > 0 ? "var(--a2-warn)" : undefined }}>
            {n(c.guardianMissing)}
          </p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">만 14세 미만 · 프로필이 열리지 않습니다</p>
        </div>
        <Link
          href="/admin2/privacy/purge"
          className="block bg-(--a2-panel) p-3 transition-colors hover:bg-(--a2-hover)"
        >
          <p className="a2-label">파기 대기</p>
          <p className="mt-1 a2-metric text-(--a2-ink)">{n(c.queued)}</p>
          <p className="mt-0.5 a2-t-xs text-(--a2-ink-4)">
            도래 {n(c.queuedExpired)} · 철회 {n(c.queuedWithdrawn)}
          </p>
        </Link>
      </div>


      <DataTable
        key={tab}
        rows={current.rows}
        cols={cols}
        filters={filters}
        getKey={(v) => v.id}
        pageSize={25}
        searchHint="회원 ID · 이름"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
