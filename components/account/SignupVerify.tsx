"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupTypeOf } from "@/lib/account";
import { patchSignupDraft, stepGuard, useSignupDraft } from "@/lib/signupStore";
import { useHydrated } from "@/lib/examStore";
import {
  AccHead,
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field,
  fieldLabel,
  LegalNote,
  Notes,
  StepButtons,
  StepIndicator,
} from "./ui";

/**
 * ACC-01-2 본인확인.
 * 사이트맵: "휴대폰 또는 간편인증. 법정대리인 신원 확인 근거".
 *
 * 국내 포털의 관례대로 인증 수단을 큰 버튼으로 나란히 놓고,
 * 휴대폰 인증은 [번호 입력 → 인증번호 받기 → 6자리 입력] 한 줄 흐름으로 둔다.
 */

const verifyNotes = [
  "본인 명의의 휴대폰만 인증하실 수 있습니다.",
  "인증번호는 3분간 유효하며, 오지 않으면 다시 보내기를 눌러 주세요.",
  "외국인 등록번호로는 간편인증을 이용해 주세요.",
];

export default function SignupVerify() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useSignupDraft();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-exam-muted">확인 중입니다…</p>;
  }

  const guard = stepGuard(draft, "verify");
  if (!guard.ok) {
    return (
      <div className={`${card} ${cardPad}`}>
        <p className="text-[15px] font-bold text-exam-text">{guard.why}</p>
        <Link href={guard.back} className={`${btnGhost} mt-4 w-full`}>
          앞 단계로 돌아가기
        </Link>
      </div>
    );
  }

  const type = signupTypeOf(draft.type!);
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const codeOk = code.replace(/\D/g, "").length === 6;

  const done = () => {
    if (!codeOk) {
      setError("인증번호 6자리를 입력해 주세요.");
      return;
    }
    patchSignupDraft({ verified: true, phone });
    router.push("/signup/consent");
  };

  return (
    <>
      <StepIndicator current={1} />
      <AccHead
        id="ACC-01-2"
        title="본인확인"
        lead={`${type.label} 가입에는 본인확인이 필요합니다. 아래 두 가지 중 하나를 이용해 주세요.`}
      />

      {draft.type === "parent" && (
        <div className="mb-4">
          <LegalNote
            title="이 단계가 법정대리인 확인의 근거가 됩니다"
            basis="개인정보보호법 제22조의2"
          >
            <p>
              만 14세 미만 자녀를 등록하시려면 보호자가 법정대리인임을 확인해야 합니다. 여기서 하신
              본인확인이 그 근거로 쓰입니다.
            </p>
            <p>자녀가 만 14세 이상이면 법정대리인 동의는 받지 않습니다.</p>
          </LegalNote>
        </div>
      )}

      <div className={`${card} ${cardPad}`}>
        <p className={fieldLabel}>인증 수단</p>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              patchSignupDraft({ verified: true, phone: phone || "010-0000-0000" });
              router.push("/signup/consent");
            }}
            className={`${btnGhost} w-full`}
          >
            간편인증
          </button>
          <button type="button" className={`${btnGhost} w-full opacity-50`} disabled>
            공동인증서 (준비 중)
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-[13px] text-exam-muted">
          <span className="h-px flex-1 bg-slate-200" />
          휴대폰으로 인증
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <label htmlFor="verify-phone" className={fieldLabel}>
          휴대폰 번호
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="verify-phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="'-' 없이 입력"
            className={field}
          />
          <button
            type="button"
            disabled={!phoneOk}
            onClick={() => setSent(true)}
            className={`${btnGhost} shrink-0 whitespace-nowrap px-4 text-[14px] disabled:opacity-50`}
          >
            {sent ? "다시 보내기" : "인증번호 받기"}
          </button>
        </div>

        {sent && (
          <div className="mt-4">
            <label htmlFor="verify-code" className={fieldLabel}>
              인증번호
            </label>
            <input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              placeholder="6자리"
              className={`mt-2 ${field} text-center text-[20px] font-black tracking-[0.35em] tabular-nums`}
            />
            <p className="mt-2 text-[13px] text-exam-muted">
              시연에서는 아무 6자리나 넣으셔도 통과합니다.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[13px] font-bold text-rose-600">
            {error}
          </p>
        )}
      </div>

      <Notes items={verifyNotes} />

      <StepButtons back={{ href: "/signup/type" }}>
        <button type="button" disabled={!sent} onClick={done} className={btnPrimary}>
          다음
        </button>
      </StepButtons>
    </>
  );
}
