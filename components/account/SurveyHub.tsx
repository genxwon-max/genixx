"use client";

import Link from "next/link";
import { useSession } from "@/lib/authStore";
import { isSelfSurvey, useExamStore, useHydrated, surveyKeys, type SurveyKey } from "@/lib/examStore";
import { useRoster } from "@/lib/roster";
import { themeOf, type Variant } from "@/lib/authVariant";
import { eyebrow } from "@/components/exam/ui";
import { listTd, listTh } from "./ui";

/**
 * 설문 현황 — 학생이 줄로 서고, 학생 본인·학부모·교사 셋이 어디까지 왔는지가 칸으로 붙는다.
 *
 * 학생 목록(/my · /my/children)과 같은 표를 쓴다. 여기는 **누가 아직 안 냈는지 훑는**
 * 자리이고, 실제로 내보내거나 여는 일은 학생 상세(/my/surveys/[id])에서 한다. 목록에서
 * 곧바로 문항 창을 띄우면 보호자가 그 자리에 앉아 셋을 대신 채우게 되는데, 그러면 관찰이
 * 한 사람의 것으로 쏠린다. 함께 보시는 분이나 교사에게는 그 사람 폰으로 링크를 보내는 것이 맞다.
 *
 * 셋을 다 보여 주는 이유가 있다. 한 아이의 재능은 네 정보원(지필·학생 응답·보호자
 * 관찰·교사 관찰)을 교차해 읽는데, 어느 축이 비었는지 보이지 않으면 왜 해석이 얕은지
 * 알 수 없다. 그래서 보호자에게도 교사 칸을 보여 주되 누가 내는 것인지 함께 적는다.
 *
 * 학생 설문(ASM-04)은 학생이 자기 화면에서 직접 한다. 보호자는 냈는지만 본다 — 보호자가
 * 대신 열 수 있게 두면 아이 자신만 아는 것을 묻는 설문이 아니게 된다.
 */

/** 칸 머리에 적는 짧은 이름. 저장소의 who는 「담당 교사·교수」처럼 길어 칸을 넘긴다. */
const shortWho: Record<SurveyKey, string> = {
  student: "학생",
  guardian: "학부모",
  teacher: "교사",
};

export default function SurveyHub({ variant = 2 }: { variant?: Variant }) {
  const t = themeOf(variant);
  const hydrated = useHydrated();
  const session = useSession();
  const roster = useRoster();
  const records = useExamStore();

  const isOrg = session?.role === "director" || session?.role === "teacher";
  const mine = roster.filter((s) => (isOrg ? s.owner === "director" : s.owner === "parent"));

  return (
    <>
      <header className="mb-6 border-b border-soft-line pb-5">
        <p className={eyebrow}>관찰 설문</p>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight text-soft-ink sm:text-[28px]">
          설문
        </h1>
        <p className={`mt-2 text-[13px] ${t.muted}`}>
          학생 본인과 학부모·교사가 각각 냅니다. 셋이 채워질수록 해석이 촘촘해집니다.
          「설문 관리」에서 그 사람 폰으로 링크를 보내거나 지금 이 자리에서 바로 여실 수
          있습니다 — 정답이 있는 검사가 아닙니다. 학생 설문은 아이가 응시 현황 화면에서
          직접 합니다.
        </p>
      </header>

      <div className={`${t.card} overflow-x-auto`}>
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">학생별 설문 제출 현황</caption>
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[9%]" />
            {/* 설문 셋 — 갈래가 늘면 칸도 함께 는다 */}
            {surveyKeys.map((k) => (
              <col key={k} className="w-[13%]" />
            ))}
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={listTh}>이름</th>
              <th className={listTh}>학교 · 학년</th>
              <th className={listTh}>제출</th>
              {surveyKeys.map((k) => (
                <th key={k} className={listTh}>
                  {shortWho[k]}
                </th>
              ))}
              <th className={listTh}>관리</th>
            </tr>
          </thead>
          <tbody>
            {!hydrated ? (
              <tr>
                <td colSpan={surveyKeys.length + 4} className={`${listTd} py-14`}>
                  확인 중입니다…
                </td>
              </tr>
            ) : mine.length === 0 ? (
              /* 빈 상태에서도 칸은 그대로 둔다 — 이 화면이 무엇을 보여 주는 자리인지가 남는다 */
              <tr>
                <td colSpan={surveyKeys.length + 4} className={`${listTd} py-14`}>
                  <p className="text-[15px] font-bold text-soft-ink">
                    아직 등록된 학생이 없습니다
                  </p>
                  <p className="mt-2 text-[13px] leading-[1.7] text-soft-muted">
                    학생을 먼저 등록하시면 설문을 낼 수 있습니다.
                  </p>
                  <Link href="/my/children/new" className={`${t.btnAction} mt-5`}>
                    등록하러 가기
                  </Link>
                </td>
              </tr>
            ) : (
              mine.map((student) => {
                const done = surveyKeys.filter(
                  (k) => records[student.id]?.surveys?.[k] === "done",
                ).length;
                return (
                  <tr key={student.id}>
                    <td className={`${listTd} text-left`}>
                      <Link
                        href={`/my/children/${student.id}`}
                        className="text-[14px] font-black text-soft-ink hover:underline"
                      >
                        {student.name}
                      </Link>
                    </td>

                    <td className={`${listTd} text-left`}>
                      {student.school ?? "—"}
                      {student.grade && <span className="block text-[12px]">{student.grade}</span>}
                    </td>

                    <td
                      className={`${listTd} font-semibold tabular-nums ${
                        done === surveyKeys.length ? "text-emerald-600" : "text-soft-muted"
                      }`}
                    >
                      {done}/{surveyKeys.length}
                    </td>

                    {/* 넷이 어디까지 왔는지만 적는다. 보내거나 여는 일은 상세에서 한다 */}
                    {surveyKeys.map((key) => {
                      const submitted = records[student.id]?.surveys?.[key] === "done";
                      const sent = student.surveySends?.[key];
                      return (
                        <td
                          key={key}
                          className={`${listTd} ${submitted ? "text-emerald-600" : ""}`}
                        >
                          <span className="font-semibold">{submitted ? "제출됨" : "미제출"}</span>
                          {/* 아직 안 냈어도 링크를 보내 두었으면 기다리는 중인 것이다 */}
                          {!submitted && sent && (
                            <span className="mt-0.5 block text-[12px]">문자 발송</span>
                          )}
                          {/* 학생 설문은 보호자가 보낼 수 없다 — 누가 내는 것인지 적어 둔다 */}
                          {!submitted && isSelfSurvey(key) && (
                            <span className="mt-0.5 block text-[12px]">학생이 직접</span>
                          )}
                        </td>
                      );
                    })}

                    <td className={listTd}>
                      <Link
                        href={`/my/surveys/${student.id}`}
                        className="font-semibold text-soft-primary hover:underline"
                      >
                        설문 관리
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className={`mt-3 text-[12.5px] leading-[1.7] ${t.muted}`}>
        평소 모습 그대로 답해 주시면 됩니다. 보호자의 양육 태도를 평가하거나 리포트에
        출력하지 않습니다. 학생 설문은 아이가 자기 화면에서, 교사 설문은 담당 교사가
        입력하며, 없어도 나머지 축으로 해석은 진행됩니다.
      </p>
    </>
  );
}
