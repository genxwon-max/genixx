"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LEVELS, gradeOptions, gradeText, levelSpecs } from "@/lib/blueprint";
import { n } from "@/lib/admin2";
import {
  stateLabel,
  formTextOf,
  typeTextOf,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import DataTable, { type Col, type CsvSpec, type Filter } from "@/components/admin2/DataTable";
import { PageHead, Status, Tab, Tag } from "@/components/admin2/ui";

/**
 * ADM-04 문항 은행의 목록판.
 *
 * 이 화면에서 던지는 물음은 셋이다 —
 *   ① 지금 검수가 몇 건 걸려 있나        지표 다섯 칸
 *   ② 회차에 넣을 것이 얼마나 있나        단계별 승인 수 한 줄
 *   ③ 그중 무엇부터 보나                  표 한 장, 검수 대기 먼저
 *
 * ②를 지표가 아니라 한 줄로 둔 까닭: 편성이 고르는 것은 「승인된 S1 몇 개」이지
 * 「전체 승인 몇 개」가 아니다. S4가 0인 채로 승인이 스물이면 그 회차는 위층을 재지
 * 못한다. 그 사실이 은행 목록에서 먼저 보여야 편성 화면에서 처음 알지 않는다.
 */

/**
 * 상태를 세우는 단 하나의 순서 — 「손이 가야 하는 순」.
 *
 * 제작 흐름 순(작성 중 → 검수 대기 → …)과 가나다순 둘 다 버렸다. 이 화면을 여는
 * 이유는 거의 언제나 검수 대기를 찾는 것이라, 흐름 순으로 두면 아무도 안 찾는 작성
 * 중이 맨 위에 서고 가나다순으로 두면 「사용 중지」가 「승인됨」보다 위에 선다.
 * 이 배열 하나가 거르개 차림표 · 상태 칸 정렬 · 표의 기본 줄 순서를 모두 정한다.
 */
const STATE_ORDER: ItemState[] = ["submitted", "rejected", "draft", "approved", "retired"];
const stateRank = (s: ItemState) => STATE_ORDER.indexOf(s);

/**
 * 자기가 쓴 문항을 자기가 검수한 줄.
 *
 * 출제자와 검수자를 갈라 두는 것이 이 저장소의 전제이고(lib/admin.ts maySelfReview),
 * 슈퍼 관리자만 예외로 통과한다. 예외로 통과했다는 것은 「없던 일」이 아니라 「세어야
 * 할 일」이므로 목록에서 그 줄이 보여야 한다. 검수 기록이 스스로 그 사실을 들고 있다.
 */
const selfReviewed = (i: ItemDraft) => i.reviews.some((r) => r.self);

const dash = <span className="text-(--a2-ink-4)">—</span>;

/** 사용 칸의 글자 — 검색에도 이 글자 그대로 걸린다 */
const inUseText = (s: ItemState) => (s === "approved" ? "사용" : s === "retired" ? "사용 중지" : "");

/*
 * 칸 순서 — 무엇인가(코드) → 어디에 쓰이는가(과목·학년·단계·유형) → 실제로 무슨
 * 문제인가(발문) → 회차에 나가나(사용·앵커) → 누가 붙어 있나(출제자) → 지난번에
 * 어땠나(정답률).
 *
 * 상태 칸은 따로 두지 않는다 — 머리의 탭이 맡는다. 사용 칸은 그 상태 가운데 승인됨과
 * 사용 중지 둘만 「사용 · 사용 중지」로 다시 읽은 것이다. 전체 탭에서 훑을 때 회차 편성
 * 후보에 오르는 줄이 어느 것인지가 탭을 옮기지 않고 보여야 해서 칸으로 세운다.
 *
 * 발문을 맨 왼쪽에 두지 않은 것은 코드로 문항을 찾아 오는 일이 훨씬 잦아서다 —
 * 검수 요청도 회차 편성도 4K02-S2-001로 문항을 부른다.
 */
const COLS: Col<ItemDraft>[] = [
  {
    key: "code",
    head: "문항 ID",
    width: "8.5rem",
    nowrap: true,
    value: (r) => r.code || r.id,
    cell: (r) => (
      <Link href={`/admin2/items/${r.id}`} className="a2-mono font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline">
        {r.code || <span className="text-(--a2-ink-4)">ID 미정</span>}
      </Link>
    ),
  },
  {
    // 과목·학년·단계는 모두 거르개가 맡는다. 검색창의 「수학」이 과목 전체를 끌고
    // 오기 시작하면 발문 검색이 못 쓰게 되므로 value를 달지 않는다
    key: "subject",
    head: "과목",
    width: "4.25rem",
    nowrap: true,
    cell: (r) => <Tag>{r.subject}</Tag>,
  },
  {
    key: "grade",
    head: "학년",
    width: "4.5rem",
    nowrap: true,
    hide: "md",
    sort: (r) => r.gradeNo,
    cell: (r) => <span className="a2-t-sm">{gradeText(r.gradeNo)}</span>,
  },
  {
    key: "level",
    head: "단계",
    width: "4rem",
    nowrap: true,
    sort: (r) => r.level,
    cell: (r) => (
      <span className="a2-mono font-semibold text-(--a2-ink-2)" title={levelSpecs[r.level].name}>
        {r.level}
      </span>
    ),
  },
  {
    key: "form",
    head: "구성",
    width: "6.5rem",
    nowrap: true,
    value: (r) => formTextOf(r),
    cell: (r) =>
      r.form === "set" ? <Tag accent>{formTextOf(r)}</Tag> : <span className="a2-t-sm text-(--a2-ink-3)">독립</span>,
  },
  {
    key: "type",
    head: "유형",
    width: "7rem",
    nowrap: true,
    hide: "lg",
    cell: (r) => (
      <span title={typeTextOf(r)} className="a2-clip a2-t-sm text-(--a2-ink-2)">
        {typeTextOf(r)}
      </span>
    ),
  },
  {
    // 폭을 100%로 두어 남는 자리를 이 칸이 먹고, 넘치면 말줄임한다(a2-clip).
    // 줄바꿈을 허용해 두 줄로 펴는 쪽은 버렸다 — 한 줄 32px이 무너지면 200줄을 못 훑는다
    key: "stem",
    head: "발문",
    width: "100%",
    clip: true,
    value: (r) => `${r.stem} ${r.unit}`,
    cell: (r) =>
      r.stem ? (
        <span title={r.stem}>{r.stem}</span>
      ) : (
        <span className="text-(--a2-ink-4)">발문 없음 — 작성 중</span>
      ),
  },
  {
    // 승인 전 문항은 켜고 끌 것이 아니라 대시로 둔다. 「사용 중지」로 적으면 누가 일부러
    // 뺀 문항처럼 읽히고, 머리의 「사용 중지」 탭 개수와도 어긋난다
    key: "inUse",
    head: "사용",
    width: "5.5rem",
    nowrap: true,
    value: (r) => inUseText(r.state),
    sort: (r) => (r.state === "approved" ? 0 : r.state === "retired" ? 1 : 2),
    cell: (r) =>
      r.state === "approved" ? (
        <Status tone="ok">사용</Status>
      ) : r.state === "retired" ? (
        <Status tone="muted">사용 중지</Status>
      ) : (
        <span title="승인된 문항만 켜고 끕니다">{dash}</span>
      ),
  },
  {
    key: "anchor",
    head: "앵커",
    width: "4rem",
    nowrap: true,
    hide: "lg",
    // 앵커는 회차가 달라도 같은 잣대로 재려고 두는 문항이라, 편성에서 먼저 찾는 값이다.
    // 검색에도 걸리게 글자를 남긴다
    value: (r) => (r.anchor ? "앵커" : ""),
    cell: (r) => (r.anchor ? <Tag accent>앵커</Tag> : dash),
  },
  {
    key: "author",
    head: "출제자",
    width: "6rem",
    nowrap: true,
    hide: "sm",
    // 점은 색만으로 알리지 않는다. title과 aria-label에 문장을 함께 적는다
    value: (r) => (selfReviewed(r) ? `${r.authorName} 자가검수` : r.authorName),
    cell: (r) =>
      selfReviewed(r) ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            role="img"
            aria-label="출제자가 자기 문항을 검수함 — 이해충돌"
            title="출제자가 자기 문항을 검수했습니다(슈퍼 관리자 예외)"
            className="a2-dot"
            style={{ color: "var(--a2-danger)" }}
          />
          {r.authorName}
        </span>
      ) : (
        r.authorName
      ),
  },
  {
    key: "correctRate",
    head: "정답률",
    width: "5.5rem",
    num: true,
    // 미출제(null)를 -1로 떨어뜨려 한쪽 끝에 뭉치게 한다. 0으로 두면 「아무도 못 맞힌
    // 문항」과 「아직 안 낸 문항」이 같은 자리에 서서 뜻이 섞인다
    value: (r) => r.correctRate ?? -1,
    cell: (r) =>
      r.correctRate == null ? (
        <span className="a2-t-sm text-(--a2-ink-4)">미출제</span>
      ) : (
        <>
          {r.correctRate}
          <span className="a2-t-xs text-(--a2-ink-4)">%</span>
        </>
      ),
  },
];

/**
 * 문항 정보 CSV — 표에 없는 분류 값(단원 · 성취기준 · Tag A/B · 난이도 · 배점)까지 싣는다.
 *
 * ⚠ 보기 · 정답 · 모범답안 · 채점 기준은 싣지 않는다. 목록에 그리지 않는 까닭과 같다 —
 *   내려받은 파일은 콘솔 밖으로 나가 돌아다니고, 거기에 정답이 있으면 파일 자체가 유출 경로다.
 */
const ITEM_CSV: CsvSpec<ItemDraft> = {
  name: "문항정보",
  cols: [
    { head: "문항 ID", value: (r) => r.code || r.id },
    { head: "상태", value: (r) => stateLabel[r.state] },
    { head: "과목", value: (r) => r.subject },
    { head: "학년", value: (r) => gradeText(r.gradeNo) },
    { head: "단계", value: (r) => r.level },
    { head: "구성", value: (r) => formTextOf(r) },
    { head: "유형", value: (r) => typeTextOf(r) },
    { head: "교과 단원", value: (r) => [r.unitTerm, r.unitNo && `${Number(r.unitNo)}단원`, r.unit].filter(Boolean).join(" ") },
    { head: "성취기준 코드", value: (r) => r.standardCode },
    { head: "Tag A", value: (r) => r.tagA },
    { head: "Tag B", value: (r) => r.tagB },
    { head: "난이도(b)", value: (r) => r.b },
    { head: "배점", value: (r) => r.points },
    { head: "앵커", value: (r) => (r.anchor ? "앵커" : "") },
    { head: "발문", value: (r) => r.stem },
    { head: "출처", value: (r) => (r.origin === "ai" ? "AI 초안" : "사람") },
    { head: "출제자", value: (r) => r.authorName },
    { head: "정답률(%)", value: (r) => r.correctRate },
    { head: "만든 때", value: (r) => r.createdAt },
    { head: "고친 때", value: (r) => r.updatedAt },
  ],
};

/* 상태는 머리의 탭이 맡는다. 같은 조건을 두 군데서 걸면 탭에서 「승인됨」을 고른 채
   거르개에서 「작성 중」을 골라 0줄이 나오고, 어느 쪽이 이겼는지 화면에 안 적힌다 */
const FILTERS: Filter<ItemDraft>[] = [
  {
    id: "subject",
    label: "과목",
    options: ["국어", "수학", "과학"].map((v) => ({ value: v, label: v })),
    match: (r, v) => r.subject === v,
  },
  {
    id: "band",
    label: "학년",
    options: gradeOptions,
    match: (r, v) => String(r.gradeNo) === v,
  },
  {
    id: "level",
    label: "단계",
    options: LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` })),
    match: (r, v) => r.level === v,
  },
];

type TabId = "all" | ItemState | "conflict";

export default function ItemBank() {
  const items = useItems();
  const [tab, setTab] = useState<TabId>("all");

  /* 기본 줄 순서 — 손이 가야 하는 상태를 위로. 같은 상태끼리는 코드 오름차순으로 못
     박는다. 저장소 배열 순서 그대로 두면 문항을 하나 만들 때마다 표가 다르게 서서
     「아까 그 줄」로 못 돌아간다. DataTable에 기본 정렬 prop이 없으므로 여기서 세운다. */
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          stateRank(a.state) - stateRank(b.state) ||
          (a.code || a.id).localeCompare(b.code || b.id),
      ),
    [items],
  );

  /**
   * 탭 하나가 곧 하나의 목록이다.
   *
   * 상태 다섯을 STATE_ORDER 차례(검수 대기 → 반려됨 → 작성 중 → 승인됨 → 폐기) 그대로
   * 세운다. 이 차례가 곧 손이 가야 하는 정도라, 가나다순으로 흐트러뜨리지 않는다.
   *
   * 맨 끝의 「자가 검수」만 상태가 아니다. 자기가 낸 문항을 자기가 승인한 줄이라 이
   * 콘솔이 이해충돌로 보는 것이고(정의서 9장), 0이 아니면 그날 바로 봐야 하는 묶음이다.
   */
  const tabs = useMemo(
    () => [
      { id: "all" as TabId, label: "전체", rows: sorted, empty: "조건에 맞는 문항이 없습니다." },
      ...STATE_ORDER.map((s) => ({
        id: s as TabId,
        label: stateLabel[s],
        rows: sorted.filter((i) => i.state === s),
        empty: `${stateLabel[s]} 문항이 없습니다.`,
      })),
      {
        id: "conflict" as TabId,
        label: "자가 검수",
        rows: sorted.filter(selfReviewed),
        empty: "자기가 낸 문항을 자기가 승인한 줄이 없습니다.",
      },
    ],
    [sorted],
  );

  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = current.rows;

  return (
    <>
      <PageHead
        title="문항 은행"
        /* 단추를 세우지 않는다. 이 화면은 **쌓인 것을 보는 자리**이고, 문항을 쓰는 일은
           출제(EXP-02)에, 회차에 담는 일은 평가별 문항관리(ADM-04-3)에 제 화면이 있다.
           목록마다 다른 화면으로 가는 문을 세워 두면 기둥과 같은 일을 하는 단추가 화면마다
           늘어난다 — 갈 데는 기둥이 이미 답한다 */
        /* ① 어느 상태에 몰려 있나 — 누르면 그 상태만 남는다 */
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

      {/* ② 무엇부터 보나. 탭을 바꾸면 표를 새로 세운다 — 걸어 둔 검색어·거르개는
          그 목록에 맞춰 다시 고르는 것이 맞다 */}
      <DataTable
        key={tab}
        rows={rows}
        cols={COLS}
        getKey={(r) => r.id}
        filters={FILTERS}
        searchHint="문항 ID · 발문 · 단원 · 출제자"
        csv={ITEM_CSV}
        empty={current.empty}
        showCount={false}
      />
    </>
  );
}
