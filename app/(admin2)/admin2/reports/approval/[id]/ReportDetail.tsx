"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { useHydrated } from "@/lib/examStore";
import {
  axisScoresOf,
  sendActions,
  unmeasuredAxes,
  sendNow,
  today,
  useSendPolicy,
  useSendRow,
} from "@/lib/reportSendStore";
import { Body, DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";
import Preview from "./Preview";

/**
 * EXP-08 리포트 상세 — 이 회원의 평가와 리포트.
 *
 * 판 넷이 사람이 하는 차례 그대로 선다 —
 *
 *   평가 정보  이 아이가 무엇을 어떻게 봤나. 리포트를 읽기 전에 먼저 보는 것
 *   발송       언제 나가고, 지금 보낼 것인가
 *   리포트     무엇이 담겼는지 한 줄. 읽고 고치는 것은 「리포트 보기」 안에서
 *   기록       누가 무엇을 했나
 *
 * ── 읽는 것도 고치는 것도 「리포트 보기」 안에서 ──
 * 한동안 이 판 안에서 블록을 펴서 고쳤다. 그런데 그 화면에는 근거 줄과 라벨링 점검이 함께
 * 붙어 있어, **고치는 사람이 회원이 받는 꼴을 못 보고 고쳤다.** 앞뒤 문단과 어떻게 이어지는지가
 * 안 보이면 문장을 다듬을 수가 없다. 고치는 자리를 미리보기 안으로 옮겼다(./Preview.tsx) —
 * 자리가 둘이면 어느 쪽이 실제로 나가는 글인지 묻게 되기도 했다.
 *
 * ⚠ 이미 보낸 리포트는 고치지 못한다. 보호자가 이미 읽은 글이라 뒤에서 바뀌면 안 되고,
 *   overrideBlock도 published면 아무것도 하지 않는다 — 미리보기가 「수정」 단추를 아예 내지 않는다.
 *
 * ⚠ 여기서 고치는 것은 **이 아이 하나뿐이다.** 문구가 아니라 템플릿이 잘못됐으면 해석
 *   템플릿(ADM-08-1)을 고쳐야 같은 문제가 다음 아이에게 안 간다. 그 링크를 판 머리에 둔다.
 */
export default function ReportDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const now = hydrated ? today() : "";
  const row = useSendRow(id, now);
  const policy = useSendPolicy();
  const by = useAdminPrefs().staffName || "운영자";

  const [ask, setAsk] = useState(false);
  const [preview, setPreview] = useState(false);

  const back = (
    <Link href="/admin2/reports/approval" className="a2-btn">
      ← 리포트 승인
    </Link>
  );

  if (!hydrated) return <PageHead title="리포트" back={back} />;

  if (!row) {
    return (
      <>
        <PageHead title="찾지 못했습니다" back={back} />
        <Body>
          <Panel title="없는 리포트">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 리포트가 목록에 없습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  const sent = row.send === "sent";
  const scores = axisScoresOf(row);
  /** 보낼 수 없는 까닭 — 없으면 보낼 수 있다 */
  const stop = row.banned > 0 ? "검토가 필요한 표현이 있어 보낼 수 없습니다." : null;

  return (
    <>
      <PageHead
        title={`${row.student} 리포트`}
        back={back}
        actions={
          sent ? (
            <Status tone="muted">보냄 · {row.sentAt}</Status>
          ) : (
            <button
              type="button"
              className="a2-btn a2-btn-primary"
              disabled={!!stop}
              title={stop ?? undefined}
              onClick={() => setAsk(true)}
            >
              지금 보내기
            </button>
          )
        }
      />

      <Body className="grid gap-3">
        {row.banned > 0 && (
          <p className="a2-note" style={{ borderLeftColor: "var(--a2-danger)" }}>
            <span>
              검토가 필요한 표현이 {row.banned}개 있어 보낼 수 없습니다. 아래 리포트에서 걸린
              블록을 고쳐 주세요.
            </span>
          </p>
        )}

        <Panel title="평가 정보" meta={row.id}>
          <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
            <DescList
              rows={[
                { k: "회원", v: `${row.student} · ${row.grade}` },
                { k: "회차", v: row.round },
                {
                  k: "재능 유형",
                  v: (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-(--a2-ink)">{row.typeName}</span>
                      <Tag accent>{row.typeCode}</Tag>
                    </span>
                  ),
                },
                { k: "조립", v: <span className="a2-mono">{row.assembledAt}</span> },
                {
                  k: "검토",
                  v:
                    row.banned > 0 ? (
                      <Status tone="danger">검토필요 {row.banned}개</Status>
                    ) : row.cautions > 0 ? (
                      <Status tone="warn">검토중 {row.cautions}개</Status>
                    ) : (
                      <Status tone="ok">완료</Status>
                    ),
                },
              ]}
            />

            {/* 축 점수는 블록의 근거 줄에서 뽑아 온다 — 조립기가 본 값 그대로다 */}
            <div>
              <p className="a2-label mb-2">측정된 축</p>
              {scores.length === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">근거에 적힌 점수가 없습니다.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {/* ⚠ ui.tsx의 Bar를 쓰지 않는다. 저것은 막대 옆에 제 손으로 「78%」를
                      찍는데 축 점수는 비율이 아니라 점수라, 옆에 세운 「78」과 겹쳐
                      「78% 78」이 나란히 섰다. 막대만 놓고 숫자는 한 번만 적는다 */}
                  {scores.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 a2-t-sm">{s.label}</span>
                      <span
                        className="a2-bar"
                        role="img"
                        aria-label={`${s.label} ${s.score}점`}
                        style={{ width: "100%" }}
                      >
                        <span style={{ width: `${s.score}%` }} />
                      </span>
                      <span className="a2-num w-7 shrink-0 text-right a2-t-sm text-(--a2-ink)">
                        {s.score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 a2-t-xs text-(--a2-ink-4)">
                재지 않은 축 — {unmeasuredAxes.join(" · ")}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="발송" meta={sent ? "보냄" : `조립 +${policy.days}일`}>
          {sent ? (
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{row.sentAt}</span> 에 {row.sentBy} 님이 보냈습니다.
              보호자 화면이 열려 있습니다.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="a2-t-sm text-(--a2-ink-2)">
                예정일{" "}
                <span className="a2-mono font-semibold text-(--a2-ink)">{row.sendOn}</span>
              </span>
              <span className="a2-t-sm text-(--a2-ink-3)">
                {row.daysLeft == null
                  ? ""
                  : row.daysLeft < 0
                    ? `${-row.daysLeft}일 지남`
                    : row.daysLeft === 0
                      ? "오늘"
                      : `${row.daysLeft}일 뒤`}
              </span>
              <button
                type="button"
                className="a2-btn a2-btn-primary ml-auto"
                disabled={!!stop}
                title={stop ?? undefined}
                onClick={() => setAsk(true)}
              >
                지금 보내기
              </button>
            </div>
          )}
        </Panel>

        <Panel
          title="리포트"
          meta={`블록 ${row.blocks.length}개`}
          actions={
            <>
              <Link href="/admin2/reports/templates" className="a2-btn a2-btn-sm">
                해석 템플릿
              </Link>
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-primary"
                onClick={() => setPreview(true)}
              >
                리포트 보기
              </button>
            </>
          }
        >
          {/* 판 안에서 블록을 펴서 고치던 것을 걷었다. 고치는 자리가 둘(판 · 미리보기)이면
              어느 쪽이 실제로 나가는 글인지 묻게 되고, 무엇보다 **고치는 사람이 보아야 하는
              것은 회원이 받는 꼴**이다. 읽는 것도 고치는 것도 「리포트 보기」 안에서 한다 */}
          <p className="a2-t-sm text-(--a2-ink-2)">
            {row.blocks.map((b) => b.section).join(" · ")}
          </p>
          <p className="mt-1 a2-t-xs text-(--a2-ink-4)">
            {sent
              ? "이미 보낸 리포트라 고칠 수 없습니다."
              : "「리포트 보기」에서 회원이 받는 꼴로 보고, 그 안에서 고칩니다."}
          </p>
        </Panel>

        <Panel title="기록" meta={`${row.sendLog.length + row.log.length}건`}>
          <div className="grid gap-3">
            <div>
              <p className="a2-label mb-1.5">발송</p>
              {row.sendLog.length === 0 ? (
                <p className="a2-t-sm text-(--a2-ink-3)">아직 보낸 적이 없습니다.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {row.sendLog.map((l, k) => (
                    <li
                      key={`${l.at}-${k}`}
                      className="flex flex-wrap items-center gap-x-2 border-l-2 border-(--a2-accent-line) pl-2 a2-t-xs"
                    >
                      <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                      <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                      <Tag>{sendActions[l.action]}</Tag>
                      <span className="text-(--a2-ink-2)">{l.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="a2-label mb-1.5">조립 · 수정 · 발행</p>
              <ul className="grid gap-1.5">
                {row.log.map((l, k) => (
                  <li
                    key={`${l.at}-${k}`}
                    className="flex flex-wrap items-center gap-x-2 border-l-2 border-(--a2-line-2) pl-2 a2-t-xs"
                  >
                    <span className="a2-mono text-(--a2-ink-4)">{l.at}</span>
                    <span className="font-bold text-(--a2-ink-2)">{l.by}</span>
                    <span className="text-(--a2-ink-2)">{l.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </Body>

      {preview && <Preview row={row} by={by} sent={sent} onClose={() => setPreview(false)} />}

      {ask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => setAsk(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="a2-send-title"
            className="a2-panel w-full max-w-[26rem] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="a2-send-title" className="a2-h">
              {row.student} 님에게 리포트를 보냅니다
            </h2>
            <p className="mt-2 a2-t-sm leading-[1.6] text-(--a2-ink-2)">
              보내는 순간 보호자 화면이 열립니다. 되돌릴 수 없습니다.
            </p>
            {row.cautions > 0 && (
              <p className="a2-note mt-3" style={{ borderLeftColor: "var(--a2-warn)" }}>
                <span>검토중인 표현이 {row.cautions}개 있습니다.</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-1.5">
              <button type="button" className="a2-btn" onClick={() => setAsk(false)}>
                그만두기
              </button>
              <button
                type="button"
                className="a2-btn a2-btn-primary"
                onClick={() => {
                  sendNow(row, by);
                  setAsk(false);
                }}
              >
                보내기
              </button>
            </div>
          </div>
        </div>
      )}

      <SeedNote />
    </>
  );
}

