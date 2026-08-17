"use client";

import { useEffect, useRef, useState } from "react";
import { userActions, type UserActionKind } from "@/lib/admin";
import { recordAction, useAdminPrefs } from "@/lib/adminStore";
import { Callout } from "./Parts";
import * as a from "./ui";

/**
 * 계정을 정지·해제·삭제할 때 한 번 더 묻는 창.
 *
 * 개인정보 열람(ReasonDialog)과 달리 사유를 강제하지 않는다. 저쪽은 남의 이름을
 * 들여다보는 일이라 "왜 봤는가"가 기록의 본체지만, 이쪽은 관리자가 자기 권한 안에서
 * 하는 조치다. 여기서까지 열 자를 채우게 하면 사람은 아무 칸이나 눌러 넘기고, 남은
 * 기록은 있으나 마나 한 글자가 된다.
 *
 * 대신 흔한 사유를 미리 골라 두고 첫 항목을 눌러 둔다. 그대로 눌러도 되고, 다르면
 * 고르거나 직접 적으면 된다 — 어느 쪽이든 사유는 기록에 남는다.
 *
 * 삭제는 되돌릴 수 없어서 무슨 일이 일어나는지 문장으로 먼저 적는다.
 */
export default function ActionDialog({
  kind,
  target,
  onClose,
  onDone,
}: {
  kind: UserActionKind;
  /** 무엇에 대한 조치인지 — 「운영자 author.yoon · 윤출제」처럼 사람이 읽을 말 */
  target: string;
  onClose: () => void;
  onDone: (reason: string) => void;
}) {
  const spec = userActions[kind];
  const prefs = useAdminPrefs();
  const [picked, setPicked] = useState(spec.reasons[0]);
  const [detail, setDetail] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reason = detail.trim() ? `${picked} — ${detail.trim()}` : picked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${target} ${spec.verb}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-exam-line bg-white p-6 outline-none sm:p-8"
      >
        <h2 className={a.pageTitle}>
          {target}
          <br />
          {spec.verb}할까요?
        </h2>

        <ul className={`${a.bodyText} mt-4 list-disc space-y-1.5 pl-5`}>
          {spec.effects.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>

        <fieldset className="mt-6">
          <legend className={a.label}>
            사유 <span className="font-normal text-exam-muted">(그대로 두셔도 됩니다)</span>
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {spec.reasons.map((r) => (
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

        <label className="mt-5 block">
          <span className={a.label}>
            덧붙일 말 <span className="font-normal text-exam-muted">(선택)</span>
          </span>
          <textarea
            rows={2}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="적지 않으셔도 됩니다. 나중에 이 조치를 다시 볼 사람에게 남기는 메모입니다."
            className={`${a.input} mt-2 resize-none`}
          />
        </label>

        <p className="mt-3 adm-t-md leading-relaxed text-exam-muted">
          기록에는 이렇게 남습니다 — <b className="text-exam-text">{reason}</b>
        </p>

        {spec.danger && (
          <div className="mt-5">
            <Callout tone="warn">되돌릴 수 없습니다. 한 번 더 확인해 주세요.</Callout>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              recordAction(target, spec.verb, reason, prefs.staffName || "운영자");
              onDone(reason);
            }}
            className={spec.danger ? a.btnDanger : a.btnPrimary}
          >
            네, {spec.verb}합니다
          </button>
          <button type="button" onClick={onClose} className={a.btnGhost}>
            아니요, 취소합니다
          </button>
        </div>
      </div>
    </div>
  );
}
