"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ageFromBirth,
  CONSENT_AGE,
  consentRouteFor,
  consentRouteInfo,
  consentStages,
} from "@/lib/account";
import { patchChildDraft, useChildDraft } from "@/lib/childStore";
import { useHydrated } from "@/lib/examStore";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { labelText as fieldLabel, field as input } from "@/components/account/ui";
import { AccHead, btnGhost, btnPrimary, card, cardPad, childStepLabels, LegalNote, StepBar } from "./ui";

/**
 * ACC-03-1 법정대리인 동의 (B00) — 학생 등록 흐름의 최선행.
 *
 * 만 14세 기준으로 동의 주체가 갈리므로, 생년월일을 가장 먼저 받는다.
 * 이때 받는 것은 생년월일 하나뿐이다. 어떤 법적 근거로 무엇을 받아야 하는지
 * 정하기 위한 최소 정보라서, 다른 항목은 다음 화면(B01~B10)으로 미룬다.
 *
 * 화면 제목은 「학생 등록」이다. 사용자는 아이를 등록하러 왔지, 법정대리인 동의를
 * 하러 온 것이 아니다. 법률 용어는 부제와 근거 상자에 둔다. 학생이 없는 계정은
 * 로그인하면 여기로 바로 오기 때문에, 3단계 중 첫 칸이라는 것을 위에 세워 둔다.
 */
export default function ChildConsent() {
  const router = useRouter();
  const hydrated = useHydrated();
  const draft = useChildDraft();

  const [birth, setBirth] = useState(draft.birth);
  const [agreed, setAgreed] = useState<string[]>([]);
  const [kidsNoticeRead, setKidsNoticeRead] = useState(false);
  const [tried, setTried] = useState(false);

  if (!hydrated) {
    return <p className="py-16 text-center text-[13px] text-soft-muted">확인 중입니다…</p>;
  }

  const digits = birth.replace(/\D/g, "");
  const age = ageFromBirth(digits);
  const route = consentRouteFor(age);
  const info = route ? consentRouteInfo[route] : null;

  const upfront = consentStages.filter((s) => s.upfront);
  const requiredStages = upfront.filter((s) => s.required);
  const allRequired = requiredStages.every((s) => agreed.includes(s.id));
  const kidsOk = route === "guardian" ? kidsNoticeRead : true;
  const ready = route !== null && allRequired && kidsOk;

  const toggle = (id: string) =>
    setAgreed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    setTried(true);
    if (!ready || !route) return;
    patchChildDraft({
      birth: digits,
      route,
      guardianConsented: route === "guardian",
      selfConsentQueued: route === "self",
      stages: agreed,
    });
    router.push("/my/children/new");
  };

  return (
    <>
      <AccHead
        id="ACC-03-1"
        title="학생 등록"
        lead="먼저 동의를 받습니다. 아이의 생년월일에 따라 누가 동의해야 하는지가 달라집니다."
        back={{ href: "/my", label: "홈으로" }}
      />

      <div className="mb-5">
        <StepBar current={0} labels={childStepLabels} />
      </div>

      {/* ① 생년월일 — 갈래를 정하는 최소 정보 */}
      <div className={`${card} ${cardPad}`}>
        <label htmlFor="child-birth" className={fieldLabel}>
          아이 생년월일 <span className="font-normal text-soft-muted">(8자리)</span>
        </label>
        <input
          id="child-birth"
          inputMode="numeric"
          value={birth}
          onChange={(e) => setBirth(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
          placeholder="20150312"
          className={`mt-2 ${input} tabular-nums`}
        />
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          이름·학년을 먼저 묻지 않는 이유가 있습니다. 그것부터 받으면 동의 없이 아이의 개인정보를
          갖게 됩니다. 생년월일은 누구에게 동의를 받아야 하는지 정하는 데만 씁니다.
        </p>

        {digits.length === 8 && age === null && (
          <p role="alert" className="mt-3 text-[13px] font-bold text-rose-600">
            날짜를 다시 확인해 주세요.
          </p>
        )}

        {age !== null && info && (
          <div
            className={`mt-5 rounded-lg border px-5 py-4 ${
              route === "guardian"
                ? "border-amber-300 bg-amber-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <p className="text-[15px] font-black text-soft-ink">
              만 {age}세 — {info.label}
            </p>
            <p className="mt-1.5 text-[14px] font-bold text-soft-ink">
              동의 주체: {info.who}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">{info.summary}</p>
          </div>
        )}
      </div>

      {/* ② 갈래별 안내 */}
      {info && (
        <div className="mt-4">
          <LegalNote title={`${info.label} 처리 기준`} basis={info.basis}>
            <ul className="list-disc space-y-1 pl-5">
              {info.extra.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </LegalNote>
        </div>
      )}

      {/* ③ 만 14세 미만 — 아동 눈높이 고지문 병행 제시 */}
      {route === "guardian" && (
        <div className={`${card} mt-4 p-6`}>
          <p className="text-[15px] font-black text-soft-ink">아이에게 보여 줄 안내문</p>
          <p className="mt-1.5 text-[13px] text-soft-muted">
            법에 따라 아이도 이해할 수 있는 말로 함께 알려 드려야 합니다.
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 p-5 text-[14px] leading-[1.9] text-soft-ink">
            <p>· 네가 푼 문제와 답을 선생님들이 보고, 네가 뭘 잘하는지 찾아볼 거야.</p>
            <p>· 점수로 등수를 매기지 않아. 잘하는 걸 찾는 게 목적이야.</p>
            <p>· 네 이름과 답은 선생님과 부모님만 볼 수 있어.</p>
            <p>· 그만하고 싶으면 언제든 부모님께 말하면 돼. 지울 수 있어.</p>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={kidsNoticeRead}
              onChange={(e) => setKidsNoticeRead(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1b2a6b]"
            />
            <span className="text-[14px] leading-relaxed text-soft-ink">
              위 내용을 아이에게 읽어 주었거나 보여 주었습니다.
            </span>
          </label>
        </div>
      )}

      {/* ④ 만 14세 이상 — 본인 동의 예약 안내 */}
      {route === "self" && (
        <div className={`${card} mt-4 p-6`}>
          <p className="text-[15px] font-black text-soft-ink">학생 본인 동의는 응시 화면에서 받습니다</p>
          <p className="mt-2 text-[14px] leading-relaxed text-soft-muted">
            만 {CONSENT_AGE}세 이상이므로 법정대리인 동의를 받지 않습니다. 대신 아이가 접속코드로
            처음 들어올 때 본인 동의 화면이 먼저 뜹니다. 아이가 동의하기 전에는 응시가 시작되지
            않습니다.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
            보호자는 결제와 리포트 열람 주체로 그대로 남습니다.
          </p>
        </div>
      )}

      {/* ⑤ 1차 동의 항목 */}
      {route && (
        <div className={`${card} mt-4 px-6 sm:px-8`}>
          <p className="pt-6 text-[13px] font-bold text-soft-ink">
            1차 동의 항목 — {route === "guardian" ? "보호자가 동의합니다" : "아이가 동의할 항목입니다"}
          </p>
          <ul className="pb-6">
            {upfront.map((s) => {
              const on = agreed.includes(s.id);
              return (
                <li key={s.id} className="border-b border-soft-line last:border-b-0">
                  <label className="flex cursor-pointer gap-3.5 py-4">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(s.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#1b2a6b]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-soft-ink">{s.label}</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${
                            s.required
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-soft-line bg-slate-50 text-soft-muted"
                          }`}
                        >
                          {s.required ? "필수" : "선택"}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-soft-muted">
                        목적 {s.purpose} · 항목 {s.items}
                      </span>
                      <span className="mt-1 block text-[13px] text-soft-muted">
                        보관 {s.keep}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {route && (
        <p className="mt-4 text-[13px] leading-relaxed text-soft-muted">
          음성·영상·행동로그가 들어가는 2단계 심화진단과 면담 녹화는 지금 받지 않습니다. 해당 시점에
          따로 여쭤봅니다.{" "}
          <Link href="/my/children/consent-stages" className="font-bold text-soft-primary-dark underline">
            단계별 동의 관리
          </Link>
        </p>
      )}

      {tried && !ready && (
        <p role="alert" className="mt-4 text-[13px] font-bold text-rose-600">
          {route === null
            ? "생년월일을 먼저 입력해 주세요."
            : !kidsOk
              ? "아이에게 보여 줄 안내문을 확인해 주세요."
              : "필수 동의 항목을 확인해 주세요."}
        </p>
      )}

      <button type="button" onClick={submit} className={`${btnPrimary} mt-5 w-full`}>
        동의하고 아이 정보 입력
        <ArrowRight className="h-4 w-4" />
      </button>

      <Link href="/my/children" className={`${btnGhost} mt-2 w-full`}>
        나중에 하기
      </Link>

      <p className="mt-5 flex items-start gap-2 text-[13px] leading-relaxed text-soft-muted">
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        동의는 언제든 철회할 수 있습니다. 철회하시면 파기 절차가 자동으로 시작되고 처리 결과를
        알려 드립니다.
      </p>
    </>
  );
}
