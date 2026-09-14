"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { interviewers } from "@/lib/interviews";
import {
  addDays,
  addMonths,
  byDay,
  interviewModes,
  layout,
  monthOf,
  monthText,
  seatOf,
  weekStart,
  weekText,
  weekdayKo,
  type Interview,
} from "@/lib/interviewStore";
import DayStrip, { type StripBlock } from "@/components/admin2/DayStrip";
import { Bar, Body, Panel, SeedNote, Tag } from "@/components/admin2/ui";
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";

/**
 * 면담 일정의 몸통 (EXP-06-1).
 *
 * 면담 신청이 「누구부터 잡나」를 답하고, 이 그림은 「어느 날이 비었나」를 답한다. 자료는
 * 하나인데 묻는 것이 달라 화면을 갈랐다 — 「평가 채점 / 회원 채점」과 같은 가름이다.
 *
 * 화면 머리는 calendar/CalendarView.tsx가 세운다. 여기 몸통만 둔 까닭은 뒤에 대시보드나
 * 회차 화면이 같은 달력을 한 칸으로 끼워 넣을 수 있게 하려는 것이다 — 머리를 안고 있으면
 * 그때 제목이 두 번 선다.
 *
 * ── 월 격자가 기본이고 주 시간표를 곁에 둔다 ──
 * 주를 기본으로 두었을 때는 화면 대부분이 빈 격자였다. 면담은 주에 서너 건 있는 일이고,
 * 09:00–20:00을 세로로 편 격자에 블록 셋이 흩어지면 「이번 달이 어떻게 찼나」가 안 읽힌다.
 * 「일정 미정 8건」을 보고 온 사람의 물음은 「어느 날에 넣지」이고, 그 답은 한 달을 통째로
 * 봐야 나온다.
 *
 * 「몇 시에 넣지」는 이 그림이 아니라 면담 상세의 하루 띠가 답한다 — 날짜와 면담원을 고르는
 * 그 자리에서 그날이 펴진다. 그래서 월을 기본으로 두어도 잃는 것이 없다.
 *
 * 주 시간표를 남긴 까닭은 하나다. 월 격자는 「09-11에 셋」까지만 말하고 「14:00과 15:00이
 * 잇대어 있고 14:30에 다른 면담원 한 건이 그 사이에 선다」는 말하지 못한다.
 *
 * 일 보기는 만들지 않았다. 하루 서너 건 규모에서 하루만 보는 화면은 목록 한 줄과 다르지
 * 않다 — 「그날 무엇이 있나」는 격자에서 날짜를 눌러 오른쪽 판에 편다.
 *
 * ── 월·주 고르개가 탭이 아니라 단추인 까닭 ──
 * 이 몸통은 화면 머리를 안고 있지 않다. 머리의 탭 줄을 빌려 쓰면 다른 자리에 끼워 넣을 때
 * 그 줄이 따라가지 못한다. 달·주는 보는 기간을 고르는 일이므로 기간을 옮기는 ◀▶ 바로 옆에
 * 같은 생김새의 단추로 세운다 — 셋이 한 덩어리로 「무엇을 언제까지 보나」를 이룬다.
 *
 * ⚠ 여기서 면담이 태어나지 않는다. 빈 칸을 눌러도 그날이 오른쪽 판에 펴질 뿐이고, 마우스를
 *   얹어야 나오는 「여기에 잡기」도 두지 않는다. 시각만으로는 면담을 만들 수 없다 — 면담은
 *   「빈 시간」이 아니라 「기다리는 케이스」에 붙이는 것이다.
 *
 * ⚠ 끌어다 옮기지 않는다. 옮기는 일에는 늘 까닭이 있는데 끌어 놓는 동작에는 그것을 적을
 *   자리가 없고, 되돌리려면 다시 끌어야 한다. 칩을 누르면 그 건의 상세로 간다.
 *
 * ⚠ 지표 띠를 두지 않는다. 「일정 미정」·「지난 일정」은 면담 신청의 탭이 이미 세고 있고,
 *   여기 또 세우면 같은 수를 두 화면이 각자 세게 되어 언젠가 둘이 갈린다. 이 달에 몇
 *   건인지만 도구 줄 오른쪽 끝에 적는다.
 */
export default function InterviewCalendar({
  desk,
  now,
  on,
}: {
  desk: Interview[];
  /** 오늘. 하이드레이션 뒤에만 채워진다 */
  now: string;
  /** 상세에서 「달력에서 보기」로 물어 온 날 */
  on: string | null;
}) {
  const router = useRouter();

  const start = on ?? now;
  const [view, setView] = useState<"month" | "week">("month");
  const [seen, setSeen] = useState(start);
  const [ym, setYm] = useState(() => monthOf(start));
  const [sunday, setSunday] = useState(() => weekStart(start));
  const [picked, setPicked] = useState(start);
  const [whoId, setWhoId] = useState("");
  const [mode, setMode] = useState("");

  /* 물어 온 날이 바뀌면(상세에서 넘어왔거나 시계를 막 읽었다) 그 렌더에서 맞춘다.
     효과로 하면 한 프레임 동안 엉뚱한 달이 보였다가 넘어간다 */
  if (seen !== start) {
    setSeen(start);
    setYm(monthOf(start));
    setSunday(weekStart(start));
    setPicked(start);
  }

  const rows = useMemo(
    () =>
      desk.filter(
        (v) =>
          !!v.date &&
          !!v.start &&
          (!whoId || v.interviewerId === whoId) &&
          (!mode || v.mode === mode),
      ),
    [desk, whoId, mode],
  );

  const byDate = useMemo(() => byDay(rows), [rows]);
  const monthCount = rows.filter((v) => monthOf(v.date!) === ym).length;

  /* 지금 보고 있는 범위 안의 같은 면담원 겹침. 좁은 화면에서 시간표가 목록으로 접혀도 이
     줄은 그대로 남아야 해서 격자 밖에서 센다 */
  const span = Object.keys(byDate).filter((d) =>
    view === "month" ? monthOf(d) === ym : d >= sunday && d <= addDays(sunday, 6),
  );
  const clashDays = span
    .map((d) => ({ d, hit: layout(byDate[d] ?? []).find((x) => x.clash) }))
    .filter((x) => x.hit);

  const dayRows = byDate[picked] ?? [];
  const strip: StripBlock[] = dayRows
    .filter((v) => v.start)
    .map((v) => ({
      id: v.id,
      start: v.start!,
      minutes: v.minutes,
      label: `${v.start} ${seatOf(v)}`,
      on: true,
    }));

  /* 면담원별 그 달 건수 — 한 사람에게 몰린 것이 여기서 보인다 */
  const load = interviewers().map((s) => ({
    id: s.id,
    name: s.name,
    count: rows.filter((v) => monthOf(v.date!) === ym && v.interviewerId === s.id).length,
  }));
  const loadMax = Math.max(1, ...load.map((l) => l.count));

  const step = (by: number) => {
    if (view === "month") setYm(addMonths(ym, by));
    else setSunday(addDays(sunday, by * 7));
  };
  const here = () => {
    setYm(monthOf(now));
    setSunday(weekStart(now));
    setPicked(now);
  };

  return (
    <>
      <Body>
        <div className="grid gap-3 xl:grid-cols-[1fr_19rem]">
          <Panel flush className="min-w-0">
            <div className="a2-toolbar">
              <span className="a2-label a2-query-label">보는 단위</span>
              <button
                type="button"
                className={`a2-btn a2-btn-sm ${view === "month" ? "a2-btn-primary" : ""}`}
                aria-pressed={view === "month"}
                onClick={() => setView("month")}
              >
                월
              </button>
              <button
                type="button"
                className={`a2-btn a2-btn-sm ${view === "week" ? "a2-btn-primary" : ""}`}
                aria-pressed={view === "week"}
                onClick={() => setView("week")}
              >
                주
              </button>

              <span className="a2-label">기간</span>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                aria-label={view === "month" ? "지난 달" : "지난 주"}
                onClick={() => step(-1)}
              >
                ◀
              </button>
              {/* ◀▶만 두지 않는다. 옆에 달·주를 고정폭으로 늘 적어 지금 어디인지가 글자로 남는다 */}
              <strong className="a2-mono a2-t-md text-(--a2-ink)">
                {view === "month" ? monthText(ym) : weekText(sunday)}
              </strong>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                aria-label={view === "month" ? "다음 달" : "다음 주"}
                onClick={() => step(1)}
              >
                ▶
              </button>
              <button type="button" className="a2-btn a2-btn-sm" onClick={here}>
                {view === "month" ? "이번 달" : "이번 주"}
              </button>

              <span className="a2-label">면담원</span>
              <select
                className="a2-select"
                style={{ maxWidth: "9rem" }}
                aria-label="면담원"
                value={whoId}
                onChange={(e) => setWhoId(e.target.value)}
              >
                <option value="">전체</option>
                {interviewers().map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <span className="a2-label">방식</span>
              <select
                className="a2-select"
                style={{ maxWidth: "7rem" }}
                aria-label="방식"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="">전체</option>
                {(Object.keys(interviewModes) as (keyof typeof interviewModes)[]).map((m) => (
                  <option key={m} value={m}>
                    {interviewModes[m]}
                  </option>
                ))}
              </select>

              <span className="ml-auto a2-t-xs text-(--a2-ink-4)">
                {monthText(ym)} {monthCount}건
              </span>
            </div>

            {clashDays.length > 0 && (
              <div className="grid gap-1 border-b border-(--a2-line) p-3">
                {clashDays.map(({ d, hit }) => (
                  <p key={d} className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
                    <span>
                      {Number(d.slice(5, 7))}월 {Number(d.slice(8))}일 {hit!.v.start} —{" "}
                      {hit!.v.interviewerName ?? "같은 면담원"} 면담이 겹칩니다. 상세에서 한쪽을
                      옮겨 주세요.
                    </span>
                  </p>
                ))}
              </div>
            )}

            {view === "month" ? (
              <MonthGrid ym={ym} now={now} picked={picked} byDate={byDate} onPick={setPicked} />
            ) : (
              <WeekGrid
                sunday={sunday}
                byDate={byDate}
                onOpen={(id) => router.push(`/admin2/interviews/${id}`)}
              />
            )}

            {view === "month" && monthCount === 0 && (
              <div className="p-3">
                <p className="a2-note">
                  <span>
                    {monthText(ym)}에 잡힌 면담이 없습니다. 면담 신청에서 대상을 골라 날짜를 잡습니다.
                  </span>
                </p>
              </div>
            )}
          </Panel>

          <div className="grid content-start gap-3">
            <Panel
              title={`${Number(picked.slice(5, 7))}월 ${Number(picked.slice(8))}일 (${weekdayKo(picked)})`}
              meta={`${dayRows.length}건`}
            >
              {dayRows.length === 0 ? (
                <div className="grid gap-2">
                  <p className="a2-t-sm text-(--a2-ink-3)">이 날에는 잡힌 면담이 없습니다.</p>
                  <p className="a2-note">
                    <span>
                      면담은 이 그림에서 만들지 않습니다. 면담 신청에서 대상을 골라 날짜를 잡습니다.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {/* 아래 목록이 같은 것을 더 자세히 세므로 띠는 자리만 그린다 */}
                  <DayStrip blocks={strip} times={false} />
                  <ul className="grid gap-1.5">
                    {dayRows.map((v) => (
                      <li
                        key={v.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-(--a2-line) pt-1.5 first:border-t-0 first:pt-0"
                      >
                        <span className="a2-mono a2-t-sm font-semibold text-(--a2-ink)">
                          {v.start}
                        </span>
                        <span className="a2-t-xs text-(--a2-ink-3)">{v.minutes}분</span>
                        {v.mode && <Tag>{interviewModes[v.mode]}</Tag>}
                        <span className="a2-t-sm">{v.interviewerName ?? "면담원 미정"}</span>
                        <span className="a2-mono a2-t-xs text-(--a2-ink-3)">{seatOf(v)}</span>
                        <Link
                          href={`/admin2/interviews/${v.id}`}
                          className="a2-btn a2-btn-sm ml-auto"
                          aria-label={`${seatOf(v)} 면담 상세보기`}
                        >
                          상세보기
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel title="면담원별" meta={monthText(ym)}>
              {monthCount === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">이 기간에 잡힌 면담이 없습니다.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {load.map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 a2-t-sm">{l.name}</span>
                      <Bar value={l.count} total={loadMax} width="100%" />
                      <span className="a2-num w-8 shrink-0 text-right a2-t-sm">{l.count}건</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </Body>

      <SeedNote>
        이 달력이 아는 것은 이 콘솔에 잡힌 면담뿐입니다. 면담원의 회의·출장·휴가는 여기
        없습니다(lib/interviewStore.ts). 사람 데이터는 전부 화면 설계를 위한 예시입니다.
      </SeedNote>
    </>
  );
}
