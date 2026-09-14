"use client";

import { DAY_FROM, DAY_SPAN, DAY_TO, minOf } from "@/lib/interviewStore";

/**
 * 하루 한 줄 — 09:00부터 20:00까지를 가로 띠로 편다.
 *
 * 일정 폼에 이것이 없을 때는 시각을 찍어 보고 → 막히고 → 다시 찍는 짓을 반복하거나,
 * 달력을 열어 빈 자리를 외워 와야 했다. 겹침을 검사로 막는 것과 빈 시간이 눈에 보이는
 * 것은 다른 일이다 — 「그 시각에 이미 면담이 있습니다」를 읽고도 **어디로 옮기면 되는지**는
 * 이 그림이 답한다.
 *
 * 달력을 여기 축소해 심은 것이지 달력을 대신하는 것이 아니다. 이 띠는 하루·한 사람만
 * 답하고, 「어느 날이 비었나」는 면담 일정(EXP-06-1)이 답한다.
 *
 * ⚠ 이 조각은 아무것도 고치지 않는다. 블록을 눌러 옮기지도, 빈 자리를 눌러 잡지도
 *   않는다 — 값은 위의 폼이 들고 여기는 그 값을 되비출 뿐이다. 그림에 손을 대게 만들면
 *   같은 일을 하는 자리가 한 화면에 둘이 된다.
 *
 * ⚠ 겹치는 블록을 나란히 세우지 못한다(높이가 한 줄뿐이다). 겹치는 것은 왼쪽 3px만
 *   danger로 세우고, 무엇이 겹쳤는지는 폼의 「짚을 것」이 글자로 말한다. 하루 띠는
 *   겹침을 **알리는** 자리이고 **세는** 자리는 주 시간표다.
 *
 * ⚠ 블록 **안에** 글자를 넣지 않는다. 40분짜리는 하루 660분의 6%라, 19rem짜리 오른쪽
 *   판에서는 폭이 17px로 나온다 — 안쪽 여백을 빼면 7px이라 「14:00 0461」이 글자 한 조각으로
 *   잘려 쓰레기처럼 보인다. 넣었다가 걷어 낸 자리다. 블록은 **자리만** 말하고, 무엇이
 *   있는지는 아래 글자 줄과 마우스를 얹었을 때 뜨는 말(title)이 답한다.
 */

export type StripBlock = {
  id: string;
  start: string;
  minutes: number;
  /** 블록 안에 적는 한 줄 — 「14:00 0461」처럼 */
  label: string;
  /** 지금 고치고 있는 것인가. 파란 면으로 세우고 나머지는 회색으로 눌러 둔다 */
  on?: boolean;
  clash?: boolean;
};

export default function DayStrip({
  blocks,
  free = [],
  empty = "이 날에는 잡힌 면담이 없습니다.",
  times = true,
}: {
  blocks: StripBlock[];
  /** 소요시간만큼 비어 있는 시작 시각들(freeOf). 띠 아래에 글자로 적는다 */
  free?: string[];
  empty?: string;
  /**
   * 띠 아래에 「잡힌 자리」 줄을 적을지.
   *
   * 띠 바로 밑에 같은 것을 세는 목록이 이미 서는 자리(달력 오른쪽 판)에서만 끈다 —
   * 같은 값이 두 줄로 서면 어느 쪽이 더 자세한 것인지 묻게 된다.
   */
  times?: boolean;
}) {
  /* 띠 밖으로 나가는 것을 **잘라 내지 않는다.** 그림에서 사라지면 있는 면담이 없는
     것이 되므로, 밖으로 나간 것은 아래에 글자 줄로 눕힌다 */
  const inside = blocks.filter(
    (b) => minOf(b.start) >= minOf(DAY_FROM) && minOf(b.start) + b.minutes <= minOf(DAY_TO),
  );
  const outside = blocks.filter((b) => !inside.includes(b));

  return (
    <div className="grid w-full gap-1">
      {/* 눈금 글자는 다섯 자리만. 열둘을 다 적으면 11px 글자가 좁은 폼 칸에서 겹친다 */}
      <div className="flex justify-between a2-mono a2-t-xs text-(--a2-ink-4)">
        <span>09</span>
        <span>12</span>
        <span>15</span>
        <span>18</span>
        <span>20</span>
      </div>

      <div className="a2-cal-strip">
        {inside.map((b) => (
          <span
            key={b.id}
            className="a2-cal-slot"
            data-on={b.on ? "true" : "false"}
            data-clash={b.clash ? "true" : undefined}
            style={{
              top: "1px",
              bottom: "1px",
              height: "auto",
              left: `${((minOf(b.start) - minOf(DAY_FROM)) / DAY_SPAN) * 100}%`,
              width: `${(b.minutes / DAY_SPAN) * 100}%`,
            }}
            title={b.label}
          />
        ))}
      </div>

      {outside.length > 0 && (
        <p className="a2-t-xs text-(--a2-ink-4)">
          띠 밖에 {outside.length}건 — {outside.map((b) => b.label).join(" · ")}
        </p>
      )}

      {blocks.length === 0 && <p className="a2-t-xs text-(--a2-ink-4)">{empty}</p>}

      {times && blocks.length > 0 && (
        <p className="a2-t-xs text-(--a2-ink-3)">
          잡힌 자리 <span className="a2-mono">{blocks.map((b) => b.label).join(" · ")}</span>
        </p>
      )}

      {free.length > 0 && (
        <p className="a2-t-xs text-(--a2-ink-3)">
          빈 자리 <span className="a2-mono">{free.slice(0, 8).join(" · ")}</span>
          {free.length > 8 && ` 외 ${free.length - 8}곳`}
        </p>
      )}
    </div>
  );
}
