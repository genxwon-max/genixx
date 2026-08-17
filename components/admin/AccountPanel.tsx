"use client";

import { useState } from "react";
import { roleOf } from "@/lib/admin";
import { patchAdminPrefs, useAdminPrefs } from "@/lib/adminStore";
import { findStaff, patchStaff } from "@/lib/staffStore";
import { PageHead } from "./Parts";
import * as a from "./ui";

/**
 * 내 계정 (ADM-03-1) — 비밀번호 변경과 2단계 인증.
 *
 * 비밀번호 변경은 강제하지 않는다. 임시 비밀번호를 받은 사람이 급한 검수부터 처리해야
 * 할 수도 있어서, 안내 띠만 띄우고 막지 않는다.
 *
 * 새 비밀번호는 저장하지 않는다 — 형식만 확인하고 「임시 상태를 벗어났다」는 사실만
 * 남긴다. 실제 구현에서는 서버가 해시로 바꿔 저장하는 자리다(lib/staffStore.ts 참조).
 */
export default function AccountPanel() {
  const prefs = useAdminPrefs();
  const account = prefs.loginId ? findStaff(prefs.loginId) : null;
  const role = roleOf(prefs.role);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const strong = next.length >= 10 && /[a-zA-Z]/.test(next) && /\d/.test(next);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (current.length < 8)
      return setMsg({ kind: "error", text: "지금 비밀번호를 입력해 주세요." });
    if (!strong)
      return setMsg({
        kind: "error",
        text: "새 비밀번호는 영문과 숫자를 섞어 10자 이상으로 정해 주세요.",
      });
    if (next !== again) return setMsg({ kind: "error", text: "새 비밀번호가 서로 다릅니다." });
    if (next === current)
      return setMsg({ kind: "error", text: "지금 쓰는 비밀번호와 다르게 정해 주세요." });

    if (prefs.loginId) patchStaff(prefs.loginId, { temp: false });
    patchAdminPrefs({ temp: false });
    setCurrent("");
    setNext("");
    setAgain("");
    setMsg({ kind: "ok", text: "비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요." });
  };

  return (
    <>
      <PageHead
        id="ADM-03-1"
        title="내 계정"
        lead="아이디와 역할은 슈퍼 관리자가 정합니다. 비밀번호는 직접 바꾸실 수 있습니다."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className={`${a.panel} p-5 sm:p-6`}>
          <h2 className={a.cardTitle}>계정 정보</h2>
          <dl className="mt-4">
            {[
              { k: "이름", v: prefs.staffName },
              { k: "아이디", v: prefs.loginId ?? "—" },
              { k: "역할", v: role.label },
              { k: "소속", v: account?.team ?? "—" },
              { k: "사번", v: account?.id ?? "—" },
              {
                k: "2단계 인증",
                v: account?.mfa ? "켜짐" : "꺼짐 — 켜 두시길 권합니다",
              },
            ].map((row) => (
              <div
                key={row.k}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-exam-line py-3.5 last:border-b-0"
              >
                <dt className="w-24 shrink-0 adm-t-sm font-bold text-exam-muted">{row.k}</dt>
                <dd className="adm-t-md font-bold text-exam-text">{row.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 adm-t-md leading-relaxed text-exam-muted">
            역할을 바꾸려면 슈퍼 관리자에게 요청하세요. 권한 변경은 전건 감사 로그에 남습니다.
          </p>
        </section>

        <section className={`${a.panel} p-5 sm:p-6`}>
          <h2 className={a.cardTitle}>비밀번호 바꾸기</h2>
          <p className="mt-1.5 adm-t-md leading-relaxed text-exam-muted">
            {prefs.temp
              ? "지금은 발급받은 임시 비밀번호를 쓰고 계십니다. 바꾸지 않아도 콘솔은 그대로 쓰실 수 있습니다."
              : "필요할 때 바꾸시면 됩니다."}
          </p>

          <form onSubmit={submit} noValidate className="mt-5">
            <label className="block">
              <span className={a.label}>지금 비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => {
                  setCurrent(e.target.value);
                  setMsg(null);
                }}
                className={`mt-2 ${a.input}`}
              />
            </label>

            <label className="mt-4 block">
              <span className={a.label}>새 비밀번호</span>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => {
                  setNext(e.target.value);
                  setMsg(null);
                }}
                placeholder="영문·숫자를 섞어 10자 이상"
                className={`mt-2 ${a.input}`}
              />
              {next.length > 0 && (
                <span
                  className={`mt-2 block adm-t-sm font-bold ${
                    strong ? "text-emerald-700" : "text-exam-muted"
                  }`}
                >
                  {strong ? "쓸 수 있습니다" : "영문과 숫자를 섞어 10자 이상으로 정해 주세요"}
                </span>
              )}
            </label>

            <label className="mt-4 block">
              <span className={a.label}>새 비밀번호 확인</span>
              <input
                type="password"
                autoComplete="new-password"
                value={again}
                onChange={(e) => {
                  setAgain(e.target.value);
                  setMsg(null);
                }}
                className={`mt-2 ${a.input}`}
              />
            </label>

            {msg && (
              <p
                role={msg.kind === "error" ? "alert" : undefined}
                className={`mt-4 adm-t-sm font-bold ${
                  msg.kind === "error" ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {msg.text}
              </p>
            )}

            <button type="submit" className={`${a.btnPrimary} mt-5`}>
              비밀번호 바꾸기
            </button>
          </form>

          <p className="mt-5 border-t border-exam-line pt-4 adm-t-xs leading-relaxed text-exam-muted">
            이 화면은 비밀번호를 저장하지 않습니다. 형식만 확인하고 「임시 상태를 벗어났다」는
            사실만 기록합니다. 실제 구현에서는 서버가 해시로 바꿔 저장합니다.
          </p>
        </section>
      </div>
    </>
  );
}
