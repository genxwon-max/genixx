"use client";

import { useState } from "react";
import { interviewerOf, interviewers } from "@/lib/interviews";
import {
  MINUTE_CHOICES,
  TIME_RE,
  checkSlot,
  endOf,
  freeOf,
  interviewModes,
  loadOf,
  scheduleText,
  seatOf,
  setSchedule,
  weekdayKo,
  type Interview,
  type InterviewMode,
  type SlotDraft,
} from "@/lib/interviewStore";
import DayStrip, { type StripBlock } from "@/components/admin2/DayStrip";
import {
  LeaveDialog,
  PageSaveBar,
  useEditDraft,
  useUnsavedGuard,
} from "@/components/admin2/EditGuard";
import { FormRow, Panel } from "@/components/admin2/ui";

/**
 * 면담 일정을 잡는 폼.
 *
 * 이 콘솔에서 일정을 고칠 수 있는 자리는 여기 하나다. 달력에서 끌어 옮기지 않는다 —
 * 날짜를 옮기는 일에는 늘 까닭이 있고(아이가 아팠다·면담원이 바뀌었다), 끌어 놓는 동작에는
 * 그 까닭을 적을 자리가 없으며 되돌리려면 다시 끌어야 한다.
 *
 * ── 하루 띠가 여기 있는 까닭 ──
 * 검사로 겹침을 막는 것과 빈 시간이 눈에 보이는 것은 다른 일이다. 띠가 없을 때는 시각을
 * 찍어 보고 → 막히고 → 다시 찍거나, 달력을 열어 빈 자리를 외워 와야 했다. 날짜와 면담원을
 * 고르는 **그 자리에서** 그날 하루가 펴진다.
 *
 * ── 저장은 화면에 하나 ──
 * 판 안에 저장 줄을 두지 않는다. 상세에 판이 다섯이라 판마다 저장 줄을 두면 그 판만
 * 저장하는 것으로 읽힌다. PageSaveBar 하나에 모으고 나가는 길목은 LeaveDialog가 잡는다.
 * save()가 false를 돌려주면 「저장하고 나가기」가 나가지 않는다 — 값이 걸러졌는데 화면은
 * 떠나 버리면, 사람이 저장했다고 믿는 순간에 고친 것이 통째로 사라진다.
 *
 * ⚠ 일정을 저장하는 것이 곧 「대상으로 받는다」는 뜻이다. 아직 케이스가 없는 신청이면
 *   setSchedule이 케이스를 먼저 세운다 — 「대상 확정」 단추를 따로 두면 같은 뜻의 단추가
 *   화면에 둘 선다.
 *
 * ⚠ 칸 폭은 Tailwind 폭 클래스가 아니라 style.maxWidth로 못 박는다. 이 콘솔의 폼이 다
 *   그렇게 한다 — 클래스로 두면 폼마다 다른 눈금이 생긴다.
 */
export default function SlotForm({
  row,
  rows,
  by,
}: {
  row: Interview;
  /** 겹침·빈 자리를 세는 데 쓰는 전체 목록 */
  rows: Interview[];
  by: string;
}) {
  const draft = useEditDraft<SlotDraft>({
    date: row.date ?? "",
    start: row.start ?? "",
    minutes: row.minutes,
    mode: row.mode ?? "onsite",
    interviewerId: row.interviewerId ?? "",
    place: row.place,
    memo: row.memo,
  });
  const v = draft.value;
  const [why, setWhy] = useState("");

  const all = checkSlot(rows, row.id, v);
  const blocked = all.some((c) => c.blocks);
  const moved = !!row.date && !!row.start && (row.date !== v.date || row.start !== v.start);

  /**
   * 손대기 전에는 **막는 말을 적지 않는다.**
   *
   * 아직 잡지 않은 면담을 열면 날짜·시각·면담원·장소가 모두 비어 있어, 아무것도 하지
   * 않은 사람 앞에 빨간 줄 넷이 먼저 선다. 그 넷은 「채워라」가 아니라 「네가 뭘 잘못했다」로
   * 읽힌다. 저장 단추도 손대기 전에는 어차피 잠겨 있으므로(PageSaveBar의 dirty) 그때까지
   * 이 줄들이 할 일이 없다.
   *
   * 짚기만 하는 줄(주말·업무시간 밖·다른 면담원과 같은 시각)은 처음부터 보인다 — 그것은
   * 고치라는 말이 아니라 이미 잡혀 있는 일정에 대해 알아 둘 것이라, 열자마자 읽혀야 한다.
   */
  const checks = draft.dirty ? all : all.filter((c) => !c.blocks);
  const blocks = all.filter((c) => c.blocks);

  const save = () => {
    if (blocked) return false;
    return setSchedule(row, v, rows, by, why);
  };
  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  /**
   * 고르개에 세울 면담원.
   *
   * 지금 값이 후보 넷 밖이면(팀을 옮겼거나 계정이 잠겼다) 그 한 줄을 앞에 덧붙인다.
   * 덧붙이지 않으면 고르개가 그 사람을 못 그려 빈 칸이 되고, 저장하는 순간 면담원이
   * 조용히 바뀐다.
   */
  const pool = interviewers();
  const mine = interviewerOf(v.interviewerId);
  const picks = mine && !pool.some((s) => s.id === mine.id) ? [mine, ...pool] : pool;

  /* 그날 그 면담원의 하루. 지금 고치는 자리는 파랗게, 이미 잡힌 것은 회색으로 */
  const strip: StripBlock[] = [
    ...rows
      .filter((o) => o.id !== row.id && o.date === v.date && o.interviewerId === v.interviewerId && o.start)
      .map((o) => ({
        id: o.id,
        start: o.start!,
        minutes: o.minutes,
        label: `${o.start} ${seatOf(o)}`,
      })),
    ...(TIME_RE.test(v.start)
      ? [
          {
            id: row.id,
            start: v.start,
            minutes: v.minutes,
            label: `${v.start} ${seatOf(row)}`,
            on: true,
            /* 겹치면 왼쪽 3px만 danger로. 무엇과 겹쳤는지는 아래 「짚을 것」이 말한다 */
            clash: blocked,
          },
        ]
      : []),
  ];

  const free =
    v.date && v.interviewerId ? freeOf(rows, v.date, v.interviewerId, v.minutes, row.id) : [];

  return (
    <>
      <Panel title="면담 일정" meta={scheduleText(row)} lead flush>
        <div className="a2-form">
          <FormRow label="날짜" req>
            <input
              type="date"
              className="a2-input a2-mono"
              style={{ maxWidth: "11rem" }}
              aria-label="면담 날짜"
              value={v.date}
              onChange={(e) => draft.set("date", e.target.value)}
            />
            {v.date && <span className="a2-t-sm text-(--a2-ink-2)">{weekdayKo(v.date)}요일</span>}
          </FormRow>

          <FormRow label="시작 시각" req>
            <input
              type="time"
              step={900}
              className="a2-input a2-mono"
              style={{ maxWidth: "8rem" }}
              aria-label="면담 시작 시각"
              value={v.start}
              onChange={(e) => draft.set("start", e.target.value)}
            />
            <select
              className="a2-select"
              style={{ maxWidth: "7rem" }}
              aria-label="소요시간"
              value={v.minutes}
              onChange={(e) => draft.set("minutes", Number(e.target.value))}
            >
              {MINUTE_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
            {TIME_RE.test(v.start) && (
              <span className="a2-t-sm text-(--a2-ink-2)">
                {endOf(v.start, v.minutes)}에 끝납니다
              </span>
            )}
          </FormRow>

          <FormRow
            label="면담원"
            req
            /* 고르고 나서 경고를 읽는 것보다 고르기 전에 보이는 것이 한 번 덜 되돌린다 */
            hint={v.date ? "괄호 안은 그날 그 사람이 맡은 건수입니다." : undefined}
          >
            <select
              className="a2-select"
              style={{ maxWidth: "16rem" }}
              aria-label="면담원"
              value={v.interviewerId}
              onChange={(e) => draft.set("interviewerId", e.target.value)}
            >
              <option value="">고르기</option>
              {picks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.team}
                  {v.date ? ` (${loadOf(rows, v.date, s.id)}건)` : ""}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="방식" req>
            {(Object.keys(interviewModes) as InterviewMode[]).map((m) => (
              <label key={m} className="a2-choice">
                <input
                  type="radio"
                  name="iv-mode"
                  checked={v.mode === m}
                  /* 전화로 바꾸면 장소를 비운다 — 「본원 3층 면담실 A」가 전화 면담에
                     남아 있으면 면담원이 그리로 간다 */
                  onChange={() => draft.patch({ mode: m, place: m === "phone" ? "" : v.place })}
                />
                {interviewModes[m]}
              </label>
            ))}
          </FormRow>

          {v.mode !== "phone" && (
            <FormRow label={v.mode === "onsite" ? "장소" : "화상 링크"} req>
              <input
                className="a2-input"
                style={{ maxWidth: "26rem" }}
                value={v.place}
                placeholder={
                  v.mode === "onsite" ? "예: 본원 3층 면담실 A" : "예: https://meet.genixx.kr/…"
                }
                onChange={(e) => draft.set("place", e.target.value)}
              />
            </FormRow>
          )}

          <FormRow
            label="그날 일정"
            hint={
              v.interviewerId
                ? undefined
                : "면담원을 고르면 그 사람의 하루가 펴지고 빈 자리가 적힙니다."
            }
          >
            <DayStrip blocks={strip} free={free} empty="이 날에는 다른 면담이 없습니다." />
          </FormRow>

          {moved && (
            <FormRow
              label="옮기는 까닭"
              hint="이미 알린 일정입니다. 무엇 때문에 옮겼는지가 기록에 남습니다."
            >
              <input
                className="a2-input"
                style={{ maxWidth: "26rem" }}
                value={why}
                placeholder="예: 보호자 요청으로 하루 미룹니다"
                onChange={(e) => setWhy(e.target.value)}
              />
            </FormRow>
          )}

          <FormRow
            label="면담원에게 남길 말"
            hint="면담원이 그대로 받는 글입니다. 개인정보는 적지 않습니다."
          >
            <textarea
              className="a2-textarea"
              rows={3}
              value={v.memo}
              onChange={(e) => draft.set("memo", e.target.value)}
            />
          </FormRow>

          {checks.length > 0 && (
            <FormRow label="짚을 것">
              <span className="grid w-full gap-1">
                {checks.map((c, i) => (
                  <span
                    key={i}
                    className="a2-note"
                    style={{
                      borderLeftColor: c.blocks ? "var(--a2-danger)" : "var(--a2-warn)",
                    }}
                  >
                    <span>{c.text}</span>
                  </span>
                ))}
              </span>
            </FormRow>
          )}
        </div>
      </Panel>

      <PageSaveBar
        dirty={draft.dirty}
        onSave={save}
        onCancel={draft.reset}
        disabled={blocked}
        /* 막는 말 첫 줄을 그대로 옮겨 적지 않는다 — 바로 위 「짚을 것」에 같은 문장이 서
           있어, 한 화면에서 같은 말을 두 번 읽게 된다. 하나면 그것을 적고 여럿이면 몇
           곳인지만 세어 그 목록을 가리킨다 */
        note={
          !draft.dirty
            ? row.state === "applied"
              ? "저장하면 이 신청을 면담 대상으로 확정합니다."
              : undefined
            : blocks.length === 1
              ? blocks[0].text
              : blocks.length > 1
                ? `채워야 할 칸이 ${blocks.length}곳 있습니다. 위 「짚을 것」을 봐 주세요.`
                : row.state === "applied"
                  ? "저장하면 이 신청을 면담 대상으로 확정합니다."
                  : undefined
        }
      />
      <LeaveDialog guard={guard} />
    </>
  );
}
