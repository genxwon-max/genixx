"use client";

import Link from "next/link";
import { MAJORITY_AGE, purposeConsents } from "@/lib/account";
import { themeOf } from "@/lib/authVariant";
import { designLinks } from "@/lib/designScreens";
import AccountChrome from "@/components/account/AccountChrome";
import { ArrowBadge, ExpertArt, PersonalArt } from "@/components/account/AuthArt";
import SocialButton, { plainStackButton, SocialMark } from "@/components/account/SocialButton";

/**
 * 전문가 회원가입 (실제 주소 /signup/type → /signup/join) — 디자인.
 *
 * 콘솔에서 일하는 사람(출제자 · 검토자 · 진단 위원 · 상담사)은 운영자가 따로 등록하지 않는다.
 * **사이트에서 전문가로 회원가입**하고, 최상위 관리자가 가입 승인에서 권한을 정해 계정을 연다.
 * 그래서 가입 화면에서는 권한이나 소속을 묻지 않는다 — 다른 회원과 같은 칸(계정 · 이름 ·
 * 휴대폰 본인인증 · 약관)만 받는다.
 *
 * 차례는 ① 회원 유형 → ② 가입 수단 → ③ 정보 입력이고, 가입하면 곧바로 콘솔의 「승인 대기」
 * 화면(/design/admin2/waiting)에 도착한다. 가입 완료 화면을 따로 두지 않는 것은 실제 화면과 같다.
 *
 * 화면 모양은 지금의 가입 화면(components/account/SignupType.tsx · SignupFlow.tsx)을 그대로
 * 옮겼다. 약관 목록만 전문가에 맞게 줄였다 — 진단 응시에 관한 동의는 전문가에게 묻지 않는다.
 */

const t = themeOf(2);
const ACCENT = "#365eef";
const to = designLinks("expert-signup");

/** 가입한 뒤 도착하는 곳 — 콘솔의 승인 대기 화면 */
const WAITING = "/design/admin2/waiting";

export default function ExpertSignup({ state }: { state: string }) {
  return (
    <AccountChrome>
      {state === "" ? <TypeStep /> : state === "method" ? <MethodStep /> : <JoinStep slug={state} />}
    </AccountChrome>
  );
}

/* ───────────────────────── ① 회원 유형 · ② 가입 수단 ───────────────────────── */

function Tabs() {
  return (
    <nav aria-label="로그인 또는 회원가입" className={t.tabBar}>
      <Link href="/login" className={`flex-1 py-3.5 text-center text-[16px] transition-colors ${t.tabOff}`}>
        로그인
      </Link>
      <span aria-current="page" className={`flex-1 py-3.5 text-center text-[16px] ${t.tabOn}`}>
        회원가입
      </span>
    </nav>
  );
}

function TypeStep() {
  const cards = [
    {
      title: "개인 회원으로 가입",
      desc: "학생 본인 또는 학부모·법정대리인 계정입니다",
      art: <PersonalArt className="h-28 w-full" accent={ACCENT} />,
      href: "/signup/type",
    },
    {
      title: "전문가 회원으로 가입",
      desc: "문항 출제·검토와 결과 해석 면담을 맡습니다. 운영진 승인 뒤에 권한이 열립니다",
      art: <ExpertArt className="h-28 w-full" accent={ACCENT} />,
      href: to("method"),
    },
  ];

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 회원가입</p>
        <div className={`mt-7 ${t.column}`}>
          <Tabs />
        </div>

        <div className="mx-auto mt-12 w-full max-w-[46rem]">
          {/* 되돌아가기 줄 — 첫 단계에서는 빈 줄로 자리만 지킨다 */}
          <div className="h-6" />
          <h1 className={`${t.heading} mt-7 text-center`}>어떤 유형으로 가입하시나요?</h1>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {cards.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="group flex flex-col rounded-[16px] border border-soft-line bg-white p-6 text-left transition-all hover:border-soft-primary hover:shadow-[0_8px_24px_rgba(54,94,239,0.12)] sm:p-7"
              >
                <span className="flex items-start justify-between gap-2.5">
                  <span className="text-[19px] font-extrabold leading-snug tracking-tight">{c.title}</span>
                  <ArrowBadge color={ACCENT} />
                </span>
                <span className={`mt-2.5 text-[13.5px] leading-[1.6] ${t.muted}`}>{c.desc}</span>
                <span className="mt-5 block" aria-hidden>
                  {c.art}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodStep() {
  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 회원가입</p>
        <div className={`mt-7 ${t.column}`}>
          <Tabs />
        </div>

        <div className={`${t.column} mt-12`}>
          <div className="flex h-6 items-center">
            <Link href={to()} className={`text-[13px] font-semibold ${t.muted} hover:underline`}>
              ← 이전으로
            </Link>
          </div>

          <div className="mt-7 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className={t.heading}>전문가로 회원가입하기</h1>
              <p className={t.lead}>가입에 사용할 계정을 선택해 주세요.</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* 간편 가입 세 버튼은 각 회사가 정해 둔 양식이다 (components/account/SocialButton.tsx) */}
              <div className="flex flex-col gap-2.5">
                <SocialButton provider="kakao" intent="signup" href={to("join/social")} />
                <SocialButton provider="naver" intent="signup" href={to("join/social")} />
                <SocialButton provider="google" intent="signup" href={to("join/social")} />
                <Link href={to("join")} className={plainStackButton}>
                  아이디로 회원가입
                </Link>
              </div>

              <div className={`flex justify-center gap-4 text-[14px] ${t.muted}`}>
                <Link href="/login" className="hover:underline">
                  로그인
                </Link>
                <span aria-hidden>|</span>
                <Link href="/login/recover" className="hover:underline">
                  아이디 찾기
                </Link>
                <span aria-hidden>|</span>
                <Link href="/login/recover" className="hover:underline">
                  비밀번호 찾기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── ③ 정보 입력 ───────────────────────── */

/** 전문가에게 받는 동의 — 진단 응시에 관한 동의(학력 · 재능 · 심화)는 묻지 않는다 */
const consents = [
  { id: "terms", label: "이용약관", required: true },
  { id: "privacy", label: "전문가 회원 개인정보 수집·이용", required: true },
  { id: "marketing", label: "안내 메일·문자 수신", required: false },
];

function Row({
  id,
  label,
  hint,
  error,
  ok,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  ok?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-[14px] font-semibold ${t.muted}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
          {error}
        </p>
      ) : ok ? (
        <p className="text-[13px] font-semibold text-emerald-600">✓ {ok}</p>
      ) : (
        hint && <p className={`text-[13px] leading-[1.6] ${t.muted}`}>{hint}</p>
      )}
    </div>
  );
}

function Check({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center justify-between gap-3 py-1">
      <span className="text-[14px] leading-[1.6]">{label}</span>
      <span
        aria-hidden
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[12px] font-black ${
          on ? "bg-soft-primary text-white" : "border border-soft-line bg-white text-transparent"
        }`}
      >
        ✓
      </span>
    </span>
  );
}

function JoinStep({ slug }: { slug: string }) {
  const kind = slug.replace(/^join\/?/, "") as "" | "filled" | "error" | "pass" | "terms" | "social" | "minor";
  const social = kind === "social";
  const bad = kind === "error";
  /* 값을 다 채운 화면들 — 입력 완료 · 간편 가입 */
  const full = kind === "filled" || social;
  /* 본인인증 전까지만 채운 화면들 */
  const half = kind === "pass" || kind === "minor" || kind === "terms";
  const agreed = full ? ["terms", "privacy"] : [];

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-10 pb-16">
        <div className={`mx-auto w-full max-w-[30rem] ${t.card} rounded-[18px] p-7 sm:p-9`}>
          <h1 className="text-center text-[26px] font-extrabold tracking-tight">회원가입</h1>
          <div className="mt-5 flex flex-col items-center gap-2">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-primary text-white ring-4 ring-soft-primary-soft"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
                <path
                  d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[13px] font-bold text-soft-primary">정보 입력</span>
          </div>

          <div className="mt-8 flex flex-col gap-6">
            {social ? (
              <Row id="email" label="이메일" ok="계정이 인증되었습니다.">
                <div className="relative">
                  <input
                    id="email"
                    readOnly
                    defaultValue="jisu.han@kakao.com"
                    className={`${t.field} bg-slate-50 pr-12 text-slate-500`}
                  />
                  <SocialMark provider="kakao" className="absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </Row>
            ) : (
              <>
                <Row
                  id="loginId"
                  label="아이디"
                  error={bad ? "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요." : undefined}
                  ok={full || half ? "사용할 수 있는 아이디입니다." : undefined}
                  hint="로그인할 때 쓰는 아이디입니다. 나중에 바꿀 수 없습니다."
                >
                  <div className="flex gap-2">
                    <input
                      id="loginId"
                      defaultValue={bad ? "admin" : full || half ? "jisu_han" : ""}
                      placeholder="genix_expert"
                      className={`${t.field} ${full || half ? "bg-soft-primary-soft" : ""}`}
                    />
                    <button
                      type="button"
                      disabled={kind === ""}
                      className={`${t.btnQuiet} shrink-0 disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      중복 확인
                    </button>
                  </div>
                </Row>

                <Row
                  id="pw"
                  label="비밀번호"
                  error={bad ? "조건을 채워 주세요." : undefined}
                  hint={
                    <>
                      최소 8자
                      <br />
                      영문 대문자, 소문자, 숫자, 기호 중 2가지 이상
                    </>
                  }
                >
                  <div className="relative">
                    <input
                      id="pw"
                      type="password"
                      defaultValue={bad ? "1234" : full || half ? "Genixx!2026" : ""}
                      placeholder="비밀번호를 입력하세요."
                      className={`${t.field} pr-12`}
                    />
                    <span aria-hidden className={`absolute right-4 top-1/2 -translate-y-1/2 text-[15px] ${t.muted}`}>
                      👁
                    </span>
                  </div>
                </Row>

                <Row
                  id="pw2"
                  label="비밀번호 확인"
                  error={bad ? "비밀번호가 서로 다릅니다." : undefined}
                  ok={full || half ? "비밀번호가 일치합니다." : undefined}
                >
                  <div className="relative">
                    <input
                      id="pw2"
                      type="password"
                      defaultValue={bad ? "12345" : full || half ? "Genixx!2026" : ""}
                      placeholder="비밀번호를 한번 더 입력해 주세요."
                      className={`${t.field} pr-12`}
                    />
                    <span aria-hidden className={`absolute right-4 top-1/2 -translate-y-1/2 text-[15px] ${t.muted}`}>
                      👁
                    </span>
                  </div>
                </Row>
              </>
            )}

            <Row id="name" label="이름" error={bad ? "이름을 입력해 주세요." : undefined}>
              <input
                id="name"
                defaultValue={full || half ? "한지수" : ""}
                placeholder="이름을 입력하세요."
                className={t.field}
              />
            </Row>

            {/* 휴대폰 본인인증 */}
            <div className="flex flex-col gap-2">
              <p className={`text-[14px] font-semibold ${t.muted}`}>휴대폰 본인인증</p>

              {(kind === "" || bad || kind === "terms") && (
                <>
                  <Link href={to("join/pass")} className={t.btnNeutral}>
                    휴대폰 인증하기
                  </Link>
                  {bad && (
                    <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                      휴대폰 본인인증을 마쳐 주세요.
                    </p>
                  )}
                </>
              )}

              {kind === "pass" && (
                <div className="rounded-[14px] border border-soft-line p-5">
                  <p className="text-[14px] font-bold">본인확인 창에서 인증을 진행해 주세요</p>
                  <p className={`mt-1.5 text-[13px] leading-[1.7] ${t.muted}`}>
                    주민등록번호와 휴대폰 번호는 본인확인 창에서 입력합니다. 인증이 끝나면 확인된 휴대폰
                    번호와 생년월일만 이 화면으로 돌아옵니다.
                  </p>
                  <p className={`mt-3 text-[13px] leading-[1.7] ${t.muted}`}>
                    창이 보이지 않으면 브라우저의 팝업 차단을 풀고 다시 눌러 주세요.
                  </p>
                  <div className="mt-3 flex gap-4 text-[13px]">
                    <button type="button" className="font-semibold text-soft-primary hover:underline">
                      본인확인 창 다시 열기
                    </button>
                    <Link href={to("join")} className={`${t.muted} hover:underline`}>
                      취소
                    </Link>
                  </div>
                </div>
              )}

              {full && (
                <p className="text-[13px] font-semibold text-emerald-600">
                  ✓ 휴대폰 본인인증이 완료되었습니다.
                </p>
              )}

              {kind === "minor" && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-[14px] font-bold">전문가 계정은 성년만 만들 수 있습니다</p>
                  <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                    전문가 활동은 만 {MAJORITY_AGE}세 이상이어야 할 수 있습니다. 학생 본인이시라면 학생으로
                    가입해 주세요.
                  </p>
                  <Link href={to()} className={`${t.btnQuiet} mt-2`}>
                    회원 유형 다시 고르기
                  </Link>
                </div>
              )}
            </div>

            {/* 약관동의 */}
            <div className="flex flex-col gap-2">
              <p className={`text-[14px] font-semibold ${t.muted}`}>약관동의</p>
              <div className="rounded-[12px] border border-soft-line bg-white px-5 py-4">
                <div className="pb-3">
                  <Check on={false} label="모두 확인, 동의합니다." />
                </div>
                <ul className="flex flex-col gap-1 border-t border-soft-line pt-3">
                  {consents.map((c) => {
                    const open = kind === "terms" && c.id === "terms";
                    return (
                      <li key={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Check on={agreed.includes(c.id)} label={`${c.label} (${c.required ? "필수" : "선택"})`} />
                          </div>
                          {c.id === "terms" ? (
                            <Link
                              href={open ? to("join") : to("join/terms")}
                              aria-expanded={open}
                              className={`shrink-0 text-[12px] ${t.muted} hover:underline`}
                            >
                              {open ? "접기" : "보기"}
                            </Link>
                          ) : (
                            <button type="button" className={`shrink-0 text-[12px] ${t.muted} hover:underline`}>
                              보기
                            </button>
                          )}
                        </div>
                        {open && (
                          <div
                            role="region"
                            aria-label="이용약관 전문"
                            tabIndex={0}
                            className="my-2 h-[500px] overflow-y-auto rounded-[10px] border border-soft-line bg-slate-50 px-4 py-3"
                          >
                            {purposeConsents[0].body.map((b) => (
                              <div key={b.h} className="mb-2.5 last:mb-0">
                                <p className="text-[12.5px] font-bold">{b.h}</p>
                                <p className={`mt-1 text-[12.5px] leading-[1.8] ${t.muted}`}>{b.p}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
              {bad && (
                <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                  필수 약관에 동의해 주세요.
                </p>
              )}
            </div>

            {/* 전문가 가입은 승인을 거친다는 것을 누르기 전에 한 번 말해 둔다 */}
            <p className="rounded-[12px] bg-soft-primary-soft px-4 py-3 text-[13px] leading-[1.7] text-soft-ink">
              전문가 회원은 가입한 뒤 <b>운영진의 승인</b>을 받아야 화면이 열립니다. 맡으실 역할(출제자 ·
              검토자 · 진단 위원 · 상담사)은 승인할 때 운영진이 정합니다.
            </p>

            {full ? (
              <Link href={WAITING} className={t.btnPrimary}>
                가입하기
              </Link>
            ) : (
              <button type="button" disabled={!bad} className={t.btnPrimary}>
                가입하기
              </button>
            )}
          </div>

          <p className={`mt-6 text-center text-[13px] ${t.muted}`}>
            <Link href={to("method")} className="hover:underline">
              가입 수단 다시 고르기
            </Link>
            <span aria-hidden className="mx-2.5 text-soft-line">
              |
            </span>
            <Link href="/login" className="hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
