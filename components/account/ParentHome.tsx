"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { formatCode, useRoster } from "@/lib/roster";
import { useHydrated } from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { assessment } from "@/lib/exam";
import { ageFromBirth } from "@/lib/account";
import { themeOf, type Variant } from "@/lib/authVariant";
import { EmptyChild } from "./AuthArt";

/**
 * ACC-03 학부모 홈 (/my) — 로그인 후 도착하는 대시보드.
 *
 * 자녀 목록만 나열하지 않고, 아이마다 지금 어디까지 왔는지와 다음에 할 일을 한 줄로
 * 붙인다. 진행 상황은 명부(lib/roster)와 응시 기록(lib/examStore)을 짝지어 계산한다.
 *
 * 자녀가 없어도 다른 화면으로 밀어내지 않는다. 대신 여기서 등록을 시작한다.
 * 클리포(clipo.ai)의 「등록된 학생이 없어요」 빈 상태와 같은 구성이다 — 제목·설명은
 * 왼쪽, 주 액션은 오른쪽 위, 가운데는 지금 무엇이 없고 무엇을 하면 되는지.
 *
 * 껍데기(좌측 레일·상단 상태바)는 app/(dash)/layout.tsx가 두르므로 여기서는 본문만 그린다.
 */
export default function ParentHome({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const all = useRoster();
  const children = all.filter((s) => s.owner === "parent");

  /* 시안별 잔가지 */
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";
  const codeChip =
    variant === 1
      ? "rounded bg-acc-panel text-acc-ink"
      : "rounded-full bg-soft-primary-soft text-soft-primary";

  const rows = hydrated ? children.map(progressOf) : [];
  const done = rows.filter((r) => r.phase === "검사완료").length;
  const running = rows.filter((r) => r.phase === "응시중" || r.phase === "제출완료").length;

  return (
    <>
      {/* 제목은 왼쪽, 주 액션은 오른쪽 위 */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[16rem] flex-1">
          <h1 className={t.heading}>{session?.name ?? "보호자"}님, 안녕하세요</h1>
          <p className={`mt-2.5 ${t.lead}`}>
            {assessment.round} 진행 상황입니다. 아이를 눌러 접속코드를 확인하거나 다음 단계로
            넘어가세요.
          </p>
        </div>
        <Link href="/my/children/consent" className={t.btnAction}>
          + 자녀 등록
        </Link>
      </header>

      {!hydrated ? (
        <p className={`py-20 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>
      ) : children.length === 0 ? (
        /* 빈 상태 — 다른 화면으로 밀어내지 않고 여기서 시작한다 */
        <section className={`${t.card} mt-6 px-6 py-14 text-center`}>
          <EmptyChild className="mx-auto h-32 w-auto" accent="#365eef" />
          <p className="mt-6 text-[18px] font-bold">등록된 자녀가 없어요.</p>
          <p className={`mx-auto mt-2.5 max-w-md text-[14px] leading-[1.7] ${t.muted}`}>
            아이를 등록하면 접속코드가 발급됩니다. 아이는 따로 가입하지 않고, 그 코드와
            생년월일로 응시 화면에 들어갑니다.
          </p>
          <Link href="/my/children/consent" className={`${t.btnAction} mt-7`}>
            + 자녀 등록
          </Link>
        </section>
      ) : (
        <>
          {/* 요약 */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
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

          <ul className="mt-5 flex flex-col gap-3">
            {rows.map((r) => {
              const age = ageFromBirth(r.student.birth);
              return (
                <li key={r.student.id} className={`${t.card} p-5 sm:p-6`}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      {/* 접속코드는 이름 바로 옆에 둔다. 아이를 찾는 단서이자 건네줄 값이다. */}
                      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-[19px] font-bold">{r.student.name}</span>
                        <span
                          className={`px-2.5 py-1 text-[14px] font-bold tracking-[0.08em] tabular-nums ${codeChip}`}
                        >
                          {formatCode(r.student.code)}
                        </span>
                      </p>
                      <p className={`mt-1 text-[13px] ${t.muted}`}>
                        {r.student.grade} · 만 {age ?? "—"}세
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

                  {/* 과목은 셋뿐이라 막대 하나로 뭉치지 않고 한 칸씩 상태를 적는다 */}
                  <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                    {r.subjects.map((sub) => (
                      <li
                        key={sub.id}
                        className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 ${
                          subjectTone[sub.state][variant === 1 ? "v1" : "v2"]
                        }`}
                      >
                        <span className="text-[14px] font-semibold">{sub.short}</span>
                        <span className="text-[12.5px] font-bold">{sub.state}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-4 flex flex-wrap items-center gap-3 border-t pt-4 ${rule}`}>
                    <span className={`text-[13px] ${t.muted}`}>
                      설문 {r.surveys} / 3 · {r.nextAction}
                    </span>
                    <Link href="/my/children" className={`${t.btnQuiet} ml-auto`}>
                      자녀 관리
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* 바로가기 — 좌측 레일에 없는 하위 화면만 둔다 */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/my/children/consent-stages", t: "동의 관리", d: "무엇에 동의했는지" },
          { href: "/exam/result", t: "결과 리포트", d: "발행 상태와 열람" },
          { href: "/support/faq", t: "자주 묻는 질문", d: "응시·결과·개인정보" },
        ].map((l) => (
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
    </>
  );
}
