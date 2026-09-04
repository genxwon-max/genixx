"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { levelSpecs } from "@/lib/blueprint";
import { n } from "@/lib/admin2";
import { reviewChecks, stateLabel, typeTextOf, useItems, type ItemDraft } from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Tab, Tag } from "@/components/admin2/ui";

/**
 * EXP-03 문항 검수 — 넘어온 것만 세운다.
 *
 * 이 화면은 목록이고, 실제 검수(3단 짚기 · 사유 코드 · 승인/반려)는 문항 상세의 오른쪽
 * 검수판에서 한다. 목록에서 승인 단추를 열지 않는 까닭은 하나다 — 검수는 발문·보기·정답·
 * 채점 기준을 **읽고** 하는 일이고, 한 줄짜리 목록에서 누르는 승인은 읽지 않은 승인이다.
 *
 * 그래서 이 화면이 답해야 하는 것은 「무엇부터 여나」뿐이다. 오래 기다린 것이 위로 온다 —
 * 넘긴 사람은 검수를 기다리는 동안 다음 문항을 못 쓰고, 회차 편성은 승인된 문항에서만
 * 고를 수 있다.
 *
 * ── 머리는 지표 띠가 아니라 탭 줄이다 ──
 * 숫자 다섯을 읽기만 하는 띠로 두었을 때는, 「짚는 중 2」를 보고 나서 그 둘을 찾으러
 * 아래 거르개로 내려가야 했다. 지금은 숫자가 곧 조회 조건이다 — 누르면 표가 그 묶음만
 * 남는다. 그래서 표의 출처 거르개도 걷었다. 같은 조건을 두 군데서 걸면 서로 부딪친다.
 *
 * 승인됨·반려됨 탭은 이미 판정이 끝난 것이라 검수할 수 없다. 그 줄에서는 관리 단추도
 * 「검수하기」가 아니라 「문항 열기」로 바뀐다 — 누를 수 없는 일을 같은 글자로 세워 두면
 * 눌러 놓고 왜 안 되는지 상세까지 들어가 확인하게 된다.
 *
 * ⚠ 쓰다 만 검수(reviewDraft)가 있는 줄을 따로 표시한다. 그 줄은 누군가 이미 열어서 짚기
 *   시작한 것이라, 모르고 다시 열면 짚어 둔 것을 덮어쓴다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/**
 * 3단 중 몇을 짚어 두었나 — 쓰다 만 검수의 진척.
 *
 * ok가 null인 칸은 아직 안 본 것이다. 「걸림(false)」과 「안 봄(null)」은 다른 상태라
 * 참인 것만 세면 걸린 칸을 안 짚은 것으로 세게 된다.
 */
function progressOf(i: ItemDraft) {
  return i.reviewDraft?.checks.filter((c) => c.ok !== null).length ?? 0;
}

type TabId = "waiting" | "started" | "ai" | "approved" | "rejected";

export default function ReviewQueue() {
  const items = useItems();
  const [tab, setTab] = useState<TabId>("waiting");

  /* 오래 기다린 것이 위로. 넘긴 시각을 따로 들고 있지 않으므로 마지막으로 고친 때를
     쓴다 — 제출이 곧 마지막 손질이라 실제로 같은 값이다 */
  const waiting = useMemo(
    () =>
      items
        .filter((i) => i.state === "submitted")
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
    [items],
  );

  /* 판정이 끝난 것 — 최근에 판정한 것이 위로. 검수하러 온 사람이 「방금 내가 넘긴 것」을
     되짚는 자리라, 오래된 것부터 세우는 대기 목록과 차례가 반대다 */
  const judgedRows = useMemo(
    () =>
      items
        .filter((i) => i.state === "approved" || i.state === "rejected")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  );

  const tabs = useMemo(
    () => [
      {
        id: "waiting" as TabId,
        label: stateLabel.submitted,
        rows: waiting,
        empty: "검수를 기다리는 문항이 없습니다.",
      },
      {
        id: "started" as TabId,
        label: "짚는 중",
        rows: waiting.filter((i) => i.reviewDraft),
        empty: "누군가 열어 둔 검수가 없습니다.",
      },
      {
        id: "ai" as TabId,
        label: "AI 초안",
        rows: waiting.filter((i) => i.origin === "ai"),
        empty: "AI가 만든 초안이 검수 대기에 없습니다.",
      },
      {
        id: "approved" as TabId,
        label: stateLabel.approved,
        rows: judgedRows.filter((i) => i.state === "approved"),
        empty: "승인한 문항이 없습니다.",
      },
      {
        id: "rejected" as TabId,
        label: stateLabel.rejected,
        rows: judgedRows.filter((i) => i.state === "rejected"),
        empty: "돌려보낸 문항이 없습니다.",
      },
    ],
    [waiting, judgedRows],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

  const cols = useMemo<Col<ItemDraft>[]>(
    () => [
      {
        key: "code",
        head: "문항 ID",
        width: "8.5rem",
        nowrap: true,
        value: (r) => r.code || r.id,
        cell: (r) => (
          <Link href={`/admin2/items/${r.id}`} className="a2-mono font-semibold text-(--a2-ink) hover:underline">
            {r.code || <span className="text-(--a2-ink-4)">ID 미정</span>}
          </Link>
        ),
      },
      {
        key: "subject",
        head: "과목",
        width: "4rem",
        nowrap: true,
        value: (r) => r.subject,
        cell: (r) => <Tag>{r.subject}</Tag>,
      },
      {
        key: "band",
        head: "학년군",
        width: "4rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.band,
        cell: (r) => <span className="a2-mono">{r.band}</span>,
      },
      {
        key: "level",
        head: "단계",
        width: "4rem",
        nowrap: true,
        value: (r) => r.level,
        cell: (r) => (
          <span className="a2-mono" title={levelSpecs[r.level].name}>
            {r.level}
          </span>
        ),
      },
      {
        key: "type",
        head: "유형",
        width: "9rem",
        nowrap: true,
        hide: "lg",
        value: (r) => typeTextOf(r),
        cell: (r) => (
          <span title={typeTextOf(r)} className="a2-clip">
            {typeTextOf(r)}
          </span>
        ),
      },
      {
        key: "stem",
        head: "발문",
        clip: true,
        value: (r) => r.stem,
        cell: (r) => <span title={r.stem}>{r.stem}</span>,
      },
      {
        key: "author",
        head: "출제자",
        width: "6rem",
        nowrap: true,
        hide: "md",
        value: (r) => r.authorName,
        cell: (r) => r.authorName,
      },
      {
        /* AI 초안은 검수자가 그런 줄 알고 봐야 한다. 특히 태깅 — 축은 사람이 고르고
           문항은 생성되므로 둘이 어긋날 수 있고, 그것을 잡는 자리가 2차 태깅이다 */
        key: "origin",
        head: "출처",
        width: "5rem",
        nowrap: true,
        value: (r) => (r.origin === "ai" ? "AI 초안" : "사람"),
        cell: (r) => (r.origin === "ai" ? <Tag accent>AI 초안</Tag> : dash),
      },
      {
        key: "progress",
        head: "검수",
        width: "6.5rem",
        nowrap: true,
        value: (r) => (r.reviewDraft ? `짚는 중 ${progressOf(r)}` : "아직"),
        sort: (r) => -progressOf(r),
        cell: (r) =>
          r.reviewDraft ? (
            <span className="a2-t-sm" style={{ color: "var(--a2-warn)" }}>
              짚는 중 {progressOf(r)}/{reviewChecks.length}
            </span>
          ) : (
            <span className="a2-t-sm text-(--a2-ink-4)">아직</span>
          ),
      },
      {
        key: "updatedAt",
        head: "넘어온 때",
        width: "8rem",
        nowrap: true,
        value: (r) => r.updatedAt,
        cell: (r) => <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{r.updatedAt}</span>,
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) =>
          /* 판정이 끝난 줄은 검수할 것이 없다. 같은 글자의 단추를 세워 두면 눌러 놓고
             왜 검수판이 안 열리는지 상세까지 들어가 확인하게 된다 */
          r.state === "submitted" ? (
            <Link
              href={`/admin2/items/${r.id}`}
              className="a2-btn a2-btn-sm a2-btn-primary"
              aria-label={`${r.code || r.id} 검수하기`}
            >
              검수하기
            </Link>
          ) : (
            <Link
              href={`/admin2/items/${r.id}`}
              className="a2-btn a2-btn-sm"
              aria-label={`${r.code || r.id} 문항 열기`}
            >
              문항 열기
            </Link>
          ),
      },
    ],
    [],
  );

  /* 출처(AI 초안)는 머리의 탭이 맡는다. 같은 조건을 두 군데서 걸면 서로 부딪친다 */
  const filters = useMemo<Filter<ItemDraft>[]>(
    () => [
      {
        id: "subject",
        label: "과목",
        options: [...new Set(rows.map((i) => i.subject))].map((v) => ({ value: v, label: v })),
        match: (r, v) => r.subject === v,
      },
      {
        id: "level",
        label: "단계",
        options: [...new Set(rows.map((i) => i.level))]
          .sort()
          .map((v) => ({ value: v, label: `${v} ${levelSpecs[v].name}` })),
        match: (r, v) => r.level === v,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        title="문항 검수"
        actions={
          <>
            <Link href="/admin2/authoring" className="a2-btn">
              문항 출제
            </Link>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
          </>
        }
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

      {/* 탭을 바꾸면 표를 새로 세운다 — 걸어 둔 검색어·거르개는 그 목록에 맞춰 다시
          고르는 것이 맞다. 조건은 위에 그대로 적혀 있는데 왜 0줄인지는 안 적혀 있다 */}
      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        searchHint="문항 ID · 발문 · 출제자"
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
