"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/authStore";
import { formatCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { phaseTone, progressOf } from "@/lib/progress";
import { themeOf, type Variant } from "@/lib/authVariant";
import { VariantSwitch } from "./AuthTabs";

/**
 * ORG-01 기관 대시보드 (/org).
 *
 * 사이트맵 10장: "소속 응시 현황·진척률·미완료자 목록".
 * 같은 장이 못박은 원칙도 함께 지킨다 — 학생 개인 상세는 학부모 동의 범위 안에서만
 * 보여 주고, 기본 제공은 비식별 집단 통계로 한정한다. 그래서 답안·결과는 열지 않고
 * 과목 제출 수만 표시하며, 최소 인원 미만이면 집단 통계를 내지 않는다.
 *
 * 권한은 기관담당자(I)와 교사(T) 둘 다. 승인 전 계정은 여기 서지 못하고 승인 진행
 * 화면(/signup/pending)으로 넘어간다.
 * 로그인·회원가입과 같은 두 시안(전문가 / 둥글둥글)을 그대로 따른다.
 */

/** 재식별 방지 — 이 인원 미만이면 집단 통계를 내지 않는다 */
const MIN_GROUP = 5;

const quickLinks = [
  { href: "/exam/roster", t: "학생 명부", d: "등록·접속코드 발급" },
  { href: "/survey/teacher", t: "교사 관찰 설문", d: "12문 모듈 입력" },
  { href: "/mypage", t: "마이페이지", d: "기관 정보·구성원·결제" },
];

export default function OrgHome({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const all = useRoster();
  const students = all.filter((s) => s.owner === "director");

  /**
   * 승인 전에는 학생 데이터가 하나도 보이지 않아 0만 가득한 대시보드가 된다.
   * 그럴 바에는 승인 진행 상태를 보여 주는 편이 낫다.
   *
   * replace로 보낸다 — push면 뒤로가기가 이 화면을 다시 열어 그대로 튕겨 나간다.
   */
  const notApproved = hydrated && session?.approved === false;
  useEffect(() => {
    if (notApproved) router.replace("/signup/pending");
  }, [notApproved, router]);

  /* 시안별 잔가지 */
  const bar = variant === 1 ? "bg-acc-primary" : "bg-soft-primary";
  const track = variant === 1 ? "bg-acc-divider" : "bg-slate-200";
  const divide = variant === 1 ? "divide-acc-hairline" : "divide-slate-100";
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const codeChip =
    variant === 1
      ? "rounded bg-acc-panel text-acc-ink"
      : "rounded-full bg-soft-primary-soft text-soft-primary";

  if (!hydrated || notApproved) {
    return (
      <p className={`container-x py-20 text-center text-[14px] ${t.muted}`}>
        {notApproved ? "승인 진행 상태로 이동합니다…" : "확인 중입니다…"}
      </p>
    );
  }

  const rows = students.map(progressOf);
  const submittedAll = rows.filter((r) => r.submitted >= r.total).length;
  const notStarted = rows.filter((r) => r.phase === "미응시");
  const running = rows.filter((r) => r.phase === "응시중");
  const rate = rows.length ? Math.round((submittedAll / rows.length) * 100) : 0;
  const enoughForStats = rows.length >= MIN_GROUP;

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="container-x py-10 pb-16">
        <div className="mx-auto w-full max-w-[60rem]">
          {/* 학부모 홈과 같은 자리에 같은 무게로 등록 버튼을 둔다 */}
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-[12px] font-bold uppercase tracking-[0.14em] ${t.muted}`}>
                ORG-01
              </p>
              <h1 className={`mt-2 ${t.heading}`}>{session?.org ?? "소속 기관"} 대시보드</h1>
              <p className={`mt-3 ${t.lead}`}>
                소속 학생의 응시 현황과 진척률입니다. 개인 상세는 보호자가 동의한 범위 안에서만
                열립니다.
              </p>
            </div>
            <Link href="/exam/roster" className={t.btnAction}>
              + 학생 등록
            </Link>
          </header>

          {/* 요약 */}
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { k: "등록 학생", v: `${students.length}명` },
              { k: "응시 진행 중", v: `${running.length}명` },
              { k: "전 과목 제출", v: `${submittedAll}명` },
              { k: "제출률", v: `${rate}%` },
            ].map((s) => (
              <div key={s.k} className={`${t.card} p-5`}>
                <p className={`text-[13px] font-semibold ${t.muted}`}>{s.k}</p>
                <p className="mt-1.5 text-[24px] font-bold tabular-nums">{s.v}</p>
              </div>
            ))}
          </div>

          {students.length === 0 ? (
            <div className={`${t.card} mt-5 p-8 text-center`}>
              <p className="text-[17px] font-bold">등록된 학생이 없습니다</p>
              <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
                명부에 학생을 올리면 접속코드가 발급됩니다. 한 명씩 추가하거나 CSV로 한 번에 올릴
                수 있습니다.
              </p>
              <Link href="/exam/roster" className={`${t.btnPrimary} mx-auto mt-6 max-w-xs`}>
                학생 명부 등록하기
              </Link>
            </div>
          ) : (
            <>
              {/* 미완료자 */}
              <section className={`${t.card} mt-5 overflow-hidden`}>
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${rule}`}
                >
                  <div>
                    <h2 className="text-[17px] font-bold">
                      아직 시작하지 않은 학생 {notStarted.length}명
                    </h2>
                    <p className={`mt-1 text-[13px] ${t.muted}`}>
                      접속코드를 다시 안내하거나 응시 기간을 알려 주세요.
                    </p>
                  </div>
                  <Link href="/exam/roster" className={t.btnQuiet}>
                    명부 열기
                  </Link>
                </div>

                {notStarted.length === 0 ? (
                  <p className={`px-5 py-6 text-[14px] ${t.muted}`}>
                    모든 학생이 응시를 시작했습니다.
                  </p>
                ) : (
                  <ul className={`divide-y ${divide}`}>
                    {notStarted.map((r) => (
                      <li
                        key={r.student.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5"
                      >
                        <span className="text-[15px] font-bold">{r.student.name}</span>
                        <span className={`text-[13px] ${t.muted}`}>
                          {r.student.grade}
                          {r.student.klass ? ` · ${r.student.klass}` : ""}
                        </span>
                        <span
                          className={`ml-auto px-2.5 py-1 text-[13px] font-bold tracking-[0.06em] tabular-nums ${codeChip}`}
                        >
                          {formatCode(r.student.code)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 학생별 진척 */}
              <section className={`${t.card} mt-5 overflow-hidden`}>
                <div className={`border-b px-5 py-4 ${rule}`}>
                  <h2 className="text-[17px] font-bold">학생별 진척</h2>
                  <p className={`mt-1 text-[13px] ${t.muted}`}>
                    과목 제출 수만 표시합니다. 답안과 결과는 보호자 동의 없이는 열리지 않습니다.
                  </p>
                </div>
                <ul className={`divide-y ${divide}`}>
                  {rows.map((r) => (
                    <li key={r.student.id} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="w-24 shrink-0 text-[15px] font-bold">{r.student.name}</span>
                      <span className={`hidden w-20 shrink-0 text-[13px] sm:block ${t.muted}`}>
                        {r.student.grade}
                      </span>
                      <span className={`h-2 flex-1 overflow-hidden rounded-full ${track}`}>
                        <span
                          className={`block h-full rounded-full ${bar}`}
                          style={{ width: `${(r.submitted / r.total) * 100}%` }}
                          role="progressbar"
                          aria-valuenow={r.submitted}
                          aria-valuemin={0}
                          aria-valuemax={r.total}
                          aria-label={`${r.student.name} 과목 제출`}
                        />
                      </span>
                      <span className="w-12 shrink-0 text-right text-[13px] font-bold tabular-nums">
                        {r.submitted}/{r.total}
                      </span>
                      <span
                        className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[12px] font-bold sm:inline ${
                          phaseTone[r.phase][variant === 1 ? "v1" : "v2"]
                        }`}
                      >
                        {r.phase}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 집단 통계 — 최소 인원 미만이면 내지 않는다 */}
              <section className={`${t.cardSoft} mt-5 p-5`}>
                <h2 className="text-[17px] font-bold">집단 리포트</h2>
                {enoughForStats ? (
                  <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>
                    학급·학년 단위 분포를 볼 수 있습니다. 개인 상세는 포함되지 않습니다.
                  </p>
                ) : (
                  <p className={`mt-2 text-[14px] leading-[1.7] ${t.muted}`}>
                    현재 {students.length}명입니다. 재식별을 막기 위해{" "}
                    <b className="font-bold">{MIN_GROUP}명 미만</b> 집단은 통계를 제공하지
                    않습니다.
                  </p>
                )}
              </section>
            </>
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

          <VariantSwitch variant={variant} kind="org" />
        </div>
      </div>
    </div>
  );
}
