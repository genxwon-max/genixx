"use client";

import { useState } from "react";
import { approvals, type Approval } from "@/lib/admin";
import { Badge } from "./Parts";
import * as a from "./ui";

/**
 * 교사·기관 가입 승인 (ADM-02-2).
 *
 * 표가 아니라 카드로 만들었다. 한 건마다 "무엇을 확인하고 무엇을 눌러야 하는지"가
 * 다르기 때문에, 좁은 셀에 밀어 넣으면 증빙 확인을 건너뛰기 쉽다.
 * 승인·반려는 되돌리기 어려우므로 한 번 더 묻는다.
 */
export default function ApprovalList() {
  const [handled, setHandled] = useState<Record<string, "approved" | "rejected">>({});
  const [confirming, setConfirming] = useState<{ item: Approval; kind: "approve" | "reject" } | null>(
    null,
  );

  const waiting = approvals.filter((x) => !handled[x.id]);

  return (
    <>
      <p className="mb-5 adm-t-md text-exam-muted">
        확인을 기다리는 신청 <b className="text-exam-text">{waiting.length}건</b> · 승인하면 즉시
        계정이 열리고, 그 순간부터 담당 학생의 설문 화면에 접근할 수 있게 됩니다.
      </p>

      <ul className="space-y-4">
        {approvals.map((item) => {
          const state = handled[item.id];
          return (
            <li
              key={item.id}
              className={`rounded-lg border p-5 sm:p-6 ${
                state ? "border-exam-line bg-exam-panel" : "border-exam-line bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge
                      label={item.kind === "teacher" ? "교사" : "기관"}
                      className={
                        item.kind === "teacher"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-accent-300 bg-accent-100 text-accent-600"
                      }
                    />
                    <h2 className="adm-t-lg font-black text-exam-text">
                      {item.name} · {item.org}
                    </h2>
                  </div>
                  <p className="mt-2 adm-t-md text-exam-muted">{item.detail}</p>

                  <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="adm-t-sm font-bold text-exam-text">제출 증빙</dt>
                      <dd className="adm-t-sm text-exam-muted">{item.proof}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="adm-t-sm font-bold text-exam-text">신청 시각</dt>
                      <dd className="adm-t-sm tabular-nums text-exam-muted">{item.requestedAt}</dd>
                    </div>
                  </dl>

                  {item.warning && (
                    <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 adm-t-sm font-bold text-amber-900">
                      확인이 필요합니다 — {item.warning}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2.5">
                  {state ? (
                    <Badge
                      label={state === "approved" ? "승인 완료" : "반려 처리됨"}
                      className={
                        state === "approved"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-rose-300 bg-rose-50 text-rose-700"
                      }
                    />
                  ) : (
                    <>
                      <button type="button" className={a.btnGhost}>
                        증빙 보기
                      </button>
                      <button
                        type="button"
                        className={a.btnDanger}
                        onClick={() => setConfirming({ item, kind: "reject" })}
                      >
                        반려하기
                      </button>
                      <button
                        type="button"
                        className={a.btnPrimary}
                        onClick={() => setConfirming({ item, kind: "approve" })}
                      >
                        승인하기
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {confirming && (
        <ConfirmDialog
          item={confirming.item}
          kind={confirming.kind}
          onClose={() => setConfirming(null)}
          onDone={() => {
            setHandled((prev) => ({
              ...prev,
              [confirming.item.id]: confirming.kind === "approve" ? "approved" : "rejected",
            }));
            setConfirming(null);
          }}
        />
      )}
    </>
  );
}

/** 되돌리기 어려운 동작은 무엇이 일어나는지 문장으로 적고 한 번 더 묻는다 */
function ConfirmDialog({
  item,
  kind,
  onClose,
  onDone,
}: {
  item: Approval;
  kind: "approve" | "reject";
  onClose: () => void;
  onDone: () => void;
}) {
  const approve = kind === "approve";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-lg border border-exam-line bg-white p-6 sm:p-8">
        <h2 className="adm-t-xl font-black text-exam-text">
          {approve ? "이 신청을 승인할까요?" : "이 신청을 반려할까요?"}
        </h2>
        <p className={`${a.bodyText} mt-3`}>
          <b className="text-exam-text">
            {item.name} · {item.org}
          </b>
        </p>
        <ul className={`${a.bodyText} mt-3 list-disc space-y-1.5 pl-5`}>
          {approve ? (
            <>
              <li>계정이 즉시 활성화됩니다.</li>
              <li>담당 학생의 관찰 설문 화면에 접근할 수 있게 됩니다.</li>
              <li>승인한 사람과 시각이 감사 로그에 남습니다.</li>
            </>
          ) : (
            <>
              <li>신청자에게 반려 사유가 메일로 안내됩니다.</li>
              <li>증빙을 다시 제출하면 재신청할 수 있습니다.</li>
              <li>반려한 사람과 시각이 감사 로그에 남습니다.</li>
            </>
          )}
        </ul>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDone}
            className={approve ? a.btnPrimary : a.btnDanger}
          >
            네, {approve ? "승인합니다" : "반려합니다"}
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            아니요, 취소합니다
          </button>
        </div>
      </div>
    </div>
  );
}
