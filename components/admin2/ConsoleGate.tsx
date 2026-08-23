"use client";

import { useState } from "react";
import Link from "next/link";
import { roleOf, type StaffRoleId } from "@/lib/admin";
import { adminSignIn, adminSignOut } from "@/lib/adminStore";
import { findStaff } from "@/lib/staffStore";

/**
 * 콘솔 문 — 로그인과 「슈퍼 관리자 아님」 안내를 한 화면에서 맡는다.
 *
 * 이 콘솔은 슈퍼 관리자 전용이다. 다른 역할로 들어와 있으면 화면을 그리지 않고
 * 기존 콘솔(/admin)로 보낸다 — 저쪽은 역할별로 메뉴를 가려 주므로 할 일이 거기 있다.
 *
 * 비밀번호는 형식만 본다. 이 프로젝트에는 인증 서버가 없어서 대조하려면 평문을
 * 어딘가 담아야 하기 때문이다(lib/staffStore.ts 참조). 실제 구현에서는 서버가
 * 해시로 대조하는 자리다.
 */
export default function ConsoleGate({ role, name }: { role: StaffRoleId | null; name: string }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = findStaff(loginId);
    if (!account) return setError("아이디를 찾을 수 없습니다.");
    if (!account.active) return setError("정지된 계정입니다.");
    if (password.length < 8) return setError("비밀번호는 8자 이상입니다.");
    if (account.role !== "super")
      return setError(`이 콘솔은 슈퍼 관리자 전용입니다. ${roleOf(account.role).label} 계정은 기존 콘솔을 쓰십시오.`);

    adminSignIn({
      loginId: account.loginId,
      staffName: account.name,
      role: account.role,
      temp: account.temp,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--a2-side) px-4 py-10">
      <div className="w-full max-w-[21rem]">
        <p className="flex items-baseline gap-1.5 text-white">
          <span className="font-brand text-[1.0625rem] font-semibold leading-none">GENIXX</span>
          <span className="a2-t-xs font-bold text-(--a2-side-ink-2)">CONSOLE</span>
        </p>

        {role && role !== "super" ? (
          /* 들어와 있지만 권한이 다른 경우 — 다시 로그인시키지 않고 갈 곳을 알려 준다 */
          <div className="mt-3 a2-panel p-4">
            <h1 className="a2-h">슈퍼 관리자 전용 콘솔입니다.</h1>
            <p className="mt-2 a2-t-sm text-(--a2-ink-3)">
              {name} 님은 {roleOf(role).label} 계정으로 들어와 계십니다. 이 콘솔에는 운영자 계정·감사 로그가 있어
              슈퍼 관리자만 들어옵니다.
            </p>
            <div className="mt-3 flex gap-1.5">
              <Link href="/admin" className="a2-btn a2-btn-primary">
                기존 콘솔로
              </Link>
              <button type="button" onClick={adminSignOut} className="a2-btn">
                다른 계정으로 로그인
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-3 a2-panel p-4">
            <h1 className="a2-h">운영자 로그인</h1>
            <p className="mt-1 a2-t-sm text-(--a2-ink-3)">
              슈퍼 관리자가 발급한 아이디로 들어옵니다. 가입 절차는 없습니다.
            </p>

            <label className="mt-3 block">
              <span className="a2-label">아이디</span>
              <input
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""));
                  setError(null);
                }}
                autoComplete="username"
                placeholder="admin.park"
                className="a2-input a2-mono mt-1"
              />
            </label>

            <label className="mt-2.5 block">
              <span className="a2-label">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                className="a2-input mt-1"
              />
            </label>

            {error && (
              <p role="alert" className="mt-2.5 a2-t-sm font-semibold text-(--a2-danger)">
                {error}
              </p>
            )}

            <button type="submit" className="a2-btn a2-btn-primary mt-3 w-full">
              로그인
            </button>

            <p className="mt-3 border-t border-(--a2-line) pt-2.5 a2-t-xs text-(--a2-ink-4)">
              시연용 계정 <span className="a2-mono text-(--a2-ink-3)">admin.park</span> · 비밀번호 8자 이상 아무 값
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
