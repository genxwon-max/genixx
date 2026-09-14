"use client";

import Link from "next/link";
import { useState } from "react";
import { auditLog, type Approval } from "@/lib/admin";
import { approvalTone } from "@/lib/admin2";
import { useAdminPrefs, useLocalAudit } from "@/lib/adminStore";
import {
  decideApproval,
  decisionReasons,
  useApproval,
  verdictLabel,
  type Verdict,
} from "@/lib/approvalStore";
import RecordList from "@/components/admin2/RecordList";
import { Body, DescList, PageHead, Panel, Status, Tag } from "@/components/admin2/ui";

/**
 * ADM-02-2-1 가입 신청 상세 — 한 건.
 *
 * 회원·학생·기관 상세와 같은 틀을 쓴다 — 왼쪽 위 되돌아가기, 오른쪽 위 지금 상태와
 * 동작, 본문은 위에서 아래로 한 줄, 기록은 맨 아래.
 *
 * ── 여기는 고치는 화면이 아니다 ──
 * 그래서 저장 줄이 없다. 신청 내용과 제출 증빙은 **신청자가 낸 것**이라 관리자가 고칠
 * 값이 아니다. 고쳐 놓고 승인하면 신청자가 낸 것과 승인된 것이 달라지고, 나중에 그
 * 승인이 무엇을 근거로 났는지 아무도 답할 수 없다. 여기서 하는 일은 읽고 둘 중 하나를
 * 누르는 것뿐이다.
 *
 * ── 자동 점검을 맨 위에 세우는 까닭 ──
 * 경고가 붙은 건은 손이 더 간다. 신청 내용보다 먼저 읽어야 어느 쪽으로 기울지 정해진다.
 * 경고가 없을 때도 줄을 지우지 않고 「이상 없음」을 적는다 — 비어 있으면 점검을 통과한
 * 건지 점검을 안 돌린 건지 구분되지 않는다.
 */

const kindLabel = { teacher: "교사", org: "기관" } as const;

/** 승인·반려 확인. 창으로 띄우는 것은 계정 조치(AccountActions)와 같은 꼴이다 */
function DecideDialog({
  verdict,
  row,
  onCancel,
  onDone,
}: {
  verdict: Verdict;
  row: Approval;
  onCancel: () => void;
  onDone: (reason: string) => void;
}) {
  const reasons = decisionReasons[verdict];
  const [picked, setPicked] = useState(reasons[0]);
  const [detail, setDetail] = useState("");
  const reason = detail.trim() ? `${picked} — ${detail.trim()}` : picked;
  const verb = verdict === "approved" ? "승인" : "반려";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="a2-panel w-full max-w-[26rem] p-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="a2-h">
          {row.name} · <span className="a2-mono font-normal">{row.id}</span> 신청을 {verb}합니다
        </p>
        <ul className="mt-1.5 grid gap-0.5 a2-t-sm text-(--a2-ink-2)">
          {verdict === "approved" ? (
            <>
              <li>{kindLabel[row.kind]} 계정이 열리고 신청자에게 안내가 나갑니다.</li>
              <li>승인한 사람과 시각, 까닭이 기록에 남습니다.</li>
              <li>승인은 소속의 실재를 확인한 것이며, 학생의 법정대리인 지위를 주지 않습니다.</li>
            </>
          ) : (
            <>
              <li>계정이 열리지 않고 신청자에게 반려 사유가 나갑니다.</li>
              <li>반려한 사람과 시각, 까닭이 기록에 남습니다.</li>
              <li>신청자는 서류를 갖춰 다시 신청할 수 있습니다.</li>
            </>
          )}
        </ul>

        <div className="mt-3 grid gap-2">
          <label className="a2-field block">
            <span className="a2-label">까닭 (그대로 두셔도 됩니다)</span>
            <select
              className="a2-select"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="a2-field block">
            <span className="a2-label">덧붙일 말 (선택)</span>
            <input
              className="a2-input"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="적지 않으셔도 됩니다"
            />
          </label>
        </div>

        <p className="a2-hint mt-2">
          기록에는 이렇게 남습니다 — <b className="text-(--a2-ink)">{reason}</b>
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-1.5">
          <button type="button" className="a2-btn" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className={verdict === "approved" ? "a2-btn a2-btn-primary" : "a2-btn a2-btn-danger"}
            onClick={() => onDone(reason)}
          >
            네, {verb}합니다
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalDetail({ id }: { id: string }) {
  const row = useApproval(id);
  const localLog = useLocalAudit();
  const prefs = useAdminPrefs();
  const [acting, setActing] = useState<Verdict | null>(null);

  if (!row) return null;

  const by = prefs.staffName || "운영자";
  const done = row.state !== "pending";

  return (
    <>
      <PageHead
        title={row.name}
        back={
          <Link href="/admin2/approvals" className="a2-btn">
            ← 이전으로
          </Link>
        }
        actions={
          <>
            <span className="mr-1 flex items-center gap-1.5">
              <span className="a2-t-xs text-(--a2-ink-4)">처리 상태</span>
              <Status tone={approvalTone[row.state]}>{verdictLabel[row.state]}</Status>
            </span>
            {done ? (
              <span className="a2-t-xs text-(--a2-ink-4)">
                {row.decision?.at} · {row.decision?.by}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="a2-btn a2-btn-primary"
                  onClick={() => setActing("approved")}
                >
                  승인
                </button>
                <button
                  type="button"
                  className="a2-btn a2-btn-danger"
                  onClick={() => setActing("rejected")}
                >
                  반려
                </button>
              </>
            )}
          </>
        }
      />

      <Body>
        <div className="grid gap-3">
          <Panel title="자동 점검" meta={row.warning ? "손이 더 가는 건" : "걸린 항목 없음"}>
            {row.warning ? (
              <p className="a2-note" style={{ borderLeftColor: "var(--a2-warn)" }}>
                <span>{row.warning}</span>
              </p>
            ) : (
              <p className="a2-t-sm text-(--a2-ink-2)">
                자동 점검에서 걸린 항목이 없습니다. 제출 증빙은 사람이 확인해야 합니다.
              </p>
            )}
          </Panel>

          <Panel title="신청 내용" meta={kindLabel[row.kind]}>
            <DescList
              rows={[
                { k: "신청 ID", v: <span className="a2-mono">{row.id}</span> },
                { k: "종류", v: <Tag>{kindLabel[row.kind]}</Tag> },
                { k: "신청자", v: <span className="font-semibold">{row.name}</span> },
                { k: "소속", v: row.org },
                { k: "신청 내용", v: row.detail },
                { k: "제출 증빙", v: row.proof },
                { k: "신청 시각", v: <span className="a2-mono">{row.requestedAt}</span> },
              ]}
            />
          </Panel>

          {row.decision && (
            <Panel title="처리 결과" meta={`${row.decision.at} · ${row.decision.by}`}>
              <DescList
                rows={[
                  {
                    k: "결론",
                    v: (
                      <Status tone={approvalTone[row.state]}>{verdictLabel[row.state]}</Status>
                    ),
                  },
                  { k: "까닭", v: row.decision.reason },
                ]}
              />
              {/* 되돌리기를 두지 않는 까닭은 lib/approvalStore.ts 머리 주석에 */}
              <p className="a2-hint mt-2">
                처리한 건은 되돌리지 않습니다. 잘못 눌렀다면 회원 상세에서 계정을 정지하거나,
                신청자에게 다시 신청을 받습니다.
              </p>
            </Panel>
          )}

          {/* 기록은 맨 아래. 오늘 할 일이 아니라 되짚어 볼 때 여는 것이다 */}
          <RecordList
            id={row.id}
            server={auditLog}
            local={localLog}
            empty="아직 이 신청에 대한 기록이 없습니다."
          />
        </div>
      </Body>

      {acting && (
        <DecideDialog
          verdict={acting}
          row={row}
          onCancel={() => setActing(null)}
          onDone={(reason) => {
            decideApproval(row, acting, reason, by);
            setActing(null);
          }}
        />
      )}
    </>
  );
}
