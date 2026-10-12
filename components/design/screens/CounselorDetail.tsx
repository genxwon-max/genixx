"use client";

import Link from "next/link";
import { endOf, minOf, WEEK_KO } from "@/lib/calendar";
import { counselFee, counselModes, counselTopics, counselors, spanLabel, SPANS, topicList, type CounselMode } from "@/lib/counselors";
import { designLinks } from "@/lib/designScreens";
import { Body, FormRow, PageHead, Panel } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 상담사 상세 — 주간 배정 현황과 휴무일
 * (실제 주소 /admin2/counselors/[id] · WBS L.2.9 · L.2.10) — 디자인.
 *
 * 지금 화면(app/(admin2)/admin2/counselors/[id]/CounselorEdit.tsx)의 판 셋 — 기본 정보 · 면담 · 근무 — 은
 * 그대로 두고, 그 위에 판 둘을 더했다.
 *
 *  · 주간 배정 현황 (L.2.9) — 한 주를 요일 × 시간으로 편다. 흰 칸이 가능 시간, 파란 블록이 배정된
 *    면담, 옅은 회색이 상담하지 않는 시간이다. 휴무일은 그날 전체가 닫힌다. 위에는 그 주의 배정
 *    건수와 남은 가능 시간(가능 시간 − 배정된 면담 시간)을 적는다.
 *  · 휴무일 (L.2.10) — 날짜 또는 기간 · 사유 · 등록한 사람. 상담사 본인이 「내 상담 일정」에서 등록한
 *    휴무도 같은 목록에 표시된다. 면담이 잡혀 있는 날은 휴무일로 저장되지 않는다.
 *
 * 새 판을 맨 위에 둔 것은 이 화면을 여는 일의 대부분이 「이번 주에 얼마나 찼나」를 보는 것이어서다.
 * 프로필과 근무 시간은 가끔 수정하는 값이라 아래에 그대로 있다.
 *
 * 사람과 근무 값은 상담사 명단(lib/counselors.ts)의 김지원 줄에서 가져온다 — 실제 화면과 같은 값이다.
 */

const to = designLinks("counselor-detail");
/** 이 상담사에게 배정된 면담의 상세 — 일정을 바꾸거나 상담사를 바꾸는 자리 */
const BOOKED = "/design/admin2/interviews/CS-2610-0019/assigned";

type Slug = "" | "week/next" | "dayoff" | "dayoff/conflict" | "dayoff/added" | "dayoff/delete";

const c = counselors.find((v) => v.id === "kim-jiwon")!;
const p = c.person;

/* ───────────────────────── 주간 배정 현황 ───────────────────────── */

type Slot = { start: string; min: number; who: string; href?: string };
type Day = {
  wd: string;
  date: string;
  /** work 근무일 · extra 추가 상담일 · off 휴무일 · none 상담하지 않는 요일 */
  kind: "work" | "extra" | "off" | "none";
  why?: string;
  today?: boolean;
  slots: Slot[];
};

/** 한 주 일곱 날 — 근무 요일을 깔고, 날짜별 예외와 배정된 면담을 얹는다 */
const week = (sunday: number, over: Record<string, Partial<Day>>): Day[] =>
  WEEK_KO.map((wd, i) => ({
    wd,
    date: `10.${sunday + i}`,
    kind: c.days.includes(i) ? "work" : "none",
    slots: [],
    ...over[wd],
  }));

const booked: Record<string, Partial<Day>> = {
  월: { today: true, slots: [{ start: "11:00", min: 30, who: "강민재" }] },
  /* 목요일은 근무 요일이 아니지만 상담사가 「내 상담 일정」에서 이날만 추가로 열었다 */
  목: { kind: "extra", slots: [{ start: "14:00", min: 60, who: "김도현" }] },
  금: { slots: [{ start: "15:00", min: 60, who: "신유나", href: BOOKED }] },
};

const thisWeek = week(11, booked);
/** 휴무일을 추가한 뒤의 이번 주 — 수요일이 닫힌다 */
const thisWeekOff = week(11, { ...booked, 수: { kind: "off", why: "건강 검진" } });
const nextWeek = week(18, { 수: { kind: "off", why: "학회 발표" } });

/** 격자가 그리는 시간 — 09:00부터 아홉 시간 */
const FROM = 9;
const HOURS = 9;
const rowOf = (t: string) => (minOf(t) - FROM * 60) / 60;
const band = (a: string, b: string) => ({
  top: `calc(var(--a2-cal-hour) * ${rowOf(a)})`,
  height: `calc(var(--a2-cal-hour) * ${rowOf(b) - rowOf(a)})`,
});
/** 근무일에도 상담하지 않는 시간 — 근무 시간 앞뒤와 상담 제외 시간 */
const closed: [string, string][] = [["09:00", c.from], c.off, [c.to, "18:00"]];

/** 하루에 열리는 시간 — 근무 시간에서 상담 제외 시간을 뺀다 */
const DAY_OPEN = (minOf(c.to) - minOf(c.from) - (minOf(c.off[1]) - minOf(c.off[0]))) / 60;
/** 6.5 → [["6", "시간"], ["30", "분"]] — 숫자만 지표 글꼴로 적으려고 단위와 가른다 */
const hourParts = (h: number): [string, string][] => [
  [String(Math.floor(h)), "시간"],
  ...(h % 1 ? ([["30", "분"]] as [string, string][]) : []),
];

/** 그 주의 배정 건수 · 가능 시간 · 배정된 면담 시간 */
function statsOf(days: Day[]) {
  const openDays = days.filter((d) => d.kind === "work" || d.kind === "extra").length;
  const slots = days.flatMap((d) => d.slots);
  const used = slots.reduce((sum, s) => sum + s.min, 0) / 60;
  return { count: slots.length, openDays, open: openDays * DAY_OPEN, used };
}

function WeekGrid({ days }: { days: Day[] }) {
  const cols = "grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]";
  return (
    <>
      {/* 넓은 화면 — 요일 × 시간 격자. 면담 일정의 주 시간표와 같은 꼴이다 */}
      <div className="mt-3 hidden overflow-hidden rounded-(--a2-radius) border border-(--a2-line) lg:block">
        <div className={`${cols} border-b border-(--a2-line) bg-(--a2-thead)`}>
          <span aria-hidden />
          {days.map((d) => (
            <span
              key={d.date}
              className={`a2-label px-2 py-1.5 text-center ${d.today ? "text-(--a2-accent-2)" : ""}`}
            >
              {d.wd} {d.date}
              {d.today && " · 오늘"}
            </span>
          ))}
        </div>
        <div className={cols}>
          <div className="a2-cal-axis">
            {Array.from({ length: HOURS }, (_, i) => (
              <span key={i}>{String(FROM + i).padStart(2, "0")}:00</span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.date} className="a2-cal-hours" style={{ height: `calc(var(--a2-cal-hour) * ${HOURS})` }}>
              {d.kind === "work" || d.kind === "extra" ? (
                closed.map(([a, b]) => (
                  <span key={a} aria-hidden className="absolute inset-x-0 bg-(--a2-bg)" style={band(a, b)} />
                ))
              ) : (
                /* 근무 요일이 아닌 날과 휴무일은 하루가 통째로 닫힌다. 휴무일은 위쪽 선으로 한 번 더 가른다 */
                <span
                  aria-hidden
                  className="absolute inset-0 bg-(--a2-bg)"
                  style={d.kind === "off" ? { boxShadow: "inset 0 2px 0 var(--a2-warn)" } : undefined}
                />
              )}
              {d.kind === "off" && (
                <span
                  className="absolute inset-x-1 top-[40%] text-center a2-t-xs font-bold"
                  style={{ color: "var(--a2-warn)" }}
                >
                  휴무일
                  <span className="block font-normal">{d.why}</span>
                </span>
              )}
              {d.kind === "extra" && (
                <span
                  className="absolute inset-x-1.5 a2-t-xs font-bold"
                  style={{ top: `calc(var(--a2-cal-hour) * ${rowOf(c.from)} + 3px)`, color: "var(--a2-ok)" }}
                >
                  추가 상담일
                </span>
              )}
              {d.slots.map((s) => {
                const box = {
                  className: "a2-cal-slot",
                  title: `${s.start}–${endOf(s.start, s.min)} ${s.who} · 화상 ${s.min}분`,
                  style: {
                    top: `calc(var(--a2-cal-hour) * ${rowOf(s.start)})`,
                    height: `calc(var(--a2-cal-hour) * ${s.min / 60} - 2px)`,
                    left: "1px",
                    width: "calc(100% - 2px)",
                  },
                };
                const text = (
                  <>
                    <span>
                      <span className="a2-mono">{s.start}</span> {s.who}
                    </span>
                    {s.min >= 60 && <span>{s.min}분 · 화상</span>}
                  </>
                );
                return s.href ? (
                  <Link key={s.start} href={s.href} {...box}>
                    {text}
                  </Link>
                ) : (
                  <span key={s.start} {...box}>
                    {text}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 좁은 화면 — 상담하는 날만 하루 한 줄씩 */}
      <ul className="mt-3 grid gap-1 lg:hidden">
        {days
          .filter((d) => d.kind !== "none")
          .map((d) => (
            <li
              key={d.date}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-(--a2-line) pb-1 last:border-b-0 last:pb-0"
            >
              <span className="a2-label">
                {d.wd} {d.date}
              </span>
              <span className="a2-t-xs text-(--a2-ink-3)">
                {d.kind === "off"
                  ? `휴무일 · ${d.why}`
                  : `${c.from}–${c.to}${d.kind === "extra" ? " · 추가 상담일" : ""}`}
              </span>
              {d.slots.map((s) => (
                <span key={s.start} className="a2-t-sm text-(--a2-ink)">
                  <span className="a2-mono">{s.start}</span> {s.who} ({s.min}분)
                </span>
              ))}
            </li>
          ))}
      </ul>

      <p className="mt-2 hidden flex-wrap items-center gap-x-4 gap-y-1 a2-t-xs text-(--a2-ink-3) lg:flex">
        {[
          { k: "가능 시간", box: "border-(--a2-line-2) bg-(--a2-panel)" },
          { k: "배정된 면담", box: "border-(--a2-accent) bg-(--a2-accent-soft)" },
          { k: "상담하지 않는 시간 · 휴무일", box: "border-(--a2-line-2) bg-(--a2-bg)" },
        ].map((l) => (
          <span key={l.k} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-3 rounded-[2px] border ${l.box}`} />
            {l.k}
          </span>
        ))}
      </p>
    </>
  );
}

/* ───────────────────────── 휴무일 ───────────────────────── */

type Off = { when: string; days: string; why: string; by: string; at: string; fresh?: boolean };

const offs: Off[] = [
  { when: "2026-10-21 (수)", days: "하루", why: "학회 발표", by: "김지원 (본인)", at: "2026-10-02" },
  { when: "2026-11-09 (월) ~ 2026-11-13 (금)", days: "근무일 3일", why: "해외 연수", by: "박서준", at: "2026-09-30" },
];
const newOff: Off = { when: "2026-10-14 (수)", days: "하루", why: "건강 검진", by: "박서준", at: "2026-10-12", fresh: true };

/* ───────────────────────── 기본 정보 ─────────────────────────
   실제 화면처럼 칸을 비워 두고, 「내 정보」에 적힌 값을 자리표시 글로 보여 준다 */
const profile: { label: string; hint: string; width?: string; rows?: number }[] = [
  { label: "이름", hint: p.name, width: "14rem" },
  { label: "직함", hint: p.role, width: "24rem" },
  { label: "소속", hint: p.org, width: "24rem" },
  { label: "전문 분야", hint: p.tags.join(", "), width: "28rem" },
  { label: "소개 한 줄", hint: p.headline, width: "34rem" },
  { label: "소개", hint: p.bio, rows: 4 },
  { label: "연혁", hint: p.career.join("\n"), rows: 4 },
  { label: "맡는 일", hint: p.duty.join("\n"), rows: 3 },
];

const red = { color: "var(--a2-danger)" };

export default function CounselorDetail({ state }: { state: string }) {
  const slug = state as Slug;
  const next = slug === "week/next";
  const added = slug === "dayoff/added" || slug === "dayoff/delete";
  const conflict = slug === "dayoff/conflict";
  const days = next ? nextWeek : added ? thisWeekOff : thisWeek;
  const stats = statsOf(days);
  const list = added ? [newOff, ...offs] : offs;
  const label = next ? "다음 주" : "이번 주";

  return (
    <ConsoleFrame at="/admin2/counselors">
      <PageHead
        title={p.name}
        back={
          <Link href="/admin2/counselors" className="a2-btn">
            ← 상담사 관리
          </Link>
        }
        actions={
          <button type="button" className="a2-btn a2-btn-danger">
            지우기
          </button>
        }
      />

      <Body className="flex flex-col gap-3">
        {added && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>
              <b className="text-(--a2-ink)">휴무일을 추가했습니다.</b> 2026-10-14 (수)에는 보호자가 면담을 신청할
              수 없고, 자동 배정에서도 빠집니다.
            </span>
          </p>
        )}

        {/* ── 주간 배정 현황 ── */}
        <Panel
          title="주간 배정 현황"
          meta={`${next ? "2026.10.18 – 10.24" : "2026.10.11 – 10.17"} · ${label}`}
          actions={
            next ? (
              <>
                <Link href={to()} className="a2-btn a2-btn-sm">
                  ◀ 이전 주
                </Link>
                <Link href={to()} className="a2-btn a2-btn-sm">
                  이번 주
                </Link>
                <button type="button" className="a2-btn a2-btn-sm">
                  다음 주 ▶
                </button>
              </>
            ) : (
              <>
                <button type="button" className="a2-btn a2-btn-sm">
                  ◀ 이전 주
                </button>
                <Link href={to("week/next")} className="a2-btn a2-btn-sm">
                  다음 주 ▶
                </Link>
              </>
            )
          }
        >
          <dl className="grid grid-cols-3 gap-3">
            {[
              { k: `${label} 배정`, v: [[String(stats.count), "건"]], sub: "" },
              { k: "가능 시간", v: hourParts(stats.open), sub: `상담하는 날 ${stats.openDays}일` },
              { k: "남은 가능 시간", v: hourParts(stats.open - stats.used), sub: "가능 시간 − 배정된 면담 시간" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="a2-label">{s.k}</dt>
                <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                  {s.v.map(([n, unit]) => (
                    <span key={unit}>
                      <span className="a2-metric text-(--a2-ink)">{n}</span>
                      <span className="a2-t-sm text-(--a2-ink-3)">{unit}</span>
                    </span>
                  ))}
                  {s.sub && <span className="a2-t-xs text-(--a2-ink-4)">{s.sub}</span>}
                </dd>
              </div>
            ))}
          </dl>
          {stats.count === 0 && (
            <p className="a2-note mt-3">
              <span>이 주에는 배정된 면담이 없습니다.</span>
            </p>
          )}
          <WeekGrid days={days} />
          <p className="a2-hint mt-2">
            자동 배정은 이번 주 배정이 적은 상담사부터 배정합니다.
            {stats.count > 0 && <span className="max-lg:hidden"> 면담 블록을 누르면 그 면담의 상세가 열립니다.</span>}
          </p>
        </Panel>

        {/* ── 휴무일 ── */}
        <Panel
          title="휴무일"
          meta={`${list.length}건`}
          actions={
            <Link href={to("dayoff")} className="a2-btn a2-btn-sm a2-btn-primary">
              휴무일 추가
            </Link>
          }
          flush
        >
          <div className="a2-table-wrap">
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col">날짜</th>
                  <th scope="col">사유</th>
                  <th scope="col">등록한 사람</th>
                  <th scope="col" style={{ width: "5rem" }} />
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.when} data-on={o.fresh ? "true" : undefined}>
                    <td className="a2-nowrap">
                      <span className="a2-mono font-semibold text-(--a2-ink)">{o.when}</span>
                      <span className="ml-2 a2-t-xs text-(--a2-ink-4)">{o.days}</span>
                    </td>
                    <td>{o.why}</td>
                    <td className="a2-nowrap">
                      {o.by}
                      <span className="ml-2 a2-mono a2-t-xs text-(--a2-ink-4)">{o.at}</span>
                    </td>
                    <td className="a2-nowrap text-right">
                      {o.fresh ? (
                        <Link href={to("dayoff/delete")} className="a2-btn a2-btn-sm a2-btn-danger">
                          삭제
                        </Link>
                      ) : (
                        <button type="button" className="a2-btn a2-btn-sm a2-btn-danger">
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
            휴무일에는 보호자의 면담 신청 달력에서 그날이 닫히고 자동 배정에서도 빠집니다. 상담사 본인이 「내 상담
            일정」에서 등록한 휴무도 여기에 함께 표시됩니다. 면담이 잡혀 있는 날은 휴무일로 등록할 수 없습니다.
          </p>
        </Panel>

        {/* ── 아래 셋은 실제 화면 그대로 ── */}
        <Panel title="기본 정보" meta={c.id} flush>
          <div className="a2-form">
            {profile.map((f) => (
              <FormRow key={f.label} label={f.label}>
                {f.rows ? (
                  <textarea aria-label={f.label} className="a2-textarea" rows={f.rows} defaultValue="" placeholder={f.hint} />
                ) : (
                  <input
                    aria-label={f.label}
                    className="a2-input"
                    style={{ maxWidth: f.width }}
                    defaultValue=""
                    placeholder={f.hint}
                  />
                )}
              </FormRow>
            ))}
          </div>
        </Panel>

        <Panel title="면담" flush>
          <div className="a2-form">
            <FormRow label="한 줄 소개">
              <input aria-label="한 줄 소개" className="a2-input" style={{ maxWidth: "34rem" }} defaultValue={c.focus} />
            </FormRow>
            <FormRow label="담당 상담 주제" req>
              {topicList.map((t) => (
                <label key={t} className="a2-choice">
                  <input type="checkbox" defaultChecked={c.topics.includes(t)} />
                  {counselTopics[t]}
                </label>
              ))}
            </FormRow>
            <FormRow label="면담 길이" req>
              {SPANS.map((s) => (
                <label key={s} className="a2-choice">
                  <input type="checkbox" defaultChecked={c.spans.includes(s)} />
                  {spanLabel(s)}
                </label>
              ))}
            </FormRow>
            <FormRow label="면담 비용">
              <span className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
                {c.spans.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className="a2-t-sm text-(--a2-ink-2)">{spanLabel(s)}</span>
                    <input
                      aria-label={`${spanLabel(s)} 면담 비용`}
                      inputMode="numeric"
                      className="a2-input a2-num"
                      style={{ maxWidth: "9.5rem" }}
                      defaultValue=""
                      placeholder={counselFee[s].toLocaleString("ko-KR")}
                    />
                    <span className="a2-t-sm text-(--a2-ink-3)">원</span>
                  </span>
                ))}
              </span>
            </FormRow>
            <FormRow label="만나는 방식" req>
              {(Object.keys(counselModes) as CounselMode[]).map((m) => (
                <label key={m} className="a2-choice">
                  <input type="checkbox" defaultChecked={c.modes.includes(m)} />
                  {counselModes[m]}
                </label>
              ))}
            </FormRow>
            <FormRow label="노출">
              <label className="a2-choice">
                <input type="checkbox" defaultChecked />
                보호자·학생 화면의 목록에 노출합니다
              </label>
            </FormRow>
          </div>
        </Panel>

        <Panel title="근무" flush>
          <div className="a2-form">
            <FormRow label="요일" req>
              {WEEK_KO.map((wd, i) => (
                <label key={wd} className="a2-choice">
                  <input type="checkbox" defaultChecked={c.days.includes(i)} />
                  {wd}
                </label>
              ))}
            </FormRow>
            {[
              { label: "근무 시간", req: true, from: c.from, to: c.to },
              { label: "상담 제외 시간", req: false, from: c.off[0], to: c.off[1] },
            ].map((r) => (
              <FormRow key={r.label} label={r.label} req={r.req}>
                <input
                  type="time"
                  step={1800}
                  aria-label={`${r.label} 시작`}
                  className="a2-input a2-mono"
                  style={{ maxWidth: "8rem" }}
                  defaultValue={r.from}
                />
                <span className="a2-t-sm text-(--a2-ink-3)">—</span>
                <input
                  type="time"
                  step={1800}
                  aria-label={`${r.label} 끝`}
                  className="a2-input a2-mono"
                  style={{ maxWidth: "8rem" }}
                  defaultValue={r.to}
                />
              </FormRow>
            ))}
          </div>
        </Panel>

        {/* 저장 줄 — 손대기 전이라 눌리지 않는다. 휴무일은 창에서 바로 저장되어 이 줄을 거치지 않는다 */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" className="a2-btn" disabled>
              취소
            </button>
            <button type="button" className="a2-btn a2-btn-primary" disabled>
              저장
            </button>
          </div>
        </div>
      </Body>

      {(slug === "dayoff" || conflict) && (
        <ConsoleDialog
          title="휴무일 추가"
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              {conflict ? (
                <button type="button" className="a2-btn a2-btn-primary" disabled>
                  추가
                </button>
              ) : (
                <Link href={to("dayoff/added")} className="a2-btn a2-btn-primary">
                  추가
                </Link>
              )}
            </>
          }
        >
          <div className="grid gap-2.5">
            <div className="a2-field">
              <span className="a2-label">날짜 또는 기간</span>
              <span className="flex flex-wrap items-center gap-1.5">
                {["시작일", "종료일"].map((k, i) => (
                  <span key={k} className="contents">
                    {i === 1 && <span className="text-(--a2-ink-4)">~</span>}
                    <input
                      type="date"
                      aria-label={`휴무 ${k}`}
                      className="a2-input a2-mono"
                      style={{ maxWidth: "10rem", ...(conflict ? { borderColor: "var(--a2-danger)" } : {}) }}
                      defaultValue={conflict ? "2026-10-16" : "2026-10-14"}
                    />
                  </span>
                ))}
              </span>
              <span className="a2-hint block">
                하루만 쉬면 시작일과 종료일을 같은 날짜로 둡니다.
                {!conflict && " 2026-10-14 (수) 하루 — 가능 시간 6시간이 닫힙니다."}
              </span>
            </div>
            <label className="a2-field block">
              <span className="a2-label">사유</span>
              <input className="a2-input" defaultValue={conflict ? "개인 사정" : "건강 검진"} placeholder="예) 학회 참석" />
              <span className="a2-hint block">운영자와 상담사 본인만 봅니다. 보호자 화면에는 표시되지 않습니다.</span>
            </label>
          </div>
          {conflict ? (
            <div className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-danger)" }}>
              <span className="grid gap-1">
                <b style={red}>2026-10-16 (금)에 잡힌 면담이 1건 있어 휴무일로 저장할 수 없습니다.</b>
                <Link href={BOOKED} className="font-semibold text-(--a2-accent-2) underline">
                  15:00 – 16:00 · 신유나 (초5) · 화상 · <span className="a2-mono">CS-2610-0019</span>
                </Link>
                <span>먼저 이 면담의 일정을 바꾸거나 다른 상담사에게 넘긴 뒤에 다시 추가해 주세요.</span>
              </span>
            </div>
          ) : (
            <p className="a2-hint mt-3">
              추가하면 바로 적용됩니다. 그날은 보호자의 면담 신청 달력에서 닫히고, 추천 목록과 자동 배정에서도
              빠집니다.
            </p>
          )}
        </ConsoleDialog>
      )}

      {slug === "dayoff/delete" && (
        <ConsoleDialog
          title="이 휴무일을 삭제할까요?"
          actions={
            <>
              <Link href={to("dayoff/added")} className="a2-btn">
                취소
              </Link>
              <Link href={to()} className="a2-btn a2-btn-danger">
                삭제
              </Link>
            </>
          }
        >
          <p>
            <b className="a2-mono text-(--a2-ink)">{newOff.when}</b> · {newOff.why} · {newOff.by} 등록
          </p>
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>
              삭제하면 그날 {c.from}–{c.to}이 다시 가능 시간이 됩니다. 보호자가 면담을 신청할 수 있고, 자동
              배정에도 다시 들어갑니다.
            </span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
