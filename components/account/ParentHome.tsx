"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { formatCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { ageFromBirth } from "@/lib/account";
import { themeOf, type Variant } from "@/lib/authVariant";
import { useExamConfig } from "@/lib/roundStore";
import SectionTitle from "@/components/exam/SectionTitle";
import { eyebrow } from "@/components/exam/ui";
import { EmptyChild } from "./AuthArt";

/**
 * ACC-03 학부모 홈 (/my) — 로그인 후 도착하는 대시보드.
 *
 * 학생 목록만 나열하지 않고, 아이마다 지금 어디까지 왔는지와 다음에 할 일을 한 줄로
 * 붙인다. 진행 상황은 명부(lib/roster)와 응시 기록(lib/examStore)을 짝지어 계산한다.
 *
 * 학생이 없어도 다른 화면으로 밀어내지 않는다. 대신 여기서 등록을 시작한다.
 * 클리포(clipo.ai)의 「등록된 학생이 없어요」 빈 상태와 같은 구성이다 — 제목·설명은
 * 왼쪽, 주 액션은 오른쪽 위, 가운데는 지금 무엇이 없고 무엇을 하면 되는지.
 *
 * 껍데기(좌측 레일·상단 상태바)는 app/(dash)/layout.tsx가 두르므로 여기서는 본문만 그린다.
 */
export default function ParentHome({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const config = useExamConfig();
  const all = useRoster();
  const children = all.filter((s) => s.owner === "parent");

  /* 시안별 잔가지 */
  const divide = variant === 1 ? "divide-acc-hairline" : "divide-slate-100";

  const rows = hydrated ? children.map(progressOf) : [];

  return (
    <>
      {/* 머리 구성은 학생 명부와 같다 — 분류 · 제목 · 한 줄 · 아래 구분선 */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div className="min-w-[16rem] flex-1">
          <p className={eyebrow}>학생 현황</p>
          <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
            {session?.name ?? "보호자"}님, 안녕하세요
          </h1>
          <p className={`mt-2 text-[13px] ${t.muted}`}>
            {config.roundLabel} · 등록 {hydrated ? children.length : 0}명
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/my/children/new" className={t.btnOutline}>
            + 학생 개별 등록
          </Link>
          <Link href="/my/students?tab=bulk" className={t.btnAction}>
            + 학생 일괄 등록
          </Link>
        </div>
      </header>

      {!hydrated ? (
        <p className={`py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>
      ) : children.length === 0 ? (
        /* 빈 상태 — 다른 화면으로 밀어내지 않고 여기서 시작한다 */
        <section className={`${t.card} mt-6 px-6 py-14 text-center`}>
          <EmptyChild className="mx-auto h-32 w-auto" accent="#365eef" />
          <p className="mt-6 text-[18px] font-bold">등록된 학생이 없어요.</p>
          <p className={`mx-auto mt-2.5 max-w-md text-[14px] leading-[1.7] ${t.muted}`}>
            아이를 등록하면 접속코드가 발급됩니다. 아이는 따로 가입하지 않고, 그 코드와 생년월일로
            응시 화면에 들어갑니다.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Link href="/my/children/new" className={t.btnOutline}>
              + 학생 개별 등록
            </Link>
            <Link href="/my/students?tab=bulk" className={t.btnAction}>
              + 학생 일괄 등록
            </Link>
          </div>
        </section>
      ) : (
        /*
         * 학생 한 명이 한 줄. 배경·테두리를 두른 칩을 늘어놓지 않는다 — 한 줄에 색
         * 덩어리가 다섯 개 있으면 정작 읽어야 할 이름과 코드가 묻힌다. 면을 걷고
         * 글자만 남겼고, 굵기는 이름 하나에만 준다.
         */
        <section className="mt-7">
          <SectionTitle note="이름 옆 접속코드와 생년월일로 학생이 응시 화면에 들어갑니다.">
            등록 학생 {children.length}명
          </SectionTitle>
          <div className={`${t.card} overflow-hidden`}>
            <ul className={`divide-y ${divide}`}>
              {rows.map((r) => {
                const age = ageFromBirth(r.student.birth);
                const tone = phaseTone[r.phase];
                return (
                  <li
                    key={r.student.id}
                    className="flex flex-wrap items-baseline gap-x-5 gap-y-2 px-4 py-3.5"
                  >
                    <span className="min-w-[11.5rem] text-[15px]">
                      <span className="font-semibold">{r.student.name}</span>
                      <span className={`ml-2.5 tracking-[0.06em] tabular-nums ${t.muted}`}>
                        {formatCode(r.student.code)}
                      </span>
                    </span>

                    <span className={`hidden w-28 shrink-0 text-[13px] xl:block ${t.muted}`}>
                      {r.student.grade ? `${r.student.grade} · ` : ""}만 {age ?? "—"}세
                    </span>

                    {/* 과목 이름은 옅게, 상태만 색으로 — 세 과목을 한눈에 훑게 */}
                    <span className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1 text-[13px]">
                      {r.subjects.map((sub) => (
                        <span key={sub.id} className="whitespace-nowrap">
                          <span className={t.muted}>{sub.short}</span>{" "}
                          <span className={subjectTone[sub.state]}>{sub.state}</span>
                        </span>
                      ))}
                    </span>

                    <span className={`flex shrink-0 items-center gap-1.5 text-[13px] ${tone.text}`}>
                      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {r.phase}
                    </span>

                    {/* 설문은 응시와 따로 간다 — 아이가 다 풀어도 보호자·교사 관찰이 비면
                        해석의 축이 하나 빈다. 눌러서 설문 화면으로 바로 넘어가게 둔다. */}
                    <Link
                      href="/my/surveys"
                      className={`shrink-0 text-[13px] hover:underline ${
                        r.surveys === 0
                          ? t.muted
                          : r.surveys === 3
                            ? "text-emerald-600"
                            : variant === 1
                              ? "text-acc-primary"
                              : "text-soft-primary"
                      }`}
                    >
                      {r.surveys === 0
                        ? "설문 미제출"
                        : r.surveys === 3
                          ? "설문 완료"
                          : `설문 ${r.surveys}/3`}
                    </Link>

                    <Link
                      href="/my/children"
                      className={`shrink-0 text-[13px] ${t.muted} hover:underline`}
                    >
                      관리
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 바로가기 — 좌측 레일에 없는 하위 화면만 둔다 */}
      <section className="mt-8">
        <SectionTitle>바로가기</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/my/children/consent-stages", t: "동의 관리", d: "무엇에 동의했는지" },
            { href: "/exam/result", t: "결과 리포트", d: "발행 상태와 열람" },
            // 고객지원은 공개 존이라 같은 탭에서 열면 대시보드가 마케팅 껍데기로 바뀐다
            { href: "/support/faq", t: "자주 묻는 질문", d: "응시·결과·개인정보", away: true },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              target={l.away ? "_blank" : undefined}
              rel={l.away ? "noopener noreferrer" : undefined}
              className={`${t.card} p-5 transition-colors ${
                variant === 1 ? "hover:border-acc-primary" : "hover:border-soft-primary"
              }`}
            >
              <p className="text-[15px] font-bold">{l.t}</p>
              <p className={`mt-1 text-[13px] ${t.muted}`}>{l.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
