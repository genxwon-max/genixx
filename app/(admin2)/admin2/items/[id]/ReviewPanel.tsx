"use client";

import { useState } from "react";
import { useAdminPrefs } from "@/lib/adminStore";
import {
  approveItem,
  blankChecks,
  checkReasons,
  clearReviewDraft,
  rejectCodes,
  rejectItem,
  reviewChecks,
  saveReviewDraft,
  type ItemDraft,
  type RejectCode,
  type ReviewCheckResult,
} from "@/lib/itemStore";
import { Panel } from "@/components/admin2/ui";

/**
 * 검수판 (EXP-03) — 3단을 짚고 승인하거나 반려한다.
 *
 * 「전문가가 확인한다」가 실제로 하는 일이 이것이다. 체크상자 셋을 켜는 것이 아니라
 * 세 갈래를 각각 **통과 / 걸림**으로 짚고, 그때마다 **무엇을 보고 그렇게 정했는지**를
 * 번호로 고르는 것이다. 소견을 서술로만 받으면 같은 지적이 「정답이 두 개」·「답이
 * 둘로 읽힘」·「복수정답」으로 흩어져 나중에 무엇 때문에 많이 걸리는지 셀 수 없다
 * (lib/itemStore.ts checkReasons 주석).
 *
 * 승인은 셋 다 통과일 때만 열린다. 반려는 하나라도 걸리면 열리고 사유 코드를 받는다.
 * 둘 다 소견문을 열 자 넘게 요구한다 — 반려 사유가 「수정 바람」 한 줄이면 출제자는
 * 무엇을 고쳐야 하는지 알 수 없다.
 *
 * 쓰다 만 검수는 문항에 붙여 둔다. 검수는 한 건에 몇 분씩 걸리고 중간에 다른 문항을
 * 열어 볼 일이 생기는데, 돌아왔을 때 체크가 날아가 있으면 처음부터 다시 읽어야 한다.
 */
export default function ReviewPanel({ item }: { item: ItemDraft }) {
  const prefs = useAdminPrefs();
  const saved = item.reviewDraft;

  const [checks, setChecks] = useState<ReviewCheckResult[]>(saved?.checks ?? blankChecks());
  const [code, setCode] = useState<RejectCode | "">(saved?.code ?? "");
  const [text, setText] = useState(saved?.text ?? "");

  const by = prefs.staffName || "운영자";
  /* 자기가 쓴 문항을 자기가 보는 것 — 슈퍼 관리자만 열려 있고, 통과시켜도 기록에
     남는다(reviews[].self). 목록에서 붉은 점으로 세는 값이 이것이다. */
  const self = item.author === prefs.loginId;

  const at = (id: string) => checks.find((c) => c.id === id)!;
  const put = (id: string, patch: Partial<ReviewCheckResult>) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const allPass = checks.every((c) => c.ok === true);
  const anyBlock = checks.some((c) => c.ok === false);
  const enough = text.trim().length >= 10;

  const done = () => {
    setChecks(blankChecks());
    setCode("");
    setText("");
  };

  return (
    <Panel
      title="검수"
      meta="3단 · EXP-03"
      actions={
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          onClick={() => saveReviewDraft(item.id, { by, checks, code: code || undefined, text })}
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

      <ul className="space-y-2">
        {reviewChecks.map((c) => {
          const cur = at(c.id);
          const list = cur.ok === null ? [] : checkReasons[c.id][cur.ok ? "pass" : "block"];
          return (
            <li key={c.id} className="border-b border-(--a2-line) pb-2 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="a2-t-sm font-bold text-(--a2-ink)">{c.label}</span>
                <span className="flex items-center gap-1">
                  {/* 통과·걸림·안 봄은 서로 다른 상태다. 다시 누르면 안 본 것으로 되돌아간다 */}
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
                      onClick={() =>
                        /* 통과↔걸림을 뒤집으면 고른 소견은 반드시 비운다 — 두 목록이
                           달라서 번호만 남으면 뜻이 통째로 바뀐다 */
                        put(c.id, { ok: cur.ok === v ? null : v, reason: undefined })
                      }
                    >
                      {v ? "통과" : "걸림"}
                    </button>
                  ))}
                </span>
              </div>
              <p className="a2-hint">{c.desc}</p>

              {cur.ok !== null && (
                <div className="mt-1.5 grid gap-1.5">
                  <select
                    className="a2-select"
                    value={cur.reason ?? ""}
                    onChange={(e) => put(c.id, { reason: e.target.value || undefined })}
                    aria-label={`${c.label} 소견`}
                  >
                    <option value="">가장 큰 까닭을 고르세요</option>
                    {list.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.text}
                      </option>
                    ))}
                  </select>
                  <input
                    className="a2-input"
                    value={cur.note}
                    onChange={(e) => put(c.id, { note: e.target.value })}
                    placeholder="덧붙일 말 (선택)"
                    aria-label={`${c.label} 덧붙임`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 grid gap-1.5">
        <label className="a2-field">
          <span className="a2-label">소견문 · 출제자에게 그대로 갑니다</span>
          <textarea
            className="a2-textarea"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="무엇을 보고 그렇게 정했는지, 반려라면 어디를 어떻게 고쳐야 하는지 적습니다."
          />
          <span className="a2-hint">
            {enough ? `${text.trim().length}자` : `열 자 넘게 적어야 승인·반려가 열립니다 (${text.trim().length}자)`}
          </span>
        </label>

        {anyBlock && (
          <label className="a2-field">
            <span className="a2-label">반려 사유 코드</span>
            <select className="a2-select" value={code} onChange={(e) => setCode(e.target.value as RejectCode)}>
              <option value="">고르세요</option>
              {rejectCodes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={!allPass || !enough}
            title={allPass ? undefined : "3단을 모두 통과로 짚어야 승인할 수 있습니다"}
            onClick={() => {
              approveItem(item.id, by, text.trim(), checks, self);
              done();
            }}
          >
            승인
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-danger"
            disabled={!anyBlock || !code || !enough}
            title={anyBlock ? undefined : "걸린 갈래가 있어야 반려할 수 있습니다"}
            onClick={() => {
              if (!code) return;
              rejectItem(item.id, by, code, text.trim(), checks, self);
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
          <span className="a2-t-xs text-(--a2-ink-4)">
            {allPass ? "3단 통과" : anyBlock ? "걸린 갈래 있음" : "아직 짚지 않음"}
          </span>
        </div>
      </div>
    </Panel>
  );
}
