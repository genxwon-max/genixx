"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 사유를 받고 하는 일 — 설문 발행 · 되돌리기(ADM-14), 응시 화면 보호 켜고 끄기(ADM-05-3)가 함께 쓴다.
 *
 * 바뀌는 것을 한 줄씩 보여 주고(lines), 짚을 것이 있으면 따로 세우고(warnings), 사유를 10자 이상 받아야
 * 확인 단추가 켜진다. 바깥을 누르거나 ESC를 누르면 닫힌다.
 */
export default function ReasonDialog({
  title,
  lead,
  lines,
  warnings = [],
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  lead: string;
  lines?: string[];
  warnings?: string[];
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const left = 10 - reason.trim().length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-title"
        className="a2-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reason-title" className="a2-title">
          {title}
        </h2>
        <p className="mt-2 a2-t-sm text-(--a2-ink-2)">{lead}</p>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-[4px] border border-(--a2-warn) p-3">
            <p className="a2-t-sm font-bold text-(--a2-warn)">짚고 넘어갈 것</p>
            <ul className="mt-1.5 grid gap-0.5 a2-t-sm">
              {warnings.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          </div>
        )}

        {lines && (
          <div className="mt-4">
            <p className="a2-label">달라지는 것 {lines.length}곳</p>
            {lines.length === 0 ? (
              <p className="mt-1 a2-t-sm text-(--a2-ink-3)">달라지는 것이 없습니다.</p>
            ) : (
              <ul className="mt-1.5 max-h-48 overflow-y-auto rounded-[4px] border border-(--a2-line) p-2.5 a2-t-sm">
                {lines.map((line, n) => (
                  <li key={`${line}-${n}`}>· {line}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label className="mt-4 grid gap-1.5">
          <span className="a2-label">왜 바꾸는지 적어 주세요</span>
          <textarea
            ref={box}
            rows={3}
            className="a2-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="10자 이상 적어 주세요"
          />
          <span
            className={`a2-t-xs font-bold ${left > 0 ? "text-(--a2-danger)" : "text-(--a2-ok)"}`}
          >
            {left > 0 ? `${left}자 더 적어 주세요` : "충분히 적었습니다"}
          </span>
        </label>

        <div className="mt-5 flex justify-end gap-1.5">
          <button type="button" className="a2-btn" onClick={onClose}>
            그만두기
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-primary"
            disabled={left > 0}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
