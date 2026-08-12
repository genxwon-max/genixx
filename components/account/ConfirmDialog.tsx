"use client";

import { useEffect, useRef } from "react";

/**
 * 예·아니오 확인 상자 (계정 존).
 *
 * 되돌릴 수 없는 일은 누르는 즉시 실행하지 않는다. 접속코드 재발급처럼 이전 코드가
 * 그 자리에서 죽는 일은 한 번 더 묻는다 — 아이에게 이미 알려 준 코드가 안 통하게
 * 되는 것이라, 잘못 누르면 다시 연락해야 한다.
 *
 * 기본값은 「아니오」다. 열리자마자 취소에 초점이 가므로 엔터를 잘못 눌러도
 * 실행되지 않는다.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel = "예",
  cancelLabel = "아니오",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-[26rem] rounded-[16px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] sm:p-7">
        <h2 id="confirm-title" className="text-[18px] font-bold text-soft-ink">
          {title}
        </h2>
        {body && <div className="mt-2.5 text-[14px] leading-relaxed text-soft-muted">{body}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[2.875rem] items-center justify-center rounded-full border border-soft-line bg-white px-7 text-[15px] font-semibold text-soft-ink transition-colors hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex min-h-[2.875rem] items-center justify-center rounded-full px-7 text-[15px] font-semibold text-white transition-colors ${
              tone === "danger"
                ? "bg-[#c8382c] hover:bg-[#a92e24]"
                : "bg-soft-primary hover:bg-soft-primary-dark"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
