"use client";

import type { ExpertAccount } from "@/lib/expertAccounts";

/**
 * 가입 승인을 기다리는 전문가가 콘솔에서 보는 화면.
 *
 * 전문가의 화면은 모두 콘솔에 있고(lib/expertConsole.ts), 콘솔은 화면 권한을 받아야 열린다.
 * 승인 전이거나 반려된 계정, 권한을 모두 거둔 계정은 열 화면이 없으므로 껍데기가 메뉴 대신
 * 이 화면을 세운다 — 신청이 어디까지 갔는지만 보이고 학생 자료는 하나도 보이지 않는다.
 * 운영진이 승인하면 껍데기가 받은 권한의 첫 화면으로 바로 옮긴다.
 */
export default function ExpertWaiting({
  account,
  name,
  onSignOut,
}: {
  /** 콘솔 아이디로 찾은 전문가 계정. 계정이 지워졌으면 null */
  account: ExpertAccount | null;
  name: string;
  onSignOut: () => void;
}) {
  const rejected = account?.state === "rejected";
  const approved = account?.state === "approved";
  const steps = [
    { t: "가입 신청 접수", d: "가입 신청이 접수되었습니다.", done: true },
    {
      t: "운영진 확인",
      d: "소속과 경력을 확인합니다. 필요한 증빙은 등록하신 연락처로 따로 요청드립니다.",
      done: false,
    },
    {
      t: "권한 부여",
      d: "담당하실 역할(출제자 · 검토자 · 진단 위원 · 상담사)을 정해 계정을 활성화합니다.",
      done: false,
    },
  ];
  const rows: [string, string][] = account
    ? [
        ["신청 번호", account.id],
        ["이름", account.profile.name || "—"],
        [
          "가입 수단",
          account.provider ? `${account.provider} 간편가입` : `아이디 가입 · ${account.loginId}`,
        ],
        ["신청 시각", account.appliedAt],
      ]
    : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--a2-side) px-4 py-10">
      <div className="w-full max-w-[26rem]">
        <p className="flex items-baseline gap-1.5 text-white">
          <span className="font-brand text-[1.0625rem] font-semibold leading-none">GENIXX</span>
          <span className="a2-t-xs font-bold text-(--a2-side-ink-2)">CONSOLE</span>
        </p>

        <div className="mt-3 a2-panel p-4">
          <h1 className="a2-h">
            {rejected
              ? "가입 신청이 반려되었습니다"
              : approved || !account
                ? "열 수 있는 화면이 없습니다"
                : "가입 승인을 기다리는 중입니다"}
          </h1>
          <p className="mt-1 a2-t-sm text-(--a2-ink-3)">
            {rejected
              ? "아래 사유를 확인하신 뒤 서류를 갖춰 다시 신청하실 수 있습니다."
              : approved || !account
                ? `${name} 님 계정에 받은 권한이 없습니다. 권한은 운영진이 정합니다.`
                : "보통 1~2 영업일이 걸립니다. 승인되면 이 화면이 받은 권한의 화면으로 바로 바뀝니다."}
          </p>

          {rejected && (
            <div className="mt-3 border-t border-(--a2-line) pt-3">
              <p className="a2-label">반려 사유</p>
              <p className="mt-1 a2-t-sm">{account.decision?.reason ?? "사유가 적히지 않았습니다."}</p>
              {account.decision && (
                <p className="mt-1 a2-t-xs a2-mono text-(--a2-ink-4)">{account.decision.at}</p>
              )}
            </div>
          )}

          {account && !rejected && !approved && (
            <ol className="mt-3 space-y-3 border-t border-(--a2-line) pt-3">
              {steps.map((s, i) => (
                <li key={s.t} className="flex gap-2.5">
                  <span
                    className={`a2-t-xs flex h-5 w-5 shrink-0 items-center justify-center rounded-(--a2-radius) font-bold ${
                      s.done ? "bg-(--a2-ink) text-white" : "border border-(--a2-line) text-(--a2-ink-4)"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`a2-t-sm font-bold ${s.done ? "" : "text-(--a2-ink-3)"}`}>
                      {s.t}
                      {s.done && <span className="ml-1.5 a2-t-xs font-semibold text-(--a2-ink-3)">완료</span>}
                    </p>
                    <p className="mt-0.5 a2-t-xs text-(--a2-ink-3)">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {rows.length > 0 && (
            <dl className="mt-3 border-t border-(--a2-line) pt-1">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
                  <dt className="a2-label shrink-0">{k}</dt>
                  <dd className="min-w-0 truncate a2-t-sm">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {account && !rejected && !approved && (
            <p className="mt-2 border-t border-(--a2-line) pt-2.5 a2-t-xs text-(--a2-ink-4)">
              사진·연혁·소개는 승인된 뒤 「내 정보」에서 입력하실 수 있습니다. 승인 전에는 학생 자료가
              하나도 보이지 않습니다.
            </p>
          )}

          <button type="button" onClick={onSignOut} className="a2-btn mt-3">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
