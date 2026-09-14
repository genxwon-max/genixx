"use client";

import Link from "next/link";
import { useState } from "react";
import { CONSENT_AGE, guardianMinimumFields, guardianVerifyMethods } from "@/lib/account";
import { createGuardianRequest, maskPhone, type GuardianRequest } from "@/lib/guardianRequest";
import { useHydrated } from "@/lib/examStore";
import { themeOf, type Variant } from "@/lib/authVariant";
import AuthTabs from "./AuthTabs";

/**
 * ACC-01-1a 만 14세 미만 학생 — 법정대리인 동의 요청.
 *
 * 이 화면의 요지는 한 문장이다. **가입 불가가 아니라 학생 단독가입 불가다.**
 * 그래서 "회원가입할 수 없습니다"로 끝내지 않고, 세 갈래 길을 함께 놓는다 —
 *
 *   ① 법정대리인에게 동의 요청 보내기   (학생이 지금 여기서 할 수 있는 일)
 *   ② 법정대리인 계정으로 자녀 등록하기 (보호자가 직접 시작하는 길)
 *   ③ 기관에서 받은 응시코드 입력하기   (학교·학원을 통해 이미 등록된 경우)
 *
 * ③을 눌렀다고 곧바로 시험을 볼 수 있는 것은 아니다. 응시코드를 넣으면 보호자 동의
 * 상태를 먼저 확인하고, 대기 중이면 안내로 돌린다(학생 로그인 화면이 처리한다).
 *
 * 이 단계에서 받는 것은 **법정대리인의 성명과 연락처뿐**이다. 개인정보보호법 시행령이
 * 법정대리인 동의를 받는 데 필요한 최소정보를 그 둘로 한정하고 있어서, 아이 이름·학교·
 * 상세 생년월일은 동의가 끝난 뒤에 받는다. 앞 화면에서 계산한 생년월일도 저장하지
 * 않았다.
 */

const relations = [
  "어머니(친권자)",
  "아버지(친권자)",
  "미성년후견인",
  "기타 법정대리인",
];

export default function GuardianRequestScreen({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState(relations[0]);
  const [childLabel, setChildLabel] = useState("");
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<GuardianRequest | null>(null);

  const nameOk = name.trim().length >= 2;
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const ready = nameOk && phoneOk;

  const send = () => {
    setTried(true);
    if (!ready) return;
    setSent(
      createGuardianRequest({
        guardianName: name.trim(),
        guardianPhone: phone,
        childLabel: childLabel.trim() || undefined,
        origin: "student",
      }),
    );
  };

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-16">
        <p className={t.crumb}>홈 &gt; 회원가입 &gt; 법정대리인 동의</p>

        <div className={`mt-6 ${t.column}`}>
          <AuthTabs />
        </div>

        <div className={`mt-9 ${t.column} flex flex-col gap-6`}>
          {sent ? (
            <SentView req={sent} variant={variant} />
          ) : (
            <>
              <Link
                href="/signup/type"
                className={`self-start text-[13px] font-semibold ${t.muted} hover:underline`}
              >
                ← 회원 유형 다시 고르기
              </Link>

              <div className="flex flex-col gap-3">
                <h1 className={t.heading}>
                  만 {CONSENT_AGE}세 미만 학생은 혼자 회원가입을 완료할 수 없습니다
                </h1>
                <p className={t.lead}>
                  법정대리인의 동의가 완료되면 서비스를 이용할 수 있습니다. 아래 세 가지 중 하나를
                  고르시면 됩니다.
                </p>
              </div>

              {/* ① 동의 요청 보내기 */}
              {open ? (
                <div className={`${t.card} flex flex-col gap-5 p-6`}>
                  <div>
                    <p className="text-[16px] font-bold">법정대리인에게 동의 요청 보내기</p>
                    <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                      입력하신 연락처로 동의 링크를 보냅니다. 법정대리인이 본인확인을 마치고
                      동의하시면 학생 계정이 열립니다.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="g-name" className={t.fieldLabel}>
                      법정대리인 성명
                    </label>
                    <input
                      id="g-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="보호자 성함"
                      className={t.field}
                    />
                    {tried && !nameOk && (
                      <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                        법정대리인 성함을 입력해 주세요.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="g-phone" className={t.fieldLabel}>
                      법정대리인 연락처
                    </label>
                    <input
                      id="g-phone"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="01012345678"
                      className={`${t.field} tabular-nums`}
                    />
                    {tried && !phoneOk && (
                      <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                        연락 가능한 휴대폰 번호를 입력해 주세요.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="g-rel" className={t.fieldLabel}>
                      나와의 관계
                    </label>
                    <select
                      id="g-rel"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className={t.field}
                    >
                      {relations.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                      관계는 법정대리인이 동의 화면에서 다시 확인합니다. 여기서 고르신 값은
                      안내 문구를 고르는 데에만 씁니다.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="g-child" className={t.fieldLabel}>
                      보호자가 알아볼 내 호칭{" "}
                      <span className={`font-normal ${t.muted}`}>(선택)</span>
                    </label>
                    <input
                      id="g-child"
                      value={childLabel}
                      onChange={(e) => setChildLabel(e.target.value)}
                      placeholder="첫째, 하늘이 등"
                      className={t.field}
                    />
                    <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                      실명이 아니어도 됩니다. 보호자가 「누구 이야기인지」 알아보시는 데에만
                      씁니다.
                    </p>
                  </div>

                  <div className={`${t.cardSoft} p-4`}>
                    <p className="text-[13.5px] font-bold">지금 저장하는 것</p>
                    <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                      {guardianMinimumFields.join(" · ")}
                      {childLabel.trim() ? " · 내가 적은 호칭" : ""}. 이름·학교·생년월일 같은
                      학생 정보는 <b>법정대리인 동의가 끝난 뒤에</b> 받습니다. 앞 화면에서
                      확인한 생년월일도 저장하지 않았습니다.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button type="button" onClick={send} className={t.btnPrimary}>
                      동의 요청 보내기
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className={`text-[13px] ${t.muted} hover:underline`}
                    >
                      다른 방법 보기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => setOpen(true)} className={t.btnPrimary}>
                    법정대리인에게 동의 요청 보내기
                  </button>

                  <Link href="/signup/type?stage=method&type=parent" className={t.btnNeutral}>
                    법정대리인 계정으로 자녀 등록하기
                  </Link>

                  <Link href="/login/student" className={t.btnNeutral}>
                    기관에서 받은 응시코드 입력하기
                  </Link>

                  <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                    응시코드를 넣으면 먼저 보호자 동의 상태를 확인합니다. 동의가 끝나 있으면 바로
                    응시로 이어지고, 아직 대기 중이면 안내 화면으로 돌아옵니다.
                  </p>
                </div>
              )}

              {/* 왜 이렇게 하는지 */}
              <div className={`${t.cardSoft} p-5`}>
                <p className="text-[14px] font-bold">법정대리인 동의는 이렇게 확인합니다</p>
                <ul className={`mt-2.5 flex flex-col gap-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                  {guardianVerifyMethods.map((m) => (
                    <li key={m.id}>
                      · <b className={variant === 1 ? "text-acc-ink" : "text-soft-ink"}>{m.label}</b>{" "}
                      — {m.desc}
                    </li>
                  ))}
                </ul>
                <p className={`mt-3 text-[13px] leading-[1.7] ${t.muted}`}>
                  학교·학원 담당자는 학생을 관리하시더라도 법정대리인이 아닌 경우가 많습니다.
                  기관은 동의 요청을 보내 드릴 수 있을 뿐, 보호자를 대신해 동의할 수 없습니다.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 요청을 보낸 뒤 — 대기 상태 안내 */
function SentView({ req, variant }: { req: GuardianRequest; variant: Variant }) {
  const t = themeOf(variant);
  return (
    <>
      <div className={`${t.card} flex flex-col gap-4 p-6 sm:p-8`}>
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[22px] text-emerald-600"
        >
          ✓
        </span>
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">동의 요청을 보냈습니다</h1>
          <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
            <b className={variant === 1 ? "text-acc-ink" : "text-soft-ink"}>{req.guardianName}</b>{" "}
            님({maskPhone(req.guardianPhone)})께 동의 링크를 보냈습니다. 법정대리인이 본인확인을
            마치고 동의하시면 학생 계정이 열립니다.
          </p>
        </div>

        <ol className={`flex flex-col gap-2.5 text-[13.5px] leading-[1.7] ${t.muted}`}>
          {[
            "법정대리인이 링크를 엽니다",
            "휴대전화 본인확인으로 신원과 관계를 확인합니다",
            "수집 항목을 확인하고 자녀별로 동의합니다",
            "학생 계정이 열리고 응시코드가 발급됩니다",
          ].map((s, i) => (
            <li key={s} className="flex gap-2.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  variant === 1
                    ? "bg-acc-primary-soft text-acc-primary-dark"
                    : "bg-soft-primary-soft text-soft-primary"
                }`}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 시연 보조 — 실제 연동에서는 문자·알림톡으로 나가는 링크다 */}
      <div className={`${t.cardSoft} p-5`}>
        <p className="text-[13px] font-bold">시연용 · 발송된 동의 링크</p>
        <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
          실제로는 문자·알림톡으로 나가는 일회용 링크입니다. 여기서는 눌러서 법정대리인 화면을
          바로 열 수 있습니다.
        </p>
        <Link href={`/consent/guardian?req=${req.id}`} className={`${t.btnQuiet} mt-3`}>
          법정대리인 동의 화면 열기
        </Link>
      </div>

      <p className={`text-center text-[13px] ${t.muted}`}>
        <Link href="/" className="hover:underline">
          홈으로 돌아가기
        </Link>
      </p>
    </>
  );
}
