"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LEVELS, levelSpecs } from "@/lib/blueprint";
import { formTone, n } from "@/lib/admin2";
import {
  checkForm,
  confirmForm,
  createForm,
  formPoints,
  levelCount,
  reopenForm,
  setFormItems,
  suggestItems,
} from "@/lib/formStore";
import { itemTypes, typeTextOf, type ItemDraft } from "@/lib/itemStore";
import type { PlanSlot } from "@/lib/roundPlanStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import TableBox from "@/components/admin2/TableBox";
import { LeaveDialog, PageSaveBar, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { FormRow, Panel, Status, Tag } from "@/components/admin2/ui";

/**
 * 검사지 한 벌 — 한 회차 · 한 과목 · 한 학년군.
 *
 * 「국어·수학·과학에 S1~S4 문항을 여러 개 골라 넣는다」가 여기서 일어나는 일이다.
 *
 * ── 왜 components에 있나 ──
 * 회차 편성 화면(ADM-05-4)의 칸 하나로 시작한 조각이라 그 폴더 안에 있었다. 지금은 평가별
 * 문항관리 상세(ADM-04-3)의 과목 탭도 이것을 그린다 — **담는 자리는 하나여야 한다.** 두
 * 화면이 각자 제 편집기를 들면 같은 검사지를 서로 다르게 그리는 날이 오고, 조합 제안이
 * 한쪽에만 붙는 식으로 갈린다.
 *
 * ── 왼쪽에 담은 것, 오른쪽에 은행 ──
 * 담은 표 아래에 은행 표를 세로로 세워 두었었다. 담을 문항을 은행에서 찾으려면 화면을
 * 내려야 하고, 담고 나서 「지금 몇 개인가」를 보려면 도로 올려야 했다 — 한 번 담을 때마다
 * 화면이 위아래로 한 번씩 굴렀다. 옮기는 일은 **두 목록 사이의 일**이므로 둘을 나란히
 * 세운다. 좁은 화면(1280px 아래)에서는 두 칸이 설 자리가 없어 위아래로 되돌아간다.
 *
 * ── 담기는 초안에만, 저장은 누를 때만 ──
 * 체크해서 담는 순간 저장소에 바로 썼었다. 잘못 담은 것을 되돌리려면 무엇을 담았는지
 * 기억해 내서 하나씩 빼야 했고, 차례를 두어 번 옮기고 나면 원래 차례가 어디에도 남지
 * 않았다. 지금은 담고 · 빼고 · 옮기는 것이 전부 **이 화면의 초안**이고, 저장을 눌러야
 * 검사지가 된다(문항 상세·기관 상세와 같은 약속 — components/admin2/EditGuard.tsx).
 * 손댄 채로 나가려 하면 붙잡고 물어본다.
 *
 * ⚠ 이 조각은 판 하나가 아니라 판 묶음을 내놓는다. 세우는 쪽에서 또 감싸지 말 것.
 *
 * ── 「검사지 짜기」 관문을 걷어 냈다 ──
 * 빈 칸에는 단추 하나짜리 판을 내놓고, 그것을 눌러야 문항 은행이 열렸다. 그 단추가 하는
 * 일은 빈 검사지 한 벌을 만드는 것뿐인데 그다음에 할 일은 언제나 문항을 담는 것이었다 —
 * 아무도 빈 검사지를 만들어 두러 이 화면에 오지 않는다. 지금은 빈 칸도 담긴 칸과 같은 판을
 * 내놓고(전부 0일 뿐이다), 문항 은행 표가 처음부터 열려 있다. 검사지는 **처음 저장할 때**
 * 만들어진다(save).
 *
 * ── 정한 것 ──
 *  · **승인된 문항만** 후보에 오른다. 검수를 안 지난 문항이 회차에 나가면 그 회차의
 *    점수는 무엇으로도 설명되지 않는다.
 *  · 문항 수를 기계가 정하지 않는다. 조합 제안이 몇 개를 집어 올지의 밑그림은
 *    lib/formStore.ts의 SUGGEST_MIX에 있고, 확정을 막지 않는다 — 회차마다 보는 것이
 *    다르고, 은행이 얇을 때는 여덟 문항으로라도 열어야 한다.
 *  · 확정하면 잠근다. 응시가 시작된 뒤에 문항이 갈리면 같은 회차 안에서 서로 다른
 *    검사지를 푼 아이가 생긴다. 풀 수는 있되 왜 풀었는지가 기록에 남는다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/*
 * 고르는 표의 칸 — 반 폭에 서는 표라 넉 칸만 세운다.
 *
 * 은행 목록(ADM-04)에는 구성·유형·단원·배점·정답률까지 있지만, 여기서 묻는 것은 「이
 * 문항이 무엇을 묻는 문항인가」 하나다. 나머지로 좁히는 일은 위 거르개(단계·유형·앵커)와
 * 검색이 맡고, 더 봐야 하면 문항 ID를 눌러 상세로 간다. 반 폭에 아홉 칸을 밀어 넣으면
 * 정작 발문이 두 낱말만 남는다.
 *
 * 컴포넌트 밖에 둔다. 매 렌더마다 새 배열을 넘기면 표 안의 useMemo가 늘 다시 돈다.
 */
const PICK_COLS: Col<ItemDraft>[] = [
  {
    key: "code",
    head: "문항 ID",
    width: "8.5rem",
    nowrap: true,
    value: (r) => r.code || r.id,
    cell: (r) => (
      <Link
        href={`/admin2/items/${r.id}`}
        className="a2-mono font-semibold text-(--a2-ink) hover:text-(--a2-accent) hover:underline"
      >
        {r.code || <span className="text-(--a2-ink-4)">ID 미정</span>}
      </Link>
    ),
  },
  {
    key: "level",
    head: "단계",
    width: "3.25rem",
    nowrap: true,
    sort: (r) => r.level,
    cell: (r) => (
      <span className="a2-mono font-semibold text-(--a2-ink-2)" title={levelSpecs[r.level].name}>
        {r.level}
      </span>
    ),
  },
  {
    key: "stem",
    head: "발문",
    width: "100%",
    clip: true,
    /* 단원도 검색에 걸리게 둔다 — 칸으로는 안 세우지만 「낱말의 의미 관계」로 찾는 일이 잦다 */
    value: (r) => `${r.stem} ${r.unit}`,
    cell: (r) =>
      r.stem ? <span title={r.stem}>{r.stem}</span> : <span className="text-(--a2-ink-4)">발문 없음</span>,
  },
  {
    /* 앵커는 회차가 달라도 같은 잣대로 재려고 두는 문항이라 편성에서 먼저 찾는 값이다 */
    key: "anchor",
    head: "앵커",
    width: "3.5rem",
    nowrap: true,
    value: (r) => (r.anchor ? "앵커" : ""),
    cell: (r) => (r.anchor ? <Tag accent>앵커</Tag> : dash),
  },
  {
    key: "points",
    head: "배점",
    width: "3.5rem",
    num: true,
    value: (r) => r.points,
    cell: (r) => r.points,
  },
];

const PICK_FILTERS: Filter<ItemDraft>[] = [
  {
    id: "level",
    label: "단계",
    options: LEVELS.map((l) => ({ value: l, label: `${l} ${levelSpecs[l].name}` })),
    match: (r, v) => r.level === v,
  },
  {
    id: "type",
    label: "유형",
    options: itemTypes.map((t) => ({ value: t.id, label: t.label })),
    match: (r, v) => r.type === v,
  },
  {
    id: "anchor",
    label: "앵커",
    options: [
      { value: "y", label: "앵커만" },
      { value: "n", label: "앵커 아님" },
    ],
    match: (r, v) => (v === "y" ? r.anchor : !r.anchor),
  },
];

export default function FormSlot({
  roundId,
  slot,
  items,
  by,
  onClose,
  onGuard,
  onDraft,
}: {
  roundId: string;
  slot: PlanSlot;
  items: ItemDraft[];
  by: string;
  /** 닫을 수 있는 자리에서만 넘긴다 — 탭으로 세운 화면에는 닫을 것이 없다 */
  onClose?: () => void;
  /**
   * 이 판을 갈아 끼우려는 쪽에 「먼저 물어봐 달라」를 건넨다.
   *
   * 과목 탭과 편성판의 열기 단추는 주소를 바꾸지 않으므로 나가기 감시에 안 걸린다. 그
   * 단추를 쥔 쪽이 이 함수로 이동을 감싸면, 손댄 것이 있을 때 같은 물음이 뜬다.
   */
  onGuard?: (ask: (run: () => void) => void) => void;
  /**
   * 저장을 바깥이 맡는다 — 회차 편성 화면처럼 기간·편성·공지와 **한 줄로 저장**하는 자리.
   *
   * 넘기면 이 조각은 제 저장 줄도, 제 나가기 감시도 세우지 않는다. 한 화면에 저장 줄이
   * 둘이면 어느 것이 무엇을 저장하는지 매번 읽어야 하고, 나가기 물음도 두 번 뜬다.
   * 넘기지 않으면(평가별 문항관리) 지금까지처럼 제 것을 들고 선다.
   */
  onDraft?: (draft: { dirty: boolean; save: () => void; discard: () => void } | null) => void;
}) {
  const form = slot.form;
  const locked = form?.state === "confirmed";
  const savedIds = form?.itemIds ?? [];

  /* 담은 목록의 초안 — 담기·빼기·차례가 전부 여기서만 일어난다.
     칸이 갈리면(과목 탭) 이 조각은 key로 새로 서므로 초안도 함께 새로 뜬다 */
  const [draftIds, setDraftIds] = useState<string[]>(savedIds);
  const [chosen, setChosen] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const dirty =
    draftIds.length !== savedIds.length || draftIds.some((id, k) => id !== savedIds[k]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const picked = draftIds.map((id) => byId.get(id)).filter((i): i is ItemDraft => !!i);

  const byLevel = levelCount(picked);
  const points = formPoints(picked);
  const anchors = picked.filter((i) => i.anchor).length;
  /* 확정을 막는 것 — 목록으로 펴 두었다가 걷었다. 대신 **막힌 단추가 제 까닭을 들고
     있게** 한다(여는 관문과 같은 꼴). 눌리지 않는 단추만 남고 왜인지가 어디에도 없으면
     고장으로 읽힌다.

     검사지가 없을 때는 대조하지 않는다 — 「문항이 하나도 담기지 않았습니다」가 담을 표를
     아직 보지도 않은 사람 앞에 먼저 설 이유가 없다. */
  const blocks = (form ? checkForm(form, picked) : []).filter((f) => f.tone === "block");

  /* 담을 수 있는 것 — 승인된, 같은 과목·학년군의, 아직 안 담긴 문항.
     **초안 기준**이다. 저장한 것만 빼면 방금 담은 문항이 오른쪽에 그대로 남아 두 번 담긴다 */
  const pool = items.filter(
    (i) =>
      i.state === "approved" &&
      i.subject === slot.subject &&
      i.band === slot.band &&
      !draftIds.includes(i.id),
  );

  /**
   * 저장 — 검사지가 없으면 이때 만든다.
   *
   * 「검사지 짜기」를 한 번 누르고 나서야 문항 은행이 열리게 두었었다. 그 단추가 하는 일은
   * 빈 검사지 한 벌을 만드는 것뿐인데, 그다음에 할 일은 언제나 문항을 담는 것이었다.
   * 화면을 열기만 해도 빈 검사지가 생기면 편성판의 「검사지 3벌」이 들여다본 칸 수만큼
   * 늘어나므로, 저장을 누르기 전까지는 저장소에 아무것도 쓰지 않는다.
   */
  const save = () => {
    if (!dirty || locked) return;
    const target = form ?? createForm(roundId, slot.subject, slot.band, by);
    const added = draftIds.filter((id) => !savedIds.includes(id)).length;
    const dropped = savedIds.filter((id) => !draftIds.includes(id)).length;
    const what = [added && `${added}문항 담음`, dropped && `${dropped}문항 뺌`].filter(Boolean);
    setFormItems(
      target.id,
      draftIds,
      by,
      /* 담지도 빼지도 않았으면 차례만 옮긴 것이다 — 그 사실이 기록에 남아야
         「문항은 그대로인데 왜 다시 저장했나」에 답이 된다 */
      what.length > 0 ? `${what.join(" · ")} — ${draftIds.length}문항` : "문항 차례를 바꿨습니다",
      "edit",
    );
  };

  const discard = () => setDraftIds(savedIds);

  /* 바깥이 저장을 맡으면 이 조각의 감시는 잠재운다 — 물음도 저장도 한 곳에서만 나야 한다 */
  const managed = !!onDraft;
  const guard = useUnsavedGuard(managed ? false : dirty, save, discard);

  /* 판을 갈아 끼우는 단추는 바깥에 있다(과목 탭 · 편성판 열기). 그쪽에 물음을 건넨다 */
  useEffect(() => {
    onGuard?.(guard.ask);
    onDraft?.({ dirty, save, discard });
  });

  const move = (k: number, dir: -1 | 1) =>
    setDraftIds((prev) => {
      const next = [...prev];
      [next[k + dir], next[k]] = [next[k], next[k + dir]];
      return next;
    });

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleMany = (ids: string[], on: boolean) =>
    setChosen((prev) => (on ? [...new Set([...prev, ...ids])] : prev.filter((x) => !ids.includes(x))));

  const closeBtn = onClose && (
    <button type="button" className="a2-btn a2-btn-sm" onClick={() => guard.ask(onClose)}>
      닫기
    </button>
  );

  return (
    <div className="grid gap-3">
      {/* ① 이 검사지가 어떤 꼴인가 — 읽기만 하는 줄이지만 고치는 줄과 같은 꼴로 편다.
          숫자는 **초안 기준**이다. 담자마자 배점과 단계 배분이 움직여야, 저장하기 전에
          「이대로 괜찮은가」를 여기서 볼 수 있다 */}
      <Panel
        title={slot.label}
        meta={form?.id}
        actions={
          <>
            {form && <Status tone={formTone[form.state]}>{locked ? "확정" : "초안"}</Status>}
            {closeBtn}
          </>
        }
        flush
        lead
      >
        <div className="a2-form a2-form-lg">
          <FormRow label="담은 문항">
            <span className="a2-num a2-t-md font-bold text-(--a2-ink)">{picked.length}</span>
            <span className="a2-t-sm text-(--a2-ink-3)">문항</span>
          </FormRow>

          <FormRow label="배점">
            <span className="a2-num a2-t-md font-bold text-(--a2-ink)">{points}</span>
            <span className="a2-t-sm text-(--a2-ink-3)">점</span>
          </FormRow>

          <FormRow label="앵커">
            <span className="a2-num a2-t-md font-bold text-(--a2-ink)">{anchors}</span>
            <span className="a2-t-sm text-(--a2-ink-3)">
              문항
              {picked.length > 0 && ` · ${Math.round((anchors / picked.length) * 100)}%`}
            </span>
          </FormRow>

          {/* 0인 단계는 빨강으로 적는다 — 그 층을 이 검사지로는 재지 못한다는 뜻이다 */}
          <FormRow label="단계 배분">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {LEVELS.map((l) => (
                <span key={l} className="a2-t-sm" title={levelSpecs[l].name}>
                  <span className="a2-mono text-(--a2-ink-3)">{l}</span>{" "}
                  <span
                    className="a2-num font-bold"
                    style={{ color: byLevel[l] === 0 ? "var(--a2-danger)" : "var(--a2-ink)" }}
                  >
                    {byLevel[l]}
                  </span>
                </span>
              ))}
            </span>
          </FormRow>
        </div>
      </Panel>

      {/* ② 옮기는 자리 — 왼쪽이 담은 것, 오른쪽이 은행 */}
      <div className="grid gap-3 xl:grid-cols-2">
        {/* 왼쪽 — 담은 문항. 차례가 곧 출제 순서다 */}
        <Panel
          title="담은 문항"
          meta={`${picked.length}문항`}
          actions={
            !locked && (
              <>
                {picked.length > 0 && (
                  <button type="button" className="a2-btn a2-btn-sm" onClick={() => setDraftIds([])}>
                    모두 빼기
                  </button>
                )}
                {/* 제안은 초안을 갈아 끼울 뿐이다 — 잘못 눌러도 취소로 돌아온다.
                    뽑는 규칙은 발주서에 적힌 것뿐이고 「이 문항이 이 학년에 맞는가」는
                    여기서 알 수 없다 */}
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={pool.length === 0 && picked.length === 0}
                  title={picked.length > 0 ? "지금 담은 것을 제안으로 갈아 끼웁니다" : undefined}
                  onClick={() => setDraftIds(suggestItems(slot, items).itemIds)}
                >
                  조합 제안
                </button>
              </>
            )
          }
          flush
        >
          <TableBox>
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col" className="a2-th-num" style={{ width: "2.25rem" }}>
                    #
                  </th>
                  <th scope="col" style={{ width: "8.5rem" }}>
                    문항 ID
                  </th>
                  <th scope="col" style={{ width: "3.25rem" }}>
                    단계
                  </th>
                  <th scope="col" style={{ width: "3.5rem" }}>
                    앵커
                  </th>
                  <th scope="col">발문</th>
                  <th scope="col" style={{ width: "7.5rem" }}>
                    <span className="sr-only">차례 · 빼기</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {picked.map((i, k) => (
                  <tr key={i.id}>
                    <td className="a2-td-num">{k + 1}</td>
                    <td className="a2-td-key a2-nowrap">
                      <Link href={`/admin2/items/${i.id}`} className="a2-mono hover:text-(--a2-accent) hover:underline">
                        {i.code || i.id}
                      </Link>
                    </td>
                    <td className="a2-mono a2-nowrap" title={typeTextOf(i)}>
                      {i.level}
                    </td>
                    <td className="a2-nowrap">{i.anchor ? <Tag accent>앵커</Tag> : dash}</td>
                    <td className="a2-clip a2-t-sm" style={{ width: "100%" }} title={i.stem}>
                      {i.stem}
                    </td>
                    <td className="a2-nowrap">
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="a2-btn a2-btn-sm"
                          disabled={locked || k === 0}
                          aria-label={`${i.code || i.id} 위로`}
                          onClick={() => move(k, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="a2-btn a2-btn-sm"
                          disabled={locked || k === picked.length - 1}
                          aria-label={`${i.code || i.id} 아래로`}
                          onClick={() => move(k, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="a2-btn a2-btn-sm a2-btn-danger"
                          disabled={locked}
                          aria-label={`${i.code || i.id} 빼기`}
                          onClick={() => setDraftIds((prev) => prev.filter((x) => x !== i.id))}
                        >
                          빼기
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {picked.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-(--a2-ink-4)">
                      <span className="block py-5">
                        {locked ? "담은 문항이 없습니다." : "오른쪽 은행에서 체크해 담습니다."}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableBox>
        </Panel>

        {/* 오른쪽 — 문항 은행. 승인된 것만.
            확정한 검사지에는 그리지 않는다. 담을 수 없는 표를 세워 두면 「왜 체크가 안 되지」를
            한 번 겪고 나서야 잠긴 줄 안다 */}
        {locked ? (
          <Panel title="문항 은행" flush>
            <p className="p-4 a2-t-sm text-(--a2-ink-4)">
              확정한 검사지입니다. 문항을 바꾸려면 아래에서 잠금을 푸세요.
            </p>
          </Panel>
        ) : (
          <Panel title="문항 은행" meta={`${n(pool.length)}건`} flush>
            <DataTable
              rows={pool}
              cols={PICK_COLS}
              filters={PICK_FILTERS}
              getKey={(r) => r.id}
              pageSize={25}
              searchHint="문항 ID · 발문 · 단원"
              empty="담을 수 있는 승인 문항이 없습니다. 문항 은행에서 만들어 검수를 거쳐야 여기에 뜹니다."
              selection={{
                chosen,
                onToggle: toggle,
                onToggleMany: toggleMany,
                labelOf: (r) => r.code || r.id,
              }}
              toolbarExtra={
                <>
                  <span className="a2-t-xs text-(--a2-ink-4)">
                    고른 것 <span className="a2-num text-(--a2-ink-2)">{chosen.length}</span>
                  </span>
                  {chosen.length > 0 && (
                    <button type="button" className="a2-btn a2-btn-sm" onClick={() => setChosen([])}>
                      고르기 지우기
                    </button>
                  )}
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm a2-btn-primary"
                    disabled={chosen.length === 0}
                    onClick={() => {
                      /* 담는 차례는 **체크한 차례가 아니라 표에 선 차례**로 맞춘다.
                         체크를 위아래로 오가며 하면 담긴 순서가 눈에 보인 순서와 달라진다 */
                      const add = pool.filter((i) => chosen.includes(i.id)).map((i) => i.id);
                      setDraftIds((prev) => [...prev, ...add]);
                      setChosen([]);
                    }}
                  >
                    ← 고른 것 담기
                  </button>
                </>
              }
            />
          </Panel>
        )}
      </div>

      {/* ③ 확정 · 잠금 해제 — 검사지가 생긴 뒤에 선다.
          빈 칸에 확정 소견 칸부터 세우면, 담기도 전에 「무엇을 보고 확정하는지」를 묻는 셈이다 */}
      {form && (
        <Panel title={locked ? "확정 · 잠금" : "확정"} flush>
          <div className="a2-form a2-form-lg">
            {locked ? (
              <>
                <FormRow label="확정" hint="회차를 열면 이대로 나갑니다.">
                  <span className="a2-mono a2-t-sm text-(--a2-ink-2)">{form.confirmedAt}</span>
                  <span className="a2-t-sm text-(--a2-ink-2)">{form.confirmedBy}</span>
                </FormRow>

                <FormRow label="잠금을 푸는 까닭" req>
                  <textarea
                    className="a2-textarea a2-textarea-lg"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="예: 3번 문항 보기에 오타가 있어 빼고 다시 담습니다"
                  />
                  <span className="flex w-full">
                    <button
                      type="button"
                      className="a2-btn a2-btn-danger"
                      disabled={note.trim().length < 10}
                      onClick={() => {
                        reopenForm(form.id, by, note.trim());
                        setNote("");
                      }}
                    >
                      잠금 해제
                    </button>
                  </span>
                </FormRow>
              </>
            ) : (
              <FormRow label="확정 소견" req>
                <textarea
                  className="a2-textarea a2-textarea-lg"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="예: 단계 배분과 앵커 비율을 확인했습니다. 한 단원 쏠림은 이번 회차 범위가 그 단원이라 그대로 갑니다."
                />
                <span className="flex w-full">
                  <button
                    type="button"
                    className="a2-btn a2-btn-primary"
                    /* 저장하지 않은 담기를 확정할 수는 없다 — 확정은 저장된 목록을 잠근다 */
                    disabled={dirty || blocks.length > 0 || note.trim().length < 10}
                    title={
                      dirty
                        ? "먼저 저장해 주세요 — 확정은 저장된 목록을 잠급니다"
                        : blocks.length > 0
                          ? blocks.map((f) => f.text).join(" · ")
                          : note.trim().length < 10
                            ? "확정 소견을 열 자 이상 적어 주세요"
                            : undefined
                    }
                    onClick={() => {
                      confirmForm(form.id, by, note.trim());
                      setNote("");
                    }}
                  >
                    검사지 확정
                  </button>
                </span>
              </FormRow>
            )}
          </div>
        </Panel>
      )}

      {/* 저장은 화면 오른쪽 아래에 붙여 둔다 — 문항 상세·기관 상세와 같은 자리다.
          바깥이 저장을 맡는 자리에서는 세우지 않는다 */}
      {!locked && !managed && (
        <PageSaveBar
          dirty={dirty}
          onSave={save}
          onCancel={discard}
          note={
            dirty
              ? `저장하지 않은 담기가 있습니다 — ${picked.length}문항`
              : form
                ? undefined
                : "저장을 누르면 이 과목의 검사지가 만들어집니다."
          }
        />
      )}

      <LeaveDialog guard={guard} />
    </div>
  );
}
