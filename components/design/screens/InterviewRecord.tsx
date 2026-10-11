"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { Body, DescList, FormRow, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";
import ConsoleFrame, { ConsoleDialog } from "../ConsoleFrame";

/**
 * 면담 결과 기록 · 종료 승인 (실제 주소 /admin2/interviews/[id]/record · WBS L.2.12) — 디자인.
 *
 * 면담이 끝나면 상담사가 하루 안에 결과를 적어 낸다(상담사 화면 /admin2/counsel의 「상담일지」와
 * 같은 세 칸 — 상담 내용 · 권고 사항 · 후속 조치). 운영자는 이 화면에서 그 기록을 읽고
 * **승인해 종료**하거나 **보완을 요청**한다. 승인하지 않아도 제출 뒤 7일이 지나면 자동으로
 * 종료된다.
 *
 * 상담사가 기한 안에 적지 않으면 알림을 다시 보내거나, 사유를 남기고 운영자가 대신 적는다.
 * 녹음 · 녹화는 없다 — 남는 것은 이 글뿐이다.
 */

const to = designLinks("interview-record");

type Slug = "" | "waiting" | "overdue" | "write" | "return" | "returned" | "approve" | "closed";

const record = {
  summary:
    "지난 분기와 재능 유형이 달라진 이유를 결과지를 놓고 함께 읽었습니다. 과목 점수는 거의 같고, 서술형에서 근거를 적는 방식이 달라져 유형이 옮겨 간 것으로 보입니다. 보호자는 수학 점수가 낮아진 것으로 이해하고 있었으나, 실제로는 풀이 과정을 길게 쓰기 시작한 변화였음을 설명했습니다.",
  advice:
    "유형 이름보다 여섯 가지 사고 능력의 변화를 보도록 안내했습니다. 주 1회 「왜 그렇게 생각했는지」를 말로 풀어 보는 활동을 권했습니다.",
  followUp: "다음 분기 진단 뒤에 서술형 답안만 다시 비교해 보기로 했습니다.",
};

/** 화면 위 진행 띠 — 예약에서 종료까지 */
const steps = ["예약 확정", "면담 완료", "기록 제출", "승인 · 종료"];

/** 지금 기다리는 단계 — 그 앞은 끝난 단계다. 4면 모두 끝났다 */
const stepAt: Record<Slug, number> = {
  waiting: 2,
  overdue: 2,
  write: 2,
  "": 3,
  return: 3,
  returned: 3,
  approve: 3,
  closed: 4,
};

type Log = { at: string; what: string; why: string; by: string; strong?: boolean };

const baseLog: Log[] = [
  { at: "2026-10-08 15:02", what: "면담 완료", why: "화상 면담 60분을 마쳤습니다.", by: "김지원" },
  { at: "2026-10-01 10:05", what: "예약 확정", why: "결제가 끝나 예약이 확정되었습니다. 주문 GX2026-000149", by: "시스템" },
];

const logOf: Record<Slug, Log[]> = {
  waiting: baseLog,
  write: baseLog,
  overdue: [
    { at: "2026-10-10 15:00", what: "기한 초과 알림", why: "기록 기한이 하루 지나 상담사에게 다시 알렸습니다.", by: "시스템" },
    { at: "2026-10-09 15:00", what: "기한 초과 알림", why: "기록 기한이 지나 상담사와 운영자에게 알렸습니다.", by: "시스템" },
    ...baseLog,
  ],
  "": [{ at: "2026-10-08 16:20", what: "기록 제출", why: "상담사가 결과 기록을 제출했습니다.", by: "김지원", strong: true }, ...baseLog],
  return: [{ at: "2026-10-08 16:20", what: "기록 제출", why: "상담사가 결과 기록을 제출했습니다.", by: "김지원", strong: true }, ...baseLog],
  approve: [{ at: "2026-10-08 16:20", what: "기록 제출", why: "상담사가 결과 기록을 제출했습니다.", by: "김지원", strong: true }, ...baseLog],
  returned: [
    { at: "2026-10-09 10:12", what: "보완 요청", why: "권고 사항을 보호자가 실천할 수 있는 내용으로 더 구체적으로 적어 주세요.", by: "박서준", strong: true },
    { at: "2026-10-08 16:20", what: "기록 제출", why: "상담사가 결과 기록을 제출했습니다.", by: "김지원" },
    ...baseLog,
  ],
  closed: [
    { at: "2026-10-09 11:05", what: "승인 · 종료", why: "결과 기록을 확인하고 면담을 종료했습니다.", by: "박서준", strong: true },
    { at: "2026-10-08 16:20", what: "기록 제출", why: "상담사가 결과 기록을 제출했습니다.", by: "김지원" },
    ...baseLog,
  ],
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <FormRow label={label}>{children}</FormRow>;
}

export default function InterviewRecord({ state }: { state: string }) {
  const slug = state as Slug;
  const at = stepAt[slug];
  const submitted = slug === "" || slug === "return" || slug === "approve";
  const noRecord = slug === "waiting" || slug === "overdue";

  const status =
    slug === "closed" ? (
      <Status tone="muted">종료됨</Status>
    ) : slug === "returned" ? (
      <Status tone="warn">보완 대기</Status>
    ) : slug === "overdue" ? (
      <Status tone="danger">기록 기한 초과</Status>
    ) : noRecord || slug === "write" ? (
      <Status tone="warn">기록 대기</Status>
    ) : (
      <Status tone="info">승인 대기</Status>
    );

  return (
    <ConsoleFrame at="/admin2/interviews">
      <PageHead
        title="면담 결과 기록"
        back={
          <Link href="/admin2/interviews" className="a2-btn">
            ← 면담 상세
          </Link>
        }
        actions={status}
      />

      <Body className="grid gap-3">
        {/* 진행 띠 — 이 면담이 어디까지 왔는지 */}
        <ol className="grid grid-cols-4 overflow-hidden rounded-(--a2-radius) border border-(--a2-line)">
          {steps.map((s, i) => {
            const done = i < at;
            const now = i === at;
            return (
              <li
                key={s}
                className="flex items-center gap-2 border-l border-(--a2-line) px-3 py-2 first:border-l-0"
                style={now ? { background: "var(--a2-accent-soft)" } : undefined}
              >
                <span
                  aria-hidden
                  className="a2-mono a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) font-bold"
                  style={{
                    background: done ? "var(--a2-ok)" : now ? "var(--a2-accent)" : "var(--a2-raised)",
                    color: done || now ? "#fff" : "var(--a2-ink-4)",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`truncate a2-t-sm ${now ? "font-bold text-(--a2-accent-2)" : done ? "font-semibold text-(--a2-ink)" : "text-(--a2-ink-4)"}`}
                >
                  {s}
                </span>
              </li>
            );
          })}
        </ol>

        {slug === "overdue" && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>
              <b style={{ color: "var(--a2-danger)" }}>기록 기한이 2일 지났습니다.</b> 기한은 면담이 끝난 뒤
              하루(2026-10-09 15:00)까지였습니다. 상담사에게 알림을 2번 보냈습니다.
            </span>
          </p>
        )}
        {slug === "returned" && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>
              <b>보완을 요청했습니다.</b> 상담사가 기록을 고쳐 다시 제출하면 이 화면에서 승인할 수 있습니다.
              다시 제출할 기한은 2026-10-10 10:12입니다.
            </span>
          </p>
        )}
        {slug === "closed" && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-ok)" }}>
            <span>
              <b>종료된 면담입니다.</b> 2026-10-09 11:05에 박서준이 승인했습니다. 종료된 면담의 기록은 고칠 수
              없습니다.
            </span>
          </p>
        )}

        <Panel title="면담" meta="CS-2610-0012" flush>
          <div className="a2-form">
            <Row label="학생">
              <Link href="/admin2/students/S-200400" className="a2-t-sm font-semibold text-(--a2-accent-2) underline">
                김도현
              </Link>
              <Tag>초4</Tag>
              <span className="a2-t-sm text-(--a2-ink-3)">서울한빛초등학교</span>
            </Row>
            <Row label="신청자">
              <span className="font-semibold text-(--a2-ink)">김지은</span>
              <Tag>어머니</Tag>
              <span className="a2-mono a2-t-sm text-(--a2-ink-3)">010-4821-7730</span>
            </Row>
            <Row label="상담사">
              <Link href="/admin2/counselors/kim-jiwon" className="a2-t-sm font-semibold text-(--a2-accent-2) underline">
                김지원
              </Link>
              <span className="a2-t-sm text-(--a2-ink-3)">책임연구원 · 진단 총괄</span>
            </Row>
            <Row label="일시">
              <span className="a2-mono text-(--a2-ink)">2026-10-08 (목) 14:00 – 15:00</span>
              <span className="a2-t-sm text-(--a2-ink-3)">60분</span>
            </Row>
            <Row label="방식">
              <Tag accent>화상</Tag>
            </Row>
            <Row label="상품 · 결제">
              <span className="text-(--a2-ink)">결과 해석 면담 60분</span>
              <span className="a2-num text-(--a2-ink)">100,000원</span>
              <span className="a2-mono a2-t-xs text-(--a2-ink-3)">GX2026-000149</span>
            </Row>
            <Row label="진단 결과">
              <span className="text-(--a2-ink)">2026 3분기 초4 진단</span>
              <Link href="/admin2/reports/approval" className="a2-btn a2-btn-sm">
                보고서 열기
              </Link>
            </Row>
            <Row label="신청 내용">
              <div className="a2-preview w-full a2-t-sm leading-[1.7] text-(--a2-ink-2)">
                지난번과 재능 유형이 다르게 나왔는데 왜 그런지 알고 싶습니다. 수학을 어려워하게 된 건지도
                궁금합니다.
              </div>
            </Row>
          </div>
        </Panel>

        {/* ── 결과 기록 ── */}
        {noRecord && (
          <Panel
            title="결과 기록"
            meta={slug === "overdue" ? "기한 2026-10-09 15:00 · 2일 초과" : "기한 2026-10-09 15:00 · 18시간 남음"}
          >
            <p className="a2-t-sm text-(--a2-ink-2)">상담사가 아직 결과 기록을 제출하지 않았습니다.</p>
            <p className="a2-hint">
              결과 기록은 면담이 끝난 뒤 하루 안에 제출해야 합니다. 기한이 지나면 상담사와 운영자에게 알림이
              갑니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" className="a2-btn">
                {slug === "overdue" ? "알림 다시 보내기" : "기록 요청 알림 보내기"}
              </button>
              <Link href={to("write")} className="a2-btn">
                운영자가 대신 기록
              </Link>
            </div>
          </Panel>
        )}

        {slug === "write" && (
          <Panel title="결과 기록" meta="운영자가 대신 기록합니다" flush>
            <div className="a2-form">
              <FormRow label="대신 기록하는 사유" req hint="누가 대신 적었는지와 사유가 기록에 남습니다.">
                <select aria-label="대신 기록하는 사유" className="a2-select max-w-72" defaultValue="상담사가 전화로 내용을 전달함">
                  <option>상담사가 전화로 내용을 전달함</option>
                  <option>상담사 계정에 접속할 수 없음</option>
                  <option>상담사가 메일로 보낸 내용을 옮김</option>
                  <option>그 밖의 사유</option>
                </select>
              </FormRow>
              <FormRow label="상담 내용" req>
                <textarea aria-label="상담 내용" className="a2-textarea" rows={5} defaultValue={record.summary} />
              </FormRow>
              <FormRow label="권고 사항">
                <textarea aria-label="권고 사항" className="a2-textarea" rows={3} defaultValue="" placeholder="보호자에게 권한 것을 적습니다." />
              </FormRow>
              <FormRow label="후속 조치">
                <textarea aria-label="후속 조치" className="a2-textarea" rows={3} defaultValue="" placeholder="다음에 하기로 한 일이 있으면 적습니다." />
              </FormRow>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 p-3">
              <Link href={to()} className="a2-btn a2-btn-primary">
                기록 제출
              </Link>
              <button type="button" className="a2-btn">
                임시 저장
              </button>
              <Link href={to("waiting")} className="a2-btn">
                취소
              </Link>
              <span className="a2-t-xs text-(--a2-ink-4)">결과 기록은 담당 상담사와 운영 책임자만 볼 수 있습니다.</span>
            </div>
          </Panel>
        )}

        {!noRecord && slug !== "write" && (
          <Panel
            title="결과 기록"
            meta="2026-10-08 16:20 제출 · 김지원"
            actions={
              slug === "closed" ? undefined : (
                <Status tone="ok">기한 안에 제출</Status>
              )
            }
          >
            <DescList
              rows={[
                { k: "상담 내용", v: <span className="leading-[1.7]">{record.summary}</span> },
                { k: "권고 사항", v: <span className="leading-[1.7]">{record.advice}</span> },
                { k: "후속 조치", v: <span className="leading-[1.7]">{record.followUp}</span> },
              ]}
            />
            <p className="a2-hint mt-2">결과 기록은 담당 상담사와 운영 책임자만 볼 수 있습니다. 보호자 화면에는 표시되지 않습니다.</p>
          </Panel>
        )}

        {submitted && (
          <Panel title="승인 · 종료" meta="자동 종료 예정 2026-10-15 16:20">
            <p className="a2-t-sm leading-[1.7] text-(--a2-ink-2)">
              기록을 확인했으면 <b className="text-(--a2-ink)">승인하고 종료</b>합니다. 내용이 부족하면{" "}
              <b className="text-(--a2-ink)">보완을 요청</b>해 상담사가 다시 제출하게 합니다.
            </p>
            <p className="a2-hint">승인하지 않아도 기록을 제출한 뒤 7일이 지나면 자동으로 종료됩니다.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Link href={to("return")} className="a2-btn">
                보완 요청
              </Link>
              <Link href={to("approve")} className="a2-btn a2-btn-primary">
                승인하고 종료
              </Link>
            </div>
          </Panel>
        )}

        <Panel title="기록" meta={`${logOf[slug].length}건`}>
          <ul className="grid gap-1.5">
            {logOf[slug].map((r) => (
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
      </Body>

      {slug === "return" && (
        <ConsoleDialog
          title="상담사에게 보완을 요청합니다"
          wide
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              <Link href={to("returned")} className="a2-btn a2-btn-primary">
                보완 요청
              </Link>
            </>
          }
        >
          <div className="grid gap-3">
            <label className="a2-field">
              <span className="a2-label">무엇을 보완해야 하나요</span>
              <select className="a2-select" defaultValue="권고 사항이 구체적이지 않음">
                <option>상담 내용이 부족함</option>
                <option>권고 사항이 구체적이지 않음</option>
                <option>후속 조치가 빠져 있음</option>
                <option>개인정보가 필요 이상으로 적혀 있음</option>
                <option>그 밖의 사유</option>
              </select>
            </label>
            <label className="a2-field">
              <span className="a2-label">상담사에게 전할 말</span>
              <textarea
                className="a2-textarea"
                rows={3}
                defaultValue="권고 사항을 보호자가 실천할 수 있는 내용으로 더 구체적으로 적어 주세요."
              />
            </label>
          </div>
          <p className="a2-hint mt-2">
            요청하면 상담사에게 알림이 가고, 다시 제출할 기한은 하루입니다. 요청한 내용은 기록에 남습니다.
          </p>
        </ConsoleDialog>
      )}

      {slug === "approve" && (
        <ConsoleDialog
          title="이 면담을 승인하고 종료할까요?"
          actions={
            <>
              <Link href={to()} className="a2-btn">
                취소
              </Link>
              <Link href={to("closed")} className="a2-btn a2-btn-primary">
                승인하고 종료
              </Link>
            </>
          }
        >
          <p>
            <b className="text-(--a2-ink)">김도현</b> 학생 · 상담사 김지원 ·{" "}
            <span className="a2-mono">2026-10-08 14:00</span> 면담을 종료합니다.
          </p>
          <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
            <span>종료하면 결과 기록을 더 고칠 수 없습니다. 보호자 화면에는 「면담 완료」로 표시됩니다.</span>
          </p>
        </ConsoleDialog>
      )}
    </ConsoleFrame>
  );
}
