"use client";

import Link from "next/link";
import { blankExpertProfile, type ExpertAccount } from "@/lib/expertAccounts";
import { designLinks } from "@/lib/designScreens";
import ExpertWaiting from "@/components/admin2/ExpertWaiting";

/**
 * 콘솔에 들어오는 두 문 — 디자인.
 *
 * ① 승인 대기 (실제 주소 /admin2 — 승인 전 전문가가 들어왔을 때)
 *    전문가로 가입하면 곧바로 이 화면에 도착한다. 승인 전에는 메뉴도 학생 자료도 보이지 않고
 *    신청이 어디까지 갔는지만 보인다. 실제 화면의 조각(components/admin2/ExpertWaiting.tsx)을
 *    그대로 쓰고 값만 예시로 넣었다.
 *
 * ② 관리자 로그인 (실제 주소 /admin2 — 로그인 전)
 *    여기로 로그인하는 사람은 **최상위 관리자**뿐이다. 이 계정은 가입으로 만들지 않고 서비스를
 *    열 때 DB에 넣어 둔다. 전문가 회원은 사이트 로그인(/login)으로 들어와 콘솔로 넘어온다.
 */

const noop = () => {};

/* ───────────────────────── ① 승인 대기 ───────────────────────── */

const applied: ExpertAccount = {
  id: "EX-2610-004",
  loginId: "jisu_han",
  provider: null,
  email: "",
  phone: "010-3318-2291",
  warning: null,
  appliedAt: "2026-10-11 09:40",
  profile: { ...blankExpertProfile(), name: "한지수" },
  state: "pending",
  duties: [],
};

const waitingAccounts: Record<string, ExpertAccount> = {
  "": applied,
  rejected: {
    ...applied,
    state: "rejected",
    decision: {
      verdict: "rejected",
      reason: "경력이 확인되지 않음 — 적어 주신 소속에 확인했으나 재직 기록을 찾지 못했습니다.",
      at: "2026-10-12 14:20",
      by: "박서준",
    },
  },
  /* 승인은 되었지만 권한을 모두 거둔 계정 */
  "no-duty": {
    ...applied,
    state: "approved",
    decision: { verdict: "approved", reason: "전문가단 추천으로 경력 확인 완료", at: "2026-10-12 10:05", by: "박서준" },
    duties: [],
  },
};

export function ExpertWaitingScreen({ state }: { state: string }) {
  return <ExpertWaiting account={waitingAccounts[state] ?? applied} name="한지수" onSignOut={noop} />;
}

/* ───────────────────────── ② 관리자 로그인 ───────────────────────── */

export function ConsoleLogin({ state }: { state: string }) {
  const to = designLinks("console-login");
  const bad = state === "error";
  const locked = state === "locked";

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--a2-side) px-4 py-10">
      <div className="w-full max-w-[21rem]">
        <p className="flex items-baseline gap-1.5 text-white">
          <span className="font-brand text-[1.0625rem] font-semibold leading-none">GENIXX</span>
          <span className="a2-t-xs font-bold text-(--a2-side-ink-2)">CONSOLE</span>
        </p>

        {state === "mfa" ? (
          <div className="mt-3 a2-panel p-4">
            <h1 className="a2-h">2단계 인증</h1>
            <p className="mt-1 a2-t-sm text-(--a2-ink-3)">
              인증 앱에 표시된 6자리 숫자를 입력해 주세요. 최상위 관리자 계정은 2단계 인증을 끌 수
              없습니다.
            </p>

            <label className="mt-3 block">
              <span className="a2-label">인증 번호</span>
              <input
                inputMode="numeric"
                defaultValue=""
                placeholder="000000"
                className="a2-input a2-mono mt-1 text-center tracking-[0.3em]"
                style={{ height: 40, fontSize: "1rem" }}
              />
            </label>

            <Link href="/design/admin2/me" className="a2-btn a2-btn-primary mt-3 w-full">
              확인
            </Link>

            <p className="mt-3 flex items-center justify-between border-t border-(--a2-line) pt-2.5 a2-t-xs text-(--a2-ink-3)">
              <button type="button" className="underline">
                문자로 인증 번호 받기
              </button>
              <Link href={to()} className="underline">
                다른 계정으로 로그인
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-3 a2-panel p-4">
            <h1 className="a2-h">관리자 로그인</h1>
            <p className="mt-1 a2-t-sm text-(--a2-ink-3)">최상위 관리자 계정으로 로그인합니다.</p>

            <label className="mt-3 block">
              <span className="a2-label">아이디</span>
              <input
                defaultValue={bad || locked ? "admin.park" : ""}
                disabled={locked}
                autoComplete="username"
                placeholder="아이디"
                className="a2-input a2-mono mt-1"
              />
            </label>

            <label className="mt-2.5 block">
              <span className="a2-label">비밀번호</span>
              <input
                type="password"
                defaultValue={bad ? "wrongpass" : ""}
                disabled={locked}
                autoComplete="current-password"
                className="a2-input mt-1"
                style={bad ? { borderColor: "var(--a2-danger)" } : undefined}
              />
            </label>

            {bad && (
              <p role="alert" className="mt-2.5 a2-t-sm font-semibold text-(--a2-danger)">
                아이디 또는 비밀번호가 맞지 않습니다. 5번 틀리면 15분 동안 로그인할 수 없습니다. (지금
                2번 틀림)
              </p>
            )}
            {locked && (
              <p role="alert" className="a2-note mt-2.5" style={{ borderLeftColor: "var(--a2-danger)" }}>
                <span>
                  <b style={{ color: "var(--a2-danger)" }}>비밀번호를 5번 틀려 로그인이 잠겼습니다.</b>{" "}
                  <span className="a2-mono">14:32</span>부터 다시 로그인할 수 있습니다.
                </span>
              </p>
            )}

            {locked ? (
              <button type="button" disabled className="a2-btn a2-btn-primary mt-3 w-full">
                로그인
              </button>
            ) : (
              <Link href={to("mfa")} className="a2-btn a2-btn-primary mt-3 w-full">
                로그인
              </Link>
            )}

            <p className="mt-2 text-right a2-t-xs">
              <button type="button" className="text-(--a2-ink-3) underline">
                비밀번호를 잊으셨나요?
              </button>
            </p>

            {/* 전문가는 여기로 로그인하지 않는다 — 길을 알려 준다 */}
            <p className="mt-2 border-t border-(--a2-line) pt-2.5 a2-t-xs leading-[1.6] text-(--a2-ink-3)">
              전문가 회원(출제자 · 검토자 · 진단 위원 · 상담사)은 사이트에서 로그인합니다. 로그인하면
              받은 권한의 화면이 바로 열립니다.{" "}
              <Link href="/login" className="font-semibold text-(--a2-accent-2) underline">
                전문가 로그인
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
