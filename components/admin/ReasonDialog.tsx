"use client";

import { useEffect, useRef, useState } from "react";
import { accessReasons } from "@/lib/admin";
import { recordAccess, useAdminPrefs } from "@/lib/adminStore";
import { Callout } from "./Parts";
import * as a from "./ui";

/**
 * 학생 개인정보 열람 사유 입력.
 *
 * FAQ에 "열람 시에는 사유 입력이 강제되고 누가 언제 무엇을 봤는지 전건이 남는다"고
 * 공개해 두었기 때문에, 관리자 화면에도 우회 경로를 만들지 않는다.
 * 사유를 고르고 10자 이상 적어야만 열기 버튼이 활성화된다.
 *
 * 50~60대 사용자를 고려해 —
 *  - 취소/열기 버튼을 같은 크기로 크게 두고, 어느 쪽이 무슨 뜻인지 글자로 적는다.
 *  - 부족한 이유를 빨간 글씨로 미리 알려 준다. 눌러 봐야 알게 하지 않는다.
 */
export default function ReasonDialog({
  target,
  onClose,
  onConfirm,
}: {
  /** 무엇을 여는지 — 그대로 감사 로그에 남는다 */
  target: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { staffName } = useAdminPrefs();
  const [picked, setPicked] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const short = detail.trim().length < 10;
  const ready = picked !== null && !short;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reason-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={boxRef}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 sm:p-8"
      >
        <h2 id="reason-title" className={a.pageTitle}>
          개인정보를 열기 전에 사유를 적어 주세요
        </h2>
        <p className={`${a.bodyText} mt-2.5`}>
          지금 열려는 것은 <b className="text-exam-text">{target}</b> 의 개인정보입니다. 여시는 즉시{" "}
          <b className="text-exam-text">{staffName}</b> 님의 이름·시각·사유가 감사 로그에 기록되며,
          보호자가 요청하면 그대로 보여 드립니다.
        </p>

        <fieldset className="mt-6">
          <legend className={a.label}>1. 열람 사유를 고르세요</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {accessReasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPicked(r)}
                aria-pressed={picked === r}
                className={`min-h-[3rem] rounded-md border px-4 py-2.5 text-left adm-t-sm font-bold transition-colors ${
                  picked === r
                    ? "border-brand-900 text-brand-900"
                    : "border-exam-line text-exam-text hover:bg-exam-raised"
                }`}
              >
                {picked === r && <span aria-hidden>✓ </span>}
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label htmlFor="reason-detail" className={a.label}>
            2. 구체적으로 무엇을 확인하려는지 적어 주세요
          </label>
          <p className="mt-1 adm-t-sm text-exam-muted">
            예: 서술형 답안의 표현을 학년 기준과 대조하기 위해 학년·생년월일 확인
          </p>
          <textarea
            id="reason-detail"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className={`${a.input} mt-2 resize-none`}
            placeholder="10자 이상 적어 주세요"
          />
          <p
            className={`mt-1.5 adm-t-sm font-bold ${short ? "text-rose-700" : "text-emerald-700"}`}
          >
            {short ? `${10 - detail.trim().length}자 더 적어 주세요` : "충분히 입력되었습니다"}
          </p>
        </div>

        {!ready && (
          <div className="mt-5">
            <Callout tone="warn">
              {picked === null
                ? "열람 사유를 아직 고르지 않으셨습니다."
                : "사유 설명이 짧습니다. 조금 더 적어 주세요."}
            </Callout>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              recordAccess(target, `${picked} — ${detail.trim()}`, staffName);
              onConfirm();
            }}
            className={ready ? a.btnPrimary : a.btnDisabled}
          >
            기록을 남기고 열기
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            열지 않고 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
