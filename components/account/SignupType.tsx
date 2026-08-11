"use client";

import { useRouter } from "next/navigation";
import { signupTypes, type SignupTypeId } from "@/lib/account";
import { patchSignupDraft, useSignupDraft } from "@/lib/signupStore";
import { AccHead, btnPrimary, card, Notes, StepButtons, StepIndicator } from "./ui";

/**
 * ACC-01-1 회원유형 선택.
 * 사이트맵: "학부모 / 교사 / 기관담당자 3분기. 학생은 독립 가입 경로 없음."
 *
 * 구성은 인싸이트 회원가입 첫 화면을 따랐다 — 유형 카드를 고르게 한 뒤
 * 그 아래에 "회원 유형별 가입 절차 안내"를 점 목록으로 붙인다.
 */

const guide = [
  "학부모 회원은 가입 즉시 자녀를 등록하고 진단을 신청하실 수 있습니다.",
  "교사·기관담당자 회원은 소속 확인이 끝난 뒤에 계정이 활성화됩니다. 보통 1~2 영업일이 걸립니다.",
  "학생은 가입 대상이 아닙니다. 보호자 계정의 자녀 프로필로 등록되거나, 소속 기관이 명부에 올리면 접속코드가 발급됩니다.",
  "가입 후에도 회원 유형은 고객센터를 통해 변경하실 수 있습니다.",
];

export default function SignupType() {
  const router = useRouter();
  const draft = useSignupDraft();

  const pick = (id: SignupTypeId) => patchSignupDraft({ type: id });

  return (
    <>
      <StepIndicator current={0} />
      <AccHead
        id="ACC-01-1"
        title="가입 유형을 골라 주세요"
        lead="고른 유형에 따라 이후 단계와 받는 권한이 달라집니다."
      />

      <ul className="grid gap-3 sm:grid-cols-3">
        {signupTypes.map((t) => {
          const on = draft.type === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => pick(t.id)}
                aria-pressed={on}
                className={`flex h-full w-full flex-col rounded-xl border-2 p-5 text-left transition-colors ${
                  on
                    ? "border-brand-700 bg-brand-50"
                    : "border-slate-300 bg-white hover:border-brand-400"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    on ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 text-white"
                  }`}
                >
                  <span className="text-[13px] font-black leading-none">✓</span>
                </span>
                <span className="mt-3 text-[18px] font-black text-exam-text">{t.label}</span>
                <span
                  className={`mt-1.5 inline-block self-start rounded px-1.5 py-0.5 text-[11px] font-bold ${t.tone}`}
                >
                  {t.badge}
                </span>
                <span className="mt-2.5 block text-[14px] font-bold text-exam-text">
                  {t.tagline}
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-exam-muted">
                  {t.detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={`${card} mt-5 p-5 sm:p-6`}>
        <h2 className="text-[15px] font-black text-exam-text">회원 유형별 가입 절차 안내</h2>
        <Notes items={guide} />
      </div>

      <StepButtons back={{ href: "/signup", label: "가입 방식 다시 고르기" }}>
        <button
          type="button"
          disabled={!draft.type}
          onClick={() => router.push("/signup/verify")}
          className={btnPrimary}
        >
          다음
        </button>
      </StepButtons>

      {!draft.type && (
        <p className="mt-3 text-center text-[13px] text-exam-muted">가입 유형을 골라 주세요.</p>
      )}
    </>
  );
}
