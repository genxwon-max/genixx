"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  monthCells,
  monthOf,
  monthText,
  today,
  weekday,
  WEEK_KO,
} from "@/lib/calendar";
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
import { Head, btnGo, btnQuiet, cardBox } from "@/components/student/self";
import { ExpertGate, isDead, useExpertMe, useMyBookings, type ClientBooking } from "./me";

/**
 * EXP-06-4 상담 일정 (/expert/schedule) — 상담사가 「언제 · 어떤 방식으로」 상담할 수
 * 있는지를 스스로 정한다.
 *
 * 두 겹이다.
 *   주간  매주 되풀이되는 바탕 — 요일 · 하루의 시간 · 비우는 구간
 *   월간  날짜로 덮는 예외 — 근무 요일인데 쉬는 날, 근무 요일이 아닌데 여는 날
 *
 * 날짜마다 시간을 따로 적게 하지 않는다. 석 달 치 아흔 칸을 하나씩 채우는 일정표는 한
 * 주만 지나도 비어 있고, 보호자의 달력은 그만큼 닫힌다. 바탕을 한 번 정하고 달라지는
 * 날만 달력에서 누르는 쪽이 오래 간다.
 *
 * ── 여기서 고친 것이 곧 보호자의 달력이다 ──
 * 주인은 상담사 명단(lib/counselorStore.ts)의 내 줄이고, 운영진의 상담사 관리(EXP-06-2)와
 * 같은 줄을 고친다. 보호자 화면의 빈자리는 그 줄에서 센다(lib/counselors.ts의 worksOn ·
 * cellsOf) — 그래서 따로 「공개」 단추가 없다.
 *
 * ── 이미 잡힌 날은 닫지 못한다 ──
 * 신청이 살아 있는 날을 달력에서 닫으면 그 면담이 근무하지 않는 날에 떠 있게 된다. 먼저
 * 상담 관리에서 그 신청을 정리하게 한다. 값(면담료)은 운영진이 정하므로 여기에 칸이 없다.
 */

const need = { duty: "counselor" as const, label: "상담사" };
const MODES = Object.keys(counselModes) as CounselMode[];

/** 30분 눈금 시각 — 06:00부터 22:00까지 */
const TIMES = Array.from({ length: 33 }, (_, i) => {
  const m = 360 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

type Draft = Pick<
  CounselorRow,
  "days" | "from" | "to" | "off" | "modes" | "spans" | "closed" | "opened"
>;

const draftOf = (r: CounselorRow): Draft => ({
  days: r.days,
  from: r.from,
  to: r.to,
  off: r.off,
  modes: r.modes,
  spans: r.spans,
  closed: r.closed ?? [],
  opened: r.opened ?? [],
});

/** 견줄 꼴 — 차례를 맞춰야 누른 차례만 다른 것을 「고침」으로 읽지 않는다 */
const canon = (d: Draft) =>
  JSON.stringify({
    ...d,
    days: [...d.days].sort(),
    modes: MODES.filter((m) => d.modes.includes(m)),
    spans: SPANS.filter((s) => d.spans.includes(s)),
    closed: [...(d.closed ?? [])].sort(),
    opened: [...(d.opened ?? [])].sort(),
  });

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function ExpertSchedule() {
  const me = useExpertMe();
  const row = useCounselorRow(me.account?.counselorId ?? "");
  const bookings = useMyBookings(me.account);
  const gate = ExpertGate({ title: "상담 일정", me, need });
  if (gate) return gate;

  if (!row) {
    return (
      <>
        <Head title="상담 일정" />
        <p className={`${cardBox} mt-7 p-10 text-center text-[13.5px] leading-[1.75] text-soft-muted`}>
          상담사 명단에서 내 정보를 찾지 못했습니다. 운영진에게 상담사 등록을 확인해 주세요.
        </p>
      </>
    );
  }

  return <Editor key={row.id} row={row} bookings={bookings} />;
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-w-[3rem] rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${
        on
          ? "border-soft-primary bg-soft-primary text-white"
          : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-[10px] border border-soft-line bg-white px-3 text-[14px] tabular-nums text-soft-ink"
    >
      {/* 눈금에 없는 옛 값도 고를 수 있게 앞에 세운다 */}
      {!TIMES.includes(value) && <option>{value}</option>}
      {TIMES.map((t) => (
        <option key={t}>{t}</option>
      ))}
    </select>
  );
}

function Editor({ row, bookings }: { row: CounselorRow; bookings: ClientBooking[] }) {
  const cases = useCounselCases();
  const [d, setD] = useState<Draft>(() => draftOf(row));
  const now = today();
  const [ym, setYm] = useState(() => monthOf(now));
  const [savedMsg, setSavedMsg] = useState(false);

  const set = (patch: Partial<Draft>) => {
    setD((cur) => ({ ...cur, ...patch }));
    setSavedMsg(false);
  };

  const dirty = canon(d) !== canon(draftOf(row));
  const errors = [
    d.from >= d.to && "끝나는 시각이 시작 시각보다 늦어야 합니다.",
    d.off[0] > d.off[1] && "상담 제외 시간의 끝이 시작보다 늦어야 합니다.",
    d.modes.length === 0 && "상담 방식을 하나 이상 골라 주세요.",
    d.spans.length === 0 && "상담 길이를 하나 이상 골라 주세요.",
  ].filter(Boolean) as string[];

  /** 날짜마다 살아 있는 신청 수 — 달력 칸에 적고, 그 날을 닫지 못하게 한다 */
  const booked = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) if (!isDead(b.status)) map[b.date] = (map[b.date] ?? 0) + 1;
    return map;
  }, [bookings]);

  const slots = d.from < d.to ? cellsOf(d).length : 0;
  const cells = useMemo(() => monthCells(ym), [ym]);
  const flip = (date: string) => {
    const base = d.days.includes(weekday(date));
    const closed = d.closed ?? [];
    const opened = d.opened ?? [];
    if (base) set({ closed: toggle(closed, date) });
    else set({ opened: toggle(opened, date) });
  };

  const save = () => {
    if (errors.length > 0) return;
    /* 지난 날짜의 예외는 버린다 — 쌓아 두면 줄이 해마다 길어진다 */
    const keep = (list: string[] | undefined) => (list ?? []).filter((x) => x >= now).sort();
    /* 바탕과 같은 예외도 버린다 — 요일을 켠 뒤의 「추가 상담일」은 뜻이 없다 */
    const closed = keep(d.closed).filter((x) => d.days.includes(weekday(x)));
    const opened = keep(d.opened).filter((x) => !d.days.includes(weekday(x)));
    const next = canonRow({
      ...row,
      ...d,
      modes: MODES.filter((m) => d.modes.includes(m)),
      closed,
      opened,
    });
    saveCounselor(next);
    /* 다듬은 값으로 초안을 갈아 끼운다 — 버린 예외가 초안에 남으면 저장 줄이 내려오지 않는다 */
    setD(draftOf(next));
    setSavedMsg(true);
  };

  return (
    <>
      <Head
        title="상담 일정"
        lead="상담할 수 있는 요일과 시간, 방식을 정합니다. 여기서 정한 대로 보호자·학생의 면담 신청 달력이 열립니다."
      />

      {/* ── 주간 ── */}
      <section className={`${cardBox} mt-7 flex flex-col gap-6 p-6 sm:p-8`}>
        <h2 className="text-[18px] font-bold text-soft-ink">매주 상담 가능 시간</h2>

        <div>
          <p className="text-[14px] font-semibold text-soft-ink">요일</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {WEEK_KO.map((w, i) => (
              <Chip key={w} on={d.days.includes(i)} onClick={() => set({ days: toggle(d.days, i) })}>
                {w}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[14px] font-semibold text-soft-ink">상담 시간</p>
            <div className="mt-2.5 flex items-center gap-2">
              <TimeSelect id="sc-from" value={d.from} onChange={(v) => set({ from: v })} />
              <span className="text-soft-muted">~</span>
              <TimeSelect id="sc-to" value={d.to} onChange={(v) => set({ to: v })} />
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-soft-ink">상담 제외 시간 (점심 등)</p>
            <div className="mt-2.5 flex items-center gap-2">
              <TimeSelect
                id="sc-off-from"
                value={d.off[0]}
                onChange={(v) => set({ off: [v, d.off[1]] })}
              />
              <span className="text-soft-muted">~</span>
              <TimeSelect
                id="sc-off-to"
                value={d.off[1]}
                onChange={(v) => set({ off: [d.off[0], v] })}
              />
            </div>
          </div>
        </div>
        <p className="-mt-2 text-[13px] text-soft-muted">
          하루에 30분 단위로 {slots}개 시간대가 열립니다. 60분 상담은 연속된 두 시간대가 비어 있을 때 예약됩니다.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-[14px] font-semibold text-soft-ink">상담 방식</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Chip key={m} on={d.modes.includes(m)} onClick={() => set({ modes: toggle(d.modes, m) })}>
                  {counselModes[m]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-soft-ink">상담 길이</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SPANS.map((s) => (
                <Chip
                  key={s}
                  on={d.spans.includes(s)}
                  onClick={() => set({ spans: toggle<Span>(d.spans, s) })}
                >
                  {spanLabel(s)}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 월간 ── */}
      <section className={`${cardBox} mt-4 p-6 sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold text-soft-ink">날짜별 일정</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`${btnQuiet} !px-3.5`}
              aria-label="이전 달"
              disabled={ym <= monthOf(now)}
              onClick={() => setYm(addMonths(ym, -1))}
            >
              ‹
            </button>
            <span className="w-20 text-center text-[15px] font-bold tabular-nums text-soft-ink">
              {monthText(ym)}
            </span>
            <button
              type="button"
              className={`${btnQuiet} !px-3.5`}
              aria-label="다음 달"
              onClick={() => setYm(addMonths(ym, 1))}
            >
              ›
            </button>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
          날짜를 누르면 그날만 휴무로 바꾸거나, 상담 요일이 아닌 날을 추가 상담일로 지정합니다. 신청이 잡혀 있는 날은
          휴무로 바꿀 수 없습니다.
        </p>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
          {WEEK_KO.map((w) => (
            <span key={w} className="pb-1 text-[12.5px] font-semibold text-soft-muted">
              {w}
            </span>
          ))}
          {cells.map((date) => {
            const inMonth = monthOf(date) === ym;
            const past = date < now;
            const open = worksOn(d, date);
            const base = d.days.includes(weekday(date));
            const n = booked[date] ?? 0;
            const locked = past || (n > 0 && open);
            const label = open ? (base ? "상담 가능" : "추가 상담일") : base ? "휴무" : "";
            return (
              <button
                key={date}
                type="button"
                disabled={locked}
                aria-pressed={open}
                aria-label={`${date} ${label || "상담 없는 날"}${n ? ` · 신청 ${n}건` : ""}`}
                title={n > 0 && open ? "신청이 잡혀 있어 휴무로 바꿀 수 없습니다" : undefined}
                onClick={() => flip(date)}
                className={`flex min-h-[4.25rem] flex-col items-center justify-start gap-0.5 rounded-[10px] border px-1 py-1.5 text-[13px] transition-colors ${
                  !inMonth ? "opacity-35" : ""
                } ${
                  past
                    ? "border-transparent bg-transparent text-slate-300"
                    : open
                      ? base
                        ? "border-soft-primary/30 bg-soft-primary-soft text-soft-ink"
                        : "border-emerald-300 bg-emerald-50 text-soft-ink"
                      : base
                        ? "border-amber-300 bg-amber-50 text-soft-ink"
                        : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
                }`}
              >
                <span className={`font-bold tabular-nums ${date === now ? "underline" : ""}`}>
                  {Number(date.slice(8))}
                </span>
                {!past && label && (
                  <span
                    className={`text-[11px] font-semibold ${
                      open ? (base ? "text-soft-primary" : "text-emerald-700") : "text-amber-700"
                    }`}
                  >
                    {label}
                  </span>
                )}
                {n > 0 && (
                  <span className="text-[11px] font-bold tabular-nums text-soft-ink">신청 {n}</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.7] text-soft-muted">
          보호자는 오늘부터 {LEAD_DAYS}일 뒤 ~ {WINDOW_DAYS}일 뒤 사이의 날짜만 신청할 수 있습니다. 그
          밖의 날짜는 상담 가능으로 두어도 아직 신청을 받지 않습니다.
        </p>
      </section>

      {/* ── 저장 ── */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`${btnGo} disabled:cursor-not-allowed disabled:bg-soft-line`}
          disabled={!dirty || errors.length > 0}
          onClick={save}
        >
          일정 저장
        </button>
        <button
          type="button"
          className={`${btnQuiet} disabled:cursor-not-allowed disabled:opacity-40`}
          disabled={!dirty}
          onClick={() => setD(draftOf(row))}
        >
          되돌리기
        </button>
        <span role="status" className="text-[13px] text-soft-muted">
          {errors[0] ?? (dirty ? "저장하지 않은 변경이 있습니다." : savedMsg ? "저장했습니다." : "")}
        </span>
      </div>

      {/* ── 수락 방식 — 바로 저장되는 스위치라 저장 줄 아래에 따로 둔다 ── */}
      <section className={`${cardBox} mt-6 flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold text-soft-ink">신청 자동 수락</h2>
          <p className="mt-1.5 text-[13px] leading-[1.7] text-soft-muted">
            켜 두면 들어온 신청이 곧바로 「확정」이 됩니다. 꺼 두면 상담 관리에서 한 건씩 수락하거나
            거절합니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!cases.auto[row.id]}
          aria-label="신청 자동 수락"
          onClick={() => setAutoAccept(row.id, !cases.auto[row.id])}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            cases.auto[row.id] ? "bg-soft-primary" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              cases.auto[row.id] ? "left-[1.375rem]" : "left-0.5"
            }`}
          />
        </button>
      </section>
    </>
  );
}
