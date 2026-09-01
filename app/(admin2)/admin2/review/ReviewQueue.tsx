"use client";

import Link from "next/link";
import { useMemo } from "react";
import { levelSpecs } from "@/lib/blueprint";
import { n, pct } from "@/lib/admin2";
import { reviewChecks, stateLabel, typeLabel, useItems, type ItemDraft } from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Kpi, PageHead, SeedNote, Tag } from "@/components/admin2/ui";

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

export default function ReviewQueue() {
  const items = useItems();

  /* 오래 기다린 것이 위로. 넘긴 시각을 따로 들고 있지 않으므로 마지막으로 고친 때를
     쓴다 — 제출이 곧 마지막 손질이라 실제로 같은 값이다 */
  const waiting = useMemo(
    () =>
      items
        .filter((i) => i.state === "submitted")
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
    [items],
  );

  const approved = items.filter((i) => i.state === "approved").length;
  const rejected = items.filter((i) => i.state === "rejected").length;
  const started = waiting.filter((i) => i.reviewDraft).length;
  const fromAi = waiting.filter((i) => i.origin === "ai").length;
  const judged = approved + rejected;

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
        width: "4.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => typeLabel(r.type),
        cell: (r) => typeLabel(r.type),
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
        cell: (r) => (
          <Link
            href={`/admin2/items/${r.id}`}
            className="a2-btn a2-btn-sm a2-btn-primary"
            aria-label={`${r.code || r.id} 검수하기`}
          >
            검수하기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<ItemDraft>[]>(
    () => [
      {
        id: "subject",
        label: "과목",
        options: [...new Set(waiting.map((i) => i.subject))].map((v) => ({ value: v, label: v })),
        match: (r, v) => r.subject === v,
      },
      {
        id: "level",
        label: "단계",
        options: [...new Set(waiting.map((i) => i.level))]
          .sort()
          .map((v) => ({ value: v, label: `${v} ${levelSpecs[v].name}` })),
        match: (r, v) => r.level === v,
      },
      {
        id: "origin",
        label: "출처",
        options: [
          { value: "ai", label: "AI 초안" },
          { value: "human", label: "사람" },
        ],
        match: (r, v) => (v === "ai" ? r.origin === "ai" : r.origin !== "ai"),
      },
    ],
    [waiting],
  );

  return (
    <>
      <PageHead
        title="문항 검수"
        statCols={5}
        meta={
          <>
            <span>
              대기 <span className="a2-num text-(--a2-ink-2)">{n(waiting.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>{reviewChecks.map((c) => c.label).join(" · ")}</span>
          </>
        }
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
        stats={
          <>
            <Kpi label={stateLabel.submitted} value={n(waiting.length)} unit="문항" sub="오래 기다린 것이 위로" />
            <Kpi label="짚는 중" value={n(started)} unit="문항" sub="누가 이미 열어 둔 것" />
            <Kpi label="AI 초안" value={n(fromAi)} unit="문항" sub="태깅을 특히 볼 것" />
            <Kpi
              label={stateLabel.approved}
              value={n(approved)}
              unit="문항"
              sub={judged ? `판정한 것의 ${pct(approved, judged)}%` : "아직 없음"}
              href="/admin2/items"
            />
            <Kpi
              label={stateLabel.rejected}
              value={n(rejected)}
              unit="문항"
              sub="돌려보낸 것"
              href="/admin2/authoring"
            />
          </>
        }
      />

      <DataTable
        rows={waiting}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        searchHint="문항 ID · 발문 · 출제자"
        empty="검수를 기다리는 문항이 없습니다."
        /* 넘겨받은 차례가 무엇인지 적어 둔다. 적지 않으면 머리 행의 정렬 화살표가 전부
           꺼져 있는데 줄 차례는 뒤섞여 보여, 표가 고장 난 것처럼 읽힌다 */
        toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기본 차례 · 오래 기다린 순</span>}
      />

      <SeedNote>
        문항은 이 브라우저에만 저장됩니다(lib/itemStore.ts). 승인·반려는 문항 상세의 검수판에서 3단을 짚어야 열립니다.
      </SeedNote>
    </>
  );
}
