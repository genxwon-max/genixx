"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { purposeConsents } from "@/lib/account";
import { patchSignupDraft, stepGuard, useSignupDraft } from "@/lib/signupStore";
import { useHydrated } from "@/lib/examStore";
import {
  btnOutline,
  btnPrimary,
  DefTable,
  SectionTitle,
  StepBar,
  StepFooter,
  TermsScroll,
} from "./ui";

/**
 * ACC-01-3 약관 동의 (원본 3c — 전문 열람형).
 *
 * 원본 규칙: 요약이 아니라 **전문 스크롤 박스**로 제공하고 항목별 동의를 개별 수취한다.
 * 개인정보 수집·이용 항목은 문장 대신 정의표(수집항목/이용목적/보유기간/제3자제공)로 둔다.
 *
 * 사이트맵 ACC-01-3의 "미동의 시에도 최소 응시 경로 제공(동의 강제 금지)"에 따라
 * 전체 동의를 기본값으로 켜 두지 않는다.
 */

/** 체크박스 — 원본의 각진 파란 체크 */
function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] text-[12px] font-bold ${
        on ? "bg-acc-primary text-white" : "border border-acc-field bg-white"
      }`}
    >
      {on ? "✓" : ""}
    </span>
  );
}

export default function SignupConsent() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useSignupDraft();
  const [checked, setChecked] = useState<string[]>([]);
  const [tried, setTried] = useState(false);

  if (!hydrated) {
    return <p className="container-x py-20 text-center text-[14px] text-acc-muted">확인 중입니다…</p>;
  }

  const guard = stepGuard(draft, "consent");
  if (!guard.ok) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-[16px] font-bold text-acc-ink">{guard.why}</p>
        <Link href={guard.back} className={`${btnOutline} mt-5`}>
          앞 단계로 돌아가기
        </Link>
      </div>
    );
  }

  const required = purposeConsents.filter((c) => c.required);
  const allRequiredOn = required.every((c) => checked.includes(c.id));
  const allOn = checked.length === purposeConsents.length;

  const toggle = (id: string) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const next = () => {
    setTried(true);
    if (!allRequiredOn) return;
    patchSignupDraft({ consents: checked });
    router.push("/signup/verify");
  };

  const terms = purposeConsents.find((c) => c.id === "terms")!;
  const privacy = purposeConsents.find((c) => c.id === "academic")!;
  const optional = purposeConsents.filter((c) => !c.required && c.id !== "academic");

  return (
    <div className="container-x py-10 pb-14">
      <div className="mx-auto flex w-full max-w-[67.5rem] flex-col gap-8">
        <StepBar current={1} />

        <div className="flex flex-col gap-5">
          <SectionTitle
            title="약관 및 개인정보 수집·이용 동의"
            id="ACC-01-3"
            note="필수 항목에 동의하지 않으면 가입할 수 없습니다."
          />

          {/* 전체 동의 */}
          <button
            type="button"
            onClick={() => setChecked(allOn ? [] : purposeConsents.map((c) => c.id))}
            aria-pressed={allOn}
            className={`flex w-full items-center gap-3 border p-4 text-left transition-colors ${
              allOn ? "border-acc-primary bg-acc-primary-soft" : "border-acc-line bg-white"
            }`}
          >
            <Check on={allOn} />
            <span className="text-[16px] font-bold text-acc-ink">
              전체 약관에 동의합니다 (필수·선택 항목 모두 포함)
            </span>
          </button>

          <div className="flex flex-col gap-4.5">
            {/* 이용약관 — 전문 스크롤 */}
            <section className="border border-acc-line">
              <div className="flex items-center gap-2.5 border-b border-acc-divider bg-acc-panel px-4.5 py-3.5">
                <button
                  type="button"
                  onClick={() => toggle(terms.id)}
                  aria-pressed={checked.includes(terms.id)}
                  className="flex flex-1 items-center gap-2.5 text-left"
                >
                  <Check on={checked.includes(terms.id)} />
                  <span className="text-[15px] font-bold text-acc-ink">
                    <span className="text-acc-required">[필수]</span> 이용약관
                  </span>
                </button>
                <Link href="/legal/terms" className="text-[13px] text-acc-muted hover:underline">
                  전문 보기
                </Link>
              </div>
              <TermsScroll>
                {terms.body.map((b) => (
                  <p key={b.h} className="mb-2 last:mb-0">
                    <b className="text-acc-ink">{b.h}</b> {b.p}
                  </p>
                ))}
              </TermsScroll>
              <p className="border-t border-acc-divider bg-acc-panel px-4.5 py-2.5 text-[12.5px] text-acc-dim">
                스크롤하여 전문을 확인할 수 있습니다.
              </p>
            </section>

            {/* 개인정보 수집·이용 — 정의표 */}
            <section className="border border-acc-line">
              <div className="flex items-center gap-2.5 border-b border-acc-divider bg-acc-panel px-4.5 py-3.5">
                <button
                  type="button"
                  onClick={() => toggle(privacy.id)}
                  aria-pressed={checked.includes(privacy.id)}
                  className="flex flex-1 items-center gap-2.5 text-left"
                >
                  <Check on={checked.includes(privacy.id)} />
                  <span className="text-[15px] font-bold text-acc-ink">
                    <span className="text-acc-required">[필수]</span> 개인정보 수집·이용 동의
                  </span>
                </button>
                <Link href="/legal/privacy" className="text-[13px] text-acc-muted hover:underline">
                  전문 보기
                </Link>
              </div>
              <DefTable
                rows={[
                  {
                    k: "수집 항목",
                    v: "(필수) 이름, 휴대폰 번호, 이메일, 본인인증 결과값, 자녀와의 관계 / (선택) 거주 지역(시·도, 시·군·구), 관심 교육 분야",
                  },
                  {
                    k: "이용 목적",
                    v: "회원 식별 및 서비스 제공, 보호자 확인, 법정 의무 이행, 진단 결과 통지",
                  },
                  {
                    k: "보유·이용 기간",
                    v: "회원 탈퇴 시까지. 관계 법령에 따른 보관 의무가 있는 경우 5년 보관 후 자동 파기",
                  },
                  {
                    k: "제3자 제공",
                    v: "제공하지 않습니다. 본인확인기관에는 인증 목적으로만 최소 정보가 전달됩니다.",
                  },
                ]}
              />
              <p className="border-t border-acc-divider bg-acc-panel px-4.5 py-3 text-[12.5px] text-acc-dim">
                동의를 거부할 권리가 있으나, 거부 시 회원가입 및 진단 서비스 이용이 불가합니다.
              </p>
            </section>

            {/* 선택 항목 */}
            {optional.map((c) => {
              const on = checked.includes(c.id);
              return (
                <section key={c.id} className="border border-acc-line">
                  <div className="flex items-center gap-2.5 border-b border-acc-divider px-4.5 py-3.5">
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      aria-pressed={on}
                      className="flex flex-1 items-center gap-2.5 text-left"
                    >
                      <Check on={on} />
                      <span className="text-[15px] font-semibold text-acc-body">
                        [선택] {c.label}
                      </span>
                    </button>
                  </div>
                  <p className="px-4.5 py-3.5 text-[13.5px] leading-[1.8] text-acc-muted">
                    {c.detail} 동의하지 않아도 진단 응시와 결과 열람에 아무런 제한이 없습니다.
                    <span className="mt-1 block text-acc-body">
                      동의하지 않으면 — {c.ifDeclined}
                    </span>
                  </p>
                </section>
              );
            })}
          </div>

          {/* 진단 윤리 헌장 */}
          <section className="border border-acc-line border-t-[3px] border-t-acc-primary bg-acc-panel p-5">
            <h3 className="text-[15px] font-bold text-acc-primary-dark">진단 윤리 헌장 Article 7</h3>
            <p className="mt-2 text-[14px] leading-[1.8] text-acc-body">
              발현되지 않은 재능은 진단할 수 없습니다. GENIXX는 아이를 등급으로 규정하지 않으며,
              점수가 낮은 영역은 약점이 아니라 아직 발현되지 않은 영역으로 기술합니다.{" "}
              <Link href="/about/charter" className="font-semibold text-acc-primary hover:underline">
                헌장 전문 보기 ›
              </Link>
            </p>
          </section>

          {tried && !allRequiredOn && (
            <p role="alert" className="text-center text-[14px] font-bold text-acc-required">
              필수 항목에 모두 동의해야 다음 단계로 넘어갑니다.
            </p>
          )}

          <StepFooter back={{ href: "/signup/type" }}>
            <button type="button" onClick={next} className={btnPrimary}>
              동의하고 다음 단계
            </button>
          </StepFooter>
        </div>
      </div>
    </div>
  );
}
