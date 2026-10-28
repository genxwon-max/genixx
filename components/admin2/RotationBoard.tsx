"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ANCHOR_RATIO } from "@/lib/blueprint";
import type { ExamForm } from "@/lib/formStore";
import type { ItemDraft } from "@/lib/itemStore";
import DataTable, { type Col } from "./DataTable";
import { Body, Kpi, PageHead, Panel, Status } from "./ui";

/**
 * ADM-04-4 문항 회전 · ADM-04-2 앵커 — 「이 문항을 다음 회차에도 넣어도 되는가」.
 *
 * 옛 콘솔의 문항 회전(/admin/items/rotation — RotationPanel · AnchorStatus)이 9월 27일 콘솔을 걷어 낼 때
 * 함께 사라졌던 것을 다시 세웠다(2026-10-28).
 *
 * 둘을 한 화면에 두는 것은 같은 물음의 앞뒤이기 때문이다. 보통 문항은 되풀이하면 답이 돌아 빼야 하고,
 * 앵커는 반대로 되풀이해 넣어야 회차 사이를 견줄 수 있다(등화). 회전표에서 앵커만 빠지는 까닭이 바로
 * 아래 판에 서 있어야 한다.
 *
 * 노출 이력은 **확정된 검사지**에서 읽는다 — 따로 적어 두면 언젠가 어긋나고, 어긋난 순간 어느 쪽이
 * 맞는지 아무도 답할 수 없다. 앵커로 삼거나 빼는 일은 문항 상세에서 한다 — 여기는 보는 자리다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/rotation/RotationView.tsx)이 문항 · 검사지 ·
 * 회전 한계를 넘기고, 디자인 보기(/design2/admin2/rotation)는 처음 값을 넘긴다.
 */

type Used = {
  item: ItemDraft;
  runs: number;
  labels: string[];
  rest: boolean;
};

export default function RotationBoard({
  items,
  forms,
  maxRuns,
  roundLabel,
  itemHref = (id) => `/admin2/items/${id}`,
  guardHref = "/admin2/security",
}: {
  items: ItemDraft[];
  forms: ExamForm[];
  /** 앵커가 아닌 문항이 연달아 나갈 수 있는 회차 수(lib/securityStore.ts) */
  maxRuns: number;
  roundLabel: (roundId: string) => string;
  itemHref?: (id: string) => string;
  /** 응시 화면 보호 화면 — 아래 안내 줄이 건다 */
  guardHref?: string;
}) {
  /* 확정된 검사지만 실제로 나간 것이다. 초안은 아직 아무도 보지 않았다 */
  const live = useMemo(() => forms.filter((f) => f.state === "confirmed"), [forms]);

  const used = useMemo<Used[]>(() => {
    const on = new Map<string, ExamForm[]>();
    for (const f of live) for (const id of f.itemIds) on.set(id, [...(on.get(id) ?? []), f]);
    return items
      .filter((i) => on.has(i.id))
      .map((i) => {
        const went = on.get(i.id)!;
        /* 앵커는 회전에서 뺀다 — 회차마다 똑같이 들어가야 등화의 기준이 된다 */
        return {
          item: i,
          runs: went.length,
          labels: went.map((f) => roundLabel(f.round)),
          rest: !i.anchor && went.length >= maxRuns,
        };
      })
      .sort((x, y) => y.runs - x.runs);
  }, [items, live, maxRuns, roundLabel]);

  const resting = used.filter((u) => u.rest);
  const pool = items.filter((i) => i.state === "approved");
  const neverUsed = pool.filter((i) => !used.some((u) => u.item.id === i.id));

  /* 앵커 비율은 확정된 문항을 모수로 본다 — 검수도 안 지난 초안까지 세면 비율이 저절로 낮아 보인다 */
  const confirmed = items.filter((i) => i.state === "approved" || i.state === "retired");
  const anchors = confirmed.filter((i) => i.anchor);
  const ratio = confirmed.length > 0 ? anchors.length / confirmed.length : 0;
  const target = Math.ceil(confirmed.length * ANCHOR_RATIO);
  const candidates = items.filter((i) => i.state === "approved" && !i.anchor && !i.disclosed);
  const retiredAnchors = anchors.filter((i) => i.state === "retired");
  /* 앵커로 삼은 뒤에 공개되는 일도 있다. 지정할 때만 막으면 그 뒤는 못 잡는다 */
  const leaked = anchors.filter((i) => i.disclosed);
  const codeOf = (i: ItemDraft) => i.code || i.id;

  const cols: Col<Used>[] = [
    {
      key: "code",
      head: "문항번호",
      width: "9rem",
      nowrap: true,
      value: (r) => codeOf(r.item),
      cell: (r) => (
        <Link href={itemHref(r.item.id)} className="a2-mono font-semibold">
          {codeOf(r.item)}
        </Link>
      ),
    },
    {
      key: "level",
      head: "단계",
      width: "4rem",
      nowrap: true,
      value: (r) => r.item.level,
      cell: (r) => <span className="a2-mono">{r.item.level}</span>,
    },
    {
      key: "runs",
      head: "나간 횟수",
      width: "6rem",
      num: true,
      sort: (r) => r.runs,
      cell: (r) => `${r.runs}회`,
    },
    {
      key: "rounds",
      head: "나간 회차",
      value: (r) => r.labels.join(", "),
      cell: (r) => r.labels.join(", "),
    },
    {
      key: "rate",
      head: "정답률",
      width: "5.5rem",
      num: true,
      sort: (r) => r.item.correctRate ?? -1,
      cell: (r) => (r.item.correctRate == null ? "—" : `${Math.round(r.item.correctRate)}%`),
    },
    {
      key: "anchor",
      head: "앵커",
      width: "4.5rem",
      nowrap: true,
      value: (r) => (r.item.anchor ? "앵커" : ""),
      cell: (r) => (r.item.anchor ? "앵커" : "—"),
    },
    {
      key: "next",
      head: "다음 회차",
      width: "9rem",
      nowrap: true,
      sort: (r) => (r.item.anchor ? 0 : r.rest ? 2 : 1),
      cell: (r) =>
        r.item.anchor ? (
          <Status tone="info">계속 넣습니다</Status>
        ) : r.rest ? (
          <Status tone="warn">한 회차 쉬게 하세요</Status>
        ) : (
          <Status tone="muted">넣어도 됩니다</Status>
        ),
    },
  ];

  return (
    <>
      <PageHead title="문항 회전" />
      <Body className="grid gap-3">
        {/* ── 회전 ── */}
        <Panel title="노출 이력" meta="ADM-04-4 · 확정된 검사지에서 읽습니다" flush>
          <div className="a2-stats border-b border-(--a2-line) sm:grid-cols-3">
            <Kpi label="나간 검사지" value={live.length} unit="건" />
            <Kpi label={`나간 문항 (승인 ${pool.length}건 중)`} value={used.length} unit="건" />
            <Kpi label={`쉬어야 하는 문항 (${maxRuns}회 연속)`} value={resting.length} unit="건" />
          </div>
          {resting.length > 0 && (
            <p className="a2-note m-3">
              <span>
                <b>쉬게 할 문항 {resting.length}건</b> —{" "}
                {resting.map((r) => codeOf(r.item)).join(", ")}. 다음 회차 검사지를 짤 때 빼 주세요.
                대신 넣을 문항은 아직 한 번도 나가지 않은 {neverUsed.length}건 중에서 고르면 됩니다.
              </span>
            </p>
          )}
          <DataTable
            rows={used}
            cols={cols}
            getKey={(r) => r.item.id}
            rowLink
            searchHint="문항번호"
            empty="아직 확정된 검사지가 없어 나간 문항이 없습니다."
          />
        </Panel>

        {/* ── 앵커 ── */}
        <Panel title="앵커 문항" meta="ADM-04-2 · 회차 사이를 같은 잣대로 재는 기준 문항">
          <div className="a2-stats -m-3 mb-3 border-b border-(--a2-line) sm:grid-cols-3">
            <Kpi
              label={`앵커 문항 (확정 ${confirmed.length}건 중)`}
              value={anchors.length}
              unit="건"
            />
            <Kpi
              label={`지금 비율 (목표 ${Math.round(ANCHOR_RATIO * 100)}%)`}
              value={`${Math.round(ratio * 100)}%`}
            />
            <Kpi label="앵커로 삼을 수 있는 문항" value={candidates.length} unit="건" />
          </div>

          <div className="grid gap-2">
            {ratio < ANCHOR_RATIO && (
              <p className="a2-note">
                <span>
                  <b>앵커가 {target - anchors.length}건 모자랍니다.</b> 앵커가 모자라면 회차 사이의
                  점수를 견줄 수 없습니다. 승인된 문항을 열어 앵커로 삼으면 됩니다 — 지금 삼을 수
                  있는 것이 {candidates.length}건 있습니다.
                </span>
              </p>
            )}
            {retiredAnchors.length > 0 && (
              <p className="a2-note">
                <span>
                  <b>사용 중지된 문항이 앵커로 남아 있습니다</b> —{" "}
                  {retiredAnchors.map(codeOf).join(", ")}. 회차에 나가지 않는 문항은 등화 기준이
                  되지 못합니다.
                </span>
              </p>
            )}
            {leaked.length > 0 && (
              <p className="a2-note">
                <span>
                  <b>공개된 문항이 앵커로 남아 있습니다</b> — {leaked.map(codeOf).join(", ")}. 답이
                  알려진 문항은 회차 간 잣대가 되지 못합니다. 앵커에서 빼고 다른 문항으로 채워
                  주세요.
                </span>
              </p>
            )}
          </div>

          <p className="a2-label mt-3">지금 앵커로 쓰는 문항</p>
          {anchors.length === 0 ? (
            <p className="mt-1.5 a2-t-sm text-(--a2-ink-3)">아직 앵커로 지정된 문항이 없습니다.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {anchors.map((i) => {
                const went = live.filter((f) => f.itemIds.includes(i.id)).length;
                return (
                  <li key={i.id}>
                    <Link href={itemHref(i.id)} className="a2-btn">
                      <span className="a2-mono font-semibold">{codeOf(i)}</span>
                      <span className="text-(--a2-ink-4)">
                        {i.level} · {went === 0 ? "아직 안 나감" : `${went}회차`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="a2-hint mt-3">
            앵커로 삼거나 빼는 일은 문항을 열어서 합니다. 등화 기준이 바뀌는 일이라 사유를 받아
            기록에 남깁니다.
          </p>
        </Panel>

        <p className="px-1 a2-t-xs text-(--a2-ink-4)">
          응시 화면에서 복사 · 오른쪽 클릭을 막는 설정은{" "}
          <Link
            href={guardHref}
            className="font-semibold text-(--a2-accent) underline underline-offset-2"
          >
            응시 화면 보호
          </Link>
          에 있습니다. 문항을 지키는 진짜 대비책은 차단이 아니라 위의 회전입니다.
        </p>
      </Body>
    </>
  );
}
