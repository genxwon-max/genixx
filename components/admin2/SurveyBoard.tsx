"use client";

import Link from "next/link";
import { useMemo } from "react";
import { surveyBandOf, surveyBands } from "@/lib/surveyBands";
import {
  draftChanges,
  modeOf,
  surveyModeLabel,
  type SurveyMode,
  surveyDocIds,
  surveySlugOf,
  type SurveyDocId,
  type SurveyDocs,
} from "@/lib/surveyStore";
import DataTable, { type Col, type Filter } from "./DataTable";
import { Body, PageHead, Panel, Status } from "./ui";

/**
 * ADM-14 설문 관리 — 목록.
 *
 * 설문은 **갈래 × 학년대**로 한 벌씩 있다(학생 · 학부모 · 지도교사 × 초3~4 · 초5~6 = 여섯 벌).
 * 줄 하나가 한 벌이고, 누르면 그 벌을 고치는 자리(/admin2/surveys/[갈래-학년대])로 간다.
 *
 * 9월 27일 옛 콘솔(/admin/surveys)을 걷어 낼 때 함께 사라졌던 화면이다(2026-10-28 다시 세움). 저장소
 * (lib/surveyStore.ts)는 그대로 남아 응답자 화면이 계속 읽고 있었다 — 고칠 자리만 없었다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/surveys/SurveysView.tsx)은 저장소의
 * 여섯 벌을 넘기고, 디자인 보기(/design2/admin2/surveys)는 처음 판을 넘긴다.
 *
 * 「발행하지 않은 수정」 칸을 둔다. 초안은 고치는 즉시 저장되지만 응답자에게는 발행해야 나간다 —
 * 고쳐 놓고 발행을 잊은 벌이 어느 것인지가 이 목록이 먼저 답해야 하는 물음이다.
 */

type Row = {
  id: SurveyDocId;
  who: string;
  title: string;
  band: string;
  bandId: string;
  code: string;
  version: number;
  /** 지금 나가는 판의 응답 방식 */
  mode: SurveyMode;
  items: number;
  choices: number;
  opens: number;
  publishedAt: string;
  publishedBy: string;
  changes: number;
};

const colsOf = (hrefOf: (id: SurveyDocId) => string): Col<Row>[] => [
  {
    key: "who",
    head: "설문",
    value: (r) => `${r.who} ${r.title}`,
    cell: (r) => (
      <Link href={hrefOf(r.id)} className="a2-t-sm font-semibold">
        {r.title}
      </Link>
    ),
  },
  {
    key: "band",
    head: "학년대",
    width: "8rem",
    nowrap: true,
    value: (r) => r.band,
    cell: (r) => r.band,
  },
  {
    key: "code",
    head: "코드",
    width: "6rem",
    hide: "md",
    value: (r) => r.code,
    cell: (r) => <span className="a2-mono">{r.code}</span>,
  },
  {
    key: "mode",
    head: "응답 방식",
    width: "8.5rem",
    nowrap: true,
    value: (r) => surveyModeLabel[r.mode],
    cell: (r) =>
      r.mode === "link" ? <Status tone="info">외부 설문 링크</Status> : surveyModeLabel[r.mode],
  },
  {
    key: "count",
    head: "문항",
    width: "11rem",
    nowrap: true,
    hide: "sm",
    sort: (r) => r.items,
    cell: (r) => (
      <span className="a2-t-sm tabular-nums">
        척도 {r.items} · 고르기 {r.choices} · 서술 {r.opens}
      </span>
    ),
  },
  {
    key: "version",
    head: "나가는 판",
    width: "6rem",
    num: true,
    sort: (r) => r.version,
    value: (r) => `v${r.version}`,
    cell: (r) => <span className="a2-mono">v{r.version}</span>,
  },
  {
    key: "published",
    head: "발행",
    width: "12rem",
    nowrap: true,
    hide: "lg",
    sort: (r) => r.publishedAt,
    value: (r) => `${r.publishedAt} ${r.publishedBy}`,
    cell: (r) => (
      <span className="a2-t-xs text-(--a2-ink-3)">
        <span className="a2-mono">{r.publishedAt}</span> · {r.publishedBy}
      </span>
    ),
  },
  {
    key: "changes",
    head: "발행하지 않은 수정",
    width: "9rem",
    nowrap: true,
    sort: (r) => r.changes,
    value: (r) => (r.changes > 0 ? `${r.changes}곳` : "없음"),
    cell: (r) =>
      r.changes > 0 ? (
        <Status tone="warn">{r.changes}곳</Status>
      ) : (
        <Status tone="muted">없음</Status>
      ),
  },
];

const filters: Filter<Row>[] = [
  {
    id: "band",
    label: "학년대",
    options: surveyBands.map((b) => ({ value: b.id, label: b.label })),
    match: (r, v) => r.bandId === v,
  },
  {
    id: "mode",
    label: "응답 방식",
    options: [
      { value: "form", label: surveyModeLabel.form },
      { value: "link", label: surveyModeLabel.link },
    ],
    match: (r, v) => r.mode === v,
  },
  {
    id: "changes",
    label: "발행하지 않은 수정",
    options: [
      { value: "y", label: "있음" },
      { value: "n", label: "없음" },
    ],
    match: (r, v) => (v === "y" ? r.changes > 0 : r.changes === 0),
  },
];

/** 줄이 가는 곳 — 실제 콘솔의 상세. 디자인 보기는 디자인 주소를 넘긴다 */
const realHref = (id: SurveyDocId) => `/admin2/surveys/${surveySlugOf(id)}`;

export default function SurveyBoard({
  docs,
  hrefOf = realHref,
  children,
}: {
  docs: SurveyDocs;
  hrefOf?: (id: SurveyDocId) => string;
  children?: React.ReactNode;
}) {
  const cols = useMemo(() => colsOf(hrefOf), [hrefOf]);
  const rows = useMemo<Row[]>(
    () =>
      surveyDocIds.map((id) => {
        const d = docs[id];
        return {
          id,
          who: d.live.who,
          title: d.draft.title || d.live.title,
          band: surveyBandOf(d.band).label,
          bandId: d.band,
          code: d.code,
          version: d.liveVersion,
          mode: modeOf(d.live),
          items: d.draft.items.length,
          choices: d.draft.choices.length,
          opens: d.draft.opens.length,
          publishedAt: d.publishedAt,
          publishedBy: d.publishedBy,
          changes: draftChanges(d).length,
        };
      }),
    [docs],
  );

  return (
    <>
      <PageHead title="설문지" />
      <Body>
        <Panel title="설문" flush>
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            rowLink
            searchHint="설문 이름"
            empty="설문이 없습니다."
          />
        </Panel>
        {children}
      </Body>
    </>
  );
}
