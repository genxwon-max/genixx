"use client";

import {
  WEEK_KO,
  isOverdue,
  monthCells,
  monthOf,
  seatOf,
  weekday,
  type Interview,
} from "@/lib/interviewStore";

/**
 * 월 격자 — 6주 42칸.
 *
 * 다섯 주와 여섯 주를 오갈 때 판 높이가 한 줄씩 튀지 않게 늘 여섯 주를 그린다. 달을 넘길
 * 때마다 아래 판이 위아래로 움직이면 훑던 눈이 매번 다시 자리를 잡는다.
 *
 * 칸 사이 선은 gap 1px + 부모 바탕으로 긋는다. 칸마다 border-right를 주면 줄 끝에 선이
 * 남는다 — admin2.css의 .a2-stats가 이미 증명한 수법이다.
 *
 * ⚠ 요일 머리 줄과 격자를 **따로** 세우고 같은 grid 템플릿을 준다. 한 상자에 넣고
 *   overflow를 켜는 순간 그 상자가 스크롤 컨테이너가 되어 머리의 sticky가 죽는다.
 *   그리고 일곱 열을 minmax(0,1fr)로 접어 가로 스크롤을 아예 만들지 않는다.
 *
 * ⚠ 다른 달·주말은 글자를 더 흐리게 만들지 않는다. --a2-ink-4가 이미 --a2-bg 위에서
 *   4.63:1로 한계다. 면을 --a2-raised로 눌러 표현한다.
 *
 * ⚠ 칩에 응시번호를 넣지 않는다. 시각·면담원·응시번호 셋이 들어가면 좁은 칸에서 전부
 *   말줄임이 된다 — 「누구를 만나나」는 오른쪽 판이 답하고 격자는 「언제 누가 비었나」만
 *   답하면 된다. 좁다고 10px로 줄이지도 않는다(11px 밑으로 내려가지 않는다).
 */
export default function MonthGrid({
  ym,
  now,
  picked,
  byDate,
  onPick,
}: {
  ym: string;
  /** 오늘. 하이드레이션 전에는 빈 문자열이라 아무 칸도 오늘이 되지 않는다 */
  now: string;
  picked: string;
  byDate: Record<string, Interview[]>;
  onPick: (d: string) => void;
}) {
  const cells = monthCells(ym);

  return (
    <>
      <div className="grid grid-cols-7 border-b border-(--a2-line) bg-(--a2-thead) text-(--a2-thead-ink)">
        {WEEK_KO.map((w) => (
          <span key={w} className="a2-label px-2 py-1.5 text-center">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-(--a2-line)">
        {cells.map((d) => {
          const out = monthOf(d) !== ym;
          const list = out ? [] : (byDate[d] ?? []);
          const wd = weekday(d);
          return (
            <button
              key={d}
              type="button"
              className="a2-cal-cell"
              data-out={out ? "true" : undefined}
              data-weekend={!out && (wd === 0 || wd === 6) ? "true" : undefined}
              aria-pressed={d === picked}
              aria-label={`${d} ${list.length}건`}
              onClick={() => onPick(d)}
            >
              <span className="a2-cal-day" data-today={d === now ? "true" : undefined}>
                {Number(d.slice(8))}
              </span>

              {/* 다른 달 칸은 날짜만 그린다. 칩까지 그리면 이 달과 저 달이 한 그림으로
                  읽혀 「이번 달 여덟 건」을 눈으로 셀 수가 없다 */}
              {list.slice(0, 3).map((v) => (
                <span
                  key={v.id}
                  className="a2-cal-chip"
                  data-late={isOverdue(v, now) ? "true" : undefined}
                  title={`${v.start} ${seatOf(v)} · ${v.interviewerName ?? "면담원 미정"}`}
                >
                  <span className="a2-mono">
                    {/* 색만으로 구분하지 않는다 — 지난 일정은 글자 앞에도 표가 선다 */}
                    {isOverdue(v, now) ? "!" : ""}
                    {v.start}
                  </span>
                  <span>{v.interviewerName ?? "미정"}</span>
                </span>
              ))}

              {/* 「+2건 더」를 제 단추로 만들지 않는다. 칸이 이미 단추라 그 안에 단추를
                  넣으면 마크업이 깨지고 Tab이 그 자리에서 갇힌다. 눌러야 할 것은 하나뿐이다 —
                  칸을 누르면 오른쪽 판에 그날 전부가 펴지므로 잘린 것을 볼 길은 이미 있다 */}
              {list.length > 3 && (
                <span className="a2-t-xs text-(--a2-ink-4)">+{list.length - 3}건 더</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
