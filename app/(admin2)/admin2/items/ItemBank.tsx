"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEVELS, gradeBands, levelSpecs, type Level } from "@/lib/blueprint";
import { itemTone, n, pct } from "@/lib/admin2";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  addItem,
  stateLabel,
  typeLabel,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import { Kpi, PageHead, SeedNote, Status, Tag } from "@/components/admin2/ui";

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

/*
 * 칸 순서 — 무엇인가(코드) → 어디에 쓰이는가(과목·학년군·단계·유형) → 실제로 무슨
 * 문제인가(발문) → 지금 어디까지 왔나(상태) → 누가 붙어 있나(출제자) → 지난번에
 * 어땠나(정답률).
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
    // 과목·학년군·단계는 모두 거르개가 맡는다. 검색창의 「수학」이 과목 전체를 끌고
    // 오기 시작하면 발문 검색이 못 쓰게 되므로 value를 달지 않는다
    key: "subject",
    head: "과목",
    width: "4.25rem",
    nowrap: true,
    cell: (r) => <Tag>{r.subject}</Tag>,
  },
  {
    key: "band",
    head: "학년군",
    width: "4.5rem",
    nowrap: true,
    hide: "md",
    sort: (r) => r.band,
    cell: (r) => <span className="a2-mono a2-t-sm">{r.band}</span>,
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
    key: "type",
    head: "유형",
    width: "4.5rem",
    nowrap: true,
    hide: "lg",
    cell: (r) => <span className="a2-t-sm text-(--a2-ink-2)">{typeLabel(r.type)}</span>,
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
    key: "state",
    head: "상태",
    width: "6.5rem",
    nowrap: true,
    value: (r) => stateLabel[r.state],
    sort: (r) => stateRank(r.state),
    cell: (r) => <Status tone={itemTone[r.state]}>{stateLabel[r.state]}</Status>,
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

const FILTERS: Filter<ItemDraft>[] = [
  {
    id: "state",
    label: "상태",
    options: STATE_ORDER.map((s) => ({ value: s, label: stateLabel[s] })),
    match: (r, v) => r.state === v,
  },
  {
    id: "subject",
    label: "과목",
    options: ["국어", "수학", "과학"].map((v) => ({ value: v, label: v })),
    match: (r, v) => r.subject === v,
  },
  {
    id: "band",
    label: "학년군",
    options: gradeBands.map((g) => ({ value: g.id, label: g.label })),
    match: (r, v) => r.band === v,
  },
  {
    id: "level",
    label: "단계",
    options: LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` })),
    match: (r, v) => r.level === v,
  },
];

export default function ItemBank() {
  const items = useItems();
  const prefs = useAdminPrefs();
  const router = useRouter();

  const by = (s: ItemState) => items.filter((i) => i.state === s).length;
  const approved = items.filter((i) => i.state === "approved");
  const anchors = approved.filter((i) => i.anchor).length;
  const conflicts = items.filter(selfReviewed).length;

  /* 기본 줄 순서 — 손이 가야 하는 상태를 위로. 같은 상태끼리는 코드 오름차순으로 못
     박는다. 저장소 배열 순서 그대로 두면 문항을 하나 만들 때마다 표가 다르게 서서
     「아까 그 줄」로 못 돌아간다. DataTable에 기본 정렬 prop이 없으므로 여기서 세운다. */
  const rows = [...items].sort(
    (a, b) => stateRank(a.state) - stateRank(b.state) || (a.code || a.id).localeCompare(b.code || b.id),
  );

  return (
    <>
      <PageHead
        statCols={5}
        title="문항 은행"
        meta={
          <>
            <span>
              전체 <span className="a2-num text-(--a2-ink-2)">{n(items.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>승인 {n(approved.length)} · 앵커 {n(anchors)}</span>
            {conflicts > 0 && (
              <>
                <span aria-hidden>·</span>
                <span style={{ color: "var(--a2-danger)" }}>자가 검수 {n(conflicts)}건</span>
              </>
            )}
          </>
        }
        actions={
          <>
            <Link href="/admin2/rounds" className="a2-btn">
              회차 편성
            </Link>
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              onClick={() => {
                /* 빈 문항을 만들어 바로 상세로 보낸다. 목록에 빈 줄만 만들어 두면
                   「방금 만든 그것」을 다시 찾아야 한다. */
                const made = addItem(prefs.loginId || "super", prefs.staffName || "운영자");
                router.push(`/admin2/items/${made.id}`);
              }}
            >
              새 문항
            </button>
          </>
        }
        /* ① 어느 상태에 몰려 있나 */
        stats={
          <>
            <Kpi
              label="전체 문항"
              value={n(items.length)}
              unit="문항"
              sub={`지난 회차 출제 ${n(items.filter((i) => i.correctRate !== null).length)}건`}
            />
            <Kpi label={stateLabel.draft} value={n(by("draft"))} unit="문항" sub="아직 제출 전" />
            <Kpi
              label={stateLabel.submitted}
              value={n(by("submitted"))}
              unit="문항"
              sub={`${stateLabel.rejected} ${n(by("rejected"))}건`}
            />
            <Kpi
              label={stateLabel.approved}
              value={n(approved.length)}
              unit="문항"
              sub={`전체의 ${pct(approved.length, items.length)}% · 앵커 ${n(anchors)}`}
            />
            <Kpi
              label={stateLabel.retired}
              value={n(by("retired"))}
              unit="문항"
              sub="회차 편성에서 제외"
            />
          </>
        }
      />

      {/* ② 회차에 넣을 것이 단계마다 얼마나 있나. 지표 띠와 표 사이에 눕는 한 줄이라
          판을 따로 두르지 않고 가로선으로만 가른다 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-(--a2-line) px-3 py-2">
      <span className="a2-label">편성 가능(승인)</span>
      {LEVELS.map((l: Level) => {
        const c = approved.filter((i) => i.level === l).length;
        return (
          <span key={l} className="inline-flex items-baseline gap-1.5">
            <span className="a2-mono a2-t-sm font-semibold text-(--a2-ink-2)">{l}</span>
            <span className="a2-t-xs text-(--a2-ink-4)">{levelSpecs[l].name}</span>
            <span
              className="a2-num a2-t-sm"
              style={{ color: c === 0 ? "var(--a2-danger)" : "var(--a2-ink)" }}
            >
              {c}
            </span>
          </span>
        );
      })}
      <span className="a2-t-xs text-(--a2-ink-4)">
        {/* 0인 단계는 붉게 적는다. 그 층은 이번 회차에 아예 재지 못한다는 뜻이다 */}
        한 단계가 0이면 그 층은 이번 회차에 재지 못합니다.
      </span>
      </div>

      {/* ③ 무엇부터 보나 */}
      <DataTable
        rows={rows}
        cols={COLS}
        getKey={(r) => r.id}
        filters={FILTERS}
        searchHint="문항 ID · 발문 · 단원 · 출제자"
        empty="조건에 맞는 문항이 없습니다."
        toolbarExtra={<span className="a2-t-xs text-(--a2-ink-4)">기본 정렬 · 검수 대기 먼저</span>}
      />

      <SeedNote>
        이 화면의 문항은 화면 설계를 위한 예시이며 브라우저에만 저장됩니다(lib/itemStore.ts). 목록에는 보기와 정답을
        그리지 않습니다 — 문항 상세에서만 엽니다.
      </SeedNote>
    </>
  );
}
