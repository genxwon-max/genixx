"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { minimumPathNotice, purposeConsents, signupTypeOf } from "@/lib/account";
import { patchSignupDraft, stepGuard, useSignupDraft } from "@/lib/signupStore";
import { useHydrated } from "@/lib/examStore";
import { signIn } from "@/lib/authStore";
import {
  AccHead,
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  StepButtons,
  StepIndicator,
  TermsBox,
} from "./ui";

/**
 * ACC-01-3 약관·동의 (분리).
 *
 * 구성은 GED 회원가입 STEP 1(가입 약관 동의)을 따랐다 — 항목마다 조문을 담은
 * 스크롤 상자를 두고 그 아래에 동의 체크박스를 붙이며, 맨 위에 '전체 동의'를 둔다.
 *
 * 다만 사이트맵 ACC-01-3이 "목적별 체크박스 분리 / 미동의 시에도 최소 응시 경로 제공
 * (동의 강제 금지)"을 정하고 있어, 전체 동의는 기본값으로 켜 두지 않고
 * 선택 항목을 끄면 무엇이 달라지는지 그 자리에서 알려 준다.
 */
export default function SignupConsent() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useSignupDraft();
  const [checked, setChecked] = useState<string[]>([]);
  const [tried, setTried] = useState(false);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-exam-muted">확인 중입니다…</p>;
  }

  const guard = stepGuard(draft, "consent");
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
  const required = purposeConsents.filter((c) => c.required);
  const allRequiredOn = required.every((c) => checked.includes(c.id));
  const allOn = checked.length === purposeConsents.length;

  const toggle = (id: string) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () =>
    setChecked(allOn ? [] : purposeConsents.map((c) => c.id));

  const submit = () => {
    setTried(true);
    if (!allRequiredOn) return;
    patchSignupDraft({ consents: checked });
    signIn({
      role: draft.type === "parent" ? "parent" : draft.type === "teacher" ? "teacher" : "director",
      name: draft.name || "새 회원",
      provider: draft.provider,
      email: draft.email || undefined,
      approved: !type.needsApproval,
    });
    router.push(type.needsApproval ? "/signup/pending" : "/signup/done");
  };

  return (
    <>
      <StepIndicator current={2} />
      <AccHead
        id="ACC-01-3"
        title="약관 · 동의"
        lead="목적마다 따로 여쭤봅니다. 선택 항목은 동의하지 않으셔도 가입과 응시가 됩니다."
      />

      {/* 전체 동의 — 국내 포털 관례대로 맨 위에 둔다 */}
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-4 transition-colors ${
          allOn ? "border-brand-700 bg-brand-50" : "border-slate-300 bg-white"
        }`}
      >
        <input
          type="checkbox"
          checked={allOn}
          onChange={toggleAll}
          className="h-5 w-5 accent-[#1b2a6b]"
        />
        <span>
          <span className="block text-[16px] font-black text-exam-text">전체 동의</span>
          <span className="mt-0.5 block text-[13px] text-exam-muted">
            선택 항목을 포함해 아래 모든 항목에 동의합니다.
          </span>
        </span>
      </label>

      <ul className="mt-4 space-y-3">
        {purposeConsents.map((c) => {
          const on = checked.includes(c.id);
          return (
            <li key={c.id} className={`${card} p-5 sm:p-6`}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(c.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#1b2a6b]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        c.required ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.required ? "필수" : "선택"}
                    </span>
                    <span className="text-[16px] font-bold text-exam-text">{c.label}</span>
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-exam-muted">
                    {c.detail}
                  </span>
                </span>
              </label>

              <div className="mt-4">
                <TermsBox body={c.body} />
              </div>

              {!on && (
                <p className="mt-2.5 text-[13px] font-bold text-amber-700">
                  동의하지 않으면 — {c.ifDeclined}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50/70 px-5 py-4 text-[13px] leading-relaxed text-brand-900">
        {minimumPathNotice}
      </p>

      {tried && !allRequiredOn && (
        <p role="alert" className="mt-4 text-center text-[14px] font-bold text-rose-600">
          필수 항목에 모두 동의해야 가입이 진행됩니다.
        </p>
      )}

      <StepButtons back={{ href: "/signup/verify" }}>
        <button type="button" onClick={submit} className={btnPrimary}>
          동의하고 가입 마치기
        </button>
      </StepButtons>

      <p className="mt-4 text-center text-[13px] leading-relaxed text-exam-muted">
        가입 후에도{" "}
        <Link href="/my/children/consent-stages" className="font-bold underline">
          단계별 동의 관리
        </Link>
        에서 언제든 켜고 끌 수 있습니다.
      </p>
    </>
  );
}
