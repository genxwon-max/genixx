"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { surveyKeys } from "@/lib/examStore";
import { surveyBandOf, surveyBands } from "@/lib/surveyBands";
import {
  draftChanges,
  modeOf,
  surveyKeyShort,
  surveyModeLabel,
  surveySlugOf,
  type NewSurvey,
  type SurveyDocId,
  type SurveyDocs,
  type SurveyMode,
} from "@/lib/surveyStore";
import DataTable, { type Col, type Filter } from "./DataTable";
import SurveyCreateDialog from "./SurveyCreateDialog";
import { Body, PageHead, Panel, Status } from "./ui";

/**
 * ADM-14 설문지 — 목록.
 *
 * 설문지는 **계속 새로 만든다**(2026-10-28 사용자 요청 — 「2025 설문지 · 2026 설문지처럼 똑같아도 남겨 둘 수
 * 있게」). 응답자(학생 · 학부모 · 지도교사) × 학년대(초1~2 · 초3~4 · 초5~6 · 중1~3 · 고1~3)마다 **사용 중**인 설문지가 하나 있고, 나머지는
 * 보관해 둔 지난 설문지다. 줄 하나가 설문지 한 벌이고, 누르면 그 설문지를 고치는 자리(/admin2/surveys/[열쇠])로
 * 간다. 「새 설문지」로 빈 설문지나 있는 설문지의 복사본을 만든다.
 *
 * 9월 27일 옛 콘솔(/admin/surveys)을 걷어 낼 때 함께 사라졌던 화면을 2026-10-28 다시 세웠다. 처음에는 갈래 ×
 * 학년대 여섯 벌로 고정돼 있었다.
 *
 * 읽는 쪽과 그리는 쪽을 갈랐다. 실제 화면(app/(admin2)/admin2/surveys/SurveysView.tsx)은 저장소의 설문지와 만드는
 * 손잡이를 넘기고, 디자인 보기(/design2/admin2/surveys)는 예시 값을 넘긴다.
 *
 * 「발행하지 않은 수정」 칸을 둔다. 초안은 고치는 즉시 저장되지만 응답자에게는 발행해야 나간다 — 고쳐 놓고 발행을
 * 잊은 설문지가 어느 것인지가 이 목록이 답해야 하는 물음이다.
 */

type Row = {
  id: SurveyDocId;
  name: string;
  who: string;
  keyId: string;
  band: string;
  bandId: string;
  active: boolean;
  version: number;
  /** 지금 나가는 판의 응답 방식 */
  mode: SurveyMode;
  items: number;
  choices: number;
  opens: number;
  createdAt: string;
  publishedAt: string;
  publishedBy: string;
  changes: number;
};

const colsOf = (hrefOf: (id: SurveyDocId) => string): Col<Row>[] => [
  {
    key: "name",
    head: "설문지",
    nowrap: true,
    value: (r) => r.name,
    cell: (r) => (
      <Link href={hrefOf(r.id)} className="a2-t-sm font-semibold">
        {r.name}
      </Link>
    ),
  },
  {
    key: "who",
    head: "응답자",
    width: "6rem",
    nowrap: true,
    value: (r) => r.who,
    cell: (r) => r.who,
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
    key: "active",
    head: "사용",
    width: "6rem",
    nowrap: true,
    sort: (r) => (r.active ? 0 : 1),
    value: (r) => (r.active ? "사용 중" : "보관"),
    cell: (r) =>
      r.active ? <Status tone="ok">사용 중</Status> : <Status tone="muted">보관</Status>,
  },
  {
    key: "mode",
    head: "응답 방식",
    width: "8.5rem",
    nowrap: true,
    hide: "md",
    value: (r) => surveyModeLabel[r.mode],
    cell: (r) =>
      r.mode === "link" ? <Status tone="info">외부 설문 링크</Status> : surveyModeLabel[r.mode],
  },
  {
    key: "count",
    head: "문항",
    width: "11rem",
    nowrap: true,
    hide: "lg",
    sort: (r) => r.items,
    csv: (r) => `척도 ${r.items} · 고르기 ${r.choices} · 서술 ${r.opens}`,
    cell: (r) => (
      <span className="a2-t-sm tabular-nums">
        척도 {r.items} · 고르기 {r.choices} · 서술 {r.opens}
      </span>
    ),
  },
  {
    key: "version",
    head: "판",
    width: "4rem",
    num: true,
    sort: (r) => r.version,
    value: (r) => `v${r.version}`,
    cell: (r) => <span className="a2-mono">v{r.version}</span>,
  },
  {
    key: "published",
    head: "마지막 발행",
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
    id: "active",
    label: "사용",
    options: [
      { value: "y", label: "사용 중" },
      { value: "n", label: "보관" },
    ],
    match: (r, v) => (v === "y" ? r.active : !r.active),
  },
  {
    id: "who",
    label: "응답자",
    options: surveyKeys.map((k) => ({ value: k, label: surveyKeyShort[k] })),
    match: (r, v) => r.keyId === v,
  },
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
];

/** 줄이 가는 곳 — 실제 콘솔의 상세. 디자인 보기는 디자인 주소를 넘긴다 */
const realHref = (id: SurveyDocId) => `/admin2/surveys/${surveySlugOf(id)}`;

export default function SurveyBoard({
  docs,
  hrefOf = realHref,
  onCreate,
  creating: startCreating = false,
  children,
}: {
  docs: SurveyDocs;
  hrefOf?: (id: SurveyDocId) => string;
  /** 「새 설문지」의 만들기 — 만들지 못했으면 까닭을 돌려준다. 없으면 단추를 세우지 않는다 */
  onCreate?: (spec: NewSurvey) => string | null;
  /** 처음부터 「새 설문지」 창이 열려 있다 — 디자인 보기만 넘긴다 */
  creating?: boolean | Partial<NewSurvey>;
  children?: React.ReactNode;
}) {
  const cols = useMemo(() => colsOf(hrefOf), [hrefOf]);
  const [creating, setCreating] = useState<boolean | Partial<NewSurvey>>(startCreating);

  /* 사용 중인 것이 위로, 그 안에서는 응답자 · 학년대 차례, 보관은 늦게 만든 것이 위로 */
  const rows = useMemo<Row[]>(
    () =>
      Object.values(docs)
        .map((d) => ({
          id: d.id,
          name: d.name,
          who: surveyKeyShort[d.key],
          keyId: d.key,
          band: surveyBandOf(d.band).label,
          bandId: d.band,
          active: d.active,
          version: d.liveVersion,
          mode: modeOf(d.live),
          items: d.draft.items.length,
          choices: d.draft.choices.length,
          opens: d.draft.opens.length,
          createdAt: d.createdAt,
          publishedAt: d.publishedAt,
          publishedBy: d.publishedBy,
          changes: draftChanges(d).length,
        }))
        .sort(
          (a, b) =>
            Number(b.active) - Number(a.active) ||
            surveyKeys.indexOf(a.keyId as (typeof surveyKeys)[number]) -
              surveyKeys.indexOf(b.keyId as (typeof surveyKeys)[number]) ||
            a.bandId.localeCompare(b.bandId) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [docs],
  );

  return (
    <>
      <PageHead
        title="설문지"
        actions={
          onCreate && (
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              onClick={() => setCreating(true)}
            >
              새 설문지
            </button>
          )
        }
      />
      <Body>
        <Panel
          title="설문지"
          meta="응답자 · 학년대마다 사용 중인 설문지 하나가 응답자에게 나갑니다"
          flush
        >
          <DataTable
            rows={rows}
            cols={cols}
            filters={filters}
            getKey={(r) => r.id}
            rowLink
            searchHint="설문지 이름"
            empty="설문지가 없습니다."
          />
        </Panel>
        {children}
      </Body>

      {creating && onCreate && (
        <SurveyCreateDialog
          docs={docs}
          start={typeof creating === "object" ? creating : undefined}
          onClose={() => setCreating(false)}
          onCreate={onCreate}
        />
      )}
    </>
  );
}
