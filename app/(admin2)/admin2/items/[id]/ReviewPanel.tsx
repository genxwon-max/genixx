"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { downloadAuditCsv, printAudit } from "@/lib/auditReport";
import {
  AI_AUDIT_MAX,
  aiAuditable,
  aiVerdictLabel,
  approveItem,
  blankChecks,
  clearReviewDraft,
  humanReviewable,
  reasonText,
  rejectItem,
  rejectLabel,
  reviewChecks,
  runAiAudit,
  saveReviewDraft,
  type ItemDraft,
  type ReviewCheckResult,
} from "@/lib/itemStore";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { Panel } from "@/components/admin2/ui";

/**
 * 검수판 (EXP-03) — 3단을 **확인**하거나 **반려**한다.
 *
 * ── 확인은 누르면 끝이다 ──
 * 한동안 칸마다 「통과 / 걸림」을 누르면 까닭 고르개와 덧붙임 칸이 열리고, 승인에는 소견문
 * 열 자가 필요했다. 무엇 때문에 많이 걸리는지 세려던 것인데, 막상 검수자는 문제없는 문항에도
 * 칸 셋을 채워야 승인할 수 있었다. 이제 확인은 누르는 것으로 끝나고, 셋 다 확인이면 승인이 열린다.
 *
 * ── 반려 내용은 적어도 되고 안 적어도 된다 ──
 * 반려를 누른 갈래에만 반려 내용 칸이 열린다. 비워도 반려할 수 있다. 출제자에게 가는 글에는
 * 반려한 갈래 이름이 늘 선다 — 내용을 적었으면 그 뒤에 붙는다. 이름까지 빼면 옛 콘솔의 출제
 * 화면(components/admin/ItemCard.tsx)은 코멘트만 읽어서, 출제자가 빈 「반려」 한 줄만 받는다.
 * 반려 사유 코드 고르개도 걷었다. 기록 쪽 code는 비워 둔다(옛 기록 · AI 검수는 그대로 코드를 든다).
 *
 * ── 옛 검수판에서 쓰던 검수를 버리지 않는다 ──
 * 옛 콘솔 검수(components/admin/ReviewCard.tsx)는 지금도 같은 문항에 쓰던 검수를 붙여 둔다 —
 * 사유 코드 · 소견문 · 고른 소견(reason). 이 판에 그 칸이 없다고 흘려버리면, 임시 저장 한 번에
 * 옛 콘솔로 돌아가도 적어 둔 것이 사라지고, 반려하면 빈 반려가 나간다. 그래서 코드와 소견문은
 * 판 위에 읽기로 세우고 승인 · 반려 · 임시 저장에 그대로 싣는다. 버리려면 「쓰던 검수 지우기」.
 *
 * ── AI 검수가 먼저다 (2026-09-21 협의) ──
 * 흐름은 「출제 → AI 검수 → 검수자」다. 이번 제출분에 AI 검수가 없으면 승인 · 반려를 잠그고 판
 * 머리에서 AI 검수를 돌리게 한다. AI 결과는 판 맨 위에 서고, 인쇄 · 다운로드할 수 있다. AI는
 * 결론을 내지 않으므로 「통과 권고」여도 승인은 검수자가 누른다. AI를 두 번 다 쓴 문항은 결과
 * 없이도 검수자가 본다(lib/itemStore.ts humanReviewable).
 *
 * 쓰다 만 검수는 문항에 붙여 둔다. 검수는 한 건에 몇 분씩 걸리고 중간에 다른 문항을
 * 열어 볼 일이 생기는데, 돌아왔을 때 짚어 둔 것이 날아가 있으면 처음부터 다시 읽어야 한다.
 */
export default function ReviewPanel({ item }: { item: ItemDraft }) {
  const prefs = useAdminPrefs();
  const saved = item.reviewDraft;

  const [checks, setChecks] = useState<ReviewCheckResult[]>(saved?.checks ?? blankChecks());
  /* 옛 검수판이 붙여 둔 사유 코드 · 소견문 — 이 판에서는 고치지 않고 싣기만 한다 */
  const legacyCode = saved?.code;
  const legacyText = saved?.text?.trim() ?? "";

  const by = prefs.staffName || "운영자";
  /* 자기가 쓴 문항을 자기가 보는 것 — 슈퍼 관리자만 열려 있고, 승인해도 기록에
     남는다(reviews[].self). 목록에서 붉은 점으로 세는 값이 이것이다. */
  const self = item.author === prefs.loginId;

  const at = (id: string) => checks.find((c) => c.id === id)!;
  const put = (id: string, patch: Partial<ReviewCheckResult>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const allOk = checks.every((c) => c.ok === true);
  const anyReject = checks.some((c) => c.ok === false);

  /* 출제자에게 가는 글 — 반려한 갈래마다 한 줄. 옛 검수판에서 고른 소견과 적은 내용이 있으면
     갈래 이름 뒤에 붙이고, 옛 소견문은 맨 끝에 싣는다 */
  const rejectText = [
    ...reviewChecks
      .map((c) => ({ id: c.id, label: c.label, cur: at(c.id) }))
      .filter(({ cur }) => cur.ok === false)
      .map(({ id, label, cur }) => {
        const detail = [reasonText(id, false, cur.reason), cur.note.trim()]
          .filter(Boolean)
          .join(" · ");
        return detail ? `${label} — ${detail}` : label;
      }),
    legacyText,
  ]
    .filter(Boolean)
    .join("\n");

  /* 기록에는 짚은 그대로 남긴다. 확인 · 반려를 뒤집으면 put이 고른 소견과 반려 내용을 비우므로,
     남아 있는 것은 지금 상태에 맞는 값이다 */
  const recorded = () => checks.map((c) => ({ ...c, note: c.note.trim() }));

  const done = () => setChecks(blankChecks());

  /* 이번 제출분에 AI 검수가 없고 아직 돌릴 수 있으면 사람의 판단을 잠근다 */
  const open = humanReviewable(item);
  const ai = item.aiAudit;
  const lockNote = open ? undefined : "AI 검수를 먼저 돌려야 승인 · 반려할 수 있습니다";

  return (
    <Panel
      title="검수"
      meta="1차 내용 · 2차 태깅 교차검증 · 3차 윤리·편향"
      actions={
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          onClick={() =>
            saveReviewDraft(item.id, { by, checks, code: legacyCode, text: saved?.text ?? "" })
          }
        >
          임시 저장
        </button>
      }
    >
      {self && (
        <p className="a2-note mb-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
          이 문항의 출제자가 지금 로그인한 계정입니다. 슈퍼 관리자라 막지 않지만, 자가 검수로 기록에 남습니다.
        </p>
      )}

      {/* AI 검수 결과 — 이번 제출분. 결론이 아니라 검수자에게 건네는 권고다 */}
      <div className="mb-2 border-b border-(--a2-line) pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="a2-t-sm font-bold text-(--a2-ink)">AI 검수</span>
          <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
            {item.aiAuditCount ?? 0}/{AI_AUDIT_MAX}회
          </span>
          <span className="ml-auto flex items-center gap-1">
            {ai ? (
              <>
                <button type="button" className="a2-btn a2-btn-sm" onClick={() => printAudit([item])}>
                  인쇄
                </button>
                <button type="button" className="a2-btn a2-btn-sm" onClick={() => downloadAuditCsv([item])}>
                  다운로드
                </button>
              </>
            ) : (
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-primary"
                disabled={!aiAuditable(item)}
                title={
                  aiAuditable(item)
                    ? undefined
                    : `AI 검수는 한 문항에 ${AI_AUDIT_MAX}번까지입니다 — 검수자가 바로 봅니다`
                }
                onClick={() => runAiAudit([item.id])}
              >
                AI 검수 돌리기
              </button>
            )}
          </span>
        </div>
        {ai ? (
          <>
            <p className="mt-1 a2-t-sm">
              <b
                style={{
                  color:
                    ai.verdict === "reject"
                      ? "var(--a2-danger)"
                      : ai.verdict === "hold"
                        ? "var(--a2-warn)"
                        : "var(--a2-ok)",
                }}
              >
                {aiVerdictLabel[ai.verdict]}
              </b>{" "}
              <span className="text-(--a2-ink-3)">
                · 규칙 위반 {ai.blocks} · 확인 필요 {ai.warns} · {ai.at}
                {ai.code && ` · ${rejectLabel(ai.code)}`}
              </span>
            </p>
            {ai.checks.some((c) => c.notes.length > 0) && (
              <ul className="mt-1 space-y-0.5">
                {ai.checks.flatMap((c) =>
                  c.notes.map((note, k) => (
                    <li key={`${c.id}-${k}`} className="a2-t-xs text-(--a2-ink-2)">
                      <span className="font-semibold text-(--a2-ink-3)">
                        {reviewChecks.find((x) => x.id === c.id)?.label}
                      </span>{" "}
                      {note}
                    </li>
                  )),
                )}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-1 a2-hint">
            {aiAuditable(item)
              ? "이번 제출분은 아직 AI가 보지 않았습니다. AI 검수를 돌린 뒤 결과를 보고 판단합니다."
              : `AI 검수를 ${AI_AUDIT_MAX}번 모두 썼습니다. 검수자가 바로 판단합니다.`}
          </p>
        )}
      </div>

      {(legacyCode || legacyText) && (
        <p className="a2-note mb-2">
          <span className="whitespace-pre-line">
            <b>먼저 적어 둔 소견</b>
            {legacyCode && ` · ${rejectLabel(legacyCode)}`}
            {legacyText && `\n${legacyText}`}
          </span>
        </p>
      )}

      <ul className="space-y-2">
        {reviewChecks.map((c) => {
          const cur = at(c.id);
          return (
            <li key={c.id} className="border-b border-(--a2-line) pb-2 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="a2-t-sm font-bold text-(--a2-ink)">{c.label}</span>
                <span className="flex items-center gap-1">
                  {/* 확인 · 반려 · 안 봄은 서로 다른 상태다. 다시 누르면 안 본 것으로 되돌아간다 */}
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      className="a2-btn a2-btn-sm"
                      aria-pressed={cur.ok === v}
                      style={
                        cur.ok === v
                          ? {
                              borderColor: v ? "var(--a2-ok)" : "var(--a2-danger)",
                              color: v ? "var(--a2-ok)" : "var(--a2-danger)",
                              fontWeight: 700,
                            }
                          : undefined
                      }
                      onClick={() => {
                        /* 뒤집으면 고른 소견과 반려 내용을 비운다 — 반려로 적은 글이 확인한 갈래에
                           숨은 채 기록에 남으면 안 된다 */
                        const next = cur.ok === v ? null : v;
                        put(c.id, {
                          ok: next,
                          reason: undefined,
                          note: next === false ? cur.note : "",
                        });
                      }}
                    >
                      {v ? "확인" : "반려"}
                    </button>
                  ))}
                </span>
              </div>
              <p className="a2-hint">{c.desc}</p>

              {cur.ok === false && (
                <label className="a2-field mt-1.5 block">
                  <span className="a2-label">반려 내용</span>
                  <GrowTextarea
                    className="a2-textarea"
                    rows={2}
                    value={cur.note}
                    onChange={(e) => put(c.id, { note: e.target.value })}
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="a2-btn a2-btn-primary"
          disabled={!open || !allOk}
          title={lockNote ?? (allOk ? undefined : "3단을 모두 확인해야 승인할 수 있습니다")}
          onClick={() => {
            /* 옛 소견문에 사유 코드가 붙어 있으면 반려로 쓰던 글이라 승인에는 싣지 않는다 */
            approveItem(item.id, by, legacyCode ? "" : legacyText, recorded(), self);
            done();
          }}
        >
          승인
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-danger"
          disabled={!open || !anyReject}
          title={lockNote ?? (anyReject ? undefined : "반려한 갈래가 있어야 반려할 수 있습니다")}
          onClick={() => {
            rejectItem(item.id, by, legacyCode, rejectText, recorded(), self);
            done();
          }}
        >
          반려
        </button>
        {saved && (
          <button
            type="button"
            className="a2-btn a2-btn-sm"
            onClick={() => {
              clearReviewDraft(item.id);
              done();
            }}
          >
            쓰던 검수 지우기
          </button>
        )}
      </div>
    </Panel>
  );
}
