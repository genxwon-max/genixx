"use client";

import Link from "next/link";
import { useMemo } from "react";
import { n } from "@/lib/admin2";
import type { PrivacyRow } from "@/lib/privacyStore";
import {
  keepText,
  purgeReasonLabel,
  purgeStateLabel,
  type KeepPolicy,
  type PurgeReason,
} from "@/lib/purgePolicy";
import DataTable, { type Col, type Filter } from "./DataTable";
import { Body, FormRow, PageHead, Panel, Tab } from "./ui";

/**
 * ADM-10-1 개인정보 파기 — 파기 대기에 오른 것을 지운다.
 *
 * 개인정보 관리(ADM-10)에서 떼어 낸 화면이다. 저쪽은 명부라 회원을 찾으러 매일 여는 화면이고,
 * 여기는 **되돌릴 수 없는 단추**가 있는 화면이다. 한 장에 같이 두면 명부를 훑으러 온 사람이 늘
 * 그 단추 옆을 지나게 된다.
 *
 * ── 언제 대기에 올리는지는 여기서 정하지 않는다 ──
 * 예전에는 이 화면이 「파기 스케줄러」였고, 자동 파기를 켜고 끄는 칸이 파기 단추와 한 판에
 * 있었다. 그 값은 시스템 > 스케줄러(components/admin2/SchedulerBoard.tsx)로 갔다 — 보관기간과
 * 함께 그곳에서 정하고, 여기는 지금 값을 읽기만 한다. 이 화면에 남은 일은 지우는 것 하나다.
 *
 * ── 대기에 올리는 것과 지우는 것은 가른다 ──
 * 자동 파기를 켜면 만료일이 지난 줄이 대기에 오른다. 지우는 것은 사람이 누른다 — 켜 둔 것만으로
 * 밤사이 자료가 사라지는 화면은 만들지 않는다.
 *
 * 값을 읽고 지우는 일은 부르는 쪽이 한다. 실제 화면(app/(admin2)/admin2/privacy/purge)은
 * 저장소를, 디자인 보기는 적어 둔 예시를 넘긴다.
 */

/** 이 화면이 한 줄에서 읽는 것 — 명부의 줄(PrivacyRow)을 그대로 넘겨도 된다 */
export type PurgeRow = Pick<
  PrivacyRow,
  "id" | "name" | "kind" | "purge" | "purgeReason" | "purgeDue" | "purgedAt" | "purgedBy" | "purgedWhy"
>;

export type PurgeTab = "queued" | "done";

const dash = <span className="text-(--a2-ink-4)">—</span>;

export default function PurgeBoard({
  rows,
  auto,
  keep,
  tab,
  onTab,
  open,
  onToggle,
  why,
  onWhy,
  onRun,
  back,
  detailHrefOf,
  schedulerHref,
}: {
  rows: PurgeRow[];
  /** 자동 파기가 켜져 있는가 — 시스템 > 스케줄러의 값 */
  auto: boolean;
  keep: KeepPolicy;
  tab: PurgeTab;
  onTab: (tab: PurgeTab) => void;
  /** 「파기 실행」 판을 펴 두었는가 */
  open: boolean;
  onToggle: () => void;
  /** 파기 사유 — 다섯 자 이상 적어야 실행된다 */
  why: string;
  onWhy: (v: string) => void;
  onRun: (reason: PurgeReason) => void;
  back: React.ReactNode;
  /** 줄을 누르면 가는 곳 — 그 회원의 동의 이력 */
  detailHrefOf: (row: PurgeRow) => string;
  /** 스케줄러를 고치는 화면. 열 수 없는 사람에게는 넘기지 않는다 */
  schedulerHref?: string;
}) {
  const queued = useMemo(() => rows.filter((v) => v.purge === "queued"), [rows]);
  const done = useMemo(() => rows.filter((v) => v.purge === "done"), [rows]);
  const expired = queued.filter((v) => v.purgeReason === "expired").length;
  const withdrawn = queued.filter((v) => v.purgeReason === "withdrawn").length;

  const tabs = [
    { id: "queued" as PurgeTab, label: "파기 대기", rows: queued, empty: "파기할 것이 없습니다." },
    { id: "done" as PurgeTab, label: "파기 완료", rows: done, empty: "아직 파기한 기록이 없습니다." },
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const cols = useMemo<Col<PurgeRow>[]>(
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
        width: "9rem",
        nowrap: true,
        value: (v) => `${v.name} ${v.kind}`,
        cell: (v) => (
          <span className="inline-flex items-center gap-1.5">
            {/* 지우기 전에 「이 사람이 왜 여기 있나」를 볼 수 있어야 한다. 줄을 누르면 이
                링크가 대신 눌려 그 회원의 동의 이력으로 간다(DataTable의 rowLink) */}
            <Link href={detailHrefOf(v)} className="font-semibold text-(--a2-ink)">
              {v.name}
            </Link>
            <span className="a2-t-xs text-(--a2-ink-4)">{v.kind}</span>
          </span>
        ),
      },
      {
        key: "reason",
        head: "사유",
        width: "8rem",
        nowrap: true,
        value: (v) => (v.purgeReason ? purgeReasonLabel[v.purgeReason] : ""),
        cell: (v) => (
          <span className="a2-t-sm text-(--a2-ink-2)">
            {v.purgeReason ? purgeReasonLabel[v.purgeReason] : dash}
          </span>
        ),
      },
      {
        key: "when",
        head: "예정 · 실행",
        width: "10rem",
        nowrap: true,
        value: (v) => v.purgedAt ?? v.purgeDue ?? "",
        /* 목록 화면과 같은 꼴로 적는다 — 상태 딱지를 두면 표 한 줄에서 이 칸만 튄다 */
        cell: (v) => (
          <span className="inline-flex flex-col">
            <span
              className="a2-t-xs font-semibold"
              style={{ color: v.purge === "done" ? "var(--a2-ink-3)" : "var(--a2-warn)" }}
            >
              {purgeStateLabel[v.purge]}
            </span>
            <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{v.purgedAt ?? v.purgeDue ?? ""}</span>
          </span>
        ),
      },
      {
        /* 완료한 줄만 채워지는 칸이다 — 대기 줄에서는 비워 두고, 회원마다의 이력은
           줄을 눌러 들어가는 상세가 답한다 */
        key: "mark",
        detail: true,
        head: "실행자 · 적어 둔 사유",
        width: "100%",
        value: (v) => `${v.purgedBy ?? ""} ${v.purgedWhy ?? ""}`,
        cell: (v) =>
          v.purge === "done" ? (
            <span className="inline-flex flex-col">
              <span className="a2-t-sm text-(--a2-ink-2)">{v.purgedBy}</span>
              <span className="a2-t-xs text-(--a2-ink-4)">{v.purgedWhy || "적어 둔 사유가 없습니다."}</span>
            </span>
          ) : (
            dash
          ),
      },
    ],
    [detailHrefOf],
  );

  const filters = useMemo<Filter<PurgeRow>[]>(
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
        id: "reason",
        label: "사유",
        options: [
          { value: "withdrawn", label: "철회 요청" },
          { value: "expired", label: "보관기간 만료" },
        ],
        match: (v, x) => v.purgeReason === x,
      },
    ],
    [],
  );

  const short = why.trim().length < 5;

  return (
    <>
      <PageHead
        title="개인정보 파기"
        back={back}
        tabsLabel="조회 조건"
        tabs={tabs.map((t) => (
          <Tab
            key={t.id}
            label={t.label}
            count={n(t.rows.length)}
            active={current.id === t.id}
            onClick={() => onTab(t.id)}
          />
        ))}
      />

      <Body>
        {/*
         * 파기 실행은 접어 둔다.
         *
         * 이 화면을 여는 첫 물음은 「무엇이 파기 대기인가」이고 그 답은 아래 표다. 실행은 그 표를
         * 보고 나서 누르는 자리라, 펴 둔 채로 두면 매번 판 하나를 지나 표에 닿는다.
         *
         * 접힌 줄이 지금 상태를 대신 적는다 — 자동 파기가 켜졌는지, 대기에 몇 건이 있는지.
         *
         * ⚠ 되돌릴 수 없는 단추가 이 안에 있다. 접어 두는 것이 그 단추를 한 번 더 멀리 두는
         *   일이기도 하다 — 표를 훑으러 온 손이 지나는 길에 놓이지 않는다.
         */}
        <Panel
          title="파기 실행"
          meta={
            open
              ? undefined
              : `자동 파기 ${auto ? "켜짐" : "꺼짐"} · 철회 ${n(withdrawn)}건 · 만료 ${n(expired)}건`
          }
          actions={
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              aria-expanded={open}
              aria-controls="purge-run"
              onClick={onToggle}
            >
              {open ? "접기" : "펼치기"}
            </button>
          }
          flush
        >
          <div id="purge-run" className="a2-form" hidden={!open}>
            {/* 스케줄러의 값 — 읽기만 한다. 고치는 자리는 시스템 > 스케줄러다 */}
            <FormRow
              label="자동 파기"
              hint={`보관기간 — ${keepText(keep)}. 철회 요청은 스케줄러와 상관없이 요청한 날 대기에 올라갑니다.`}
            >
              <span className="a2-t-sm text-(--a2-ink-2)">
                <b className="text-(--a2-ink)">{auto ? "켜짐" : "꺼짐"}</b>
                {auto
                  ? " — 보관기간이 지나면 파기 대기에 올립니다."
                  : " — 보관기간이 지나도 파기 대기에 올리지 않습니다."}
              </span>
              {schedulerHref && (
                <Link href={schedulerHref} className="a2-btn a2-btn-sm ml-auto">
                  스케줄러에서 변경
                </Link>
              )}
            </FormRow>

            <FormRow label="사유" req>
              <textarea
                className="a2-textarea"
                rows={2}
                value={why}
                onChange={(e) => onWhy(e.target.value)}
                placeholder="예: 9월 정기 파기 — 철회 3건 통지 완료, 보관기간 도래 12건"
              />
            </FormRow>

            <FormRow label="파기 실행">
              <span className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  disabled={withdrawn === 0 || short}
                  title={
                    withdrawn === 0
                      ? "철회 요청이 없습니다"
                      : short
                        ? "사유를 다섯 자 이상 적어 주세요"
                        : undefined
                  }
                  onClick={() => onRun("withdrawn")}
                >
                  철회 {n(withdrawn)}건 즉시 파기
                </button>
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  disabled={expired === 0 || short}
                  title={
                    expired === 0
                      ? "보관기간이 만료된 건이 없습니다"
                      : short
                        ? "사유를 다섯 자 이상 적어 주세요"
                        : undefined
                  }
                  onClick={() => onRun("expired")}
                >
                  만료 {n(expired)}건 파기
                </button>
              </span>
            </FormRow>
          </div>
        </Panel>
      </Body>

      <DataTable
        key={current.id}
        rows={current.rows}
        cols={cols}
        filters={filters}
        getKey={(v) => v.id}
        rowLink
        pageSize={25}
        searchHint="회원 ID · 이름"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
