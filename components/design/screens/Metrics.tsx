"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { Body, Kpi, PageHead, Panel, SeedNote, Tab } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 운영 지표 (실제 주소 /admin2/metrics · WBS Q3 6.2.4 · L.2.13) — 디자인.
 *
 * 대시보드가 「오늘 손댈 것」을 보여 준다면 이 화면은 「이번 달이 어땠나」를 보여 준다.
 * 위에서부터 한 달의 숫자 다섯 → 면담 신청률 → 달별 추이 → 검수 처리량 → 응시 진행 차례다.
 *
 * 면담 신청률은 새로 들어온 지표다(L.1.14 · L.2.13). 계산 방식이 아직 확정되지 않아
 * 「결제를 마친 면담 신청 ÷ 발행된 진단 결과」로 그려 두고, 그 방식을 창으로 밝혀 둔다.
 */

const to = designLinks("metrics");
const HERE = "/design/admin2/metrics";
const noop = () => {};
const n = (v: number) => v.toLocaleString("ko-KR");

/** 달별 값 — 최근 달이 위 */
const months = [
  { ym: "2026-10", signups: 412, done: 388, reports: 396, paid: 143, counsel: 73 },
  { ym: "2026-09", signups: 365, done: 341, reports: 329, paid: 118, counsel: 52 },
  { ym: "2026-08", signups: 298, done: 276, reports: 268, paid: 97, counsel: 37 },
  { ym: "2026-07", signups: 251, done: 230, reports: 221, paid: 80, counsel: 26 },
  { ym: "2026-06", signups: 187, done: 162, reports: 158, paid: 51, counsel: 14 },
  { ym: "2026-05", signups: 143, done: 120, reports: 112, paid: 33, counsel: 8 },
];

const rate = (m: (typeof months)[number]) => (m.reports ? (m.counsel / m.reports) * 100 : 0);

/** 검수 처리량 — 처리한 역할별 */
const review = [
  { role: "검수자", approved: 148, rejected: 37, returned: 12, hours: "5.2시간" },
  { role: "마스터 · 관리자", approved: 41, rejected: 6, returned: 3, hours: "9.8시간" },
];

const rejectWhy = [
  { why: "성취기준과 맞지 않음", count: 14 },
  { why: "정답이 둘 이상이거나 불분명", count: 11 },
  { why: "지문 · 그림 오류", count: 9 },
  { why: "난이도 표시가 맞지 않음", count: 5 },
  { why: "편향 · 민감한 표현", count: 3 },
  { why: "그 밖의 사유", count: 1 },
];

/** 응시 진행 — 등록부터 결과 발행까지 */
const funnel = [
  { step: "등록 학생", count: 1284 },
  { step: "진단 접수", count: 962 },
  { step: "응시 시작", count: 871 },
  { step: "최종 제출", count: 788 },
  { step: "결과 발행", count: 396 },
];

export default function Metrics({ state }: { state: string }) {
  const empty = state === "empty";
  const now = months[0];
  const prev = months[1];
  const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

  return (
    <ConsoleFrame at={HERE}>
      <PageHead
        title="운영 지표"
        statCols={5}
        actions={
          <>
            <span className="a2-t-xs text-(--a2-ink-4)">
              {empty ? "아직 집계 전" : "마지막 집계 2026-10-11 04:00"}
            </span>
            <button type="button" className="a2-btn" disabled={empty}>
              CSV 다운로드
            </button>
          </>
        }
        stats={
          empty ? (
            <>
              {["신규 가입", "응시 완료율", "결과 발행", "유료 전환율", "면담 신청률"].map((label) => (
                <Kpi key={label} label={label} value="—" sub="집계된 값 없음" />
              ))}
            </>
          ) : (
            <>
              <Kpi
                label="신규 가입"
                value={n(now.signups)}
                unit="명"
                delta={delta(now.signups, prev.signups)}
                sub={`지난달 ${n(prev.signups)}`}
              />
              <Kpi label="응시 완료율" value="81.9" unit="%" delta={2.4} sub="접수 962 중 제출 788" />
              <Kpi
                label="결과 발행"
                value={n(now.reports)}
                unit="건"
                delta={delta(now.reports, prev.reports)}
                sub={`지난달 ${n(prev.reports)}`}
              />
              <Kpi label="유료 전환율" value="34.7" unit="%" delta={7.4} sub={`가입 ${n(now.signups)} 중 결제 ${now.paid}`} />
              <Kpi
                label="면담 신청률"
                value={rate(now).toFixed(1)}
                unit="%"
                delta={delta(rate(now), rate(prev))}
                sub={`발행 ${n(now.reports)} 중 신청 ${now.counsel}`}
              />
            </>
          )
        }
        tabsLabel="조회 기간"
        tabs={
          <>
            <Tab label="이번 달" active onClick={noop} />
            <Tab label="지난달" active={false} onClick={noop} />
            <Tab label="최근 3개월" active={false} onClick={noop} />
            <Tab label="올해" active={false} onClick={noop} />
          </>
        }
      />

      {empty ? (
        <Body>
          <div className="px-4 py-16 text-center">
            <p className="a2-h">아직 집계된 값이 없습니다</p>
            <p className="mx-auto mt-2 max-w-md a2-t-sm leading-[1.7] text-(--a2-ink-3)">
              지표는 매일 새벽 4시에 전날까지의 기록으로 계산합니다. 이번 달 첫 집계는 내일 새벽에
              만들어집니다.
            </p>
            <button type="button" className="a2-btn mt-4">
              지난달 보기
            </button>
          </div>
        </Body>
      ) : (
        <Body className="grid gap-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Panel
              title="면담 신청률"
              meta="결과가 발행된 학생 가운데 면담을 신청한 비율"
              actions={
                <Link href={to("formula")} className="a2-btn a2-btn-sm">
                  계산 방식
                </Link>
              }
            >
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="a2-metric-lg text-(--a2-ink)">{rate(now).toFixed(1)}</span>
                <span className="a2-t-sm text-(--a2-ink-3)">%</span>
                <span className="a2-num a2-t-sm font-semibold" style={{ color: "var(--a2-ok)" }}>
                  ▲ {(rate(now) - rate(prev)).toFixed(1)}%p
                </span>
              </p>
              <p className="mt-1 a2-t-xs text-(--a2-ink-4)">
                면담 신청 {now.counsel}건 ÷ 결과 발행 {n(now.reports)}건 · 지난달 {rate(prev).toFixed(1)}%
              </p>

              <ul className="mt-3 grid gap-0.5 border-t border-(--a2-line) pt-2">
                {months.map((m, i) => (
                  <li
                    key={m.ym}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.25rem_3rem] items-center gap-2 px-1.5 py-1"
                    style={i === 0 ? { background: "var(--a2-accent-soft)", borderRadius: 3 } : undefined}
                  >
                    <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{m.ym}</span>
                    <span className="a2-bar" aria-hidden>
                      <span style={{ width: `${(rate(m) / 20) * 100}%` }} />
                    </span>
                    <span className="a2-num a2-t-sm text-right text-(--a2-ink)">{rate(m).toFixed(1)}%</span>
                    <span className="a2-num a2-t-xs text-right text-(--a2-ink-4)">{m.counsel}건</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-(--a2-line) pt-3">
                <div>
                  <dt className="a2-label">상품별 (이번 달)</dt>
                  <dd className="mt-1 a2-t-sm text-(--a2-ink-2)">
                    30분 <b className="a2-num text-(--a2-ink)">42</b>건 · 60분{" "}
                    <b className="a2-num text-(--a2-ink)">31</b>건
                  </dd>
                </div>
                <div>
                  <dt className="a2-label">방식별 (이번 달)</dt>
                  <dd className="mt-1 a2-t-sm text-(--a2-ink-2)">
                    화상 <b className="a2-num text-(--a2-ink)">48</b> · 전화{" "}
                    <b className="a2-num text-(--a2-ink)">17</b> · 대면{" "}
                    <b className="a2-num text-(--a2-ink)">8</b>
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel title="달별 추이" meta="최근 6개월" flush>
              <div className="a2-table-wrap">
                <table className="a2-table">
                  <thead>
                    <tr>
                      <th scope="col">월</th>
                      <th scope="col" className="a2-th-num">
                        신규 가입
                      </th>
                      <th scope="col" className="a2-th-num">
                        최종 제출
                      </th>
                      <th scope="col" className="a2-th-num">
                        결과 발행
                      </th>
                      <th scope="col" className="a2-th-num">
                        유료 결제
                      </th>
                      <th scope="col" className="a2-th-num">
                        면담 신청
                      </th>
                      <th scope="col" className="a2-th-num">
                        면담 신청률
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={m.ym}>
                        <td className="a2-mono a2-nowrap a2-td-key">
                          {m.ym}
                          {i === 0 && (
                            <span className="ml-1.5 a2-t-xs font-bold text-(--a2-accent-2)" style={{ fontFamily: "inherit" }}>
                              이번 달
                            </span>
                          )}
                        </td>
                        <td className="a2-td-num">{n(m.signups)}</td>
                        <td className="a2-td-num">{n(m.done)}</td>
                        <td className="a2-td-num">{n(m.reports)}</td>
                        <td className="a2-td-num">{n(m.paid)}</td>
                        <td className="a2-td-num">{n(m.counsel)}</td>
                        <td className="a2-td-num text-(--a2-ink)">{rate(m).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Panel title="문항 검수 처리량" meta="이번 달에 결정한 건수" flush>
              {/* 과목 고르개 — 조회 조건 탭과 같은 모양 */}
              <div role="group" aria-label="과목" className="a2-tabs border-b border-(--a2-line)">
                {[
                  ["전체", 247],
                  ["국어", 92],
                  ["수학", 78],
                  ["과학", 61],
                  ["융합", 16],
                ].map(([label, count], i) => (
                  <Tab key={label} label={String(label)} count={count} active={i === 0} onClick={noop} />
                ))}
              </div>
              <div className="a2-table-wrap">
                <table className="a2-table">
                  <thead>
                    <tr>
                      <th scope="col">처리한 역할</th>
                      <th scope="col" className="a2-th-num">
                        승인
                      </th>
                      <th scope="col" className="a2-th-num">
                        반려
                      </th>
                      <th scope="col" className="a2-th-num">
                        수정 요청
                      </th>
                      <th scope="col" className="a2-th-num">
                        합계
                      </th>
                      <th scope="col" className="a2-th-num">
                        평균 처리 시간
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.map((r) => (
                      <tr key={r.role}>
                        <td className="a2-td-key a2-nowrap">{r.role}</td>
                        <td className="a2-td-num">{r.approved}</td>
                        <td className="a2-td-num">{r.rejected}</td>
                        <td className="a2-td-num">{r.returned}</td>
                        <td className="a2-td-num text-(--a2-ink)">{r.approved + r.rejected + r.returned}</td>
                        <td className="a2-td-num">{r.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-(--a2-line) p-3">
                <p className="a2-label">반려 사유 (43건)</p>
                <ul className="mt-1.5 grid gap-1">
                  {rejectWhy.map((w) => (
                    <li key={w.why} className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2rem] items-center gap-2">
                      <span className="truncate a2-t-sm text-(--a2-ink-2)">{w.why}</span>
                      <span className="a2-bar" aria-hidden>
                        <span style={{ width: `${(w.count / 14) * 100}%` }} />
                      </span>
                      <span className="a2-num a2-t-sm text-right text-(--a2-ink)">{w.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel title="응시 진행" meta="2026 4분기 진단 · 누적">
              <ul className="grid gap-2">
                {funnel.map((f, i) => (
                  <li key={f.step}>
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="a2-t-sm font-semibold text-(--a2-ink)">{f.step}</span>
                      <span className="a2-t-xs text-(--a2-ink-4)">
                        <span className="a2-num a2-t-sm text-(--a2-ink)">{n(f.count)}</span>명
                        {i > 0 && (
                          <span className="ml-1.5">
                            앞 단계의 {Math.round((f.count / funnel[i - 1].count) * 100)}%
                          </span>
                        )}
                      </span>
                    </p>
                    <span className="a2-bar mt-1 block" style={{ height: 6 }} aria-hidden>
                      <span style={{ width: `${(f.count / funnel[0].count) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="a2-hint mt-3">
                최종 제출에서 결과 발행 사이가 가장 크게 줄어듭니다 — 채점과 리포트 승인을 기다리는 392명이 여기에 있습니다.
              </p>
            </Panel>
          </div>
        </Body>
      )}

      <SeedNote />

      {state === "formula" && (
        <ConsoleDialog
          title="면담 신청률 계산 방식"
          wide
          actions={
            <Link href={to()} className="a2-btn a2-btn-primary">
              확인
            </Link>
          }
        >
          <p className="rounded-(--a2-radius) border border-(--a2-line) bg-(--a2-raised) px-3 py-2.5 text-center a2-t-md font-semibold text-(--a2-ink)">
            면담 신청률 = 면담 신청 건수 ÷ 결과 발행 건수 × 100
          </p>
          <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2">
            <dt className="font-semibold text-(--a2-ink)">면담 신청</dt>
            <dd>조회 기간에 결제까지 마친 면담 신청. 취소하거나 환불한 신청은 뺍니다.</dd>
            <dt className="font-semibold text-(--a2-ink)">결과 발행</dt>
            <dd>같은 기간에 진단 결과가 발행된 학생 수. 면담은 결과가 발행된 학생만 신청할 수 있습니다.</dd>
            <dt className="font-semibold text-(--a2-ink)">이번 달</dt>
            <dd>
              <span className="a2-num text-(--a2-ink)">73</span>건 ÷{" "}
              <span className="a2-num text-(--a2-ink)">396</span>건 × 100 ={" "}
              <b className="a2-num text-(--a2-ink)">18.4%</b>
            </dd>
          </dl>
          <p className="a2-note mt-3">
            <span>한 학생이 같은 기간에 여러 번 신청하면 신청한 횟수만큼 셉니다. 지난달에 결과를 받고 이번 달에 신청한 경우는 이번 달 신청에 들어갑니다.</span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
