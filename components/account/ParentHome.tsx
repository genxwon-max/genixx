"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { formatCode, useRoster } from "@/lib/roster";
import { useExamStore, useHydrated } from "@/lib/examStore";
import { progressOf, phaseTone, subjectTone } from "@/lib/progress";
import { ageFromBirth } from "@/lib/account";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { eyebrow } from "@/components/exam/ui";
import { PickBox, SendCodesButton, usePicked } from "./SendCodes";
import { listTd, listTh } from "./ui";

/**
 * ACC-03 학부모 홈 (/my) — 로그인 후 도착하는 대시보드.
 *
 * 학생 프로필(/my/children)과 같은 **표**를 편다. 두 화면이 서로 다른 모양이면
 * 보호자는 같은 아이를 두 번 배워야 한다. 다만 칸은 다르다 — 저쪽이 응시권·연락처를
 * 손보는 자리라면, 여기는 **지금 어디까지 왔는지**를 보는 자리라 과목 셋을 칸으로
 * 세우고 그 옆에 설문과 단계를 붙인다.
 *
 * 체크해서 접속코드를 한 번에 문자로 보낼 수 있다. 코드를 아이에게 넘기는 일이 등록
 * 다음에 바로 오는 일이라, 홈에서 목록을 보다가 그대로 할 수 있어야 한다.
 *
 * 학생이 없어도 표를 걷지 않는다. 칸은 그대로 두고 그 안에서 「아직 등록된 학생이
 * 없습니다」와 등록하러 가는 길만 말한다 — 빈 그림으로 갈아 끼우면 이 화면이 무엇을
 * 보여 주는 자리인지가 함께 사라진다.
 *
 * 껍데기(좌측 레일·상단 상태바)는 app/(dash)/layout.tsx가 두르므로 여기서는 본문만 그린다.
 */
export default function ParentHome({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const all = useRoster();
  // 과목 상태가 바뀌면 다시 세야 한다. 값 자체는 progressOf가 스토어에서 직접 읽는다.
  useExamStore();
  const children = all.filter((s) => s.owner === "parent");
  const pick = usePicked();

  const rows = hydrated ? children.map(progressOf) : [];
  const chosen = children.filter((c) => pick.has(c.id));
  const allPicked = children.length > 0 && children.every((c) => pick.has(c.id));

  return (
    <>
      {/* 머리 구성은 학생 명부와 같다 — 분류 · 제목 · 한 줄 · 아래 구분선 */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div className="min-w-[16rem] flex-1">
          <p className={eyebrow}>학생 현황</p>
          <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
            {session?.name ?? "보호자"}님, 안녕하세요
          </h1>
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

      <section className="mt-7">
        <SectionTitle
          right={
            <div className="flex flex-wrap items-center gap-2.5">
              {chosen.length > 0 && (
                <span className="text-[13px] font-semibold text-soft-primary">
                  {chosen.length}명 선택
                </span>
              )}
              <SendCodesButton
                chosen={chosen}
                onSent={pick.clear}
                className="rounded-full text-[13px] font-semibold"
              />
            </div>
          }
        >
          등록 학생 {hydrated ? children.length : 0}명
        </SectionTitle>

        <div className={`${t.card} overflow-x-auto`}>
          <table className="w-full min-w-[820px] border-collapse">
            <caption className="sr-only">등록한 학생과 과목별 진행 상황</caption>
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[15%]" />
              <col className="w-[17%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr>
                <th className={listTh}>
                  <PickBox
                    checked={allPicked}
                    onChange={() =>
                      pick.setMany(
                        children.map((c) => c.id),
                        !allPicked,
                      )
                    }
                    disabled={children.length === 0}
                    label="학생 모두 선택"
                  />
                </th>
                <th className={listTh}>이름</th>
                <th className={listTh}>학교 · 학년</th>
                <th className={listTh}>접속코드</th>
                <th className={listTh}>국어</th>
                <th className={listTh}>수학</th>
                <th className={listTh}>과학</th>
                <th className={listTh}>설문</th>
                <th className={listTh}>상태</th>
                <th className={listTh}>관리</th>
              </tr>
            </thead>
            <tbody>
              {!hydrated ? (
                <tr>
                  <td colSpan={10} className={`${listTd} py-14`}>
                    확인 중입니다…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                /* 빈 상태 — 칸은 그대로 두고 다른 화면으로 밀어내지도 않는다 */
                <tr>
                  <td colSpan={10} className={`${listTd} py-14`}>
                    <p className="text-[15px] font-bold text-soft-ink">
                      아직 등록된 학생이 없습니다
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.7] text-soft-muted">
                      아이를 등록하면 접속코드가 발급됩니다. 만 14세 미만 아이는 따로 가입하지
                      않고, 그 코드와 생년월일로 응시 화면에 들어갑니다.
                    </p>
                    <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
                      등록하러 가기
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const age = ageFromBirth(r.student.birth);
                  const tone = phaseTone[r.phase];
                  const on = pick.has(r.student.id);
                  return (
                    <tr key={r.student.id} className={on ? "bg-soft-primary-soft/50" : undefined}>
                      <td className={listTd}>
                        <PickBox
                          checked={on}
                          onChange={() => pick.toggle(r.student.id)}
                          label={`${r.student.name} 선택`}
                        />
                      </td>

                      <td className={`${listTd} text-left`}>
                        <Link
                          href={`/my/children/${r.student.id}`}
                          className="text-[14px] font-black text-soft-ink hover:underline"
                        >
                          {r.student.name}
                        </Link>
                        <span className="mt-0.5 block text-[12px]">만 {age ?? "—"}세</span>
                      </td>

                      <td className={`${listTd} text-left`}>
                        {r.student.school ?? "—"}
                        {r.student.grade && (
                          <span className="block text-[12px]">{r.student.grade}</span>
                        )}
                      </td>

                      <td
                        className={`${listTd} font-semibold tracking-[0.06em] tabular-nums text-soft-ink`}
                      >
                        {formatCode(r.student.code)}
                      </td>

                      {/* 과목은 칸으로 세운다 — 세로로 맞으면 「누가 어느 과목에서 멈췄는지」가 보인다 */}
                      {r.subjects.map((sub) => (
                        <td key={sub.id} className={`${listTd} ${subjectTone[sub.state]}`}>
                          {sub.state}
                        </td>
                      ))}

                      {/* 설문은 응시와 따로 간다 — 아이가 다 풀어도 보호자·교사 관찰이 비면
                          해석의 축이 하나 빈다. 눌러서 설문 화면으로 바로 넘어가게 둔다. */}
                      <td className={listTd}>
                        <Link
                          href="/my/surveys"
                          className={`font-semibold hover:underline ${
                            r.surveys === 3 ? "text-emerald-600" : "text-soft-muted"
                          }`}
                        >
                          {r.surveys}/3
                        </Link>
                      </td>

                      <td className={listTd}>
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${tone.text}`}
                        >
                          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {r.phase}
                        </span>
                      </td>

                      <td className={listTd}>
                        <Link
                          href={`/my/children/${r.student.id}`}
                          className="font-semibold text-soft-primary hover:underline"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 바로가기 — 좌측 레일에 없는 하위 화면만 둔다 */}
      <section className="mt-8">
        <SectionTitle>바로가기</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
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
