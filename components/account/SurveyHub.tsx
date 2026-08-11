"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { useExamStore, useHydrated, surveyKeys } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { surveys } from "@/lib/survey";
import { surveyWindow } from "@/lib/popup";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { eyebrow } from "@/components/exam/ui";

/**
 * 설문 현황 — 학생마다 어머니·아버지·교사 셋을 나란히 둔다.
 *
 * 셋을 다 보여 주는 이유가 있다. 한 아이의 재능은 네 정보원(지필·학생 응답·보호자
 * 관찰·교사 관찰)을 교차해 읽는데, 어느 축이 비었는지 보이지 않으면 왜 해석이 얕은지
 * 알 수 없다. 그래서 보호자에게도 교사 칸을 보여 주되 누가 내는 것인지 함께 적는다.
 *
 * 문항 작성만 새 창(/survey/[role])으로 띄운다. 답만 쓰는 화면이라 레일·헤더가 없는
 * 편이 낫고, 이 화면은 다른 화면과 오가며 훑는 자리라 껍데기를 유지한다.
 *
 * 학생 응답(ASM-04)은 학생이 접속코드로 들어가 직접 하는 것이라 여기 없다.
 */
export default function SurveyHub({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const records = useExamStore();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent"));
  const divide = variant === 1 ? "divide-acc-hairline" : "divide-slate-100";
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>관찰 설문</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          설문
        </h1>
        <p className={`mt-2 text-[13px] ${t.muted}`}>
          학생마다 어머니·아버지·교사가 각각 냅니다. 셋이 채워질수록 해석이 촘촘해집니다.
        </p>
      </header>

      {!hydrated ? (
        <p className={`py-16 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>
      ) : mine.length === 0 ? (
        <section className={`${t.card} px-6 py-12 text-center`}>
          <p className="text-[17px] font-bold">등록된 학생이 없어요.</p>
          <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
            학생을 먼저 등록하시면 설문을 낼 수 있습니다.
          </p>
          <Link href="/my/students?tab=one" className={`${t.btnAction} mt-6`}>
            + 학생 등록
          </Link>
        </section>
      ) : (
        <section>
          <SectionTitle note="누르면 새 창에서 문항이 열립니다. 정답이 있는 검사가 아닙니다.">
            학생별 제출 현황
          </SectionTitle>

          <div className={`${t.card} overflow-hidden`}>
            <ul className={`divide-y ${divide}`}>
              {mine.map((student) => {
                const done = surveyKeys.filter(
                  (k) => records[student.id]?.surveys?.[k] === "done",
                ).length;
                return (
                  <li key={student.id} className="px-4 py-4">
                    <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-[15px] font-semibold">{student.name}</span>
                      <span className={`text-[12.5px] ${t.muted}`}>{student.grade}</span>
                      <span
                        className={`text-[12.5px] ${
                          done === surveyKeys.length ? "text-emerald-600" : t.muted
                        }`}
                      >
                        {done} / {surveyKeys.length} 제출
                      </span>
                    </p>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                      {surveyKeys.map((key) => {
                        const cfg = surveys[key];
                        const submitted = records[student.id]?.surveys?.[key] === "done";
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => surveyWindow(`/survey/${key}?student=${student.id}`)}
                            className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                              submitted
                                ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                                : variant === 1
                                  ? "border-acc-line bg-white hover:border-acc-primary"
                                  : "border-soft-line bg-white hover:border-soft-primary"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-semibold">{cfg.who}</span>
                              <span className={`mt-0.5 block text-[12px] ${t.muted}`}>
                                {key === "teacher" ? "담당 교사가 입력" : "가정에서 관찰한 모습"}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 text-[12.5px] font-semibold ${
                                submitted
                                  ? "text-emerald-600"
                                  : variant === 1
                                    ? "text-acc-primary"
                                    : "text-soft-primary"
                              }`}
                            >
                              {submitted ? "제출됨" : "작성"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={`border-t px-4 py-3.5 ${rule}`}>
              <p className={`text-[12.5px] leading-[1.7] ${t.muted}`}>
                평소 모습 그대로 답해 주시면 됩니다. 보호자의 양육 태도를 평가하거나 리포트에
                출력하지 않습니다. 교사 설문은 담당 교사가 입력하며, 없어도 나머지 축으로 해석은
                진행됩니다.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
