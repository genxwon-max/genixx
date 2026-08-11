"use client";

import { useState } from "react";
import { roleOf, staffRoles, type StaffRoleId } from "@/lib/admin";
import {
  issueStaff,
  patchStaff,
  resetStaffPassword,
  useStaffAccounts,
  type StaffAccount,
} from "@/lib/staffStore";
import { useHydrated } from "@/lib/examStore";
import { Badge } from "./Parts";
import * as a from "./ui";

/**
 * ADM-03 운영자 계정 발급.
 *
 * 운영자는 스스로 가입하지 않는다. 슈퍼 관리자가 아이디를 만들고 역할을 붙여 임시
 * 비밀번호와 함께 건네준다. 그래서 이 화면이 계정의 유일한 입구다.
 *
 * 임시 비밀번호는 만든 직후 한 번만 보여 준다. 저장하지 않기 때문에 이 창을 닫으면
 * 다시 볼 수 없고, 잊으면 재발급해야 한다 — 실제 운영에서도 그게 맞는 절차다.
 */
export default function StaffIssue() {
  const hydrated = useHydrated();
  const accounts = useStaffAccounts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    loginId: "",
    name: "",
    role: "author" as StaffRoleId,
    team: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ account: StaffAccount; password: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = issueStaff(form);
    if (!result.ok) return setError(result.error);
    setIssued({ account: result.account, password: result.tempPassword });
    setForm({ loginId: "", name: "", role: "author", team: "" });
    setOpen(false);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={a.cardTitle}>운영자 {hydrated ? accounts.length : 0}명</h2>
          <p className={`${a.bodyText} mt-1`}>
            아이디와 역할은 여기서만 만들어집니다. 스스로 가입하는 경로는 없습니다.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className={a.btnPrimary}>
          {open ? "닫기" : "운영자 추가하기"}
        </button>
      </div>

      {/* ── 발급 결과 — 한 번만 보여 준다 ── */}
      {issued && (
        <section className="mb-6 border-l-4 border-emerald-500 py-1 pl-4">
          <h3 className="adm-t-lg font-black text-emerald-700">
            {issued.account.name} 계정을 만들었습니다
          </h3>
          <p className="mt-1.5 adm-t-sm leading-relaxed text-exam-text">
            아래 임시 비밀번호를 본인에게 전달해 주세요. 이 창을 닫으면 다시 볼 수 없습니다 —
            저장하지 않기 때문입니다. 잊으면 재발급하시면 됩니다.
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { k: "아이디", v: issued.account.loginId },
              { k: "역할", v: roleOf(issued.account.role).label },
              { k: "임시 비밀번호", v: issued.password },
            ].map((row) => (
              <div key={row.k} className="rounded-md border border-exam-line px-4 py-3">
                <dt className="adm-t-xs font-bold text-exam-muted">{row.k}</dt>
                <dd className="mt-1 adm-t-md font-black tracking-tight text-exam-text">{row.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`아이디 ${issued.account.loginId} / 임시 비밀번호 ${issued.password}`)
                  .catch(() => undefined);
              }}
              className={a.btnGhost}
            >
              아이디·비밀번호 복사
            </button>
            <button type="button" onClick={() => setIssued(null)} className={a.btnGhost}>
              확인했습니다
            </button>
          </div>
        </section>
      )}

      {/* ── 발급 폼 ── */}
      {open && (
        <form onSubmit={submit} noValidate className={`${a.panel} mb-6 p-5 sm:p-6`}>
          <h3 className={a.cardTitle}>새 운영자</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <label className="block">
              <span className={a.label}>아이디</span>
              <input
                value={form.loginId}
                onChange={(e) => {
                  setForm({
                    ...form,
                    loginId: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
                  });
                  setError(null);
                }}
                placeholder="author.kim"
                className={`mt-2 ${a.input}`}
              />
            </label>
            <label className="block">
              <span className={a.label}>이름</span>
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setError(null);
                }}
                placeholder="김출제"
                className={`mt-2 ${a.input}`}
              />
            </label>
            <label className="block">
              <span className={a.label}>역할</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRoleId })}
                className={`mt-2 ${a.select}`}
              >
                {staffRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={a.label}>
                소속 <span className="font-normal text-exam-muted">(비우면 자동)</span>
              </span>
              <input
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                placeholder="문항개발팀"
                className={`mt-2 ${a.input}`}
              />
            </label>
          </div>

          <p className="mt-4 adm-t-sm leading-relaxed text-exam-muted">
            고른 역할이 곧 권한입니다 — {roleOf(form.role).desc}
          </p>

          {error && (
            <p role="alert" className="mt-3 adm-t-sm font-bold text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" className={`${a.btnPrimary} mt-5`}>
            계정 만들고 임시 비밀번호 발급
          </button>
        </form>
      )}

      {/* ── 계정 목록 ── */}
      <div className={`${a.panel} overflow-x-auto`}>
        <table className={a.table}>
          <thead>
            <tr>
              <th className={a.th}>사번</th>
              <th className={a.th}>아이디</th>
              <th className={a.th}>이름</th>
              <th className={a.th}>역할</th>
              <th className={a.th}>비밀번호</th>
              <th className={a.th}>2단계 인증</th>
              <th className={a.th}>마지막 접속</th>
              <th className={a.th}>할 일</th>
            </tr>
          </thead>
          <tbody>
            {(hydrated ? accounts : []).map((s) => (
              <tr key={s.loginId}>
                <td className={a.td}>{s.id}</td>
                <td className={a.tdStrong}>{s.loginId}</td>
                <td className={a.td}>{s.name}</td>
                <td className={a.td}>
                  <Badge label={roleOf(s.role).label} className={roleOf(s.role).tone} />
                </td>
                <td className={a.td}>
                  <Badge
                    label={s.temp ? "임시 — 아직 안 바꿈" : "변경됨"}
                    className={s.temp ? "text-amber-700" : "text-emerald-700"}
                  />
                </td>
                <td className={a.td}>
                  <Badge
                    label={s.mfa ? "켜짐" : "꺼짐 — 확인 필요"}
                    className={s.mfa ? "text-emerald-700" : "text-rose-700"}
                  />
                </td>
                <td className={a.td}>{s.lastSeen ?? "접속 전"}</td>
                <td className={a.td}>
                  <span className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setIssued({ account: s, password: resetStaffPassword(s.loginId) })
                      }
                      className={a.btnRowGhost}
                    >
                      비밀번호 재발급
                    </button>
                    <button
                      type="button"
                      onClick={() => patchStaff(s.loginId, { active: !s.active })}
                      className={a.btnRowGhost}
                    >
                      {s.active ? "정지" : "정지 해제"}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
