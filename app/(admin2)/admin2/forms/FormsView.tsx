"use client";

import Link from "next/link";
import { useMemo } from "react";
import { gradeBands, type GradeBand } from "@/lib/blueprint";
import { roundStateLabels, roundStates, type RoundState } from "@/lib/admin";
import { n, roundTone } from "@/lib/admin2";
import { useForms } from "@/lib/formStore";
import { useItems, type ItemDraft } from "@/lib/itemStore";
import { bandFor, planOf, slotsFor, slotsOf, usePlans, useRounds } from "@/lib/roundPlanStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Status } from "@/components/admin2/ui";

/**
 * ADM-04-3 평가별 문항관리 — **회차 한 줄**.
 *
 * ── 왜 줄을 회차로 세는가 ──
 * 한동안 회차 × 과목 × 학년 한 칸을 한 줄로 폈다. 「어느 칸이 비었나」는 잘 보였지만, 한
 * 회차가 표에서 세 줄로 흩어졌다. 회차 이름이 세 번 되풀이되고, 그 셋을 다시 눈으로 묶어야
 * 「이 회차가 어디까지 왔나」를 알 수 있었다 — 실제로 사람이 세는 단위는 회차다.
 *
 * 지금은 회차가 한 줄이고 **과목은 한 칸 안에 나란히 눕는다**(국어 · 수학 · 과학). 칸 하나가
 * 검사지 한 벌이라는 것은 그대로이므로, 그 벌이 어디까지 왔는지는 과목 꼬리표가 스스로
 * 적는다 — 담긴 문항 수, 확정 전이면 「초안」, 아직 없으면 「—」.
 *
 * 과목 꼬리표는 그 과목 탭으로 바로 들어가는 문이다(`?subject=`). 표에서 눈에 걸린 「수학
 * 3」을 누르면 그 검사지가 열려 있다 — 회차를 열고 다시 과목을 찾는 왕복이 사라진다.
 *
 * 문항을 담는 자리는 상세(같은 주소 + 회차 번호)다. 여기서 답하는 것은 하나 —
 * 「어느 회차부터 손대야 하나」. 한 벌도 없는 회차가 위로, 그다음이 짜는 중, 전부 확정한
 * 회차가 아래다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 한 회차 안의 과목 한 칸 = 검사지 한 벌 */
type Cell = {
  subject: ItemDraft["subject"];
  /** 없음 · 초안 · 확정 */
  state: "none" | "draft" | "confirmed";
  picked: number;
  pool: number;
};

type Row = {
  id: string;
  label: string;
  roundState: RoundState;
  opensOn: string;
  closesOn: string;
  band: GradeBand;
  bandLabel: string;
  cells: Cell[];
  /** 이 회차가 보는 칸 수 = 넣은 과목 수 */
  slots: number;
  built: number;
  confirmed: number;
  picked: number;
  points: number;
  anchors: number;
  /** 손이 가야 하는 차례 — 0 한 벌도 없음 · 1 짜는 중 · 2 전부 확정 */
  rank: 0 | 1 | 2;
};

const PLAN_LABEL = { 0: "비어 있음", 1: "짜는 중", 2: "전부 확정" } as const;

/**
 * 과목 한 칸 — 꼬리표 하나가 검사지 한 벌이다.
 *
 * 색만으로 상태를 가르지 않는다. 점 색과 함께 글자로도 적는다 — 확정된 벌은 담긴 문항 수만,
 * 확정 전이면 「초안」을, 아직 검사지가 없으면 「—」를 세운다. 흑백으로 인쇄해도 셋이 갈린다.
 */
function SubjectCell({ roundId, cell }: { roundId: string; cell: Cell }) {
  const tone =
    cell.state === "confirmed"
      ? "var(--a2-ok)"
      : cell.state === "draft"
        ? "var(--a2-warn)"
        : "var(--a2-ink-4)";
  return (
    <Link
      href={`/admin2/forms/${roundId}?subject=${encodeURIComponent(cell.subject)}`}
      className="a2-tag gap-1 hover:border-(--a2-accent-line) hover:bg-(--a2-accent-soft)"
      title={
        cell.state === "none"
          ? `${cell.subject} — 검사지 없음 · 담을 수 있는 승인 문항 ${cell.pool}건`
          : `${cell.subject} — ${cell.state === "confirmed" ? "확정" : "초안"} · 문항 ${cell.picked}건`
      }
    >
      <span aria-hidden className="a2-dot" style={{ color: tone }} />
      <span className="text-(--a2-ink)">{cell.subject}</span>
      {cell.state === "none" ? (
        <span className="text-(--a2-ink-4)">—</span>
      ) : (
        <>
          <span className="a2-num text-(--a2-ink-3)">{cell.picked}</span>
          {cell.state === "draft" && (
            <span className="font-bold" style={{ color: "var(--a2-warn)" }}>
              초안
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export default function FormsView() {
  const forms = useForms();
  const items = useItems();
  const plans = usePlans();
  const rounds = useRounds();

  const rows = useMemo<Row[]>(
    () =>
      rounds.map((r): Row => {
        const plan = planOf(plans, r.id);
        const band = bandFor(plan);
        const slots = slotsOf(r.id, forms, items, slotsFor(plan));

        const cells = slots.map(
          (s): Cell => ({
            subject: s.subject,
            state: !s.form ? "none" : s.form.state === "confirmed" ? "confirmed" : "draft",
            picked: s.picked.length,
            pool: s.pool,
          }),
        );

        const all = slots.flatMap((s) => s.picked);
        const built = slots.filter((s) => s.form).length;
        const confirmed = slots.filter((s) => s.form?.state === "confirmed").length;

        return {
          id: r.id,
          label: r.label,
          roundState: plan.state,
          opensOn: plan.opensOn,
          closesOn: plan.closesOn,
          band,
          bandLabel: gradeBands.find((g) => g.id === band)?.label ?? band,
          cells,
          slots: slots.length,
          built,
          confirmed,
          picked: all.length,
          points: all.reduce((sum, i) => sum + i.points, 0),
          anchors: all.filter((i) => i.anchor).length,
          /* 「전부 확정」은 짤 칸이 하나라도 있고 그것이 전부 확정되었을 때다. 칸이 0인
             회차(과목을 하나도 안 넣은 회차)를 전부 확정으로 세면 손댈 것이 없는 회차가
             맨 아래에 서고, 정작 편성을 안 한 사실이 안 보인다 */
          rank: built === 0 ? 0 : confirmed === slots.length && slots.length > 0 ? 2 : 1,
        };
      }),
    [rounds, plans, forms, items],
  );

  /* 한 벌도 없는 회차 → 짜는 중 → 전부 확정. 같은 차례 안에서는 최신 회차가 먼저다.
     **마감한 회차는 그 앞에 통째로 내려간다** — 지난 회차의 빈 칸은 이제 채울 일이 아닌데,
     차례만으로 세우면 「검사지 없이 끝난 옛 회차」가 맨 위에 서서 오늘 할 일을 가린다 */
  const sorted = useMemo(() => {
    const done = (r: Row) => (r.roundState === "closed" ? 1 : 0);
    return [...rows].sort(
      (a, b) => done(a) - done(b) || a.rank - b.rank || b.opensOn.localeCompare(a.opensOn),
    );
  }, [rows]);

  const cols = useMemo<Col<Row>[]>(
    () => [
      {
        key: "round",
        head: "평가 회차",
        width: "12rem",
        nowrap: true,
        value: (r) => r.label,
        cell: (r) => (
          <Link
            href={`/admin2/forms/${r.id}`}
            className="font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
          >
            {r.label}
          </Link>
        ),
      },
      {
        key: "roundState",
        head: "회차 상태",
        width: "6.5rem",
        nowrap: true,
        value: (r) => roundStates[r.roundState].label,
        cell: (r) => <Status tone={roundTone[r.roundState]}>{roundStates[r.roundState].label}</Status>,
      },
      {
        /* 학년은 회차마다 하나다(roundPlanStore의 band). 과목처럼 여럿 눕지 않으므로
           제 칸에 세운다 — 같은 과목이라도 학년이 다르면 다른 검사지다 */
        key: "band",
        head: "학년",
        width: "9rem",
        nowrap: true,
        hide: "lg",
        value: (r) => r.bandLabel,
        cell: (r) => r.bandLabel,
      },
      {
        /* 이 화면의 본체 — 한 회차가 보는 과목이 나란히 눕는다. 남는 폭을 이 칸이 먹는다 */
        key: "subjects",
        head: "평가 과목",
        width: "100%",
        value: (r) =>
          r.cells
            .map((c) => `${c.subject} ${c.state === "none" ? "비어 있음" : c.state === "draft" ? "초안" : "확정"}`)
            .join(" "),
        cell: (r) =>
          r.cells.length === 0 ? (
            <span className="a2-t-sm text-(--a2-ink-4)">넣은 과목이 없습니다</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1">
              {r.cells.map((c) => (
                <SubjectCell key={c.subject} roundId={r.id} cell={c} />
              ))}
            </span>
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
        key: "anchors",
        head: "앵커",
        width: "4rem",
        num: true,
        hide: "lg",
        value: (r) => r.anchors,
        cell: (r) => (r.anchors ? n(r.anchors) : dash),
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
        key: "act",
        head: "관리",
        width: "5.5rem",
        nowrap: true,
        cell: (r) => (
          <Link href={`/admin2/forms/${r.id}`} className="a2-btn a2-btn-sm" aria-label={`${r.label} 문항 편성하기`}>
            문항 편성
          </Link>
        ),
      },
    ],
    [],
  );

  const filters = useMemo<Filter<Row>[]>(
    () => [
      {
        /* 차림표를 열쇠가 아니라 **말**로 세운다. 열쇠로 세우면 open과 grading이 같은
           「진행중」을 쓰므로 차림표에 같은 줄이 두 번 선다 */
        id: "roundState",
        label: "회차 상태",
        options: roundStateLabels.map((l) => ({ value: l, label: l })),
        match: (r, v) => roundStates[r.roundState].label === v,
      },
      {
        id: "subject",
        label: "과목",
        options: [...new Set(rows.flatMap((r) => r.cells.map((c) => c.subject)))].map((v) => ({
          value: v,
          label: v,
        })),
        match: (r, v) => r.cells.some((c) => c.subject === v),
      },
      {
        id: "band",
        label: "학년",
        options: gradeBands.map((g) => ({ value: g.id, label: g.label })),
        match: (r, v) => r.band === v,
      },
      {
        id: "plan",
        label: "검사지",
        options: ([0, 1, 2] as const).map((v) => ({ value: String(v), label: PLAN_LABEL[v] })),
        match: (r, v) => String(r.rank) === v,
      },
    ],
    [rows],
  );

  return (
    <>
      <PageHead
        title="평가별 문항관리"
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
        pageSize={25}
        searchHint="회차 이름 · 과목"
        empty="조건에 맞는 회차가 없습니다."
        // 줄 수는 끈다 — 쪽 넘김 줄이 이미 같은 수를 적는다
        showCount={false}
      />
    </>
  );
}
