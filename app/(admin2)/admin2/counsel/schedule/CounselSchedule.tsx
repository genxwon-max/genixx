"use client";

import { useMemo, useState } from "react";
import { addMonths, monthCells, monthOf, monthText, today, weekday, WEEK_KO } from "@/lib/calendar";
import { setAutoAccept, useCounselCases } from "@/lib/counselCaseStore";
import {
  cellsOf,
  counselModes,
  spanLabel,
  SPANS,
  worksOn,
  type CounselMode,
  type Span,
} from "@/lib/counselors";
import { canonRow, saveCounselor, useCounselorRow, type CounselorRow } from "@/lib/counselorStore";
import { LEAD_DAYS, WINDOW_DAYS } from "@/lib/counselStore";
import { LeaveDialog, PageSaveBar, useEditDraft, useUnsavedGuard } from "@/components/admin2/EditGuard";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";
import { isDead, useMyBookings, type ClientBooking } from "@/components/expert/me";
import { NotCounselor, useConsoleCounselor } from "../shared";

/**
 * EXP-06-4 내 상담 일정 — 상담사가 상담 가능 요일 · 시간 · 방식을 스스로 정한다.
 *
 * 두 판이다.
 *   매주   되풀이되는 기본 — 요일 · 상담 시간 · 상담 제외 시간 · 방식 · 길이
 *   날짜별  달력에서 덮는 예외 — 휴무 · 추가 상담일
 *
 * 고치는 것은 상담사 명단(lib/counselorStore.ts)의 내 줄이고, 운영자의 상담사 관리(EXP-06-2)와
 * 같은 줄이다. 저장하면 보호자의 면담 신청 달력이 그대로 따른다(lib/counselors.ts의 worksOn).
 * 면담 비용은 운영자가 정하므로 여기에 칸이 없다.
 *
 * 신청이 잡혀 있는 날은 휴무로 바꾸지 못한다 — 먼저 「내 상담」에서 그 신청을 정리한다.
 */

const MODES = Object.keys(counselModes) as CounselMode[];

/** 30분 눈금 시각 — 06:00부터 22:00까지 */
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

const pick = <T,>(list: T[], all: readonly T[], one: T) =>
  list.includes(one) ? list.filter((x) => x !== one) : all.filter((x) => list.includes(x) || x === one);

export default function CounselSchedule() {
  const account = useConsoleCounselor();
  const row = useCounselorRow(account?.counselorId ?? "");
  const bookings = useMyBookings(account);

  if (!account) return <NotCounselor title="내 상담 일정" />;
  if (!row) {
    return (
      <>
        <PageHead title="내 상담 일정" />
        <Body>
          <Panel title="상담사 명단에서 내 정보를 찾지 못했습니다">
            <p className="a2-t-sm text-(--a2-ink-2)">운영진에게 상담사 등록을 확인해 주세요.</p>
          </Panel>
        </Body>
      </>
    );
  }
  return <Editor key={row.id} row={row} bookings={bookings} />;
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select
      className="a2-select a2-mono"
      style={{ width: "6rem" }}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {/* 눈금에 없는 옛 값도 고를 수 있게 앞에 둔다 */}
      {!TIMES.includes(value) && <option>{value}</option>}
      {TIMES.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  );
}

function Editor({ row, bookings }: { row: CounselorRow; bookings: ClientBooking[] }) {
  const cases = useCounselCases();
  const draft = useEditDraft({
    days: row.days,
    from: row.from,
    to: row.to,
    off: row.off,
    modes: row.modes,
    spans: row.spans,
    closed: row.closed ?? [],
    opened: row.opened ?? [],
  });
  const v = draft.value;
  const now = today();
  const [ym, setYm] = useState(() => monthOf(now));

  const bad: string[] = [];
  if (v.from >= v.to) bad.push("상담 시간의 끝이 시작보다 늦어야 합니다.");
  if (v.off[0] > v.off[1]) bad.push("상담 제외 시간의 끝이 시작보다 늦어야 합니다.");
  if (v.modes.length === 0) bad.push("상담 방식을 하나 이상 골라 주세요.");
  if (v.spans.length === 0) bad.push("상담 길이를 하나 이상 골라 주세요.");

  /** 날짜마다 살아 있는 신청 수 — 달력에 적고, 그 날은 휴무로 바꾸지 못하게 한다 */
  const booked = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) if (!isDead(b.status)) map[b.date] = (map[b.date] ?? 0) + 1;
    return map;
  }, [bookings]);

  const cells = useMemo(() => monthCells(ym), [ym]);
  const slots = v.from < v.to ? cellsOf(v).length : 0;

  const flip = (date: string) => {
    if (v.days.includes(weekday(date))) draft.set("closed", pick(v.closed, [...v.closed, date], date));
    else draft.set("opened", pick(v.opened, [...v.opened, date], date));
  };

  const save = () => {
    if (bad.length > 0) return false;
    /* 지난 날짜와, 기본 요일과 같아진 예외는 버린다 */
    const closed = v.closed.filter((x) => x >= now && v.days.includes(weekday(x))).sort();
    const opened = v.opened.filter((x) => x >= now && !v.days.includes(weekday(x))).sort();
    const next = canonRow({ ...row, ...v, closed, opened });
    saveCounselor(next);
    /* 다듬은 꼴을 초안에 되돌려 넣는다 — 버린 예외가 남으면 저장 줄이 내려오지 않는다 */
    draft.patch({ days: next.days, spans: next.spans, closed, opened });
    return true;
  };

  const guard = useUnsavedGuard(draft.dirty, save, draft.reset);

  return (
    <>
      <PageHead title="내 상담 일정" />
      <Body className="flex flex-col gap-3">
        <Panel title="매주 상담 가능 시간" meta="저장하면 보호자의 면담 신청 달력에 바로 반영됩니다" flush>
          <div className="a2-form">
            <FormRow label="요일" req>
              {WEEK_KO.map((w, i) => (
                <label key={w} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.days.includes(i)}
                    onChange={() => draft.set("days", pick(v.days, [0, 1, 2, 3, 4, 5, 6], i))}
                  />
                  {w}
                </label>
              ))}
            </FormRow>

            <FormRow
              label="상담 시간"
              req
              hint={`하루에 30분 단위로 ${slots}개 시간대가 열립니다. 60분 상담은 연속된 두 시간대가 비어 있을 때 예약됩니다.`}
            >
              <span className="flex items-center gap-1.5">
                <TimeSelect label="상담 시작" value={v.from} onChange={(t) => draft.set("from", t)} />
                <span className="text-(--a2-ink-4)">~</span>
                <TimeSelect label="상담 끝" value={v.to} onChange={(t) => draft.set("to", t)} />
              </span>
            </FormRow>

            <FormRow label="상담 제외 시간" hint="점심처럼 상담을 받지 않는 시간입니다.">
              <span className="flex items-center gap-1.5">
                <TimeSelect
                  label="상담 제외 시간 시작"
                  value={v.off[0]}
                  onChange={(t) => draft.set("off", [t, v.off[1]])}
                />
                <span className="text-(--a2-ink-4)">~</span>
                <TimeSelect
                  label="상담 제외 시간 끝"
                  value={v.off[1]}
                  onChange={(t) => draft.set("off", [v.off[0], t])}
                />
              </span>
            </FormRow>

            <FormRow label="상담 방식" req>
              {MODES.map((m) => (
                <label key={m} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.modes.includes(m)}
                    onChange={() => draft.set("modes", pick<CounselMode>(v.modes, MODES, m))}
                  />
                  {counselModes[m]}
                </label>
              ))}
            </FormRow>

            <FormRow label="상담 길이" req>
              {SPANS.map((s) => (
                <label key={s} className="a2-choice">
                  <input
                    type="checkbox"
                    checked={v.spans.includes(s)}
                    onChange={() => draft.set("spans", pick<Span>(v.spans, SPANS, s))}
                  />
                  {spanLabel(s)}
                </label>
              ))}
            </FormRow>

            <FormRow
              label="신청 자동 수락"
              hint="켜 두면 들어온 신청이 곧바로 「확정」이 됩니다. 꺼 두면 「내 상담」에서 한 건씩 수락하거나 거절합니다. 바꾸는 즉시 적용됩니다."
            >
              <button
                type="button"
                role="switch"
                className="a2-switch"
                aria-checked={!!cases.auto[row.id]}
                aria-label="신청 자동 수락"
                onClick={() => setAutoAccept(row.id, !cases.auto[row.id])}
              />
            </FormRow>
          </div>
        </Panel>

        <Panel
          title="날짜별 일정"
          meta="날짜를 누르면 그날만 휴무로 바꾸거나, 상담 요일이 아닌 날을 추가 상담일로 지정합니다"
          actions={
            <>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                aria-label="이전 달"
                disabled={ym <= monthOf(now)}
                onClick={() => setYm(addMonths(ym, -1))}
              >
                ‹
              </button>
              <span className="a2-mono a2-t-sm font-semibold text-(--a2-ink)">{monthText(ym)}</span>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                aria-label="다음 달"
                onClick={() => setYm(addMonths(ym, 1))}
              >
                ›
              </button>
            </>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK_KO.map((w) => (
              <span key={w} className="a2-t-xs pb-1 font-semibold text-(--a2-ink-3)">
                {w}
              </span>
            ))}
            {cells.map((date) => {
              const inMonth = monthOf(date) === ym;
              const past = date < now;
              const open = worksOn(v, date);
              const base = v.days.includes(weekday(date));
              const count = booked[date] ?? 0;
              const locked = past || (count > 0 && open);
              const label = open ? (base ? "상담 가능" : "추가 상담일") : base ? "휴무" : "";
              const tone = past
                ? "var(--a2-ink-4)"
                : open
                  ? base
                    ? "var(--a2-accent)"
                    : "var(--a2-ok)"
                  : "var(--a2-warn)";
              return (
                <button
                  key={date}
                  type="button"
                  disabled={locked}
                  aria-pressed={open}
                  aria-label={`${date} ${label || "상담 없는 날"}${count ? ` · 신청 ${count}건` : ""}`}
                  title={count > 0 && open ? "신청이 잡혀 있어 휴무로 바꿀 수 없습니다" : undefined}
                  onClick={() => flip(date)}
                  className="flex min-h-[3.75rem] flex-col items-center gap-0.5 rounded-(--a2-radius) border px-1 py-1.5"
                  style={{
                    opacity: inMonth ? 1 : 0.35,
                    borderColor: !past && label ? tone : "var(--a2-line)",
                    background: !past && open ? "var(--a2-accent-soft)" : "var(--a2-panel)",
                    cursor: locked ? "default" : "pointer",
                  }}
                >
                  <span
                    className="a2-mono a2-t-sm font-semibold"
                    style={{ color: past ? "var(--a2-ink-4)" : "var(--a2-ink)" }}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {!past && label && (
                    <span className="a2-t-xs font-semibold" style={{ color: tone }}>
                      {label}
                    </span>
                  )}
                  {count > 0 && <span className="a2-t-xs font-bold text-(--a2-ink)">신청 {count}</span>}
                </button>
              );
            })}
          </div>
          <p className="a2-hint mt-2">
            보호자는 오늘부터 {LEAD_DAYS}일 뒤 ~ {WINDOW_DAYS}일 뒤 사이의 날짜만 신청할 수 있습니다.
            신청이 잡혀 있는 날은 휴무로 바꿀 수 없습니다.
          </p>
        </Panel>

        <PageSaveBar
          dirty={draft.dirty}
          onSave={save}
          onCancel={draft.reset}
          disabled={bad.length > 0}
          note={bad[0]}
        />
      </Body>

      <LeaveDialog guard={guard} />
    </>
  );
}
