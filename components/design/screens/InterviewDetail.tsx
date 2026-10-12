"use client";

import Link from "next/link";
import { counselTopics, counselors } from "@/lib/counselors";
import { designLinks } from "@/lib/designScreens";
import { Body, DescList, FormRow, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 면담 상세 — 상담사 배정과 알림 발송
 * (실제 주소 /admin2/interviews/[id] · WBS L.2.4 · L.2.5 · L.1.7) — 디자인.
 *
 * 지금 화면(app/(admin2)/admin2/interviews/[id])의 판 넷 — 이 면담 · 신청 · 면담 일정 · 기록 — 을
 * 유료 결과 해석 면담 한 건의 값으로 옮기고, WBS에는 있는데 화면에 없던 둘을 더했다.
 *
 * ── 상담사 배정 (L.2.4 · L.1.7) ──
 * 신청자가 상담사를 고르지 않고 「관리자 배정 요청」으로 낸 신청은 배정 대기로 들어온다.
 * 운영자는 추천 목록에서 한 명을 골라 배정하거나, 「자동 배정」으로 기준에 맡긴다. 기준은
 * 분야 일치 → 그 시간에 가능 → 이번 주 배정이 가장 적은 사람이고, 추천 순위도 같은 순서다.
 * 맞는 상담사가 없으면 배정하지 않고 배정 대기로 둔다.
 *
 * ── 알림 발송 (L.2.5) ──
 * 머리의 「알림 보내기」로 이미 나간 알림을 신청자 · 상담사에게 다시 보낸다. 시스템이 보낸
 * 알림과 운영자가 보낸 알림이 「알림 발송 내역」 한 표에 쌓인다.
 *
 * 실제 화면과 달라진 곳 — 일정 폼에서 고르던 면담원은 「상담사 배정」 판으로 옮겼고(같은 값을
 * 두 군데서 정하지 않는다), 머리의 「전문가 콘솔에서 기록」은 「결과 기록 · 종료 승인」으로 바꿨다.
 * 머리의 「반려」 · 「일정 지우기」는 넣지 않았다 — 결제를 마친 면담에서는 환불이 함께 정해져야 한다.
 */

const to = designLinks("interview-detail");
const COUNSELOR = "/design/admin2/counselors/kim-jiwon";

type Slug = "" | "assign" | "assigned" | "auto" | "no-match" | "notify" | "notified";
/** 창 아래에 깔리는 화면 — 배정 확인 창은 배정 대기 위에, 알림 발송 창은 배정된 화면 위에 뜬다 */
type View = Exclude<Slug, "assign" | "notify">;

/** 예시 한 건 — 신청자가 상담사를 고르지 않은 유료 면담 */
const iv = {
  id: "CS-2610-0019",
  student: "신유나",
  applicant: "신동욱",
  phone: "010-3358-2046",
  day: "2026-10-16 (금)",
  time: "15:00 – 16:00",
};
const WHEN = `${iv.day} ${iv.time}`;

type Cand = {
  id: string;
  /** 이번 주(10.11 – 10.17)에 이미 배정된 면담 */
  week: number;
  /** 그 시간에 가능한 근거 */
  free: string;
  /** 그 시간에 안 되는 사유와 가장 가까운 가능 시간 — 추천할 상담사가 없는 상태에서 쓴다 */
  busy: string;
  next: string;
};

/** 60분 · 화상 면담을 맡는 상담사. 사람과 담당 상담 주제는 상담사 명단(lib/counselors.ts)에서 가져온다 */
const cands: Cand[] = [
  { id: "kim-jiwon", week: 2, free: "금요일 10:00–17:00 근무", busy: "휴무일 · 학회 참석", next: "10-19 (월) 15:00" },
  { id: "im-doyoon", week: 4, free: "추가 상담일 10:00–18:00", busy: "근무 요일은 화 · 목", next: "10-20 (화) 15:00" },
  { id: "seo-minjeong", week: 3, free: "금요일 14:00–20:00 근무", busy: "같은 시간에 다른 면담 1건", next: "10-16 (금) 16:00" },
];

/** 자동 배정이 한 명을 고른 과정 — 기준 셋을 차례로 적용한다 */
const autoSteps = [
  { k: "분야 일치", v: "「결과지 해석」을 맡는 상담사 2명 — 김지원 · 임도윤" },
  { k: "그 시간에 가능", v: `${WHEN}에 가능한 상담사 2명 — 김지원 · 임도윤` },
  { k: "이번 주 배정이 가장 적은 사람", v: "김지원 2건 · 임도윤 4건 → 김지원" },
];

type Sent = { at: string; who: string; what: string; how: string; by: string; fresh?: boolean };

const sentBase: Sent[] = [
  { at: "2026-10-09 21:17", who: "신청자 신동욱", what: "결제 완료 · 면담 신청 접수", how: "알림톡", by: "시스템" },
];
const sentAssigned: Sent[] = [
  { at: "2026-10-12 10:26", who: "상담사 김지원", what: "면담 배정", how: "알림톡", by: "시스템" },
  { at: "2026-10-12 10:26", who: "신청자 신동욱", what: "면담 예약 확정", how: "알림톡", by: "시스템" },
  ...sentBase,
];
/** 운영자가 신청자에게 예약 확정 알림을 한 번 더 보낸 뒤 — 맨 위 한 건이 새로 생긴다 */
const sentManual: Sent[] = [
  { at: "2026-10-12 11:02", who: "신청자 신동욱", what: "면담 예약 확정", how: "알림톡", by: "박서준", fresh: true },
  ...sentAssigned,
];

type Log = { at: string; what: string; why: string; by: string; strong?: boolean };

const applied: Log = {
  at: "2026-10-09 21:17",
  what: "신청 접수",
  why: "결제가 끝나 신청이 접수되었습니다. 상담사 선택은 「관리자 배정 요청」 · 주문 GX2026-000160",
  by: "시스템",
};
const assignedLog: Log = {
  at: "2026-10-12 10:26",
  what: "상담사 배정",
  why: "김지원 상담사를 배정했습니다. 추천 1순위 — 분야 일치 · 그 시간 가능 · 이번 주 배정 2건",
  by: "박서준",
};

const logOf: Record<View, Log[]> = {
  "": [applied],
  "no-match": [
    {
      at: "2026-10-09 21:17",
      what: "배정 대기",
      why: `자동 배정을 시도했지만 ${WHEN}에 가능한 상담사가 없어 배정 대기로 두었습니다.`,
      by: "시스템",
      strong: true,
    },
    applied,
  ],
  assigned: [{ ...assignedLog, strong: true }, applied],
  auto: [
    {
      at: "2026-10-12 10:26",
      what: "자동 배정",
      why: "분야 일치 2명 → 그 시간에 가능 2명 → 이번 주 배정이 가장 적은 김지원 상담사(2건)를 배정했습니다.",
      by: "박서준",
      strong: true,
    },
    applied,
  ],
  notified: [
    {
      at: "2026-10-12 11:02",
      what: "알림 발송",
      why: "신청자에게 「면담 예약 확정」을 알림톡으로 다시 보냈습니다.",
      by: "박서준",
      strong: true,
    },
    assignedLog,
    applied,
  ],
};

/** 알림 발송 창의 미리보기 — 신청자에게 가는 글 */
const preview = `[GENIXX] 면담 예약이 확정되었습니다.

학생: 신유나 (초5)
일시: ${WHEN} · 화상 60분
상담사: 김지원 책임연구원
화상 면담 링크는 면담 10분 전부터 「면담 일정」에서 열립니다. (예약번호 ${iv.id})`;

function Note({ tone, children }: { tone: "ok" | "danger"; children: React.ReactNode }) {
  return (
    <p className="a2-note" style={{ borderLeftColor: `var(--a2-${tone})` }}>
      <span>{children}</span>
    </p>
  );
}

export default function InterviewDetail({ state }: { state: string }) {
  const slug = state as Slug;
  const view: View = slug === "assign" ? "" : slug === "notify" ? "assigned" : slug;
  const done = view === "assigned" || view === "auto" || view === "notified";
  const none = view === "no-match";
  const sent = view === "notified" ? sentManual : done ? sentAssigned : sentBase;

  return (
    <ConsoleFrame at="/admin2/interviews">
      <PageHead
        title={`${iv.student} 면담`}
        back={
          <Link href="/admin2/interviews" className="a2-btn">
            ← 면담 신청
          </Link>
        }
        actions={
          <>
            <Link href="/admin2/interviews/calendar?on=2026-10-16" className="a2-btn">
              달력에서 보기
            </Link>
            <Link href={to("notify")} className="a2-btn">
              알림 보내기
            </Link>
            {done && (
              <Link href="/design/admin2/interviews/record" className="a2-btn">
                결과 기록 · 종료 승인
              </Link>
            )}
          </>
        }
      />

      <Body className="grid gap-3">
        {(view === "assigned" || view === "auto") && (
          <Note tone="ok">
            <b className="text-(--a2-ink)">
              {view === "auto" ? "자동 배정으로 김지원 상담사를 배정했습니다." : "김지원 상담사를 배정했습니다."}
            </b>{" "}
            예약이 확정되어 신청자와 상담사에게 알림을 보냈습니다.
          </Note>
        )}
        {view === "notified" && (
          <Note tone="ok">
            <b className="text-(--a2-ink)">알림을 보냈습니다.</b> 신청자 {iv.applicant} 님에게 「면담 예약 확정」
            알림톡이 나갔습니다. 아래 「알림 발송 내역」에서 결과를 확인할 수 있습니다.
          </Note>
        )}

        {/* ── 상담사 배정 ── */}
        {done ? (
          <Panel
            title="상담사 배정"
            meta="2026-10-12 10:26 · 박서준"
            actions={
              <Link href={to()} className="a2-btn a2-btn-sm">
                상담사 변경
              </Link>
            }
          >
            <DescList
              rows={[
                {
                  k: "상담사",
                  v: (
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={COUNSELOR} className="font-semibold text-(--a2-accent-2) underline">
                        김지원
                      </Link>
                      <span className="text-(--a2-ink-3)">책임연구원 · 진단 총괄</span>
                    </span>
                  ),
                },
                {
                  k: "배정 방식",
                  v: view === "auto" ? <Tag accent>자동 배정</Tag> : <Tag>운영자 배정 · 추천 1순위</Tag>,
                },
                ...(view === "auto" ? [] : [{ k: "배정 근거", v: "분야 일치 · 그 시간 가능 · 이번 주 배정 2건" }]),
                { k: "이번 주 배정", v: "3건 (이 면담 포함 · 10.11 – 10.17)" },
              ]}
            />
            {view === "auto" && (
              <ol className="mt-3 grid gap-1.5 border-t border-(--a2-line) pt-3">
                {autoSteps.map((s, i) => (
                  <li key={s.k} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      aria-hidden
                      className="a2-mono a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) bg-(--a2-ink) font-bold text-white"
                    >
                      {i + 1}
                    </span>
                    <b className="a2-t-sm text-(--a2-ink)">{s.k}</b>
                    <span className="a2-t-sm text-(--a2-ink-2)">{s.v}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="a2-hint mt-2">
              {view === "auto" &&
                "시스템 설정에서 자동 배정을 켜 두면 결제가 끝난 신청이 같은 기준으로 바로 배정되고, 기록에는 「시스템」으로 남습니다. "}
              상담사를 바꾸면 신청자와 두 상담사에게 알림이 갑니다.
            </p>
          </Panel>
        ) : (
          <Panel
            title="상담사 배정"
            meta={`결과지 해석 · 60분 · 화상 · ${WHEN}`}
            actions={
              none ? (
                <button type="button" className="a2-btn a2-btn-sm" disabled title="그 시간에 가능한 상담사가 없습니다">
                  자동 배정
                </button>
              ) : (
                <Link href={to("auto")} className="a2-btn a2-btn-sm">
                  자동 배정
                </Link>
              )
            }
            flush
          >
            <div className="grid gap-2 px-3 py-2.5">
              {none ? (
                <>
                  <Note tone="danger">
                    <b style={{ color: "var(--a2-danger)" }}>{WHEN}에 가능한 상담사가 없습니다.</b> 자동 배정을 하지
                    못해 배정 대기로 남아 있습니다. 보호자 화면에는 계속 「전문가 배정 중」으로 표시됩니다.
                  </Note>
                  <ul className="grid gap-1 a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                    <li>
                      · <b className="text-(--a2-ink)">일정을 바꿉니다.</b> 신청자와 다른 시간을 정한 뒤 아래 「면담
                      일정」의 날짜와 시각을 바꿔 저장하면 추천 목록을 다시 계산합니다.
                    </li>
                    <li>
                      · <b className="text-(--a2-ink)">신청자에게 다른 시간을 묻습니다.</b> 전화{" "}
                      <span className="a2-mono">{iv.phone}</span>로 연락해 아래의 가까운 가능 시간을 안내합니다.
                    </li>
                  </ul>
                </>
              ) : (
                <p className="a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                  신청자가 상담사를 고르지 않고 <b className="text-(--a2-ink)">「관리자 배정 요청」</b>으로
                  신청했습니다. 추천 목록에서 한 명을 골라 배정하거나, 「자동 배정」으로 1순위 상담사에게 바로
                  배정합니다. 보호자에게는 영업일 하루 안에 배정한다고 안내했습니다. 배정 기한은{" "}
                  <span className="a2-mono text-(--a2-ink)">2026-10-12 (월) 18:00</span>입니다.
                </p>
              )}
            </div>

            <div className="a2-table-wrap border-t border-(--a2-line)">
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" className="a2-th-num" style={{ width: "3.5rem" }}>
                      순위
                    </th>
                    <th scope="col">상담사</th>
                    <th scope="col">분야</th>
                    <th scope="col">
                      {iv.day.slice(5)} {iv.time}
                    </th>
                    <th scope="col" className="a2-th-num" style={{ width: "6.5rem" }}>
                      이번 주 배정
                    </th>
                    <th scope="col" style={{ width: none ? "9rem" : "5rem" }}>
                      {none ? "가까운 가능 시간" : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cands.map((r, i) => {
                    const c = counselors.find((v) => v.id === r.id)!;
                    const match = c.topics.includes("report");
                    return (
                      <tr key={r.id}>
                        <td className="a2-td-num">{none ? "—" : i + 1}</td>
                        <td>
                          <Link
                            href={r.id === "kim-jiwon" ? COUNSELOR : `/admin2/counselors/${r.id}`}
                            className="font-semibold text-(--a2-ink) underline"
                          >
                            {c.person.name}
                          </Link>
                          <span className="block a2-t-xs text-(--a2-ink-3)">{c.person.role}</span>
                        </td>
                        <td>
                          <Status tone={match ? "ok" : "muted"}>{match ? "일치" : "불일치"}</Status>
                          <span className="block a2-t-xs text-(--a2-ink-3)">
                            {c.topics.map((t) => counselTopics[t]).join(", ")}
                          </span>
                        </td>
                        <td>
                          <Status tone={none ? "danger" : "ok"}>{none ? "불가" : "가능"}</Status>
                          <span className="block a2-t-xs text-(--a2-ink-3)">{none ? r.busy : r.free}</span>
                        </td>
                        <td className="a2-td-num">{r.week}건</td>
                        <td className="a2-nowrap">
                          {none ? (
                            <span className="a2-mono a2-t-sm text-(--a2-ink)">{r.next}</span>
                          ) : (
                            <Link href={to("assign")} className={`a2-btn a2-btn-sm ${i === 0 ? "a2-btn-primary" : ""}`}>
                              배정
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
              추천 순서는 자동 배정 기준과 같습니다 — 분야 일치(신청한 상담 주제를 맡는 상담사) → 그 시간에 가능 →
              이번 주(10.11 – 10.17) 배정이 적은 순. 60분 · 화상 면담을 맡고 노출 중인 상담사만 후보가 됩니다.
              {!none && " 이 신청은 자동 배정이 꺼져 있을 때 들어와 배정 대기로 남았습니다."} 새 신청을 결제와 함께
              자동으로 배정할지는{" "}
              <Link href="/design/admin2/settings/interview" className="underline">
                시스템 설정
              </Link>
              에서 정합니다.
            </p>
          </Panel>
        )}

        {/* ── 이 면담 — 읽기만 ── */}
        <Panel title="이 면담" meta={iv.id} flush>
          <div className="a2-form">
            <FormRow label="학생">
              <Link href="/admin2/students/S-200427" className="a2-t-sm font-semibold text-(--a2-accent-2) underline">
                {iv.student}
              </Link>
              <Tag>초5</Tag>
              <span className="a2-t-sm text-(--a2-ink-3)">서울새솔초등학교</span>
            </FormRow>
            <FormRow label="진단 결과">
              <span className="text-(--a2-ink)">2026 3분기 초5 진단</span>
              <Link href="/admin2/reports/approval" className="a2-btn a2-btn-sm">
                보고서 열기
              </Link>
            </FormRow>
            <FormRow label="상품 · 결제">
              <span className="text-(--a2-ink)">결과 해석 면담 60분</span>
              <span className="a2-num text-(--a2-ink)">100,000원</span>
              <span className="a2-mono a2-t-xs text-(--a2-ink-3)">GX2026-000160</span>
            </FormRow>
            <FormRow label="상담 주제">
              <Tag accent>결과지 해석</Tag>
            </FormRow>
            <FormRow label="상담사 선택">
              <Tag>관리자 배정 요청</Tag>
              <span className="a2-t-sm text-(--a2-ink-3)">신청자가 상담사를 고르지 않았습니다</span>
            </FormRow>
            <FormRow label="상태">
              <Status tone={done ? "ok" : "warn"}>{done ? "예약 확정" : "배정 대기"}</Status>
              <span className="a2-t-sm text-(--a2-ink-3)">
                보호자 화면에는 「{done ? "예약 확정" : "전문가 배정 중"}」으로 표시됩니다
              </span>
            </FormRow>
          </div>
        </Panel>

        <Panel title="신청" flush>
          <div className="a2-form">
            <FormRow label="신청자">
              <span className="font-semibold text-(--a2-ink)">{iv.applicant}</span>
              <Tag>아버지</Tag>
            </FormRow>
            <FormRow label="연락처">
              <span className="a2-mono">{iv.phone}</span>
            </FormRow>
            <FormRow label="메일">
              <span className="a2-mono">dongwook.shin@example.com</span>
            </FormRow>
            <FormRow label="신청 경로">홈페이지</FormRow>
            <FormRow label="신청 일시">
              <span className="a2-mono">2026-10-09 21:14</span>
              <span className="a2-t-sm text-(--a2-ink-3)">3일 경과</span>
            </FormRow>
            <FormRow label="신청 내용">
              <div className="a2-preview w-full a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                결과지에서 「탐구」는 높고 「표현」은 낮게 나왔습니다. 집에서는 말이 많은 아이라 결과와 달라
                보여서, 어떻게 읽어야 하는지 듣고 싶습니다.
              </div>
            </FormRow>
          </div>
        </Panel>

        {/* ── 면담 일정 — 실제 화면의 일정 폼. 상담사 줄만 읽기로 바뀌었다 ── */}
        <Panel title="면담 일정" meta={`${WHEN} · 60분`} lead flush>
          <div className="a2-form">
            <FormRow label="날짜" req>
              <input
                type="date"
                aria-label="면담 날짜"
                className="a2-input a2-mono"
                style={{ maxWidth: "11rem" }}
                defaultValue="2026-10-16"
              />
              <span className="a2-t-sm text-(--a2-ink-2)">금요일</span>
            </FormRow>
            <FormRow label="시작 시각" req hint="면담 시간은 결제한 상품(결과 해석 면담 60분)을 따릅니다.">
              <input
                type="time"
                step={1800}
                aria-label="면담 시작 시각"
                className="a2-input a2-mono"
                style={{ maxWidth: "8rem" }}
                defaultValue="15:00"
              />
              <select aria-label="면담 시간" className="a2-select" style={{ maxWidth: "7rem" }} defaultValue="60분" disabled>
                <option>30분</option>
                <option>60분</option>
              </select>
              <span className="a2-t-sm text-(--a2-ink-2)">16:00에 끝납니다</span>
            </FormRow>
            <FormRow label="상담사" req hint="상담사는 위 「상담사 배정」에서 정합니다.">
              {done ? (
                <Link href={COUNSELOR} className="a2-t-sm font-semibold text-(--a2-accent-2) underline">
                  김지원
                </Link>
              ) : (
                <span className="a2-t-sm text-(--a2-ink-4)">아직 배정되지 않았습니다</span>
              )}
            </FormRow>
            <FormRow label="방식" req>
              {["대면", "화상", "전화"].map((m) => (
                <label key={m} className="a2-choice">
                  <input type="radio" name="iv-mode" defaultChecked={m === "화상"} />
                  {m}
                </label>
              ))}
            </FormRow>
            <FormRow label="화상 링크" req>
              <input
                aria-label="화상 링크"
                className="a2-input"
                style={{ maxWidth: "26rem" }}
                defaultValue="https://meet.genixx.kr/cs-2610-0019"
              />
            </FormRow>
            <FormRow
              label="그날 일정"
              hint={
                done
                  ? "날짜나 시각을 바꾸면 이 상담사의 다른 면담 · 휴무일과 겹치는지 확인합니다. 겹치면 저장되지 않습니다."
                  : "상담사를 배정하면 그 상담사의 하루 일정과 빈 시간이 표시됩니다."
              }
            >
              <div className="grid w-full gap-1">
                <div className="flex justify-between a2-mono a2-t-xs text-(--a2-ink-4)">
                  {["09", "12", "15", "18", "20"].map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </div>
                {/* 09:00–20:00을 편 띠 — 15:00부터 60분 */}
                <div className="a2-cal-strip">
                  <span
                    className="a2-cal-slot"
                    data-on="true"
                    title={`15:00 ${iv.student}`}
                    style={{ top: "1px", bottom: "1px", height: "auto", left: `${(360 / 660) * 100}%`, width: `${(60 / 660) * 100}%` }}
                  />
                </div>
                <p className="a2-t-xs text-(--a2-ink-3)">
                  예약된 시간 <span className="a2-mono">15:00 {iv.student}</span>
                </p>
                {done && (
                  <p className="a2-t-xs text-(--a2-ink-3)">
                    빈 시간{" "}
                    <span className="a2-mono">10:00 · 10:30 · 11:00 · 11:30 · 13:30 · 14:00 · 14:30 · 15:00</span> 외
                    2개
                  </p>
                )}
              </div>
            </FormRow>
            <FormRow label="상담사에게 남길 말" hint="상담사가 그대로 받는 글입니다. 개인정보는 적지 않습니다.">
              <textarea aria-label="상담사에게 남길 말" className="a2-textarea" rows={3} defaultValue="" />
            </FormRow>
          </div>
        </Panel>

        {/* ── 알림 발송 내역 ── */}
        <Panel title="알림 발송 내역" meta={`${sent.length}건`} flush>
          <div className="a2-table-wrap">
            <table className="a2-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "9.5rem" }}>
                    보낸 때
                  </th>
                  <th scope="col">받는 사람</th>
                  <th scope="col">알림</th>
                  <th scope="col">방법</th>
                  <th scope="col">결과</th>
                  <th scope="col">보낸 사람</th>
                </tr>
              </thead>
              <tbody>
                {sent.map((r) => (
                  <tr key={r.at + r.who} data-on={r.fresh ? "true" : undefined}>
                    <td className="a2-mono a2-nowrap a2-t-sm">{r.at}</td>
                    <td className="a2-nowrap a2-td-key">{r.who}</td>
                    <td>{r.what}</td>
                    <td className="a2-nowrap">{r.how}</td>
                    <td className="a2-nowrap">
                      <Status tone="ok">성공</Status>
                    </td>
                    <td className="a2-nowrap">{r.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-(--a2-line) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
            시스템이 보낸 알림과 「알림 보내기」로 직접 보낸 알림이 함께 표시됩니다. 알림톡을 받을 수 없는 번호에는
            문자로 대신 보내고, 그 결과도 여기에 한 건으로 남습니다.
          </p>
        </Panel>

        <Panel title="기록" meta={`${logOf[view].length}건`}>
          <ul className="grid gap-1.5">
            {logOf[view].map((r) => (
              <li
                key={r.at + r.what}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-(--a2-line) pb-1.5 last:border-b-0 last:pb-0"
              >
                <span className="a2-mono a2-t-xs text-(--a2-ink-4)">{r.at}</span>
                <Tag accent={r.strong}>{r.what}</Tag>
                <span className="a2-t-sm text-(--a2-ink-2)">{r.why}</span>
                <span className="ml-auto a2-t-xs text-(--a2-ink-4)">{r.by}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* 저장 줄 — 실제 화면과 같은 자리. 손대기 전이라 눌리지 않는다 */}
        <div className="sticky bottom-0 z-10 -mx-3 mt-3 border-t border-(--a2-line) bg-(--a2-panel)/95 px-3 py-2.5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="mr-auto a2-t-xs text-(--a2-ink-4)">
              {done
                ? "날짜나 시각을 바꿔 저장하면 신청자와 상담사에게 「면담 일정 변경」 알림이 갑니다."
                : "날짜나 시각을 바꿔 저장하면 추천 목록을 다시 계산합니다."}
            </span>
            <button type="button" className="a2-btn" disabled>
              취소
            </button>
            <button type="button" className="a2-btn a2-btn-primary" disabled>
              저장
            </button>
          </div>
        </div>
      </Body>

      <SeedNote>이 화면의 사람과 값은 화면 설계를 위한 예시입니다.</SeedNote>

      {slug === "assign" && (
        <ConsoleDialog
          title="김지원 상담사를 배정할까요?"
          wide
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              <Link href={to("assigned")} className="a2-btn a2-btn-primary">
                배정
              </Link>
            </>
          }
        >
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-(--a2-ink-3)">면담</dt>
            <dd className="text-(--a2-ink)">
              <b>{iv.student}</b> (초5) · 결과 해석 면담 60분 · 화상
            </dd>
            <dt className="text-(--a2-ink-3)">일시</dt>
            <dd className="a2-mono text-(--a2-ink)">{WHEN}</dd>
            <dt className="text-(--a2-ink-3)">상담사</dt>
            <dd className="text-(--a2-ink)">
              <b>김지원</b> · 책임연구원 · 진단 총괄
            </dd>
            <dt className="text-(--a2-ink-3)">추천 근거</dt>
            <dd className="text-(--a2-ink)">1순위 — 분야 일치 · 그 시간 가능 · 이번 주 배정 2건</dd>
          </dl>
          <ul className="mt-3 grid gap-0.5">
            <li>예약이 바로 확정됩니다. 상담사의 수락을 기다리지 않습니다.</li>
            <li>
              신청자 {iv.applicant} 님에게 「면담 예약 확정」 알림이 갑니다 (알림톡 ·{" "}
              <span className="a2-mono">{iv.phone}</span>).
            </li>
            <li>상담사 김지원 님에게 「면담 배정」 알림이 갑니다 (알림톡).</li>
            <li>배정한 사람과 시각이 기록에 남습니다.</li>
          </ul>
          <p className="a2-hint mt-2">
            보호자 화면의 「전문가 배정 중」은 「예약 확정」으로 바뀌고, 상담사 이름과 화상 면담 링크가 표시됩니다.
          </p>
        </ConsoleDialog>
      )}

      {slug === "notify" && (
        <ConsoleDialog
          title="알림 보내기"
          wide
          actions={
            <>
              <Link href={to("assigned")} className="a2-btn">
                취소
              </Link>
              <Link href={to("notified")} className="a2-btn a2-btn-primary">
                보내기
              </Link>
            </>
          }
        >
          <div className="grid gap-3">
            <div className="a2-field">
              <span className="a2-label">받는 사람</span>
              <span className="grid gap-1">
                {[
                  { who: `신청자 ${iv.applicant}`, phone: iv.phone, on: true },
                  { who: "상담사 김지원", phone: "010-2345-6789", on: false },
                ].map((r) => (
                  <label key={r.who} className="a2-choice">
                    <input type="checkbox" defaultChecked={r.on} />
                    {r.who}
                    <span className="a2-mono a2-t-xs font-normal text-(--a2-ink-3)">{r.phone}</span>
                  </label>
                ))}
              </span>
            </div>
            <label className="a2-field block">
              <span className="a2-label">알림 종류</span>
              <select className="a2-select" defaultValue="면담 예약 확정">
                <option>면담 예약 확정</option>
                <option>면담 일정 변경</option>
                <option>면담 하루 전 안내</option>
              </select>
            </label>
            <div className="a2-field">
              <span className="a2-label">방법</span>
              <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                {["알림톡", "문자", "이메일"].map((m) => (
                  <label key={m} className="a2-choice">
                    <input type="checkbox" defaultChecked={m === "알림톡"} />
                    {m}
                  </label>
                ))}
              </span>
              <span className="a2-hint block">알림톡을 받을 수 없는 번호에는 문자로 대신 보냅니다.</span>
            </div>
            <div className="a2-field">
              <span className="a2-label">미리보기 · 신청자에게 가는 글</span>
              <div className="a2-preview whitespace-pre-line a2-t-sm leading-[1.7] text-(--a2-ink-2)">{preview}</div>
            </div>
          </div>
          <p className="a2-hint mt-2">
            이미 나간 알림을 다시 보낼 때 씁니다. 알림 글은 종류마다 정해진 양식으로 나가며 여기서 수정하지
            않습니다. 보낸 알림은 「알림 발송 내역」에 남습니다.
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
