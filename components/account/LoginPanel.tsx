"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mfaRequired, roleHome, signIn, type Role } from "@/lib/authStore";
import { getRoster } from "@/lib/roster";
import { themeOf, type Variant } from "@/lib/authVariant";
import AuthTabs, { VariantSwitch } from "./AuthTabs";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * ACC-02 로그인.
 *
 * 로그인 수단을 네 개 버튼으로 세운다 — 카카오 · 네이버 · 구글 · 이메일.
 * 간편 로그인은 각 제공자 화면에서 동의를 받고 돌아오므로 우리 쪽에 동의 단계를
 * 두지 않는다. 이메일만 아이디·비밀번호가 필요해서 눌렀을 때 펼친다.
 *
 * 로그인 뒤 분기(사이트맵 기준) —
 *  1) 전문가·관리자 → 2FA (통과 전에는 세션을 만들지 않는다)
 *  2) 교사·기관이면서 소속 승인 전 → ACC-01-4 승인 대기
 *  3) 학부모이면서 등록된 자녀 없음 → 법정대리인 동의(B00)
 *  4) 그 외 → 역할별 기본 화면
 */

const demoAccounts: {
  role: Role;
  label: string;
  name: string;
  org?: string;
  desc: string;
  approved?: boolean;
}[] = [
  { role: "parent", label: "학부모", name: "김보호", desc: "자녀가 없으면 동의 단계부터" },
  {
    role: "director",
    label: "기관담당자",
    name: "정원장",
    org: "제닉스 영재교육원",
    desc: "명부·접속코드 관리",
    approved: true,
  },
  {
    role: "teacher",
    label: "교사 (승인 전)",
    name: "이교사",
    org: "서울 목동초등학교",
    desc: "승인 대기 화면으로",
    approved: false,
  },
  { role: "admin", label: "운영관리자", name: "박서준", desc: "2단계 인증을 거쳐 콘솔로" },
];

export default function LoginPanel({
  variant = 1,
  /** 이메일 폼을 펼친 채로 열지. 시안 검토·반출용으로 URL(?view=email)에서 지정한다. */
  initialByEmail = false,
}: {
  variant?: Variant;
  initialByEmail?: boolean;
}) {
  const t = themeOf(variant);
  const router = useRouter();
  const [byEmail, setByEmail] = useState(initialByEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [pendingMfa, setPendingMfa] = useState<{ role: Role; name: string; email: string } | null>(
    null,
  );

  const routeAfterLogin = (role: Role, approved?: boolean) => {
    if ((role === "teacher" || role === "director") && approved === false) return "/signup/pending";
    if (role === "parent") {
      // 자녀가 없으면 홈에 세워 둘 게 없으므로 등록 흐름 최선행으로 바로 보낸다
      const mine = getRoster().filter((s) => s.owner === "parent");
      return mine.length === 0 ? "/my/children/consent" : "/my";
    }
    return roleHome[role];
  };

  const enterAs = (role: Role, name: string, org?: string, approved?: boolean) => {
    if (mfaRequired.includes(role)) {
      setPendingMfa({ role, name, email: `${role}@genixx.demo` });
      return;
    }
    signIn({ role, name, org, provider: "카카오", email: `${role}@genixx.demo`, approved });
    router.push(routeAfterLogin(role, approved));
  };

  const social = (provider: string) => {
    signIn({
      role: "parent",
      name: "김보호",
      provider,
      email: "genix.kim@example.com",
      approved: true,
    });
    router.push(routeAfterLogin("parent", true));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!emailRe.test(email)) next.email = "이메일 형식을 확인해 주세요.";
    if (password.length < 8)
      next.password = "이메일 또는 비밀번호가 일치하지 않습니다. (5회 오류 시 10분간 잠금)";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const local = email.split("@")[0].toLowerCase();
    const role: Role = local.startsWith("admin")
      ? "admin"
      : local.startsWith("expert")
        ? "expert"
        : local.startsWith("teacher")
          ? "teacher"
          : local.startsWith("org")
            ? "director"
            : "parent";

    if (mfaRequired.includes(role)) {
      setPendingMfa({ role, name: local, email });
      return;
    }
    signIn({ role, name: local, provider: null, email, approved: true });
    router.push(routeAfterLogin(role, true));
  };

  if (pendingMfa) {
    return (
      <MfaStep
        variant={variant}
        account={pendingMfa}
        onCancel={() => setPendingMfa(null)}
        onPass={() => {
          signIn({
            role: pendingMfa.role,
            name: pendingMfa.name,
            provider: null,
            email: pendingMfa.email,
            approved: true,
            mfaPassed: true,
          });
          router.push(roleHome[pendingMfa.role]);
        }}
      />
    );
  }

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-14">
        <p className={t.crumb}>홈 &gt; 로그인</p>

        <div className={`mt-6 ${t.column}`}>
          <AuthTabs variant={variant} />

        <div className="mt-8 flex flex-col gap-5">
          {!byEmail ? (
            <>
              <p className={t.lead}>가입 시 선택한 방법으로 로그인해 주세요.</p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => social("카카오")}
                  className={`${t.btnSocial} bg-[#FEE500] text-[#191600]`}
                >
                  카카오 로그인
                  <span className="rounded-full bg-black/12 px-2 py-0.5 text-[12px] font-semibold">
                    최근 사용
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => social("네이버")}
                  className={`${t.btnSocial} bg-[#03C75A] text-white`}
                >
                  네이버 로그인
                </button>
                <button type="button" onClick={() => social("구글")} className={t.btnNeutral}>
                  구글 로그인
                </button>
                <button type="button" onClick={() => setByEmail(true)} className={t.btnNeutral}>
                  이메일로 로그인
                </button>
              </div>

              <p className={`text-[13px] leading-[1.7] ${t.muted}`}>
                카카오·네이버·구글로 로그인하시면 해당 서비스의 동의 화면을 거쳐 돌아옵니다.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setByEmail(false)}
                className={`self-start text-[13px] font-semibold ${t.muted} hover:underline`}
              >
                ← 다른 방법으로 로그인
              </button>

              <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="login-email" className={t.fieldLabel}>
                    이메일 <span className={t.required}>*</span>
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@genixx.kr"
                    aria-invalid={!!errors.email}
                    className={t.field}
                  />
                  {errors.email && (
                    <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="login-password" className={t.fieldLabel}>
                    비밀번호 <span className={t.required}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      aria-invalid={!!errors.password}
                      className={`${t.field} pr-16`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-pressed={showPw}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 text-[13px] ${t.muted}`}
                    >
                      {showPw ? "숨김" : "표시"}
                    </button>
                  </div>
                  {errors.password && (
                    <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className={`flex cursor-pointer items-center gap-2 text-[14px] ${t.muted}`}>
                    <input
                      type="checkbox"
                      checked={keep}
                      onChange={(e) => setKeep(e.target.checked)}
                      className="h-[18px] w-[18px] accent-[#365eef]"
                    />
                    로그인 상태 유지
                  </label>
                  <span className={`text-[13px] ${t.muted}`}>공용 PC에서는 사용하지 마세요.</span>
                </div>

                <button type="submit" className={t.btnPrimary}>
                  로그인
                </button>
              </form>
            </>
          )}

          <div className={`flex justify-center gap-4 text-[14px] ${t.muted}`}>
            <Link href="/login/recover" className="hover:underline">
              아이디 찾기
            </Link>
            <span aria-hidden>|</span>
            <Link href="/login/recover" className="hover:underline">
              비밀번호 재설정
            </Link>
          </div>

          {/* 학생 응시 접속 — 회원 로그인과 완전히 분리 */}
          <div
            className={`${t.cardSoft} flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center`}
          >
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] font-bold">진단에 참여하는 학생인가요?</p>
              <p className={`text-[13px] leading-[1.6] ${t.muted}`}>
                학생은 회원가입을 하지 않습니다. 보호자가 발급한 접속코드로 접속하세요.
              </p>
            </div>
            <Link
              href="/login/student"
              className={`${variant === 1 ? "rounded border-acc-primary text-acc-primary hover:bg-acc-primary-soft" : "rounded-full border-soft-primary text-soft-primary hover:bg-white"} flex h-[2.875rem] shrink-0 items-center border bg-white px-5 text-[15px] font-bold transition-colors`}
            >
              학생 응시 접속
            </Link>
          </div>

          {/* 시연용 */}
          <div className={`${t.card} p-5`}>
            <p className={`text-[13px] font-bold ${t.muted}`}>시연용 간편 로그인</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((d) => (
                <li key={d.label}>
                  <button
                    type="button"
                    onClick={() => enterAs(d.role, d.name, d.org, d.approved)}
                    className={`h-full w-full px-4 py-3 text-left ${t.pick} ${t.pickOff}`}
                  >
                    <span className="block text-[14px] font-bold">{d.label}</span>
                    <span className={`mt-1 block text-[12px] leading-relaxed ${t.muted}`}>
                      {d.desc}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

          <VariantSwitch variant={variant} kind="login" />
        </div>
      </div>
    </div>
  );
}

/** 전문가·관리자 2단계 인증 (사이트맵 12장 보안 정책) */
function MfaStep({
  variant,
  account,
  onCancel,
  onPass,
}: {
  variant: Variant;
  account: { role: Role; name: string; email: string };
  onCancel: () => void;
  onPass: () => void;
}) {
  const t = themeOf(variant);
  const [code, setCode] = useState("");
  const ready = code.replace(/\D/g, "").length === 6;

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-11 pb-14">
        <p className={t.crumb}>홈 &gt; 로그인 &gt; 2단계 인증</p>

        <div className={`mt-8 ${t.column}`}>
        <div className="flex flex-col items-center gap-2.5">
          <h1 className={t.heading}>2단계 인증</h1>
          <p className={t.lead}>{account.email}</p>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <div className={`${t.cardSoft} p-5`}>
            <p className="text-[15px] font-bold">이 계정은 2단계 인증이 필수입니다</p>
            <p className={`mt-2 text-[13.5px] leading-[1.8] ${t.muted}`}>
              전문가와 운영관리자는 아동의 개인정보에 접근할 수 있어, 비밀번호만으로는 로그인할 수
              없습니다.
            </p>
          </div>

          <div className="flex flex-col gap-[7px]">
            <label htmlFor="mfa-code" className={t.fieldLabel}>
              인증 앱에 표시된 6자리 숫자 <span className={t.required}>*</span>
            </label>
            <input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className={`${t.field} text-center text-[20px] font-bold tracking-[0.3em] tabular-nums`}
            />
            <p className={`text-[13px] ${t.muted}`}>
              30초마다 바뀝니다. 시연에서는 아무 6자리나 넣으셔도 통과합니다.
            </p>
          </div>

          <button type="button" disabled={!ready} onClick={onPass} className={t.btnPrimary}>
            인증하고 들어가기
          </button>
            <button type="button" onClick={onCancel} className={t.btnNeutral}>
              다른 계정으로 로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
