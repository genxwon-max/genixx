"use client";

import Link from "next/link";
import { isSelfSurvey, surveyKeys, surveyMeta, useExamRecord } from "@/lib/examStore";
import { surveyWindow } from "@/lib/popup";
import { listTd, listTh } from "@/components/account/ui";
import { Head, WhoNote, btnGo, cardBox, useSelf } from "./self";

/**
 * 내 설문 (/student/surveys) — 학생이 자기 설문을 내는 자리.
 *
 * 보호자 설문 화면(/my/surveys)과 보는 각이 다르다. 저쪽은 **아이들이 줄로** 서고 누가
 * 아직 안 냈는지를 훑는 자리다. 여기는 내 것 하나뿐이라 **설문 셋이 줄로** 선다 — 내
 * 설문, 그리고 우리 집과 선생님이 냈는지.
 *
 * 남의 설문은 내지 못한다. 학생이 보호자 설문을 열 수 있게 두면 가정 관찰이 학생 자기
 * 응답의 복사가 되어, 교차해 읽는 뜻이 사라진다. 그래서 낸 여부만 보여 주고 단추는
 * 내 것에만 둔다.
 *
 * 설문은 고정 크기 창으로 뜬다(lib/popup.ts) — 문항에 집중하는 자리라 대시보드 레일을
 * 지고 있을 까닭이 없고, 다 내고 창을 닫으면 이 표로 돌아온다.
 */
export default function StudentSurveys() {
  const self = useSelf();
  const record = useExamRecord(self.id);

  const open = () => surveyWindow(`/survey/student?student=${self.id}`);
  const mine = record.surveys.student === "done";

  return (
    <>
      <WhoNote self={self} />

      <Head
        eyebrowText="설문"
        title="내 설문"
        lead="정답이 있는 검사가 아닙니다. 평소 내 모습을 그대로 고르면 됩니다. 우리 집과 선생님 설문이 함께 채워질수록 결과 해석이 촘촘해집니다."
        right={
          <button type="button" onClick={open} className={btnGo}>
            {mine ? "내 설문 다시 열기" : "내 설문 작성하기"} →
          </button>
        }
      />

      <div className={`mt-7 overflow-x-auto ${cardBox}`}>
        <table className="w-full min-w-[560px] border-collapse">
          <caption className="sr-only">설문 셋의 제출 현황</caption>
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={listTh}>설문</th>
              <th className={listTh}>내는 사람</th>
              <th className={listTh}>언제 내는가</th>
              <th className={listTh}>상태</th>
            </tr>
          </thead>
          <tbody>
            {surveyKeys.map((key) => {
              const meta = surveyMeta[key];
              const done = self.hydrated && record.surveys[key] === "done";
              const isMine = isSelfSurvey(key);
              return (
                <tr key={key} className={isMine ? "bg-soft-primary-soft/40" : undefined}>
                  <td className={`${listTd} text-left text-[13.5px] font-bold text-soft-ink`}>
                    {meta.label}
                    {isMine && (
                      <span className="ml-1.5 align-[1px] text-[11px] font-bold text-soft-primary">
                        내 것
                      </span>
                    )}
                  </td>
                  <td className={listTd}>{meta.who}</td>
                  <td className={`${listTd} text-left`}>{meta.note}</td>
                  <td className={listTd}>
                    {!self.hydrated ? (
                      "—"
                    ) : isMine ? (
                      <button
                        type="button"
                        onClick={open}
                        className={`font-semibold hover:underline ${
                          done ? "text-emerald-600" : "text-soft-primary"
                        }`}
                      >
                        {done ? "제출 완료 · 다시 열기" : "작성하기"}
                      </button>
                    ) : (
                      <span className={done ? "font-semibold text-emerald-600" : undefined}>
                        {done ? "제출 완료" : "미제출"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-[13px] leading-[1.8] text-soft-muted">
        우리 집·선생님 설문은 보호자 화면에서 링크를 보내 냅니다. 내가 대신 낼 수는 없습니다
        — 같은 사람이 셋을 채우면 서로 맞춰 보는 뜻이 없어지기 때문입니다. 최종 제출은{" "}
        <Link href="/student/exams" className="font-semibold text-soft-primary hover:underline">
          내 평가
        </Link>
        의 평가 판에서 합니다.
      </p>
    </>
  );
}
