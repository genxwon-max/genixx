"use client";

import { useState } from "react";
import Link from "next/link";
import { talentOf } from "@/lib/blueprint";
import {
  stateLabel,
  stateTone,
  typeLabel,
  useItems,
  type ItemDraft,
  type ItemState,
} from "@/lib/itemStore";
import { TableCard } from "./Parts";
import * as a from "./ui";

/**
 * 문항 은행 목록 (ADM-04-1).
 *
 * 기본은 **확정된 것만** 보여 준다. 은행은 「검사지에 넣을 것을 고르는 자리」인데
 * 작성중·검수 대기가 섞여 있으면, 그 줄을 본 사람은 여기서 고치거나 검수하려 든다.
 * 문항을 고치는 길은 출제 워크벤치 하나여야 한다.
 *
 * 사용 중지된 문항도 은행에 남긴다. 정답률이 치우쳐 뺀 문항을 지워 버리면, 그
 * 문항으로 이미 판정한 아이들의 결과를 나중에 설명할 수 없다.
 *
 * 전체 목록도 볼 수 있게 두되 이름을 「전체 문항」으로 따로 붙인다. 어디까지 와
 * 있는지 한자리에서 세어 보는 일은 실제로 필요하고, 이름이 다르면 은행과 헷갈리지
 * 않는다. 그 화면에서 아직 확정되지 않은 줄은 워크벤치로 보내기만 한다.
 *
 * 자료는 출제 워크벤치와 **같은 저장소**를 본다. 은행이 따로 자료를 들면 같은
 * 문항이 두 화면에서 다르게 보이고, 어느 쪽이 맞는지 아무도 답할 수 없게 된다.
 */

/** 확정된 것 — 한 번이라도 승인을 지난 문항 */
const CONFIRMED: ItemState[] = ["approved", "retired"];

const views = [
  {
    id: "bank",
    label: "은행",
    note: "승인 · 사용 중지",
    caption:
      "검수를 지나 확정된 문항입니다. 사용을 멈춘 문항도 지우지 않고 남깁니다 — 그 문항으로 이미 판정한 결과를 설명할 수 있어야 합니다.",
  },
  {
    id: "all",
    label: "전체 문항",
    note: "작성중까지 포함",
    caption:
      "아직 확정되지 않은 문항까지 셉니다. 여기서는 고칠 수 없고, 어디까지 와 있는지만 봅니다.",
  },
] as const;

type ViewId = (typeof views)[number]["id"];

/** 아직 확정되지 않은 문항이 지금 놓여 있는 자리 */
const deskOf = (state: ItemState) =>
  state === "submitted"
    ? { label: "검수 워크벤치", href: "/admin/review" }
    : { label: "출제 워크벤치", href: "/admin/authoring" };

const lastReviewer = (item: ItemDraft) => item.reviews[item.reviews.length - 1]?.by ?? "미배정";

export default function ItemBank() {
  const items = useItems();
  const [view, setView] = useState<ViewId>("bank");

  const bankCount = items.filter((i) => CONFIRMED.includes(i.state)).length;
  const rows = view === "bank" ? items.filter((i) => CONFIRMED.includes(i.state)) : items;
  const current = views.find((v) => v.id === view)!;

  /**
   * 지금 보고 있는 목록을 그대로 내려받는다.
   * 맨 앞의 BOM은 엑셀이 한글을 깨뜨리지 않게 하려는 것이다.
   */
  const download = () => {
    const head = [
      "문항번호",
      "과목",
      "학년",
      "유형",
      "단계",
      "재능 좌표",
      "성취기준",
      "발문",
      "작성",
      "검수",
      "지난 회차 정답률",
      "상태",
    ];
    const body = rows.map((r) => [
      r.code || r.id,
      r.subject,
      r.grade,
      typeLabel(r.type),
      r.level,
      r.tagB,
      r.standardCode,
      r.stem,
      r.authorName,
      lastReviewer(r),
      r.correctRate === null ? "출제 전" : `${r.correctRate}%`,
      stateLabel[r.state],
    ]);
    const csv = [head, ...body]
      .map((cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `문항목록-${current.label}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* 두 갈래. 어느 쪽을 보고 있는지 글자로도 적는다 — 색만으로 나누지 않는다. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {views.map((v) => {
          const on = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={on}
              className={`min-h-[2.75rem] rounded-md border px-4 py-2 text-left transition-colors ${
                on
                  ? "border-brand-900 bg-brand-50"
                  : "border-exam-line bg-white hover:bg-exam-raised"
              }`}
            >
              <span className="adm-t-md font-bold text-exam-text">
                {v.label}{" "}
                <span className="tabular-nums">{v.id === "bank" ? bankCount : items.length}</span>건
              </span>
              <span className="ml-2 adm-t-sm text-exam-muted">{v.note}</span>
            </button>
          );
        })}
      </div>

      <TableCard
        title={`${current.label} ${rows.length}건`}
        caption={current.caption}
        action={
          <button type="button" onClick={download} className={a.btnGhost}>
            지금 목록 내려받기
          </button>
        }
      >
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>문항번호</th>
              <th className={a.th}>과목 · 학년</th>
              <th className={a.th}>유형 · 단계</th>
              <th className={a.th}>재능 축</th>
              <th className={a.th}>발문</th>
              <th className={a.th}>작성</th>
              <th className={a.th}>검수</th>
              <th className={a.th}>지난 회차 정답률</th>
              <th className={a.th}>상태</th>
              <th className={a.th}>어디에 있나</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => {
              const odd = q.correctRate !== null && (q.correctRate > 90 || q.correctRate < 40);
              const confirmed = CONFIRMED.includes(q.state);
              const desk = deskOf(q.state);
              return (
                <tr key={q.id}>
                  <td className={a.tdStrong}>
                    <Link
                      href={`/admin/items/${q.id}`}
                      className="font-bold text-brand-700 underline underline-offset-4"
                    >
                      {q.code || q.id}
                    </Link>
                  </td>
                  <td className={a.td}>
                    {q.subject} · {q.grade}
                  </td>
                  <td className={a.td}>
                    {typeLabel(q.type)} · {q.level}
                  </td>
                  <td className={a.td}>{talentOf(q.talent).name}</td>
                  <td className={`${a.td} min-w-[18rem] text-left`}>{q.stem}</td>
                  <td className={a.td}>{q.authorName}</td>
                  <td className={a.td}>{lastReviewer(q)}</td>
                  <td className={a.tdNum}>
                    {q.correctRate === null ? (
                      "출제 전"
                    ) : (
                      <span className={odd ? "font-bold text-rose-700" : undefined}>
                        {q.correctRate}%
                        {odd && <span className="block adm-t-sm">다시 볼 것</span>}
                      </span>
                    )}
                  </td>
                  <td className={a.td}>
                    <span className={`${a.badge} ${stateTone[q.state]}`}>{stateLabel[q.state]}</span>
                  </td>
                  <td className={a.td}>
                    {confirmed ? (
                      <span className={a.hint}>은행</span>
                    ) : (
                      <Link href={desk.href} className={a.btnRowGhost}>
                        {desk.label}에서 보기
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <p className={`${a.hint} mt-3`}>
        문항번호를 누르면 지문·보기·해설과 검수 이력까지 볼 수 있습니다.
        {view === "bank" && items.length - bankCount > 0 && (
          <>
            {" "}
            아직 확정되지 않은 {items.length - bankCount}건은 여기 없습니다 —{" "}
            <Link
              href="/admin/authoring"
              className="font-bold text-brand-700 underline underline-offset-4"
            >
              출제 워크벤치
            </Link>
            와{" "}
            <Link
              href="/admin/review"
              className="font-bold text-brand-700 underline underline-offset-4"
            >
              검수 워크벤치
            </Link>
            에 있습니다.
          </>
        )}
      </p>
    </>
  );
}
