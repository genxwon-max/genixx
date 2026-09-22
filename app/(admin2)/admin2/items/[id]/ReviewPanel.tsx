"use client";

import { useMemo, useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import { buildCardReport, reportStatusLabel, sectionName } from "@/lib/cardReport";
import {
  AI_AUDIT_MAX,
  aiAuditable,
  aiVerdictLabel,
  approveItem,
  clearReviewDraft,
  humanReviewable,
  rejectItem,
  reviewChecks,
  runAiAudit,
  saveReviewDraft,
  type ItemDraft,
  type ReviewCheckResult,
} from "@/lib/itemStore";
import AuditReportView from "@/components/admin2/AuditReportView";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { Panel } from "@/components/admin2/ui";

/**
 * 검수판 (EXP-03) — AI 검수 보고서를 보고 승인하거나, 반려할 부분과 사유를 적어 돌려보낸다
 * (2026-09-22 요청).
 *
 * ── 1 · 2 · 3차 확인 줄을 걷었다 ──
 * 한동안 검수자가 내용 · 태깅 · 윤리 세 갈래마다 「확인 · 반려」를 눌렀다. 그런데 그 세 갈래를 실제로
 * 대조하는 것은 AI 검수이고, 검수자가 하는 일은 그 결과를 읽고 결론을 내는 것이다. 같은 갈래를 사람이
 * 한 번 더 누르게 두면 누른 것이 무엇을 본 것인지 기록으로 남지 않는다. 이제 흐름은 —
 *
 *   AI 검수 돌리기 → AI 검수 보고서 보기(문항 카드 항목마다 판정 · lib/cardReport.ts)
 *     → 승인(문항 은행으로) 또는 반려(반려할 부분을 고르고 사유를 적어 출제자에게)
 *
 * ── 반려에는 사유가 있어야 한다 ──
 * 출제자는 이 글 하나를 받고 고친다. 비어 있으면 무엇을 고쳐야 할지 모른다 — 사유를 적어야 반려가 열린다.
 * 반려할 부분(카드 항목)은 보고서에서 「보완 필요」인 것을 미리 골라 둔다. 고른 부분은 출제자에게 가는 글
 * 맨 앞에 서고, 기록의 3단(checks)에는 그 항목이 든 갈래를 「걸림」으로 남긴다.
 *
 * AI 검수를 두 번 다 쓴 문항은 보고서 없이도 검수자가 판단한다(humanReviewable). 쓰다 만 반려 사유는
 * 「임시 저장」으로 문항에 붙여 둔다.
 */
export default function ReviewPanel({ item }: { item: ItemDraft }) {
  const prefs = useAdminPrefs();
  const by = prefs.staffName || "운영자";
  /* 자기가 쓴 문항을 자기가 보는 것 — 슈퍼 관리자만 열려 있고, 기록에 남는다(reviews[].self) */
  const self = item.author === prefs.loginId;

  const ai = item.aiAudit;
  const open = humanReviewable(item);
  const report = useMemo(() => (ai ? buildCardReport(item) : null), [ai, item]);
  const needFix = report?.sections.filter((s) => s.status === "fail") ?? [];

  const [showReport, setShowReport] = useState(false);
  const [rejecting, setRejecting] = useState(!!item.reviewDraft?.text);
  const [parts, setParts] = useState<string[]>(() => needFix.map((s) => s.key));
  const [reason, setReason] = useState(item.reviewDraft?.text ?? "");

  const partName = (key: string) => {
    const s = report?.sections.find((x) => x.key === key);
    return s ? sectionName(s) : key;
  };

  /* 기록의 3단 — 고른 부분이 든 갈래는 걸림, 나머지는 확인 안 함(반려) / 모두 통과(승인) */
  const checksFor = (verdict: "approve" | "reject"): ReviewCheckResult[] =>
    reviewChecks.map((c) => {
      const hit = parts.filter((k) => report?.sections.find((s) => s.key === k)?.tier === c.id);
      return {
        id: c.id,
        ok: verdict === "approve" ? true : hit.length ? false : null,
        note: verdict === "reject" ? hit.map(partName).join(" · ") : "",
      };
    });

  const rejectText = [parts.length ? `[반려한 부분] ${parts.map(partName).join(" · ")}` : "", reason.trim()]
    .filter(Boolean)
    .join("\n");

  const lockNote = open ? undefined : "AI 검수를 먼저 돌려야 승인 · 반려할 수 있습니다";

  return (
    <Panel
      title="검수"
      meta="AI 검수 보고서 → 승인 · 반려"
      actions={
        rejecting && (
          <button
            type="button"
            className="a2-btn a2-btn-sm"
            onClick={() => saveReviewDraft(item.id, { by, checks: checksFor("reject"), text: reason })}
          >
            임시 저장
          </button>
        )
      }
    >
      {self && (
        <p className="a2-note mb-2" style={{ borderLeftColor: "var(--a2-danger)" }}>
          이 문항의 출제자가 지금 로그인한 계정입니다. 슈퍼 관리자라 막지 않지만, 자가 검수로 기록에 남습니다.
        </p>
      )}

      {/* ① AI 검수 — 돌리기 · 보고서 보기 */}
      <div className="border-b border-(--a2-line) pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="a2-t-sm font-bold text-(--a2-ink)">AI 검수</span>
          <span className="a2-mono a2-t-xs text-(--a2-ink-4)">
            {item.aiAuditCount ?? 0}/{AI_AUDIT_MAX}회
          </span>
          <span className="ml-auto">
            {ai ? (
              <button type="button" className="a2-btn a2-btn-sm a2-btn-primary" onClick={() => setShowReport(true)}>
                AI 검수 보고서 보기
              </button>
            ) : (
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-primary"
                disabled={!aiAuditable(item)}
                title={aiAuditable(item) ? undefined : `AI 검수는 한 문항에 ${AI_AUDIT_MAX}번까지입니다 — 검수자가 바로 봅니다`}
                onClick={() => runAiAudit([item.id])}
              >
                AI 검수 돌리기
              </button>
            )}
          </span>
        </div>
        {ai && report ? (
          <p className="mt-1.5 a2-t-sm text-(--a2-ink-2)">
            권고{" "}
            <b
              style={{
                color:
                  ai.verdict === "reject" ? "var(--a2-danger)" : ai.verdict === "hold" ? "var(--a2-warn)" : "var(--a2-ok)",
              }}
            >
              {aiVerdictLabel[ai.verdict]}
            </b>
            <span className="text-(--a2-ink-3)">
              {" "}
              · {reportStatusLabel.fail} {report.fails} · {reportStatusLabel.warn} {report.warns} · {ai.at}
            </span>
          </p>
        ) : (
          <p className="mt-1 a2-hint">
            {aiAuditable(item)
              ? "AI 검수를 돌리면 문항 카드 항목마다 판정한 보고서가 나옵니다. 보고서를 보고 승인 · 반려합니다."
              : `AI 검수를 ${AI_AUDIT_MAX}번 모두 썼습니다. 검수자가 문항을 보고 바로 판단합니다.`}
          </p>
        )}
      </div>

      {/* ② 결론 — 승인 또는 반려(부분 + 사유) */}
      {rejecting ? (
        <div className="mt-2.5 grid gap-2">
          <div>
            <p className="a2-label mb-1">반려할 부분</p>
            {report ? (
              <div className="flex flex-wrap gap-1">
                {report.sections.map((s) => {
                  const on = parts.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      aria-pressed={on}
                      className="a2-btn a2-btn-sm"
                      style={
                        on
                          ? { borderColor: "var(--a2-danger)", color: "var(--a2-danger)", fontWeight: 700 }
                          : s.status === "fail"
                            ? { borderStyle: "dashed", borderColor: "var(--a2-danger)" }
                            : undefined
                      }
                      title={`${reportStatusLabel[s.status]} — ${s.findings.map((f) => f.text).join(" ") || "걸린 것 없음"}`}
                      onClick={() => setParts((p) => (on ? p.filter((x) => x !== s.key) : [...p, s.key]))}
                    >
                      {sectionName(s)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="a2-hint">보고서가 없어 부분을 고를 수 없습니다. 사유에 적어 주세요.</p>
            )}
            {report && <p className="a2-hint mt-1">점선 테두리는 보고서에서 「보완 필요」인 항목입니다.</p>}
          </div>
          <label className="a2-field block">
            <span className="a2-label">
              반려 사유 <span style={{ color: "var(--a2-danger)" }}>*</span>
            </span>
            <GrowTextarea
              className="a2-textarea"
              rows={3}
              value={reason}
              placeholder="출제자가 무엇을 어떻게 고쳐야 하는지 적어 주세요."
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="a2-btn a2-btn-danger"
              disabled={!open || !reason.trim()}
              title={lockNote ?? (reason.trim() ? undefined : "반려 사유를 적어야 반려할 수 있습니다")}
              onClick={() => rejectItem(item.id, by, undefined, rejectText, checksFor("reject"), self)}
            >
              반려하기
            </button>
            <button
              type="button"
              className="a2-btn"
              onClick={() => {
                setRejecting(false);
                if (item.reviewDraft) clearReviewDraft(item.id);
              }}
            >
              그만두기
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!open}
            title={lockNote ?? "승인하면 문항 은행으로 올라갑니다"}
            onClick={() => {
              const warn =
                needFix.length > 0
                  ? `AI 검수 보고서에 「보완 필요」 항목이 ${needFix.length}개 있습니다.\n${needFix
                      .map(sectionName)
                      .join(" · ")}\n\n그래도 승인할까요?`
                  : "승인하면 문항 은행으로 올라갑니다. 승인할까요?";
              if (!window.confirm(warn)) return;
              approveItem(item.id, by, "", checksFor("approve"), self);
            }}
          >
            승인
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-danger"
            disabled={!open}
            title={lockNote}
            onClick={() => {
              /* 반려할 부분은 보고서의 「보완 필요」를 미리 골라 둔다 — 고칠 곳이 거기서 나온다 */
              if (parts.length === 0) setParts(needFix.map((x) => x.key));
              setRejecting(true);
            }}
          >
            반려
          </button>
        </div>
      )}

      {showReport && <AuditReportView item={item} onClose={() => setShowReport(false)} />}
    </Panel>
  );
}
