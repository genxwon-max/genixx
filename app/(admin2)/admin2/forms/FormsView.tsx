"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LEVELS, gradeBands, type Level } from "@/lib/blueprint";
import { roundStates } from "@/lib/admin";
import { formTone, n, roundTone } from "@/lib/admin2";
import { useForms } from "@/lib/formStore";
import { useItems } from "@/lib/itemStore";
import { planOf, slotsFor, slotsOf, usePlans, useRounds } from "@/lib/roundPlanStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, SeedNote, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-04-3 평가별 문항관리 — 검사지 한 벌이 한 줄.
 *
 * 편성 화면(회차 편성)은 **한 회차의** 칸을 보여 준다. 그 화면만 있으면 「지금 어느
 * 검사지가 비어 있나」를 알려고 회차를 하나씩 열어 봐야 한다. 회차가 넷이면 견딜 만하지만
 * 분기마다 한 줄씩 쌓이는 목록이라 두 해면 여덟 회차 × 여섯 칸 = 마흔여덟 벌이 된다.
 *
 * 그래서 이 화면은 **회차 × 과목 × 학년군을 통째로 편다.** 답해야 하는 것은 하나다 —
 * 「어느 칸부터 손대야 하나」. 비어 있는 칸이 위로 오고, 그다음이 초안, 확정된 것이 아래다.
 *
 * 문항을 담는 자리는 여기가 아니라 편성 화면이다. 「수정하기」는 그 회차의 편성 화면으로
 * 보내고, 칸은 거기서 연다. 담는 자리를 두 곳에 만들면 같은 검사지를 두 화면이 다르게
 * 그리는 날이 온다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

type Row = {
  id: string;
  roundId: string;
  roundLabel: string;
  roundState: keyof typeof roundStates;
  subject: string;
  band: string;
  bandLabel: string;
  slotKey: string;
  /** 없음 · 초안 · 확정 */
  formState: "none" | "draft" | "confirmed";
  picked: number;
  points: number;
  anchors: number;
  pool: number;
  spread: Record<Level, number>;
};

/** 비어 있는 칸이 위로. 손이 가야 하는 차례 그대로다 */
const FORM_ORDER = { none: 0, draft: 1, confirmed: 2 } as const;
const FORM_LABEL = { none: "비어 있음", draft: "초안", confirmed: "확정" } as const;

export default function FormsView() {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const rounds = useRounds();

  const rows = useMemo<Row[]>(
    () =>
      rounds.flatMap((r) => {
        const plan = planOf(plans, r.id);
        return slotsOf(r.id, forms, items, slotsFor(plan)).map((s): Row => {
          const spread = LEVELS.reduce(
            (acc, l) => ({ ...acc, [l]: s.picked.filter((i) => i.level === l).length }),
            {} as Record<Level, number>,
          );
          return {
            id: `${r.id}:${s.key}`,
            roundId: r.id,
            roundLabel: r.label,
            roundState: plan.state,
            subject: s.subject,
            band: s.band,
            bandLabel: gradeBands.find((g) => g.id === s.band)?.label ?? s.band,
            slotKey: s.key,
            formState: !s.form ? "none" : s.form.state === "confirmed" ? "confirmed" : "draft",
            picked: s.picked.length,
            points: s.picked.reduce((sum, i) => sum + i.points, 0),
            anchors: s.picked.filter((i) => i.anchor).length,
            pool: s.pool,
            spread,
          };
        });
      }),
    [rounds, plans, forms, items],
  );

  /* 비어 있는 칸 → 초안 → 확정. 같은 상태 안에서는 최신 회차가 먼저다 */
  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          FORM_ORDER[a.formState] - FORM_ORDER[b.formState] || b.roundId.localeCompare(a.roundId),
      ),
    [rows],
  );

  const cols = useMemo<Col<Row>[]>(
    () => [
      {
        key: "round",
        head: "평가 회차",
        width: "11rem",
        nowrap: true,
        value: (r) => r.roundLabel,
        cell: (r) => (
          <Link href={`/admin2/rounds/${r.roundId}`} className="font-semibold text-(--a2-ink) hover:underline">
            {r.roundLabel}
          </Link>
        ),
      },
      {
        key: "roundState",
        head: "회차 상태",
        width: "6.5rem",
        nowrap: true,
        hide: "lg",
        value: (r) => roundStates[r.roundState].label,
        cell: (r) => <Status tone={roundTone[r.roundState]}>{roundStates[r.roundState].label}</Status>,
      },
      {
        key: "subject",
        head: "평가 과목",
        width: "5rem",
        nowrap: true,
        value: (r) => r.subject,
        cell: (r) => <Tag>{r.subject}</Tag>,
      },
      {
        key: "band",
        head: "학년군",
        width: "9rem",
        nowrap: true,
        value: (r) => r.bandLabel,
        cell: (r) => r.bandLabel,
      },
      {
        key: "formState",
        head: "검사지",
        width: "6rem",
        nowrap: true,
        value: (r) => FORM_LABEL[r.formState],
        sort: (r) => FORM_ORDER[r.formState],
        cell: (r) =>
          r.formState === "none" ? (
            <span className="a2-t-sm text-(--a2-ink-4)">비어 있음</span>
          ) : (
            <Status tone={formTone[r.formState === "confirmed" ? "confirmed" : "draft"]}>
              {FORM_LABEL[r.formState]}
            </Status>
          ),
      },
      {
        key: "picked",
        head: "문항",
        width: "4.5rem",
        num: true,
        value: (r) => r.picked,
        cell: (r) => (r.picked ? n(r.picked) : dash),
      },
      {
        /* 단계 배분 — 0인 단계가 있으면 그 층은 이 검사지로 못 잰다. 합계만으로는
           「열 문항인데 S4가 하나도 없다」가 안 보인다 */
        key: "spread",
        head: "단계 배분",
        width: "7.5rem",
        nowrap: true,
        hide: "md",
        value: (r) => LEVELS.map((l) => r.spread[l]).join(" · "),
        cell: (r) =>
          r.picked ? (
            <span className="a2-num a2-t-sm">
              {LEVELS.map((l, i) => (
                <span key={l}>
                  {i > 0 && <span className="text-(--a2-ink-4)"> · </span>}
                  <span style={r.spread[l] === 0 ? { color: "var(--a2-danger)" } : undefined}>
                    {r.spread[l]}
                  </span>
                </span>
              ))}
            </span>
          ) : (
            dash
          ),
      },
      {
        key: "points",
        head: "배점",
        width: "4.5rem",
        num: true,
        hide: "lg",
        value: (r) => r.points,
        cell: (r) => (r.points ? n(r.points) : dash),
      },
      {
        key: "anchors",
        head: "앵커",
        width: "4rem",
        num: true,
        hide: "lg",
        value: (r) => r.anchors,
        cell: (r) => (r.anchors ? n(r.anchors) : dash),
      },
      {
        /* 담을 수 있는 승인 문항이 0이면 이 칸은 지금 짤 수 없다 — 문항 은행부터 채워야
           한다. 「비어 있음」과 「채울 것이 없음」은 다른 일이라 칸을 따로 둔다 */
        key: "pool",
        head: "남은 승인",
        width: "5.5rem",
        num: true,
        value: (r) => r.pool,
        cell: (r) => (
          <span style={r.pool === 0 && r.formState === "none" ? { color: "var(--a2-danger)" } : undefined}>
            {n(r.pool)}
          </span>
        ),
      },
      {
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link
            href={`/admin2/rounds/${r.roundId}`}
            className="a2-btn a2-btn-sm"
            aria-label={`${r.roundLabel} ${r.subject} ${r.bandLabel} 수정하기`}
          >
            수정하기
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<Row>[]>(
    () => [
      {
        id: "round",
        label: "회차",
        options: rounds.map((r) => ({ value: r.id, label: r.label })),
        match: (r, v) => r.roundId === v,
      },
      {
        id: "subject",
        label: "과목",
        options: [...new Set(rows.map((r) => r.subject))].map((v) => ({ value: v, label: v })),
        match: (r, v) => r.subject === v,
      },
      {
        id: "formState",
        label: "검사지",
        options: (["none", "draft", "confirmed"] as const).map((v) => ({ value: v, label: FORM_LABEL[v] })),
        match: (r, v) => r.formState === v,
      },
    ],
    [rounds, rows],
  );

  return (
    <>
      <PageHead
        title="평가별 문항관리"
        meta={
          <>
            <span>
              검사지 <span className="a2-num text-(--a2-ink-2)">{n(rows.length)}</span>벌
            </span>
            <span aria-hidden>·</span>
            <span>회차 × 과목 × 학년군 한 칸이 검사지 한 벌</span>
          </>
        }
        actions={
          <>
            <Link href="/admin2/items" className="a2-btn">
              문항 은행
            </Link>
            <Link href="/admin2/rounds" className="a2-btn">
              평가 회차
            </Link>
          </>
        }
      />

      <DataTable
        rows={sorted}
        cols={cols}
        filters={filters}
        getKey={(r) => r.id}
        pageSize={50}
        searchHint="회차 · 과목 · 학년군"
        empty="조건에 맞는 검사지가 없습니다."
        toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기본 차례 · 비어 있는 칸 먼저</span>}
      />

      <SeedNote>
        검사지와 문항은 이 브라우저에만 저장됩니다(lib/formStore.ts · lib/itemStore.ts). 문항을 담고 확정하는 일은
        「수정하기」로 여는 회차 편성 화면에서 합니다.
      </SeedNote>
    </>
  );
}
