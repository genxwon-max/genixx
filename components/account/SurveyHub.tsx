"use client";

import { useSession } from "@/lib/authStore";
import { useExamStore, useHydrated, surveyKeys, type SurveyKey } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { surveys } from "@/lib/survey";
import { surveyWindow } from "@/lib/popup";
import { themeOf, type Variant } from "@/lib/authVariant";
import SectionTitle from "@/components/exam/SectionTitle";
import { eyebrow } from "@/components/exam/ui";

/**
 * 설문 고르는 자리 — 팝업 창(/survey)의 첫 화면.
 *
 * 대시보드 레일의 「설문」이 이 주소를 새 창으로 연다. 응시가 학생 화면에서 따로 열리듯
 * 설문도 답만 쓰는 창에서 하는 편이 낫다. 여기서 학생과 응답자를 고르면 같은 창이
 * 문항 화면(/survey/[role])으로 넘어간다.
 *
 * 학생 응답(ASM-04)은 학생이 접속코드로 들어가 직접 하는 것이라 여기 없다.
 */

/** 학부모는 어머니·아버지, 교사는 관찰 설문만 본다 */
function keysFor(isOrg: boolean): SurveyKey[] {
  return isOrg ? ["teacher"] : surveyKeys.filter((k) => k !== "teacher");
}

export default function SurveyHub({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const records = useExamStore();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent"));
  const keys = keysFor(isOrg);
  const divide = variant === 1 ? "divide-acc-hairline" : "divide-slate-100";
  const rule = variant === 1 ? "border-acc-divider" : "border-slate-100";

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>{isOrg ? "관찰 설문" : "보호자 설문"}</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          설문
        </h1>
        <p className={`mt-2 text-[13px] ${t.muted}`}>
          {isOrg
            ? "담당 학생의 관찰 설문입니다. 학생 응답·보호자 응답과 함께 해석에 씁니다."
            : "가정에서 본 아이의 모습을 알려 주세요. 어머니·아버지가 각각 내실 수 있습니다."}
        </p>
      </header>

      {!hydrated ? (
        <p className={`py-16 text-center text-[14px] ${t.muted}`}>확인 중입니다…</p>
      ) : mine.length === 0 ? (
        <section className={`${t.card} px-6 py-12 text-center`}>
          <p className="text-[17px] font-bold">등록된 학생이 없어요.</p>
          <p className={`mt-2.5 text-[14px] leading-[1.7] ${t.muted}`}>
            대시보드에서 학생을 먼저 등록하시면 설문을 낼 수 있습니다. 이 창은 닫으셔도 됩니다.
          </p>
        </section>
      ) : (
        <section>
          <SectionTitle note="응답자를 고르면 문항 화면으로 넘어갑니다. 정답이 있는 검사가 아닙니다.">
            학생별 제출 현황
          </SectionTitle>
          <div className={`${t.card} overflow-hidden`}>
            <ul className={`divide-y ${divide}`}>
              {mine.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5"
                >
                  <span className="flex min-w-[10rem] items-center gap-2">
                    <span className="text-[15px] font-bold">{student.name}</span>
                    <span className={`text-[12.5px] ${t.muted}`}>{student.grade}</span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {keys.map((key) => {
                      const done = records[student.id]?.surveys?.[key] === "done";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => surveyWindow(`/survey/${key}?student=${student.id}`)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                            done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : variant === 1
                                ? "border-acc-primary bg-white text-acc-primary hover:bg-acc-primary-soft"
                                : "border-soft-primary bg-white text-soft-primary hover:bg-soft-primary-soft"
                          }`}
                        >
                          {surveys[key].who}
                          <span className="font-bold">{done ? "제출됨" : "작성하기"}</span>
                        </button>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>

            <div className={`border-t px-4 py-3.5 ${rule}`}>
              <p className={`text-[12.5px] leading-[1.7] ${t.muted}`}>
                평소 모습 그대로 답해 주시면 됩니다. 보호자의 양육 태도를 평가하거나 리포트에
                출력하지 않습니다.
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
