"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mfaRequired, roleHome, signIn, type Role } from "@/lib/authStore";
import { getRoster } from "@/lib/roster";
import { themeOf } from "@/lib/authVariant";
import AuthTabs, { BackRow } from "./AuthTabs";

/** 가입 때 만든 아이디 규칙과 같다 (components/account/SignupFlow.tsx) */
const idRe = /^[a-z][a-z0-9_]{3,19}$/;

/** 시안 2「둥글둥글」로 확정했다. 로그인 화면은 이 톤 하나만 쓴다. */
const t = themeOf(2);

/**
 * ACC-02 로그인.
 *
 * 로그인 수단을 네 개 버튼으로 세운다 — 카카오 · 네이버 · 구글 · 아이디.
 * 간편 로그인은 각 제공자 화면에서 동의를 받고 돌아오므로 우리 쪽에 동의 단계를
 * 두지 않는다. 아이디 로그인만 아이디·비밀번호가 필요해서 눌렀을 때 펼친다.
 *
 * 펼쳤다 접었다 하는 화면이라 **되돌아가기 줄이 늘 같은 자리를 차지한다.** 버튼이
 * 없을 때도 빈 줄로 남겨 두어야 「아이디로 로그인」을 눌렀을 때 아래 내용이 밀리지
 * 않는다. 위아래 여백도 넉넉히 둔다.
 *
 * 학생 응시 접속 안내는 여기 두지 않는다. 응시코드는 기관·보호자가 링크와 함께
 * 건네주는 것이고, 공개 화면에서는 헤더와 홈, 응시 관문(/exam)이 그 길을 이미 열어
 * 둔다. 회원 로그인 화면에 그 안내까지 얹으면 두 갈래가 한 화면에서 겹쳐 읽힌다.
 *
 * 로그인 뒤 분기(사이트맵 기준) —
 *  1) 전문가·관리자 → 2FA (통과 전에는 세션을 만들지 않는다)
 *  2) 교사·기관이면서 소속 승인 전 → ACC-01-4 승인 대기
 *  3) 학부모이면서 등록된 자녀 없음 → 법정대리인 동의(B00)
 *  4) 그 외 → 역할별 기본 화면
 */

/* 시연용 계정 — 화면에서 감춰 두는 동안 함께 잠재운다. 다시 켤 때 이 블록과
   아래 enterAs, 본문의 「시연용 간편 로그인」 카드를 같이 되살리면 된다.

const demoAccounts: {
  role: Role;
  label: string;
  name: string;
  org?: string;
  desc: string;
  approved?: boolean;
}[] = [
  { role: "parent", label: "학부모", name: "김보호", desc: "자녀가 없으면 등록 화면부터" },
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
*/

export default function LoginPanel({
  /** 아이디 폼을 펼친 채로 열지. 검토·반출용으로 URL(?view=id)에서 지정한다. */
  initialById = false,
}: {
  initialById?: boolean;
}) {
  const router = useRouter();
  const [byId, setById] = useState(initialById);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState<{ id?: string; password?: string }>({});
  const [pendingMfa, setPendingMfa] = useState<{ role: Role; name: string; email: string } | null>(
    null,
  );

  const routeAfterLogin = (role: Role, approved?: boolean) => {
    if ((role === "teacher" || role === "director") && approved === false) return "/my/pending";
    if (role === "parent") {
      // 자녀가 없으면 홈에 세워 둘 게 없으므로 등록 흐름 최선행으로 바로 보낸다
      const mine = getRoster().filter((s) => s.owner === "parent");
      return mine.length === 0 ? "/my/children/new" : "/my";
    }
    return roleHome[role];
  };

  /* 시연용 계정으로 바로 들어가기 — demoAccounts와 함께 잠재워 둔다.
  const enterAs = (role: Role, name: string, org?: string, approved?: boolean) => {
    if (mfaRequired.includes(role)) {
      setPendingMfa({ role, name, email: `${role}@genixx.demo` });
      return;
    }
    signIn({ role, name, org, provider: "카카오", email: `${role}@genixx.demo`, approved });
    router.push(routeAfterLogin(role, approved));
  };
  */

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
    if (!idRe.test(loginId)) next.id = "아이디는 영문 소문자로 시작하는 4~20자입니다.";
    if (password.length < 8)
      next.password = "아이디 또는 비밀번호가 일치하지 않습니다. (5회 오류 시 10분간 잠금)";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const local = loginId.toLowerCase();
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
      setPendingMfa({ role, name: local, email: `${local}@genixx.demo` });
      return;
    }
    // 교사는 기관담당자가 초대·승인해야 활성화된다. 아이디가 teacher로 시작하면
    // 승인 전 계정으로 들여보내 ACC-01-4 승인 대기 화면을 확인할 수 있다.
    const approved = role !== "teacher";
    signIn({ role, name: local, provider: null, loginId, approved });
    router.push(routeAfterLogin(role, approved));
  };

  if (pendingMfa) {
    return (
      <MfaStep
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
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 로그인</p>

        <div className={`mt-7 ${t.column}`}>
          <AuthTabs />

          <div className="mt-12">
            <BackRow
              onClick={byId ? () => setById(false) : undefined}
              label="다른 방법으로 로그인"
            />

            <div className="mt-7 flex flex-col gap-5">
              {!byId ? (
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
                    <button type="button" onClick={() => setById(true)} className={t.btnNeutral}>
                      아이디로 로그인
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                  <div className="flex flex-col gap-[7px]">
                    <label htmlFor="login-id" className={t.fieldLabel}>
                      아이디 <span className={t.required}>*</span>
                    </label>
                    <input
                      id="login-id"
                      type="text"
                      autoComplete="username"
                      value={loginId}
                      onChange={(e) =>
                        setLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      placeholder="genix_parent"
                      aria-invalid={!!errors.id}
                      className={t.field}
                    />
                    {errors.id && (
                      <p role="alert" className={`text-[13px] font-semibold ${t.required}`}>
                        {errors.id}
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
                    <label
                      className={`flex cursor-pointer items-center gap-2 text-[14px] ${t.muted}`}
                    >
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
              )}

              {/* 회원가입은 위 탭에도 있지만, 로그인이 막혀 되돌아가는 자리는 여기다.
                  찾기 둘과 나란히 두면 「안 되면 갈 곳」이 한 줄에 모인다 */}
              <div className={`flex justify-center gap-4 text-[14px] ${t.muted}`}>
                <Link href="/signup/type" className="hover:underline">
                  회원가입
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

              {/* 시연용 간편 로그인 — 검토용이라 잠시 감춰 둔다. 계정 목록은 demoAccounts에 그대로 있다.
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
              */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 전문가·관리자 2단계 인증 (사이트맵 12장 보안 정책) */
function MfaStep({
  account,
  onCancel,
  onPass,
}: {
  account: { role: Role; name: string; email: string };
  onCancel: () => void;
  onPass: () => void;
}) {
  const [code, setCode] = useState("");
  const ready = code.replace(/\D/g, "").length === 6;

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x pt-14 pb-24">
        <p className={t.crumb}>홈 &gt; 로그인 &gt; 2단계 인증</p>

        <div className={`mt-12 ${t.column}`}>
          <div className="flex flex-col items-center gap-2.5">
            <h1 className={t.heading}>2단계 인증</h1>
            <p className={t.lead}>{account.email}</p>
          </div>

          <div className="mt-9 flex flex-col gap-5">
            <div className={`${t.cardSoft} p-5`}>
              <p className="text-[15px] font-bold">이 계정은 2단계 인증이 필수입니다</p>
              <p className={`mt-2 text-[13.5px] leading-[1.8] ${t.muted}`}>
                전문가와 운영관리자는 아동의 개인정보에 접근할 수 있어, 비밀번호만으로는 로그인할
                수 없습니다.
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
