"use client";

import Link from "next/link";
import { useState } from "react";
import { isSelfSurvey, surveyKeys, surveyMeta, useExamRecord } from "@/lib/examStore";
import { surveyWindow } from "@/lib/popup";
import { recordSurveySend } from "@/lib/roster";
import { phoneText } from "@/components/account/SendCodes";
import { listTd, listTh } from "@/components/account/ui";
import SmsDialog from "@/components/exam/SmsDialog";
import Toast from "@/components/exam/Toast";
import { Head, WhoNote, btnGo, cardBox, useSelf } from "./self";

/**
 * 내 설문 (/student/surveys) — 학생이 자기 설문을 내고, 부모님 몫을 보내는 자리.
 *
 * 보호자 설문 화면(/my/surveys)과 보는 각이 다르다. 저쪽은 **아이들이 줄로** 서고 누가
 * 아직 안 냈는지를 훑는 자리다. 여기는 내 것 하나뿐이라 **설문 셋이 줄로** 선다 — 내
 * 설문, 그리고 우리 집과 선생님이 냈는지.
 *
 * ── 남의 설문을 대신 내지는 못한다. 보내 줄 수는 있다 ──
 * 학생이 보호자 설문을 열어 채울 수 있게 두면 가정 관찰이 학생 자기 응답의 복사가 되어,
 * 교차해 읽는 뜻이 사라진다. 그래서 **여는 단추**는 내 것에만 둔다. 다만 링크를 부모님
 * 휴대전화로 보내는 일은 다르다 — 답하는 사람은 여전히 부모님이고, 아이는 「엄마 설문
 * 아직 안 냈대」를 말할 길이 생긴다. 설문이 비어 있는 집은 대개 보호자가 화면에 들어오지
 * 않아서 비는데, 그 집의 아이는 지금 이 화면을 보고 있다.
 *
 * 선생님 몫에는 단추를 두지 않는다. 번호를 아는 사람이 보호자이고, 명부에도 보호자
 * 연락처만 있다. 아이가 기억나는 번호를 찍어 보내게 두면 우리 시스템이 모르는 번호로
 * 링크가 나간다.
 *
 * 설문은 고정 크기 창으로 뜬다(lib/popup.ts) — 문항에 집중하는 자리라 대시보드 레일을
 * 지고 있을 까닭이 없고, 다 내고 창을 닫으면 이 표로 돌아온다.
 */
export default function StudentSurveys() {
  const self = useSelf();
  const record = useExamRecord(self.id);
  /** 문자 창이 열려 있는 설문 */
  const [smsFor, setSmsFor] = useState<"guardian" | null>(null);
  /* 명부에 없는 시연 계정도 「보냈다」가 남도록 화면에 따로 적어 둔다 */
  const [localSend, setLocalSend] = useState<{ phone: string; at: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = () => surveyWindow(`/survey/student?student=${self.id}`);
  const mine = record.surveys.student === "done";
  const sent = localSend ?? self.student?.surveySends?.guardian ?? null;

  return (
    <>
      <WhoNote self={self} />

      <Head
        title="내 설문"
        lead="정답이 있는 검사가 아닙니다. 평소 내 모습을 그대로 고르면 됩니다. 우리 집과 선생님 설문이 함께 채워질수록 결과 해석이 더 정확해집니다."
        right={
          <button type="button" onClick={open} className={btnGo}>
            {mine ? "내 설문 다시 열기" : "내 설문 작성하기"} →
          </button>
        }
      />

      <div className={`mt-7 overflow-x-auto ${cardBox}`}>
        <table className="w-full min-w-[620px] border-collapse">
          <caption className="sr-only">설문 세 가지의 제출 현황</caption>
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col />
            <col className="w-[26%]" />
          </colgroup>
          <thead>
            <tr>
              <th className={listTh}>설문</th>
              <th className={listTh}>내는 사람</th>
              <th className={listTh}>제출 시기</th>
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
                    ) : done ? (
                      <span className="font-semibold text-emerald-600">제출 완료</span>
                    ) : key === "guardian" ? (
                      /* 보낸 뒤에도 자리를 지운다거나 「보냈음」만 남기지 않는다 — 문자는
                         지워지고 잊힌다. 언제 보냈는지를 적고 다시 보낼 길을 함께 둔다 */
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setSmsFor("guardian")}
                          className="font-semibold text-soft-primary hover:underline"
                        >
                          {sent ? "다시 보내기" : "문자 보내기"}
                        </button>
                        {sent && (
                          <span className="text-[11.5px] text-soft-muted">
                            {phoneText(sent.phone)}로 보냄
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>미제출</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-[13px] leading-[1.8] text-soft-muted">
        부모님 설문은 <b className="font-semibold text-soft-ink">문자 보내기</b>로 링크를 보내면
        부모님이 자기 휴대전화에서 바로 쓰실 수 있습니다. 내가 대신 낼 수는 없습니다 — 같은
        사람이 세 설문을 모두 쓰면 서로 비교해 보는 의미가 없어지기 때문입니다. 선생님 설문은 연락처를 아는
        보호자 화면에서 보냅니다. 최종 제출은{" "}
        <Link href="/student/exams" className="font-semibold text-soft-primary hover:underline">
          내 진단
        </Link>
        에서 합니다.
      </p>

      {smsFor && (
        <SmsDialog
          label={surveyMeta[smsFor].label}
          /* 등록할 때 받은 보호자 번호에서 출발한다 — 아이가 번호를 외우고 있지 않아도 된다 */
          initial={sent?.phone ?? self.student?.guardianPhone ?? ""}
          note="부모님이 링크를 열면 로그인 없이 바로 설문을 쓰실 수 있습니다. 내가 쓴 답은 보이지 않습니다."
          onCancel={() => setSmsFor(null)}
          onSend={(phone) => {
            /* ⚠ 문자는 아직 나가지 않는다. 발송 API를 붙이면 그 결과가 돌아온 뒤에 기록한다 */
            if (self.student) recordSurveySend(self.student.id, "guardian", phone);
            setLocalSend({ phone, at: new Date().toISOString() });
            setToast(`${phoneText(phone)}로 부모님 설문 링크를 보냈습니다.`);
            setSmsFor(null);
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
