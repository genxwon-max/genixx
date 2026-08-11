"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SocialButtons from "./SocialButtons";
import { providerName, type ProviderId } from "@/lib/signup";
import { mfaRequired, roleHome, signIn, type Role } from "@/lib/authStore";
import { getRoster } from "@/lib/roster";
import {
  btnGhost,
  btnPrimary,
  card,
  cardPad,
  field,
  fieldError,
  fieldLabel,
  LegalNote,
  narrow,
  Notes,
} from "./ui";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * ACC-02 로그인.
 *
 * 레이아웃은 인싸이트(inpsyt.co.kr) 로그인 화면 구성을 그대로 따랐다 —
 * 좁은 중앙 상자, 라벨 + 44px 입력칸 두 개, 왼쪽 '아이디 저장' 체크박스와
 * 오른쪽 찾기 링크, 폭 전체를 채우는 남색 제출 버튼, 가운데 구분점으로 나눈
 * 아이디·비밀번호 찾기, 맨 아래 "아직 회원이 아니신가요? 회원가입".
 * 폼 아래 점 목록 주의사항은 GED 로그인 화면의 관례를 가져왔다.
 *
 * 사이트맵이 정한 동작 —
 *  · 이메일·간편로그인 (ACC-02), 2FA는 전문가·관리자 필수 (12장 보안 정책)
 *  · 학생은 이 화면으로 들어오지 않고 ACC-02-1 별도 경로를 쓴다
 */

/** 시연용 계정 */
const demoAccounts: {
  role: Role;
  label: string;
  name: string;
  org?: string;
  desc: string;
  approved?: boolean;
}[] = [
  {
    role: "parent",
    label: "학부모",
    name: "김보호",
    desc: "자녀가 없으면 법정대리인 동의부터 시작합니다",
  },
  {
    role: "director",
    label: "기관담당자",
    name: "정원장",
    org: "제닉스 영재교육원",
    desc: "학생 명부와 접속코드를 관리합니다",
    approved: true,
  },
  {
    role: "teacher",
    label: "교사 (승인 전)",
    name: "이교사",
    org: "서울 목동초등학교",
    desc: "승인 대기 화면으로 보냅니다",
    approved: false,
  },
  { role: "admin", label: "운영관리자", name: "박서준", desc: "2FA를 거쳐 관리자 콘솔로" },
];

const loginNotes = [
  "아이디는 가입하실 때 등록한 이메일 주소입니다.",
  "학교·기관 계정은 소속 승인이 끝난 뒤에 로그인하실 수 있습니다.",
  "전문가·운영관리자 계정은 2단계 인증을 함께 거칩니다.",
];

export default function LoginPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [pendingMfa, setPendingMfa] = useState<{ role: Role; name: string; email: string } | null>(
    null,
  );

  /** 로그인 성공 후 어디로 보낼지 */
  const routeAfterLogin = (role: Role, approved?: boolean) => {
    if ((role === "teacher" || role === "director") && approved === false) return "/signup/pending";
    if (role === "parent") {
      const mine = getRoster().filter((s) => s.owner === "parent");
      return mine.length === 0 ? "/my/children/consent" : "/my/children";
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!emailRe.test(email)) next.email = "아이디(이메일) 형식을 확인해 주세요.";
    if (password.length < 8) next.password = "비밀번호는 8자 이상입니다.";
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

  const social = (id: ProviderId) => {
    signIn({
      role: "parent",
      name: "김보호",
      provider: providerName(id),
      email: `genix.kim@${id}.com`,
      approved: true,
    });
    router.push(routeAfterLogin("parent"));
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
    <div className={narrow}>
      <header className="mb-7 text-center">
        <h1 className="text-[28px] font-black tracking-tight text-exam-text">로그인</h1>
        <p className="mt-2.5 text-[15px] text-exam-muted">
          로그인하시면 자녀의 진단을 신청하고 결과를 보실 수 있습니다.
        </p>
      </header>

      <div className={`${card} ${cardPad}`}>
        <form onSubmit={submit} noValidate>
          <div>
            <label htmlFor="login-email" className={fieldLabel}>
              아이디 <span className="font-normal text-exam-muted">(이메일)</span>
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              aria-invalid={!!errors.email}
              className={`mt-2 ${field} ${errors.email ? fieldError : ""}`}
            />
            {errors.email && (
              <p role="alert" className="mt-1.5 text-[13px] font-bold text-rose-600">
                {errors.email}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="login-password" className={fieldLabel}>
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              aria-invalid={!!errors.password}
              className={`mt-2 ${field} ${errors.password ? fieldError : ""}`}
            />
            {errors.password && (
              <p role="alert" className="mt-1.5 text-[13px] font-bold text-rose-600">
                {errors.password}
              </p>
            )}
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[14px] text-exam-muted">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
              className="h-4 w-4 accent-[#1b2a6b]"
            />
            로그인 상태 유지
          </label>

          <button type="submit" className={`${btnPrimary} mt-5`}>
            로그인
          </button>
        </form>

        {/* 인싸이트처럼 가운데 구분점으로 나눈 찾기 링크 */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[14px] text-exam-muted">
          <Link href="/login/recover" className="hover:text-exam-text hover:underline">
            아이디 찾기
          </Link>
          <span aria-hidden className="h-3 w-px bg-slate-300" />
          <Link href="/login/recover" className="hover:text-exam-text hover:underline">
            비밀번호 찾기
          </Link>
        </div>

        <div className="my-6 flex items-center gap-3 text-[13px] text-exam-muted">
          <span className="h-px flex-1 bg-slate-200" />
          간편 로그인
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <SocialButtons onPick={social} suffix="로 로그인" />

        <p className="mt-7 border-t border-slate-200 pt-5 text-center text-[14px] text-exam-muted">
          아직 GENIXX 회원이 아니신가요?{" "}
          <Link href="/signup" className="font-bold text-brand-700 hover:underline">
            회원가입
          </Link>
        </p>
      </div>

      {/* ACC-02-1 별도 경로 */}
      <div className={`${card} mt-4 p-6`}>
        <h2 className="text-[16px] font-black text-exam-text">학생은 이곳으로 들어옵니다</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-exam-muted">
          학생은 따로 가입하지 않습니다. 보호자나 학원에서 받은 <b>8자리 접속코드</b>와{" "}
          <b>생년월일</b>로 바로 응시 화면에 들어갑니다.
        </p>
        <Link href="/login/student" className={`${btnGhost} mt-4 w-full`}>
          학생 응시 로그인
        </Link>
      </div>

      <Notes items={loginNotes} />

      {/* 시연용 */}
      <div className={`${card} mt-6 p-6`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-exam-muted">
          시연용 간편 로그인
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-exam-muted">
          역할마다 로그인 뒤 흐름이 어떻게 갈리는지 바로 확인하실 수 있습니다.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((d) => (
            <li key={d.label}>
              <button
                type="button"
                onClick={() => enterAs(d.role, d.name, d.org, d.approved)}
                className="h-full w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="block text-[14px] font-black text-exam-text">{d.label}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-exam-muted">
                  {d.desc}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 전문가·관리자 계정의 2단계 인증 (사이트맵 12장 보안 정책) */
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
    <div className={narrow}>
      <header className="mb-7 text-center">
        <h1 className="text-[28px] font-black tracking-tight text-exam-text">2단계 인증</h1>
        <p className="mt-2.5 text-[15px] text-exam-muted">{account.email}</p>
      </header>

      <div className={`${card} ${cardPad}`}>
        <LegalNote title="이 계정은 2단계 인증이 필수입니다">
          <p>
            전문가와 운영관리자는 아동의 개인정보에 접근할 수 있어, 비밀번호만으로는 로그인할 수
            없습니다.
          </p>
        </LegalNote>

        <div className="mt-6">
          <label htmlFor="mfa-code" className={fieldLabel}>
            인증 앱에 표시된 6자리 숫자
          </label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className={`mt-2 ${field} text-center text-[22px] font-black tracking-[0.4em] tabular-nums`}
          />
          <p className="mt-2 text-[13px] text-exam-muted">
            30초마다 바뀝니다. 시연에서는 아무 6자리나 넣으셔도 통과합니다.
          </p>
        </div>

        <button type="button" disabled={!ready} onClick={onPass} className={`${btnPrimary} mt-6`}>
          인증하고 들어가기
        </button>
        <button type="button" onClick={onCancel} className={`${btnGhost} mt-2 w-full`}>
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
