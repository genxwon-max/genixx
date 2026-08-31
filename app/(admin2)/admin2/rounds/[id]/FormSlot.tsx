"use client";

import Link from "next/link";
import { useState } from "react";
import { LEVELS, levelSpecs, type Level } from "@/lib/blueprint";
import { formTone } from "@/lib/admin2";
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
import { typeLabel, type ItemDraft } from "@/lib/itemStore";
import type { PlanSlot } from "@/lib/roundPlanStore";
import { Panel, Status, Tag } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";

/**
 * 회차 편성판의 칸 하나 — 한 과목 · 한 학년군의 검사지.
 *
 * 「국어·수학·과학에 S1~S4 문항을 여러 개 골라 넣는다」가 여기서 일어나는 일이다.
 * 아래 표가 담긴 문항(출제 순서대로), 그 아래 표가 아직 안 담긴 승인 문항이다. 단계
 * 거르개를 위에 둔 것은 고르는 기준이 거의 언제나 「S3가 몇 개 모자란가」이기 때문이다.
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
  onClose: () => void;
}) {
  const [lv, setLv] = useState<Level | "">("");
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
          <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
            닫기
          </button>
        }
      >
        <p className="a2-t-sm text-(--a2-ink-2)">
          이 칸에는 아직 검사지가 없습니다. 비워 두면 이번 회차에 {slot.subject} · {slot.band} 학년군은 응시하지
          않습니다.
        </p>
        <p className="a2-hint">담을 수 있는 승인 문항 {slot.pool}건</p>
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

  const pool = items
    .filter(
      (i) =>
        i.state === "approved" &&
        i.subject === slot.subject &&
        i.band === slot.band &&
        !form.itemIds.includes(i.id) &&
        (lv === "" || i.level === lv),
    )
    .sort((a, b) => a.level.localeCompare(b.level) || (a.code || a.id).localeCompare(b.code || b.id));

  const toggle = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Panel
      title={slot.label}
      meta={form.id}
      actions={
        <>
          <Status tone={formTone[form.state]}>{locked ? "확정" : "초안"}</Status>
          <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
            닫기
          </button>
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
                <td className="a2-nowrap a2-t-sm">{typeLabel(i.type)}</td>
                <td className="a2-td-num">{i.points}</td>
                <td className="a2-nowrap">{i.anchor ? <Tag accent>앵커</Tag> : <span className="text-(--a2-ink-4)">—</span>}</td>
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
                  <span className="block py-5">아직 담긴 문항이 없습니다. 아래에서 골라 담습니다.</span>
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

      {/* 후보 문항 — 승인된 것만 */}
      {!locked && (
        <div className="border-t border-(--a2-line)">
          <div className="a2-toolbar">
            <span className="a2-label">담을 문항</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                aria-pressed={lv === ""}
                style={lv === "" ? { borderColor: "var(--a2-accent)", color: "var(--a2-accent)" } : undefined}
                onClick={() => setLv("")}
              >
                전체
              </button>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className="a2-btn a2-btn-sm"
                  aria-pressed={lv === l}
                  style={lv === l ? { borderColor: "var(--a2-accent)", color: "var(--a2-accent)" } : undefined}
                  onClick={() => setLv(l)}
                  title={levelSpecs[l].name}
                >
                  {l}
                </button>
              ))}
            </span>
            <span className="a2-t-xs text-(--a2-ink-4)">
              <span className="a2-num text-(--a2-ink-2)">{pool.length}</span>건 · 고른 것{" "}
              <span className="a2-num text-(--a2-ink-2)">{chosen.length}</span>
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={chosen.length === 0}
                onClick={() => {
                  addFormItems(form.id, chosen, by, `${chosen.length}문항 담음`);
                  setChosen([]);
                }}
              >
                고른 것 담기
              </button>
            </div>
          </div>

          {/* 고를 문항 — 여기도 20rem 상자를 풀었다. 담는 표와 고르는 표가 세로로 놓여
              있어서, 둘 다 제 상자를 들고 있으면 한 화면에 스크롤 막대가 셋(화면·위·아래)
              선다 */}
          <TableBox>
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "2.25rem" }}>
                    <span className="sr-only">고르기</span>
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
                  <th scope="col" style={{ width: "3.5rem" }}>
                    앵커
                  </th>
                  <th scope="col" className="a2-th-num" style={{ width: "4.5rem" }}>
                    정답률
                  </th>
                  <th scope="col">발문</th>
                </tr>
              </thead>
              <tbody>
                {pool.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={chosen.includes(i.id)}
                        onChange={() => toggle(i.id)}
                        aria-label={`${i.code || i.id} 담기`}
                      />
                    </td>
                    <td className="a2-td-key a2-nowrap">
                      <Link href={`/admin2/items/${i.id}`} className="a2-mono hover:text-(--a2-accent) hover:underline">
                        {i.code || i.id}
                      </Link>
                    </td>
                    <td className="a2-mono a2-nowrap">{i.level}</td>
                    <td className="a2-nowrap a2-t-sm">{typeLabel(i.type)}</td>
                    <td className="a2-nowrap">
                      {i.anchor ? <Tag accent>앵커</Tag> : <span className="text-(--a2-ink-4)">—</span>}
                    </td>
                    <td className="a2-td-num">
                      {i.correctRate == null ? <span className="a2-t-xs text-(--a2-ink-4)">미출제</span> : `${i.correctRate}%`}
                    </td>
                    <td className="a2-clip a2-t-sm" style={{ width: "100%" }} title={i.stem}>
                      {i.stem}
                    </td>
                  </tr>
                ))}
                {pool.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-(--a2-ink-4)">
                      <span className="block py-5">
                        담을 수 있는 승인 문항이 없습니다. 문항 은행에서 만들어 검수를 거쳐야 여기에 뜹니다.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableBox>
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
