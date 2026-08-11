"use client";

import { useState } from "react";
import { roleOf } from "@/lib/admin";
import { adminSignIn } from "@/lib/adminStore";
import { findStaff, useStaffAccounts } from "@/lib/staffStore";
import * as a from "./ui";

/**
 * 콘솔 로그인 (ADM-00).
 *
 * 운영자 계정은 스스로 가입하지 않는다. 슈퍼 관리자가 아이디를 만들고 역할을 붙여
 * 임시 비밀번호와 함께 건네준다. 그래서 이 화면에는 가입 링크도, 비밀번호 찾기도 없다 —
 * 잊었으면 슈퍼 관리자가 다시 발급하는 쪽이 맞다.
 *
 * 비밀번호는 형식만 본다. 이 프로젝트에는 인증 서버가 없어서, 대조하려면 평문을 어딘가
 * 담아야 하기 때문이다. 실제 구현에서는 서버가 해시로 대조하는 자리다.
 */
export default function ConsoleLogin() {
  const accounts = useStaffAccounts();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = findStaff(loginId);
    if (!account) return setError("아이디를 찾을 수 없습니다. 슈퍼 관리자에게 문의해 주세요.");
    if (!account.active) return setError("정지된 계정입니다. 슈퍼 관리자에게 문의해 주세요.");
    if (password.length < 8) return setError("비밀번호는 8자 이상입니다.");

    adminSignIn({
      loginId: account.loginId,
      staffName: account.name,
      role: account.role,
      temp: account.temp,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-5 py-12">
      <div className="w-full max-w-[26rem]">
        <p className="text-center text-2xl font-black tracking-tight text-white">GENIXX</p>
        <p className="mt-1.5 text-center adm-t-sm font-bold text-slate-400">관리자 콘솔</p>

        <form onSubmit={submit} noValidate className="mt-7 rounded-lg bg-white p-6 sm:p-7">
          <h1 className="adm-t-lg font-black text-exam-text">운영자 로그인</h1>
          <p className="mt-1.5 adm-t-sm leading-relaxed text-exam-muted">
            슈퍼 관리자가 발급한 아이디로 들어옵니다. 이 콘솔에는 가입 절차가 없습니다.
          </p>

          <label className="mt-5 block">
            <span className={a.label}>아이디</span>
            <input
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""));
                setError(null);
              }}
              autoComplete="username"
              placeholder="author.kim"
              className={`mt-2 ${a.input}`}
            />
          </label>

          <label className="mt-4 block">
            <span className={a.label}>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              placeholder="발급받은 임시 비밀번호"
              className={`mt-2 ${a.input}`}
            />
          </label>

          {error && (
            <p role="alert" className="mt-4 adm-t-sm font-bold text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" className={`${a.btnPrimary} mt-6 w-full`}>
            로그인
          </button>

          <p className="mt-5 border-t border-exam-line pt-4 adm-t-xs leading-relaxed text-exam-muted">
            비밀번호를 잊으셨으면 슈퍼 관리자에게 재발급을 요청하세요. 찾기 절차를 두지 않는 것은
            운영자 계정이 학생 개인정보에 닿기 때문입니다.
          </p>
        </form>

        {/* 화면 검토용 — 어떤 아이디가 있는지 알아야 역할별 화면을 볼 수 있다 */}
        <div className="mt-5 rounded-lg border border-white/15 p-4">
          <p className="adm-t-xs font-bold text-slate-400">화면 검토용 계정</p>
          <ul className="mt-2 space-y-1.5">
            {accounts.slice(0, 4).map((s) => (
              <li key={s.loginId} className="flex items-baseline justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setLoginId(s.loginId);
                    setPassword("genixx-demo");
                    setError(null);
                  }}
                  className="adm-t-sm font-bold text-white underline underline-offset-2"
                >
                  {s.loginId}
                </button>
                <span className="adm-t-xs text-slate-400">{roleOf(s.role).label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 adm-t-xs text-slate-500">
            누르면 아이디가 채워집니다. 비밀번호는 8자 이상이면 통과합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
