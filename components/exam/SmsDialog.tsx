"use client";

import { useState } from "react";
import { phoneText } from "@/components/account/SendCodes";
import { btnGhost, btnPrimary, input } from "./ui";

/**
 * 설문 링크를 문자로 보내는 창.
 *
 * 두 자리가 함께 쓴다 — 평가 판(components/exam/StatusTable.tsx)과 학생의 설문 화면
 * (components/student/StudentSurveys.tsx). 창을 양쪽에 따로 두면 번호를 받는 규칙(10~11자리)이
 * 한쪽만 고쳐지고, 받은 분에게 가는 안내 문구도 자리마다 달라진다.
 *
 * ⚠ 문자는 아직 나가지 않는다. 발송 API를 붙이면 그 결과가 돌아온 뒤에 「보냈다」를 적어야
 *   하므로, onSend를 부르는 자리(부모)가 그때 비동기로 바뀐다.
 */
export default function SmsDialog({
  label,
  initial,
  note,
  onCancel,
  onSend,
}: {
  /** 「학부모 설문」 — 창 제목에 그대로 들어간다 */
  label: string;
  /** 미리 채워 둘 번호. 모르면 빈 문자열 */
  initial: string;
  /** 제목 아래 한 줄을 갈아 끼울 때 */
  note?: string;
  onCancel: () => void;
  onSend: (phone: string) => void;
}) {
  const [phone, setPhone] = useState(phoneText(initial));
  const digits = phone.replace(/\D/g, "");
  const ok = digits.length >= 10 && digits.length <= 11;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSend(digits);
        }}
        className="w-full max-w-md rounded-[2px] bg-white p-7 shadow-float"
      >
        <h2 id="sms-title" className="text-[19px] font-bold text-soft-ink">
          {label} 링크를 문자로 보냅니다
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          {note ?? "받은 분이 링크를 열면 로그인 없이 바로 설문을 작성할 수 있습니다."}
        </p>
        <label htmlFor="sms-phone" className="mt-5 block text-[13px] font-bold text-soft-ink">
          휴대전화 번호
        </label>
        <input
          id="sms-phone"
          type="tel"
          inputMode="numeric"
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, "").slice(0, 13))}
          placeholder="010-1234-5678"
          className={`mt-2 tabular-nums ${input}`}
        />
        {phone && !ok && (
          <p className="mt-1.5 text-[12px] text-rose-600">휴대전화 번호를 정확히 입력해 주세요.</p>
        )}
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            취소
          </button>
          <button
            type="submit"
            disabled={!ok}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  );
}
