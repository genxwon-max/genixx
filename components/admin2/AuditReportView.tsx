"use client";

import { useEffect, useMemo, useRef } from "react";
import { gradeText, levelSpecs } from "@/lib/blueprint";
import { downloadAuditCsv, printAudit } from "@/lib/auditReport";
import { buildCardReport, reportStatusLabel, type ReportSection, type ReportStatus } from "@/lib/cardReport";
import { AI_AUDIT_MAX, aiVerdictLabel, type ItemDraft } from "@/lib/itemStore";

/**
 * AI 검수 보고서 보기 — 문항 카드 항목마다 판정 · 카드에 적힌 것 · 소견을 한 장으로 (2026-09-22 요청).
 *
 * 검수자는 이것을 읽고 검수판에서 승인하거나, 반려할 부분을 골라 사유와 함께 돌려보낸다. 보고서
 * 위쪽에 판정 셋의 개수를 먼저 세우고(보완 필요부터 봐야 한다), 아래에 카드 차례대로 항목을 편다.
 * 세트는 문항마다 한 덩이로 묶는다 — 2번 발문과 3번 발문이 섞여 서면 어느 문항의 것인지 매번 읽어야 한다.
 *
 * 인쇄 · 다운로드는 같은 보고서를 종이 · CSV로 낸다(lib/auditReport.ts).
 */

const TONE: Record<ReportStatus, string> = {
  ok: "var(--a2-ok)",
  warn: "var(--a2-warn)",
  fail: "var(--a2-danger)",
};

export default function AuditReportView({ item, onClose }: { item: ItemDraft; onClose: () => void }) {
  const report = useMemo(() => buildCardReport(item), [item]);
  const box = useRef<HTMLDivElement>(null);
  const a = item.aiAudit;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* 묶음 전체의 항목 → 문항마다의 항목 → 다시 묶음 전체(윤리 · 편향) 차례를 지키며 덩이로 */
  const groups: { title: string; rows: ReportSection[] }[] = [];
  for (const s of report.sections) {
    const title = s.question ? `${s.question}번 문항` : item.form === "set" ? "세트 전체" : "문항 카드";
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.rows.push(s);
    else groups.push({ title, rows: [s] });
  }
  const oks = report.sections.length - report.fails - report.warns;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="AI 검수 보고서"
        className="a2-panel my-4 w-full max-w-[60rem] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-(--a2-line) px-5 py-3.5">
          <div className="min-w-0">
            <p className="a2-h">AI 검수 보고서</p>
            <p className="mt-0.5 a2-t-sm text-(--a2-ink-3)">
              <span className="a2-mono">{item.code || item.id}</span> · {item.subject} · {gradeText(item.gradeNo)} ·{" "}
              {item.level} {levelSpecs[item.level].name}
              {a && (
                <>
                  {" "}
                  · AI 검수 {a.round ?? item.aiAuditCount ?? 1}/{AI_AUDIT_MAX}회 · {a.at}
                </>
              )}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1.5">
            <button type="button" className="a2-btn a2-btn-sm" onClick={() => printAudit([item])}>
              인쇄
            </button>
            <button type="button" className="a2-btn a2-btn-sm" onClick={() => downloadAuditCsv([item])}>
              다운로드
            </button>
            <button type="button" className="a2-btn a2-btn-sm" onClick={onClose}>
              닫기
            </button>
          </span>
        </div>

        {/* 요약 — 권고와 판정 셋의 개수 */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-(--a2-line) bg-(--a2-raised) px-5 py-3">
          {a && (
            <span className="a2-t-sm">
              권고{" "}
              <b style={{ color: a.verdict === "reject" ? TONE.fail : a.verdict === "hold" ? TONE.warn : TONE.ok }}>
                {aiVerdictLabel[a.verdict]}
              </b>
            </span>
          )}
          {(["fail", "warn", "ok"] as ReportStatus[]).map((st) => (
            <span key={st} className="a2-t-sm text-(--a2-ink-2)">
              <span className="font-semibold" style={{ color: TONE[st] }}>
                {reportStatusLabel[st]}
              </span>{" "}
              <span className="a2-num font-bold text-(--a2-ink)">
                {st === "fail" ? report.fails : st === "warn" ? report.warns : oks}
              </span>
            </span>
          ))}
          <span className="a2-t-xs text-(--a2-ink-4)">
            규칙으로 대조한 결과입니다. 교과 내용 · 학년 이독성은 검수자가 봅니다.
          </span>
        </div>

        <div className="grid gap-5 px-5 py-4">
          {groups.map((g) => (
            <section key={g.title}>
              <p className="mb-1.5 a2-t-sm font-bold text-(--a2-ink)">{g.title}</p>
              <table className="a2-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "10rem" }}>
                      카드 항목
                    </th>
                    <th scope="col" style={{ width: "5.5rem" }}>
                      판정
                    </th>
                    <th scope="col" style={{ width: "34%" }}>
                      카드에 적힌 것
                    </th>
                    <th scope="col">소견 → 고칠 곳</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((s) => (
                    <tr key={s.key}>
                      <td className="a2-t-sm font-semibold text-(--a2-ink)">{s.label}</td>
                      <td>
                        <span className="a2-t-sm font-bold" style={{ color: TONE[s.status] }}>
                          {reportStatusLabel[s.status]}
                        </span>
                      </td>
                      <td className="a2-t-sm text-(--a2-ink-2)" style={{ whiteSpace: "normal" }}>
                        {s.written}
                      </td>
                      <td className="a2-t-sm" style={{ whiteSpace: "normal" }}>
                        {s.findings.length === 0 ? (
                          <span className="text-(--a2-ink-4)">—</span>
                        ) : (
                          <ul className="grid gap-1">
                            {s.findings.map((f, k) => (
                              <li key={k}>
                                <span className="text-(--a2-ink)">{f.text}</span>{" "}
                                <span className="text-(--a2-ink-3)">→ {f.fix}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
