"use client";

import {
  DAY_FROM,
  DAY_TO,
  layout,
  minOf,
  seatOf,
  weekCells,
  weekday,
  weekdayKo,
  type Interview,
} from "@/lib/interviewStore";

/**
 * 주 시간표 — 09:00–20:00, 세로가 시각.
 *
 * 겹침을 눈으로 보는 자리다. 월 격자에서는 14:00과 14:30이 나란한 두 줄로 보여 겹쳤다는
 * 사실이 사라진다.
 *
 * 가로를 면담원 레인으로 두는 안을 먼저 짜 보았다가 버렸다. 7일 × 4명이면 28열이고, 폭
 * 1000px에서 한 열이 33px라 11px 글자 넉 자가 안 들어간다. 면담원은 도구 줄 고르개로 가른다.
 *
 * 격자선은 정시만 긋는다. 30분 선까지 그으면 스물두 줄이 되어 판이 줄무늬가 되고,
 * 소요시간이 40·50분이라 30분 선이 어느 블록 경계와도 안 맞았다.
 *
 * ⚠ 한 시간의 높이는 --a2-cal-hour 하나로만 적는다. 격자선(CSS의 gradient)과 블록의
 *   top·height(inline style)가 같은 숫자를 써야 한다 — 한쪽만 고치면 블록이 선에서 떨어진다.
 *
 * ⚠ 09:00 앞·20:00 뒤의 일정은 격자 위아래에 줄로 눕힌다. 그림에서 잘라 내면 있는 것이
 *   없는 것이 된다 — 격자보다 이 줄을 먼저 짰다.
 *
 * ⚠ 겹침 두 갈래를 가른다. 다른 면담원의 같은 시각은 정상이라 좌우로 나누고(면담실이
 *   여럿이고 화상·전화는 자리를 안 쓴다), 같은 면담원의 겹침은 사고라 data-clash로 왼쪽
 *   3px이 danger가 되고 블록 안에 「겹침」이 **글자로도** 선다.
 *
 * ⚠ 좁은 화면에서는 시간표 대신 하루 한 판씩 일곱 덩이 세로 목록으로 접는다. 가로로 밀지
 *   않는다 — 한 칸이 44px까지 줄면 「15:00 정태호」가 「15:0…」이 되고, 11px 밑으로는
 *   내려가지 않는다.
 */
export default function WeekGrid({
  sunday,
  byDate,
  onOpen,
}: {
  sunday: string;
  byDate: Record<string, Interview[]>;
  onOpen: (id: string) => void;
}) {
  const days = weekCells(sunday);
  const from = minOf(DAY_FROM);
  const to = minOf(DAY_TO);
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from / 60 + i);

  const inside = (v: Interview) =>
    !!v.start && minOf(v.start) >= from && minOf(v.start) + v.minutes <= to;

  const early = days.flatMap((d) => (byDate[d] ?? []).filter((v) => !!v.start && minOf(v.start) < from));
  const late = days.flatMap((d) =>
    (byDate[d] ?? []).filter((v) => !!v.start && minOf(v.start) + v.minutes > to && minOf(v.start) >= from),
  );
  const total = days.reduce((sum, d) => sum + (byDate[d] ?? []).length, 0);

  if (total === 0) {
    return (
      <div className="p-3">
        <p className="a2-note">
          <span>이 주에 잡힌 면담이 없습니다.</span>
        </p>
      </div>
    );
  }

  const outsideLine = (label: string, list: Interview[]) =>
    list.length > 0 && (
      <p className="a2-t-xs text-(--a2-ink-3)">
        {label} {list.length}건 —{" "}
        {list.map((v) => `${v.date!.slice(5)} ${v.start} ${seatOf(v)}`).join(" · ")}
      </p>
    );

  return (
    <div className="grid gap-2 p-3">
      {outsideLine("이른 시각", early)}

      {/* 넓은 화면 — 격자 */}
      <div className="hidden lg:grid">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-(--a2-line) bg-(--a2-thead) text-(--a2-thead-ink)">
          <span aria-hidden />
          {days.map((d) => (
            <span key={d} className="a2-label px-2 py-1.5 text-center">
              {weekdayKo(d)} {Number(d.slice(5, 7))}.{Number(d.slice(8))}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-(--a2-line)">
          <div className="a2-cal-axis">
            {hours.map((h) => (
              <span key={h}>{String(h).padStart(2, "0")}:00</span>
            ))}
          </div>

          {days.map((d) => {
            const wd = weekday(d);
            return (
              <div
                key={d}
                className="a2-cal-hours"
                data-weekend={wd === 0 || wd === 6 ? "true" : undefined}
              >
                {layout((byDate[d] ?? []).filter(inside)).map(({ v, col, of, clash }) => (
                  <button
                    key={v.id}
                    type="button"
                    className="a2-cal-slot"
                    data-clash={clash ? "true" : undefined}
                    title={`${v.start}–${v.end} ${seatOf(v)} · ${v.interviewerName ?? "면담원 미정"}`}
                    style={{
                      top: `calc(var(--a2-cal-hour) * ${(minOf(v.start!) - from) / 60})`,
                      height: `calc(var(--a2-cal-hour) * ${v.minutes / 60} - 2px)`,
                      left: `calc(${(col / of) * 100}% + 1px)`,
                      width: `calc(${100 / of}% - 2px)`,
                    }}
                    onClick={() => onOpen(v.id)}
                  >
                    <span className="a2-mono">{v.start}</span>
                    <span>{v.interviewerName ?? "미정"}</span>
                    {clash && <span className="a2-tag">겹침</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 좁은 화면 — 하루 한 덩이씩 */}
      <div className="grid gap-2 lg:hidden">
        {days.map((d) => {
          const list = byDate[d] ?? [];
          if (list.length === 0) return null;
          return (
            <div key={d}>
              <p className="a2-label mb-1">
                {d.slice(5).replace("-", ".")} ({weekdayKo(d)}) · {list.length}건
              </p>
              <ul className="grid gap-1">
                {list.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className="a2-btn w-full justify-start"
                      onClick={() => onOpen(v.id)}
                    >
                      <span className="a2-mono">
                        {v.start}–{v.end}
                      </span>
                      <span className="a2-mono">{seatOf(v)}</span>
                      <span>{v.interviewerName ?? "면담원 미정"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {outsideLine("늦은 시각", late)}
    </div>
  );
}
