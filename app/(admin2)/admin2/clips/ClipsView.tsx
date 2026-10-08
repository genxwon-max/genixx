"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  canMove,
  clipKindLabel,
  clipRatio,
  moveClip,
  setClipShown,
  useClipRows,
  youtubeId,
  type ClipRow,
} from "@/lib/clipStore";
import { clipKinds } from "@/lib/clipStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, Panel, Status, Switch } from "@/components/admin2/ui";

/**
 * ADM-15-2 홍보 영상 — 첫 화면(/newhome) 「영상으로 보기」 칸에 걸리는 목록.
 *
 * 여태 이 목록은 코드에 박혀 있었다(lib/promoClips.ts). 영상은 올라오는 대로 걸리는
 * 것이라, 유튜브 링크 하나 붙이는 일에 배포가 필요한 화면은 운영에 쓸 수 없다.
 *
 * ── 차례를 여기서 옮긴다 ──
 * 표의 차례가 곧 화면에 서는 차례다. 그래서 정렬 화살표에 기대지 않고 줄마다 위·아래
 * 단추를 둔다 — 정렬은 보는 차례를 바꿀 뿐이고, 여기서 정해야 하는 것은 **나가는 차례**다.
 *
 * 옮기는 것은 **같은 갈래 안에서만** 된다. 화면이 가로 영상과 숏폼을 다른 줄에 세우므로
 * (newhome ⑤ 구간) 갈래를 건너 옮겨도 보이는 차례가 바뀌지 않는다.
 *
 * ── 노출은 여기서 바로 ──
 * 영상은 「내렸다 다시 올리는」 일이 잦다(수정본을 올리는 동안 잠깐 내린다). 상세까지
 * 들어가 저장을 거치게 하면 그 왕복이 하루에 몇 번씩 생긴다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

export default function ClipsView() {
  const rows = useClipRows();

  const cols: Col<ClipRow>[] = useMemo(
    () => [
      {
        /* 차례를 옮기는 칸이 맨 왼쪽이다 — 이 표에서 줄을 붙들고 하는 일이 그것이다 */
        key: "order",
        head: "차례",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <span className="flex gap-0.5">
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={!canMove(rows, r.id, -1)}
              aria-label={`${r.title || r.id} 앞으로`}
              onClick={() => moveClip(r.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={!canMove(rows, r.id, 1)}
              aria-label={`${r.title || r.id} 뒤로`}
              onClick={() => moveClip(r.id, 1)}
            >
              ↓
            </button>
          </span>
        ),
      },
      {
        key: "kind",
        head: "분류",
        width: "7rem",
        nowrap: true,
        value: (r) => clipKindLabel[r.kind],
        cell: (r) => (
          <span className="a2-t-sm">
            {clipKindLabel[r.kind]}{" "}
            <span className="a2-num a2-t-xs text-(--a2-ink-4)">{clipRatio[r.kind]}</span>
          </span>
        ),
      },
      {
        key: "title",
        head: "제목",
        width: "100%",
        clip: true,
        value: (r) => r.title,
        /* 줄을 누르면 이 링크가 대신 눌린다(DataTable의 rowLink) — 「수정하기」 단추는 걷었다.
           차례 단추 · 노출 스위치 · 주소 링크는 그대로 제 일만 한다. ⚠ 줄을 누르면 줄 안의
           **첫 링크**가 눌리므로, 바깥으로 나가는 주소 칸은 이 칸보다 뒤에 있어야 한다 */
        cell: (r) => (
          <Link href={`/admin2/clips/${r.id}`} className="font-semibold text-(--a2-ink)" title={r.title}>
            {r.title || <span className="text-(--a2-ink-4)">제목 없음</span>}
          </Link>
        ),
      },
      {
        key: "length",
        detail: true,
        head: "길이",
        width: "5rem",
        nowrap: true,
        value: (r) => r.length,
        cell: (r) => (r.length ? <span className="a2-num a2-t-sm">{r.length}</span> : dash),
      },
      {
        /* 주소가 있는지와 그것이 유튜브인지를 한 칸에 적는다 — 미리보기 그림이 서는지가
           그 둘에 달려 있고, 「걸었는데 안 보인다」는 물음이 늘 여기서 갈린다 */
        key: "url",
        detail: true,
        head: "주소",
        width: "9rem",
        nowrap: true,
        value: (r) => r.url ?? "",
        cell: (r) =>
          r.url ? (
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="a2-t-sm text-(--a2-accent) hover:underline"
            >
              {youtubeId(r.url) ? "유튜브" : "외부 주소"}
            </a>
          ) : (
            <Status tone="warn">준비 중</Status>
          ),
      },
      {
        key: "shown",
        head: "노출",
        width: "7rem",
        nowrap: true,
        value: (r) => (r.shown ? "노출" : "숨김"),
        cell: (r) => (
          <span className="flex items-center gap-2">
            <Switch
              on={r.shown}
              label={`${r.title || r.id} 노출`}
              onChange={(on) => setClipShown(r.id, on)}
            />
            <Status tone={r.shown ? "ok" : "muted"}>{r.shown ? "노출" : "숨김"}</Status>
          </span>
        ),
      },
    ],
    [rows],
  );

  const filters: Filter<ClipRow>[] = useMemo(
    () => [
      {
        id: "kind",
        label: "분류",
        options: clipKinds.map((k) => ({ value: k, label: clipKindLabel[k] })),
        match: (r, v) => r.kind === v,
      },
      {
        id: "shown",
        label: "노출",
        options: [
          { value: "y", label: "노출" },
          { value: "n", label: "숨김" },
        ],
        match: (r, v) => (v === "y" ? r.shown : !r.shown),
      },
      {
        id: "url",
        label: "주소",
        options: [
          { value: "y", label: "등록됨" },
          { value: "n", label: "준비 중" },
        ],
        match: (r, v) => (v === "y" ? !!r.url : !r.url),
      },
    ],
    [],
  );

  const shown = rows.filter((r) => r.shown).length;
  const waiting = rows.filter((r) => !r.url).length;

  return (
    <>
      <PageHead
        title="홍보 영상"
        actions={
          <Link href="/admin2/clips/new" className="a2-btn a2-btn-primary">
            새 영상
          </Link>
        }
      />
      <Body>
        <Panel
          title="영상"
          meta={`${rows.length}개 · 노출 ${shown}개${waiting > 0 ? ` · 주소 없음 ${waiting}개` : ""}`}
          flush
        >
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            rowLink
            searchHint="제목 · 설명"
            showCount={false}
            empty="아직 등록한 영상이 없습니다."
          />
        </Panel>
      </Body>
    </>
  );
}
