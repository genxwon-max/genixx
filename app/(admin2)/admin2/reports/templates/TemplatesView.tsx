"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { n } from "@/lib/admin2";
import { useHydrated } from "@/lib/examStore";
import { bandOf, gradeLabel, slotOf, slotOrder, type SlotId } from "@/lib/reportAssets";
import { useAllTemplates, type TemplateRow } from "@/lib/reportAssetStore";
import { axes } from "@/lib/result";
import { surveyBands, type SurveyBand } from "@/lib/surveyBands";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Body, PageHead, SeedNote, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * ADM-08-1 해석 템플릿 — 목록.
 *
 * 탭이 학년대다. 이 화면에서 사람이 하는 일은 「한 학년대의 문구를 채우는 것」이라, 학년대를
 * 옮기는 것이 곧 조회 조건이다. 탭에 「채운 칸 / 전체」를 함께 적어 어느 학년대가 비었는지를
 * 탭 줄에서 바로 보게 한다 — 그것이 이 화면의 첫 물음이다.
 *
 * ── 격자가 아니라 표인 까닭 ──
 * 「축 × 밴드」 격자를 먼저 짜 보았다. 그런데 자리(slot)마다 붙는 차원이 다르다 — 유형
 * 판정은 축만, 강하게 나타난 축은 축과 밴드 둘 다, 미측정 안내는 어느 것도 안 붙는다.
 * 네모난 격자에 넣으려면 안 쓰는 칸을 회색으로 막아 두어야 하고, 그러면 「빈 칸」과
 * 「없는 칸」이 같은 회색으로 서서 둘을 못 가린다. 표로 두면 있는 칸만 줄로 서고, 상태
 * 칸이 「빈 칸」을 제 글자로 말한다.
 *
 * 표로 두어 얻은 것이 하나 더 있다 — 검색·거르개·정렬이 딸려 온다(DataTable). 문구를
 * 고치러 오는 사람은 대개 「그 말이 어느 칸에 있더라」를 들고 오는데, 그 물음은 검색으로만
 * 풀린다.
 *
 * ⚠ 고치는 자리는 제 주소로 간다(/admin2/reports/templates/[id]). 한동안 목록 아래에 판으로
 *   폈다 — 문구가 한두 문장이라 그 편이 가볍다고 보았는데, 주소가 없어 「이 칸 좀 봐 달라」고
 *   링크를 건넬 수가 없었다. 문구는 여럿이 함께 다듬는 글이라 그 왕복이 잦다. 공지를 상세로
 *   뺀 것과 같은 까닭이고, 이 콘솔의 다른 목록도 전부 그렇게 간다.
 */

type TabId = SurveyBand;

export default function TemplatesView() {
  const [tab, setTab] = useState<TabId>("e34");
  const hydrated = useHydrated();

  const rows = useAllTemplates(tab);

  /* 탭마다 「채운 칸 / 전체」를 세려면 네 학년대를 다 세어야 한다. 훅은 조건 없이
     넷을 다 부른다 — 지금 탭만 세면 다른 탭이 비었는지를 이 화면에서 볼 수 없다 */
  const e34 = useAllTemplates("e34");
  const e56 = useAllTemplates("e56");
  const m1 = useAllTemplates("m1");
  const m23 = useAllTemplates("m23");
  const filled = useMemo(
    () => ({
      e34: e34.filter((r) => !r.empty).length,
      e56: e56.filter((r) => !r.empty).length,
      m1: m1.filter((r) => !r.empty).length,
      m23: m23.filter((r) => !r.empty).length,
    }),
    [e34, e56, m1, m23],
  );
  const total = e34.length;

  const cols: Col<TemplateRow>[] = useMemo(
    () => [
      {
        key: "slot",
        head: "자리",
        width: "9rem",
        nowrap: true,
        value: (r) => slotOf(r.slot).label,
        sort: (r) => SLOT_RANK(r.slot),
        cell: (r) => (
          <span title={slotOf(r.slot).guide}>
            <span className="font-semibold text-(--a2-ink)">{slotOf(r.slot).label}</span>
          </span>
        ),
      },
      {
        key: "axis",
        head: "재능 축",
        width: "7rem",
        nowrap: true,
        value: (r) => (r.axis ? axisLabel(r.axis) : ""),
        cell: (r) =>
          r.axis ? <Tag>{axisLabel(r.axis)}</Tag> : <span className="text-(--a2-ink-4)">전 축</span>,
      },
      {
        key: "band",
        head: "발현 밴드",
        width: "8.5rem",
        nowrap: true,
        value: (r) => (r.band ? `${r.band} ${bandOf(r.band).label}` : ""),
        cell: (r) =>
          r.band ? (
            <span title={bandOf(r.band).desc}>
              <span className="a2-mono a2-t-xs text-(--a2-ink-3)">{r.band}</span>{" "}
              <span className="a2-t-sm">{bandOf(r.band).label}</span>
            </span>
          ) : (
            <span className="text-(--a2-ink-4)">밴드 없음</span>
          ),
      },
      {
        /* a2-clip(max-width:0)을 주지 않는다. 말줄임 칸이 둘이면 width:100%인 쪽이 자리를
           다 먹고 이쪽은 59px까지 눌려 「이…」만 남는다 — 제목은 열세 자 안쪽이라
           줄이지 않고 폭을 지키는 편이 낫다 */
        key: "title",
        head: "제목",
        width: "10rem",
        nowrap: true,
        value: (r) => r.title,
        cell: (r) => (
          <Link
            href={`/admin2/reports/templates/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {r.title || <span className="text-(--a2-ink-4)">제목 없음</span>}
          </Link>
        ),
      },
      {
        key: "text",
        head: "문구",
        width: "100%",
        clip: true,
        value: (r) => r.text,
        cell: (r) =>
          r.text ? (
            <span title={r.text} className="a2-t-sm text-(--a2-ink-2)">
              {r.text}
            </span>
          ) : (
            <span className="a2-t-sm text-(--a2-ink-4)">아직 아무도 쓰지 않았습니다.</span>
          ),
      },
      {
        key: "state",
        head: "상태",
        width: "6.5rem",
        nowrap: true,
        value: (r) => (r.empty ? "빈 칸" : r.edited ? "고침" : "씨앗"),
        cell: (r) =>
          r.empty ? (
            <Status tone="warn">빈 칸</Status>
          ) : r.edited ? (
            <span title={`${r.editedAt} · ${r.editedBy}`}>
              <Status tone="info">고침</Status>
            </span>
          ) : (
            <Status tone="muted">기본 문구</Status>
          ),
      },
      {
        key: "act",
        head: "",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/reports/templates/${r.id}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${slotOf(r.slot).label} 문구 ${r.empty ? "쓰기" : "고치기"}`}
          >
            {r.empty ? "쓰기" : "고치기"}
          </Link>
        ),
      },
    ],
    [],
  );

  const filters: Filter<TemplateRow>[] = useMemo(
    () => [
      {
        id: "state",
        label: "상태",
        options: [
          { value: "empty", label: "빈 칸" },
          { value: "edited", label: "고친 것" },
          { value: "seed", label: "기본 문구" },
        ],
        match: (r, v) =>
          v === "empty" ? r.empty : v === "edited" ? r.edited : !r.empty && !r.edited,
      },
      {
        id: "slot",
        label: "자리",
        options: slotOrder.map((s) => ({ value: s, label: slotOf(s).label })),
        match: (r, v) => r.slot === v,
      },
      {
        id: "axis",
        label: "재능 축",
        options: axes
          .filter((a) => a.subject)
          .map((a) => ({ value: a.id, label: a.label })),
        match: (r, v) => r.axis === v,
      },
    ],
    [],
  );

  const gap = rows.filter((r) => r.empty).length;

  return (
    <>
      <PageHead
        title="해석 템플릿"
        tabsLabel="학년대별 조회 조건"
        tabs={surveyBands.map((b) => (
          <Tab
            key={b.id}
            label={b.label}
            /* 「채운 칸/전체」 — 어느 학년대가 비었는지를 탭 줄에서 바로 본다 */
            count={hydrated ? `${n(filled[b.id])}/${n(total)}` : undefined}
            active={tab === b.id}
            onClick={() => setTab(b.id)}
          />
        ))}
      />

      {hydrated && gap > 0 && (
        <Body className="pb-0">
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>
              {gradeLabel(tab)}에 아직 쓰지 않은 칸이 {n(gap)}개 있습니다. 조립할 때 그 자리는
              초등 3~4학년 문구로 물러섭니다 — 물러선 사실은 조립 규칙 화면의 미리보기에
              적힙니다.
            </span>
          </p>
        </Body>
      )}

      <DataTable
        key={tab}
        rows={rows}
        cols={cols}
        getKey={(r) => r.id}
        filters={filters}
        showCount={false}
        searchHint="문구 · 제목 · 축 검색"
        empty="조건에 맞는 칸이 없습니다."
      />

      <SeedNote>
        고친 문구는 이 브라우저에만 저장됩니다(lib/reportAssetStore.ts). 기본 문구는
        lib/reportAssets.ts의 씨앗입니다. 여기서 무엇을 고쳐도 이미 발행된 리포트는 그대로
        두고 다음 조립부터 적용됩니다.
      </SeedNote>
    </>
  );
}


/** 표의 기본 순서 — 리포트에 서는 차례 그대로 */
const SLOT_RANK = (id: SlotId) => slotOrder.indexOf(id);

const axisLabel = (id: string) => axes.find((a) => a.id === id)?.label ?? id;
