"use client";

import Link from "next/link";
import { useState } from "react";
import { CONSENT_AGE, MAJORITY_AGE, minorFeatureMatrix } from "@/lib/account";
import { useSession } from "@/lib/authStore";
import { findById, formatCode, linkToOrg, setResultSharing } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { themeOf, type Variant } from "@/lib/authVariant";

/**
 * ACC-01-5 학생 본인 가입 완료 — 기관코드·평가코드 잇기.
 *
 * 만 14세 이상 학생이 자기 이름으로 가입을 끝낸 다음 자리다. 흐름의 마지막 두 칸이
 * 여기서 채워진다 —
 *
 *   학생 계정 생성 → **기관코드 또는 평가코드 입력** → 평가 응시
 *
 * 코드는 선택이다. 기관을 통하지 않고 혼자 온 학생도 무료 진단은 그대로 응시할 수
 * 있어야 하기 때문이다. 코드를 넣으면 그 기관의 회차에 이어지고, 기관 화면에는
 * 「학생 본인 가입 완료」 상태로 나타난다.
 *
 * 결과 공유는 여기서 학생이 직접 정한다. 만 14세 이상이면 개인정보 동의의 주체가
 * 학생 본인이므로, 보호자에게 무엇을 보여 줄지도 학생이 고르는 쪽이 맞다.
 */
export default function StudentLink({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();

  const [code, setCode] = useState("");
  const [linked, setLinked] = useState<string | null>(null);
  /** null = 아직 고르지 않음. 고르기 전에 한쪽이 켜져 보이면 정하지 않은 것을 정한 것처럼 읽힌다 */
  const [share, setShare] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  const me = session?.studentId ? findById(session.studentId) : null;

  const submit = () => {
    const clean = code.trim();
    if (clean.length < 4) {
      setError("기관에서 받은 코드를 입력해 주세요. 없으시면 건너뛰셔도 됩니다.");
      return;
    }
    // 실제 연동에서는 코드로 기관·회차를 조회한다. 시연에서는 입력한 값을 그대로 쓴다.
    const orgName = `${clean.toUpperCase()} 소속`;
    if (session?.studentId) linkToOrg(session.studentId, orgName);
    setLinked(orgName);
    setError(null);
  };

  const toggleShare = (on: boolean) => {
    setShare(on);
    if (session?.studentId) setResultSharing(session.studentId, on);
  };

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-16">
        <div className={`${t.column} flex flex-col gap-6`}>
          <div className={`${t.card} p-7 text-center sm:p-9`}>
            <span
              aria-hidden
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[24px] text-emerald-600"
            >
              ✓
            </span>
            <h1 className="mt-5 text-[24px] font-extrabold tracking-tight">
              {session?.name ?? "학생"}님, 가입이 끝났습니다
            </h1>
            <p className={`mt-3 text-[14px] leading-[1.7] ${t.muted}`}>
              만 {CONSENT_AGE}세 이상이라 본인 동의로 계정을 만들었습니다. 이제 평가에 응시할 수
              있습니다.
            </p>
            {me && (
              <div className="mt-5 rounded-[12px] bg-slate-50 px-5 py-4">
                <p className={`text-[12.5px] font-semibold ${t.muted}`}>내 접속코드</p>
                <p className="mt-1 text-[20px] font-black tracking-[0.14em] tabular-nums">
                  {formatCode(me.code)}
                </p>
              </div>
            )}
          </div>

          {/* 기관코드·평가코드 */}
          <div className={`${t.card} flex flex-col gap-4 p-6`}>
            <div>
              <p className="text-[16px] font-bold">기관코드 또는 평가코드 입력</p>
              <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                학교·학원에서 코드를 받으셨다면 넣어 주세요. 그 기관의 회차에 이어지고, 기관
                화면에는 「학생 본인 가입 완료」로 표시됩니다. 없으셔도 무료 진단은 그대로 응시할
                수 있습니다.
              </p>
            </div>

            {linked ? (
              <p className="text-[13px] font-semibold text-emerald-600">
                ✓ {linked}으로 연결되었습니다.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    aria-label="기관코드 또는 평가코드"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, ""));
                      setError(null);
                    }}
                    placeholder="MOKDONG-2026"
                    className={`${t.field} tracking-[0.08em]`}
                  />
                  <button type="button" onClick={submit} className={`${t.btnQuiet} shrink-0`}>
                    연결
                  </button>
                </div>
                {error && (
                  <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          {/* 결과 공유 — 학생이 정한다 */}
          <div className={`${t.card} flex flex-col gap-3 p-6`}>
            <p className="text-[16px] font-bold">학부모에게 평가 결과 공유</p>
            <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
              만 {CONSENT_AGE}세 이상이면 동의의 주체가 본인이라, 보호자에게 결과를 보여 줄지도
              직접 정하실 수 있습니다. 고르지 않으시면 공유하지 않습니다. 나중에 언제든 바꿀 수
              있습니다.
            </p>
            <div className="flex gap-2">
              {[
                { on: true, label: "공유함" },
                { on: false, label: "공유하지 않음" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => toggleShare(o.on)}
                  aria-pressed={share === o.on}
                  className={`flex-1 rounded-full border px-4 py-3 text-[14px] font-semibold transition-colors ${
                    share === o.on
                      ? "border-soft-primary bg-soft-primary-soft text-soft-primary"
                      : "border-soft-line bg-white text-soft-muted hover:bg-slate-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 만 19세 미만 안내 */}
          <div className={`${t.cardSoft} p-5`}>
            <p className="text-[14px] font-bold">
              만 {MAJORITY_AGE}세 미만이면 결제만 따로 봅니다
            </p>
            <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
              개인정보 동의의 기준은 만 {CONSENT_AGE}세, 계약·결제의 기준은 만 {MAJORITY_AGE}세로
              서로 다른 선입니다.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {minorFeatureMatrix.map((f) => (
                <li key={f.feature} className="flex gap-2 text-[13px] leading-[1.7]">
                  <span
                    aria-hidden
                    className={`mt-[3px] h-4 w-4 shrink-0 rounded-full text-center text-[10px] font-black leading-4 ${
                      f.self ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {f.self ? "✓" : "!"}
                  </span>
                  <span>
                    <b>{f.feature}</b> — <span className={t.muted}>{f.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/exam" className={t.btnPrimary}>
            평가 응시하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
