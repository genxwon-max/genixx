"use client";

import Link from "next/link";
import { useState } from "react";
import { LEVELS, levelSpecs } from "@/lib/blueprint";
import { formTone, n } from "@/lib/admin2";
import {
  SUGGEST_MIX,
  addFormItems,
  checkForm,
  confirmForm,
  createForm,
  formPoints,
  levelCount,
  moveFormItem,
  removeFormItem,
  reopenForm,
  setFormItems,
  suggestItems,
} from "@/lib/formStore";
import { formTextOf, itemTypes, typeTextOf, type ItemDraft } from "@/lib/itemStore";
import type { PlanSlot } from "@/lib/roundPlanStore";
import DataTable, { type Col, type Filter } from "@/components/admin2/DataTable";
import TableBox from "@/components/admin2/TableBox";
import { Panel, Status, Tag } from "@/components/admin2/ui";

/**
 * 검사지 한 벌 — 한 회차 · 한 과목 · 한 학년군.
 *
 * 「국어·수학·과학에 S1~S4 문항을 여러 개 골라 넣는다」가 여기서 일어나는 일이다. 위 표가
 * 담긴 문항(출제 순서대로), 아래가 문항 은행에서 고르는 표다.
 *
 * ── 왜 components에 있나 ──
 * 회차 편성 화면(ADM-05-4)의 칸 하나로 시작한 조각이라 그 폴더 안에 있었다. 지금은 평가별
 * 문항관리 상세(ADM-04-3)의 과목 탭도 이것을 그린다 — **담는 자리는 하나여야 한다.** 두
 * 화면이 각자 제 편집기를 들면 같은 검사지를 서로 다르게 그리는 날이 오고, 조합 제안이
 * 한쪽에만 붙는 식으로 갈린다.
 *
 * ── 고르는 표를 공용 표(DataTable)로 바꾼 까닭 ──
 * 손으로 짠 표에 단계 거르개 단추만 얹어 두었었다. 승인 문항이 스무 건일 때는 됐지만, 은행이
 * 백 건을 넘으면 「4K02로 시작하는 그 문항」을 눈으로 찾아야 한다. 공용 표를 쓰면 검색 ·
 * 거르개(단계 · 유형 · 앵커) · 정렬 · 쪽 넘김이 문항 은행 화면과 같은 손놀림으로 붙는다.
 * 고른 것은 이 조각이 들고 있고 표는 되비추기만 한다 — 담고 나서 체크를 비우는 일이
 * 표 밖에서 되어야 한다.
 *
 * ── 정한 것 ──
 *  · **승인된 문항만** 후보에 오른다. 검수를 안 지난 문항이 회차에 나가면 그 회차의
 *    점수는 무엇으로도 설명되지 않는다.
 *  · 문항 수를 기계가 정하지 않는다. SUGGEST_MIX(3·3·2·2)는 조합 제안이 몇 개를 집어
 *    올지에만 쓰는 밑그림이고 확정을 막지 않는다 — 회차마다 보는 것이 다르고, 은행이
 *    얇을 때는 여덟 문항으로라도 열어야 한다.
 *  · 확정하면 잠근다. 응시가 시작된 뒤에 문항이 갈리면 같은 회차 안에서 서로 다른
 *    검사지를 푼 아이가 생긴다. 풀 수는 있되 왜 풀었는지가 기록에 남는다.
 */

const dash = <span className="text-(--a2-ink-4)">—</span>;

/*
 * 고르는 표의 칸 — 문항 은행 목록(ADM-04)과 같은 차례로 세운다. 두 화면에서 같은 문항을
 * 다른 순서로 읽게 하면, 은행에서 골라 둔 것을 여기서 다시 찾는 일이 매번 새로 시작된다.
 * 과목·학년군 칸은 두지 않는다 — 이 표에 서는 것은 이미 이 칸의 과목·학년군뿐이다.
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
    width: "3.75rem",
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
      r.form === "set" ? <Tag accent>{formTextOf(r)}</Tag> : <span className="a2-t-sm text-(--a2-ink-3)">단일</span>,
  },
  {
    key: "type",
    head: "유형",
    width: "6rem",
    nowrap: true,
    hide: "lg",
    cell: (r) => (
      <span title={typeTextOf(r)} className="a2-clip a2-t-sm text-(--a2-ink-2)">
        {typeTextOf(r)}
      </span>
    ),
  },
  {
    key: "unit",
    head: "단원",
    width: "8rem",
    nowrap: true,
    clip: true,
    hide: "md",
    value: (r) => r.unit,
    cell: (r) => (r.unit ? <span title={r.unit}>{r.unit}</span> : dash),
  },
  {
    key: "stem",
    head: "발문",
    width: "100%",
    clip: true,
    value: (r) => r.stem,
    cell: (r) =>
      r.stem ? <span title={r.stem}>{r.stem}</span> : <span className="text-(--a2-ink-4)">발문 없음</span>,
  },
  {
    /* 앵커는 회차가 달라도 같은 잣대로 재려고 두는 문항이라 편성에서 먼저 찾는 값이다 */
    key: "anchor",
    head: "앵커",
    width: "4rem",
    nowrap: true,
    value: (r) => (r.anchor ? "앵커" : ""),
    cell: (r) => (r.anchor ? <Tag accent>앵커</Tag> : dash),
  },
  {
    key: "points",
    head: "배점",
    width: "4rem",
    num: true,
    hide: "lg",
    value: (r) => r.points,
    cell: (r) => r.points,
  },
  {
    /* 미출제(null)를 −1로 떨어뜨려 한쪽 끝에 뭉치게 한다. 0으로 두면 「아무도 못 맞힌
       문항」과 「아직 안 낸 문항」이 같은 자리에 선다 */
    key: "correctRate",
    head: "정답률",
    width: "5rem",
    num: true,
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
}: {
  roundId: string;
  slot: PlanSlot;
  items: ItemDraft[];
  by: string;
  /** 닫을 수 있는 자리에서만 넘긴다 — 탭으로 세운 화면에는 닫을 것이 없다 */
  onClose?: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const form = slot.form;
  const locked = form?.state === "confirmed";

  if (!form) {
    return (
      <Panel
        title={slot.label}
        meta="검사지 없음"
        actions={
          onClose && (
            <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
              닫기
            </button>
          )
        }
      >
        {/* 학년군은 사람이 읽는 이름으로 적는다 — 저장하는 값(3-4)을 그대로 흘리면
            「3-4 학년군」이라는, 화면 어디에도 없는 말이 문장 한가운데 선다 */}
        <p className="a2-t-sm text-(--a2-ink-2)">
          이 칸에는 아직 검사지가 없습니다. 비워 두면 이번 회차에 「{slot.label}」은 응시하지 않습니다.
        </p>
        <p className="a2-hint">담을 수 있는 승인 문항 {n(slot.pool)}건</p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            onClick={() => createForm(roundId, slot.subject, slot.band, by)}
          >
            검사지 짜기
          </button>
          {slot.pool === 0 && (
            <Link href="/admin2/items" className="a2-btn">
              문항 은행에서 만들기
            </Link>
          )}
        </div>
      </Panel>
    );
  }

  const picked = slot.picked;
  const byLevel = levelCount(picked);
  const points = formPoints(picked);
  const anchors = picked.filter((i) => i.anchor).length;
  const findings = checkForm(form, picked);
  const blocks = findings.filter((f) => f.tone === "block");

  /* 담을 수 있는 것 — 승인된, 같은 과목·학년군의, 아직 안 담긴 문항.
     거르개·검색·정렬·쪽 넘김은 표가 맡는다(DataTable). */
  const pool = items.filter(
    (i) =>
      i.state === "approved" &&
      i.subject === slot.subject &&
      i.band === slot.band &&
      !form.itemIds.includes(i.id),
  );

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleMany = (ids: string[], on: boolean) =>
    setChosen((prev) => (on ? [...new Set([...prev, ...ids])] : prev.filter((x) => !ids.includes(x))));

  return (
    <Panel
      title={slot.label}
      meta={form.id}
      actions={
        <>
          <Status tone={formTone[form.state]}>{locked ? "확정" : "초안"}</Status>
          {onClose && (
            <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
              닫기
            </button>
          )}
        </>
      }
      flush
    >
      {/* 요약 한 줄 — 몇 문항 · 몇 점 · 단계마다 몇 개 · 앵커 몇 % */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-(--a2-line) bg-(--a2-raised) px-2.5 py-2">
        <span className="a2-t-sm">
          <span className="a2-label">문항</span> <span className="a2-num text-(--a2-ink)">{picked.length}</span>
        </span>
        <span className="a2-t-sm">
          <span className="a2-label">배점</span> <span className="a2-num text-(--a2-ink)">{points}</span>점
        </span>
        <span className="a2-t-sm">
          <span className="a2-label">앵커</span>{" "}
          <span className="a2-num text-(--a2-ink)">
            {anchors}
            {picked.length > 0 && ` (${Math.round((anchors / picked.length) * 100)}%)`}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="a2-label">단계</span>
          {LEVELS.map((l) => (
            <span key={l} className="a2-t-sm" title={`${levelSpecs[l].name} · 제안 밑그림 ${SUGGEST_MIX[l]}개`}>
              <span className="a2-mono text-(--a2-ink-3)">{l}</span>{" "}
              <span
                className="a2-num"
                style={{ color: byLevel[l] === 0 ? "var(--a2-danger)" : "var(--a2-ink)" }}
              >
                {byLevel[l]}
              </span>
            </span>
          ))}
        </span>
      </div>

      {/* 대조 결과 — 막는 것과 봐 두는 것 */}
      {findings.length > 0 && (
        <ul className="grid gap-1 border-b border-(--a2-line) p-2.5">
          {findings.map((f) => (
            <li
              key={f.text}
              className="a2-note"
              style={{ borderLeftColor: f.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)" }}
            >
              <span className="a2-t-xs font-bold" style={{ color: f.tone === "block" ? "var(--a2-danger)" : "var(--a2-warn)" }}>
                {f.tone === "block" ? "막음" : "확인"}
              </span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 담긴 문항 — 순서가 곧 출제 순서다.
          22rem 상자에 가둬 두었던 것을 풀었다. 검사지 한 벌이 서른 문항 남짓인데 그 안에서
          또 굴려야 했고, 「몇 문항 담겼나」를 세려면 상자를 끝까지 내려 봐야 했다.
          길어진 만큼은 화면이 굴러가고, 머리 행은 상단 바 아래에 붙는다 */}
      <TableBox>
        <table className="a2-table">
          <thead>
            <tr>
              <th scope="col" className="a2-th-num" style={{ width: "2.5rem" }}>
                #
              </th>
              <th scope="col" style={{ width: "8.5rem" }}>
                문항 ID
              </th>
              <th scope="col" style={{ width: "3.5rem" }}>
                단계
              </th>
              <th scope="col" style={{ width: "4.5rem" }}>
                유형
              </th>
              <th scope="col" className="a2-th-num" style={{ width: "3.5rem" }}>
                배점
              </th>
              <th scope="col" style={{ width: "3.5rem" }}>
                앵커
              </th>
              <th scope="col">발문</th>
              <th scope="col" style={{ width: "7.5rem" }}>
                순서
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
                <td className="a2-mono a2-nowrap">{i.level}</td>
                <td className="a2-nowrap a2-t-sm">{typeTextOf(i)}</td>
                <td className="a2-td-num">{i.points}</td>
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
                      onClick={() => moveFormItem(form.id, i.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm"
                      disabled={locked || k === picked.length - 1}
                      aria-label={`${i.code || i.id} 아래로`}
                      onClick={() => moveFormItem(form.id, i.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm a2-btn-danger"
                      disabled={locked}
                      onClick={() => removeFormItem(form.id, i.id, by, i.code || i.id)}
                    >
                      빼기
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {picked.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-(--a2-ink-4)">
                  <span className="block py-5">아직 담긴 문항이 없습니다. 아래 문항 은행에서 골라 담습니다.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableBox>

      {/* 확정 · 잠금 해제 */}
      <div className="border-t border-(--a2-line) p-2.5">
        {locked ? (
          <div className="grid gap-1.5">
            <p className="a2-t-sm text-(--a2-ink-2)">
              {form.confirmedAt} · {form.confirmedBy} 확정. 회차를 열면 이대로 나갑니다.
            </p>
            <label className="a2-field">
              <span className="a2-label">잠금을 푸는 까닭</span>
              <textarea
                className="a2-textarea"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 3번 문항 보기에 오타가 있어 빼고 다시 담습니다"
              />
            </label>
            <div>
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
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <label className="a2-field">
              <span className="a2-label">확정 소견 — 무엇을 보고 확정하는지</span>
              <textarea
                className="a2-textarea"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 단계 배분과 앵커 비율을 확인했습니다. 한 단원 쏠림은 이번 회차 범위가 그 단원이라 그대로 갑니다."
              />
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="a2-btn a2-btn-primary"
                disabled={blocks.length > 0 || note.trim().length < 10}
                title={blocks.length > 0 ? "막는 것이 남아 있습니다" : undefined}
                onClick={() => {
                  confirmForm(form.id, by, note.trim());
                  setNote("");
                }}
              >
                검사지 확정
              </button>
              <button
                type="button"
                className="a2-btn"
                onClick={() => {
                  /* 제안은 초안에만 넣는다. 뽑는 규칙은 발주서에 적힌 것뿐이고
                     「이 문항이 이 학년에 맞는가」는 여기서 알 수 없다 */
                  const s = suggestItems(form, items);
                  setFormItems(
                    form.id,
                    s.itemIds,
                    by,
                    s.short.length > 0
                      ? `조합 제안 ${s.itemIds.length}문항 — 모자란 단계 ${s.short.join(" · ")}`
                      : `조합 제안 ${s.itemIds.length}문항`,
                  );
                }}
              >
                {picked.length > 0 ? "조합 제안으로 다시 채우기" : "조합 제안으로 채우기"}
              </button>
              <span className="a2-t-xs text-(--a2-ink-4)">
                {picked.length > 0 && (
                  <span style={{ color: "var(--a2-warn)" }}>
                    지금 담긴 {picked.length}문항을 제안으로 바꿉니다 ·{" "}
                  </span>
                )}
                제안 밑그림 S1 {SUGGEST_MIX.S1} · S2 {SUGGEST_MIX.S2} · S3 {SUGGEST_MIX.S3} · S4 {SUGGEST_MIX.S4} —
                정원이 아니라 제안이 몇 개를 집어 올지의 기준입니다
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 문항 은행에서 담기 — 승인된 것만.
          확정한 검사지에는 그리지 않는다. 담을 수 없는 표를 세워 두면 「왜 체크가 안 되지」를
          한 번 겪고 나서야 잠긴 줄 안다 */}
      {!locked && (
        <div className="border-t border-(--a2-line)">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-(--a2-line) bg-(--a2-raised) px-2.5 py-2">
            <span className="a2-label">문항 은행에서 담기</span>
            <span className="a2-t-xs text-(--a2-ink-4)">
              {slot.label}의 <b className="font-semibold text-(--a2-ink-3)">승인</b> 문항 중 아직 담기지 않은{" "}
              {n(pool.length)}건 · 체크해서 「고른 것 담기」
            </span>
          </div>
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
                    addFormItems(form.id, chosen, by, `${chosen.length}문항 담음`);
                    setChosen([]);
                  }}
                >
                  고른 것 담기
                </button>
              </>
            }
          />
        </div>
      )}

      {/* 이 검사지에 무슨 일이 있었나 */}
      {form.log.length > 0 && (
        <ul className="divide-y divide-(--a2-line) border-t border-(--a2-line)">
          {[...form.log].reverse().map((l, k) => (
            <li key={`${l.at}-${k}`} className="px-2.5 py-1.5">
              <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{l.at}</span>{" "}
              <span className="a2-t-xs font-bold text-(--a2-ink-2)">{l.by}</span>{" "}
              <span className="a2-t-sm text-(--a2-ink-2)">{l.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
