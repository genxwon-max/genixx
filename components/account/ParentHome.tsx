"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { formatCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { progressOf, phaseTone } from "@/lib/progress";
import { ageFromBirth, consentRouteFor, consentRouteInfo } from "@/lib/account";
import { themeOf, type Variant } from "@/lib/authVariant";
import { VariantSwitch } from "./AuthTabs";

/**
 * ACC-03 학부모 홈 (/my).
 *
 * 로그인 직후 도착하는 자리다. 자녀 목록만 나열하지 않고, 아이마다 지금 어디까지
 * 왔는지와 다음에 할 일을 한 줄로 붙인다. 진행 상황은 명부(lib/roster)와
 * 응시 기록(lib/examStore)을 짝지어 실제로 계산한다.
 *
 * 로그인·회원가입·기관 대시보드와 같은 두 시안(전문가 / 둥글둥글)을 그대로 따른다.
 */

const quickLinks = [
  { href: "/my/children/consent", t: "자녀 추가 등록", d: "법정대리인 동의부터" },
  { href: "/my/children/consent-stages", t: "동의 관리", d: "무엇에 동의했는지" },
  { href: "/mypage", t: "마이페이지", d: "회원정보·동의·수신·탈퇴" },
];

export default function ParentHome({ variant = 1 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const all = useRoster();
  const children = all.filter((s) => s.owner === "parent");

  /* 시안별 잔가지 */
  const bar = variant === 1 ? "bg-acc-primary" : "bg-soft-primary";
  const track = variant === 1 ? "bg-acc-divider" : "bg-slate-200";
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const codeChip =
    variant === 1
      ? "rounded bg-acc-panel text-acc-ink"
      : "rounded-full bg-soft-primary-soft text-soft-primary";

  if (!hydrated) {
    return <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>;
  }

  const rows = children.map(progressOf);
  const done = rows.filter((r) => r.phase === "검사완료").length;
  const running = rows.filter((r) => r.phase === "응시중" || r.phase === "제출완료").length;

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-10 pb-16">
        <div className="mx-auto w-full max-w-[60rem]">
          <header className="mb-7">
            <p className={`text-[12px] font-bold uppercase tracking-[0.14em] ${t.muted}`}>ACC-03</p>
            <h1 className={`mt-2 ${t.heading}`}>{session?.name ?? "보호자"}님, 안녕하세요</h1>
            <p className={`mt-3 ${t.lead}`}>
              자녀의 진단 진행 상황입니다. 아이를 눌러 접속코드를 확인하거나 다음 단계로 넘어가세요.
            </p>
          </header>

          {/* 요약 */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { k: "등록한 자녀", v: `${children.length}명` },
              { k: "진행 중", v: `${running}명` },
              { k: "검사 완료", v: `${done}명` },
            ].map((s) => (
              <div key={s.k} className={`${t.card} p-5`}>
                <p className={`text-[13px] font-semibold ${t.muted}`}>{s.k}</p>
                <p className="mt-1.5 text-[26px] font-bold tabular-nums">{s.v}</p>
              </div>
            ))}
          </div>

          {children.length === 0 ? (
            <div className={`${t.card} mt-5 p-8 text-center`}>
              <p className="text-[17px] font-bold">아직 등록된 자녀가 없습니다</p>
              <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
                등록은 <b className="font-bold">법정대리인 동의</b>부터 시작합니다. 아이 생년월일에
                따라 누가 동의해야 하는지 안내해 드립니다.
              </p>
              <Link href="/my/children/consent" className={`${t.btnPrimary} mx-auto mt-6 max-w-xs`}>
                자녀 등록 시작하기
              </Link>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {rows.map((r) => {
                const age = ageFromBirth(r.student.birth);
                const route = consentRouteFor(age);
                const info = route ? consentRouteInfo[route] : null;
                return (
                  <li key={r.student.id} className={`${t.card} p-5 sm:p-6`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[19px] font-bold">{r.student.name}</p>
                        <p className={`mt-1 text-[13px] ${t.muted}`}>
                          {r.student.grade} · 만 {age ?? "—"}세
                          {info && ` · ${info.label} (${info.who} 동의)`}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[12px] font-bold ${
                          phaseTone[r.phase][variant === 1 ? "v1" : "v2"]
                        }`}
                      >
                        {r.phase}
                      </span>
                    </div>

                    {/* 진행 막대 */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-semibold">과목 제출</span>
                        <span className="font-bold tabular-nums">
                          {r.submitted} / {r.total}
                          {r.forfeited > 0 && (
                            <span className={`ml-2 font-normal ${t.required}`}>
                              포기 {r.forfeited}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className={`mt-1.5 h-2 overflow-hidden rounded-full ${track}`}>
                        <div
                          className={`h-full rounded-full ${bar}`}
                          style={{ width: `${(r.submitted / r.total) * 100}%` }}
                          role="progressbar"
                          aria-valuenow={r.submitted}
                          aria-valuemin={0}
                          aria-valuemax={r.total}
                          aria-label={`${r.student.name} 과목 제출`}
                        />
                      </div>
                      <p className={`mt-2 text-[13px] ${t.muted}`}>
                        설문 {r.surveys} / 3 · {r.nextAction}
                      </p>
                    </div>

                    <div
                      className={`mt-4 flex flex-wrap items-center gap-3 border-t pt-4 ${rule}`}
                    >
                      <span
                        className={`px-3 py-2 text-[15px] font-bold tracking-[0.08em] tabular-nums ${codeChip}`}
                      >
                        {formatCode(r.student.code)}
                      </span>
                      <span className={`text-[12px] ${t.muted}`}>
                        생년월일과 함께 입력해야 들어갑니다
                      </span>
                      <Link href="/my/children" className={`${t.btnQuiet} ml-auto`}>
                        자녀 관리
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 바로가기 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${t.card} p-5 transition-colors ${
                  variant === 1 ? "hover:border-acc-primary" : "hover:border-soft-primary"
                }`}
              >
                <p className="text-[15px] font-bold">{l.t}</p>
                <p className={`mt-1 text-[13px] ${t.muted}`}>{l.d}</p>
              </Link>
            ))}
          </div>

          <VariantSwitch variant={variant} kind="my" />
        </div>
      </div>
    </div>
  );
}
