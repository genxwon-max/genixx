"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import {
  countPrivacy,
  purge,
  purgeReasonLabel,
  purgeStateLabel,
  setAutoPurge,
  usePrivacy,
  type PrivacyRow,
} from "@/lib/privacyStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, FormRow, PageHead, Panel, Tab } from "@/components/admin2/ui";

/**
 * ADM-10-1 파기 스케줄러 — 무엇을 언제 지우는가.
 *
 * 개인정보 관리(ADM-10)에서 떼어 냈다. 저쪽은 명부라 회원을 찾으러 매일 여는 화면이고,
 * 여기는 **되돌릴 수 없는 단추**가 있는 화면이다. 한 장에 같이 두면 명부를 훑으러 온
 * 사람이 늘 그 단추 옆을 지나게 된다.
 *
 * 떼어 내면서 얻은 것이 하나 더 있다. 큐를 **목록으로** 세울 자리가 생겼다 — 「철회 6건」
 * 이라는 숫자만 보고 누르는 것과 지워질 이름 여섯을 보고 누르는 것은 다른 일이다.
 *
 * ── 켜 두는 것과 누르는 것은 가른다 ──
 * 자동 파기를 켜면 만료일이 지난 줄이 큐에 선다. 지우는 것은 사람이 누른다 — 켜 둔
 * 것만으로 밤사이 자료가 사라지는 화면은 만들지 않는다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

type TabId = "queued" | "done";

export default function PurgeView() {
  const { rows, auto } = usePrivacy();
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";
  const [tab, setTab] = useState<TabId>("queued");
  const [why, setWhy] = useState("");
  /* 접힌 채로 연다 — 아래 판 주석 참조 */
  const [schedOpen, setSchedOpen] = useState(false);

  const c = useMemo(() => countPrivacy(rows), [rows]);

  const queued = useMemo(() => rows.filter((v) => v.purge === "queued"), [rows]);
  const done = useMemo(() => rows.filter((v) => v.purge === "done"), [rows]);

  const tabs = [
    { id: "queued" as TabId, label: "파기 대기", rows: queued, empty: "파기할 것이 없습니다." },
    { id: "done" as TabId, label: "파기 완료", rows: done, empty: "아직 파기한 기록이 없습니다." },
  ];
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
        width: "9rem",
        nowrap: true,
        value: (v) => `${v.name} ${v.kind}`,
        cell: (v) => (
          <span className="inline-flex items-center gap-1.5">
            {/* 지우기 전에 「이 사람이 왜 여기 섰나」를 볼 수 있어야 한다 */}
            <Link
              href={`/admin2/privacy/${v.id}`}
              className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
            >
              {v.name}
            </Link>
            <span className="a2-t-xs text-(--a2-ink-4)">{v.kind}</span>
          </span>
        ),
      },
      {
        key: "reason",
        head: "까닭",
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
           이름을 눌러 들어가는 상세가 답한다 */
        key: "mark",
        head: "실행자 · 적어 둔 까닭",
        width: "100%",
        value: (v) => `${v.purgedBy ?? ""} ${v.purgedWhy ?? ""}`,
        cell: (v) =>
          v.purge === "done" ? (
            <span className="inline-flex flex-col">
              <span className="a2-t-sm text-(--a2-ink-2)">{v.purgedBy}</span>
              <span className="a2-t-xs text-(--a2-ink-4)">{v.purgedWhy || "적어 둔 까닭이 없습니다."}</span>
            </span>
          ) : (
            dash
          ),
      },
    ],
    [],
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
        id: "reason",
        label: "까닭",
        options: [
          { value: "withdrawn", label: "철회 요청" },
          { value: "expired", label: "보관기간 도래" },
        ],
        match: (v, x) => v.purgeReason === x,
      },
    ],
    [],
  );

  const run = (reason: "expired" | "withdrawn") => {
    const list = queued.filter((v) => v.purgeReason === reason);
    const note = why.trim();
    /* 까닭 없이는 실행하지 않는다 — 단추를 잠가 두었지만 그것만 믿지 않는다 */
    if (list.length === 0 || note.length < 5) return;
    const ok = window.confirm(
      `${n(list.length)}명의 개인정보를 파기합니다.\n\n되돌릴 수 없습니다. 누가 언제 왜 지웠는지는 회원마다 이력에 남고, 처리 결과는 정보주체에게 통지해야 합니다.\n\n실행할까요?`,
    );
    if (!ok) return;
    /* 까닭은 두 군데로 간다 — 감사 로그에는 이 조작이 한 줄로, 회원 이력에는 사람마다
       한 줄로. 물어 오는 쪽은 늘 사람 하나를 짚어서 묻는다 */
    purge(
      list.map((v) => ({ id: v.id, reason })),
      by,
      note,
    );
    recordAction(
      `개인정보 ${n(list.length)}건 (${purgeReasonLabel[reason]})`,
      "개인정보 파기 실행",
      note,
      by,
    );
    setWhy("");
    /* 지운 줄은 대기에서 빠진다 — 빈 표를 보여 주는 대신 결과가 선 자리로 옮겨 준다 */
    setTab("done");
  };

  const short = why.trim().length < 5;

  return (
    <>
      <PageHead
        title="파기 스케줄러"
        back={
          <Link href="/admin2/privacy" className="a2-btn">
            ← 개인정보 관리
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

      <Body>
        {/*
         * 스케줄러는 접어 둔다.
         *
         * 이 화면을 여는 첫 물음은 「무엇이 파기 대기인가」이고 그 답은 아래 표다. 스케줄러는
         * 그 표를 보고 나서 누르는 자리라, 펴 둔 채로 두면 매번 판 하나를 지나 표에 닿는다.
         *
         * 접힌 줄이 지금 상태를 대신 적는다 — 자동 파기가 켜졌는지, 큐에 몇 건이 서 있는지.
         * 접었을 때 아무 말이 없으면 펴 보고 나서야 그것을 알게 된다.
         *
         * ⚠ 되돌릴 수 없는 단추가 이 안에 있다. 접어 두는 것이 그 단추를 한 번 더 멀리
         *   두는 일이기도 하다 — 표를 훑으러 온 손이 지나는 길에 놓이지 않는다.
         */}
        <Panel
          title="스케줄러"
          meta={
            schedOpen
              ? undefined
              : `자동 파기 ${auto ? "켜짐" : "꺼짐"} · 철회 ${n(c.queuedWithdrawn)}건 · 도래 ${n(c.queuedExpired)}건`
          }
          actions={
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              aria-expanded={schedOpen}
              aria-controls="purge-scheduler"
              onClick={() => setSchedOpen((v) => !v)}
            >
              {schedOpen ? "접기" : "펴기"}
            </button>
          }
          flush
        >
          <div id="purge-scheduler" className="a2-form" hidden={!schedOpen}>
            <FormRow label="자동 파기">
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <label className="a2-choice">
                  <input
                    type="radio"
                    name="auto-purge"
                    checked={auto}
                    onChange={() => setAutoPurge(true)}
                  />
                  보관기간이 지나면 큐에 세웁니다
                </label>
                <label className="a2-choice">
                  <input
                    type="radio"
                    name="auto-purge"
                    checked={!auto}
                    onChange={() => setAutoPurge(false)}
                  />
                  세우지 않습니다
                </label>
              </span>
            </FormRow>

            <FormRow label="까닭" req>
              <textarea
                className="a2-textarea"
                rows={2}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="예: 9월 정기 파기 — 철회 3건 통지 완료, 보관기간 도래 12건"
              />
            </FormRow>

            <FormRow label="파기 실행">
              <span className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  disabled={c.queuedWithdrawn === 0 || short}
                  title={
                    c.queuedWithdrawn === 0
                      ? "철회 요청이 없습니다"
                      : short
                        ? "까닭을 다섯 자 이상 적어 주세요"
                        : undefined
                  }
                  onClick={() => run("withdrawn")}
                >
                  철회 {n(c.queuedWithdrawn)}건 즉시 파기
                </button>
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  disabled={c.queuedExpired === 0 || short}
                  title={
                    c.queuedExpired === 0
                      ? "도래한 것이 없습니다"
                      : short
                        ? "까닭을 다섯 자 이상 적어 주세요"
                        : undefined
                  }
                  onClick={() => run("expired")}
                >
                  도래 {n(c.queuedExpired)}건 파기
                </button>
              </span>
            </FormRow>
          </div>
        </Panel>
      </Body>

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
