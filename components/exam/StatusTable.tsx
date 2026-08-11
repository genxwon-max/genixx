"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assessment, QUESTIONS_PER_SUBJECT, questionsOf, subjects } from "@/lib/exam";
import {
  allSubmitted,
  finalize,
  missingSurveys,
  resetStudent,
  submittedCount,
  surveyKeys,
  surveyMeta,
  useExamRecord,
  useHydrated,
  type SurveyKey,
} from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { findById, formatCode } from "@/lib/roster";
import { examWindow, surveyWindow } from "@/lib/popup";
import { isAnswered } from "./ExamSession";
import SectionTitle from "./SectionTitle";
import { ArrowRight } from "@/components/Icons";
import {
  btnGhost,
  btnPrimary,
  btnSm,
  btnSmGhost,
  btnSmMuted,
  eyebrow,
  govTable,
  panel,
  td,
  tdStrong,
  th,
} from "./ui";

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const stateText: Record<string, { label: string; className: string }> = {
  submitted: { label: "제출완료", className: "font-bold text-emerald-700" },
  reflecting: { label: "해석 작성중", className: "font-bold text-amber-700" },
  "in-progress": { label: "진행중", className: "font-bold text-amber-700" },
  ready: { label: "미시작", className: "text-soft-muted" },
  forfeited: { label: "응시포기", className: "font-bold text-rose-600" },
  done: { label: "제출완료", className: "font-bold text-emerald-700" },
  none: { label: "미제출", className: "font-bold text-rose-600" },
};

export default function StatusTable() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const student = hydrated ? findById(studentId) : null;

  const [askFinal, setAskFinal] = useState(false);
  const [guardianPick, setGuardianPick] = useState(false);

  // 세 과목 모두 제출 + 문항별 해석 작성까지 끝나야 최종 제출할 수 있다
  const examDone =
    allSubmitted(record) && subjects.every((s) => record.subjects[s.id].reflectionAt !== null);
  const missing = missingSurveys(record);
  const asGuardian = session?.asGuardian === true;

  // 학생 세션이 아니면 응시 현황을 볼 대상이 없다
  if (hydrated && session && session.role !== "student") {
    const home = session.role === "director" ? "/my/students" : "/my/children";
    return (
      <div className="container-x py-16">
        <div className={`mx-auto max-w-lg p-8 text-center ${panel}`}>
          <p className={eyebrow}>학생 화면</p>
          <h1 className="mt-3 text-[20px] font-bold text-soft-ink">
            응시 현황은 학생 계정에서 확인합니다
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">
            학생에게 발급한 접속코드로 들어가면 이 화면이 열립니다. 보호자도 같은 코드로 들어와
            설문만 진행할 수 있습니다.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={home} className={btnPrimary}>
              학생 관리로
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login/student" className={btnGhost}>
              학생 코드로 접속
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openExam = (subject: string) => examWindow(`/exam/session/${subject}`);
  const openSurvey = (key: SurveyKey) => surveyWindow(`/survey/${key}?student=${studentId}`);

  return (
    <div>
      {/* 응시자 정보 */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          <p className={eyebrow}>ASM-01 · 응시 현황</p>
          <h1 className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">
            {assessment.name} {assessment.round} 진단 현황
          </h1>
        </div>
        <p className="text-[12px] text-soft-muted">
          응시 기간 2026-08-10 ~ 2026-08-24 · 조회 기준 {fmt(new Date().toISOString())}
        </p>
      </div>

      {asGuardian && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded border border-brand-300 bg-soft-primary-soft px-5 py-4">
          <p className="text-[13px] leading-relaxed text-soft-ink">
            <b>보호자로 접속하셨습니다.</b> 학생의 응시 답안은 열람할 수 없으며, 아래{" "}
            <b>학부모 설문</b>만 진행할 수 있습니다.
          </p>
          <button type="button" onClick={() => setGuardianPick(true)} className={btnPrimary}>
            학부모 설문 진행
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <dl className={`mt-5 grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4 ${panel}`}>
        {[
          { t: "성명", v: student?.name ?? session?.name ?? "-" },
          { t: "학년", v: student?.grade ?? "초등 4학년" },
          { t: "접속코드", v: student ? formatCode(student.code) : "-" },
          { t: "제출 과목", v: `${hydrated ? submittedCount(record) : 0} / ${subjects.length}` },
        ].map((i) => (
          <div key={i.t} className="px-5 py-4">
            <dt className="text-[11px] font-bold text-soft-muted">{i.t}</dt>
            <dd className="mt-1 text-[15px] font-bold tabular-nums text-soft-ink">{i.v}</dd>
          </div>
        ))}
      </dl>

      {/* 표 1 — 과목별 평가 */}
      <section className="mt-9">
        <SectionTitle note="과목마다 따로 응시하며, 한 과목당 4문항 40분입니다. 응시 버튼을 누르면 별도 창이 열립니다.">
          평가 응시 현황
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <caption className="sr-only">과목별 응시 현황</caption>
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[80px]" />
              <col className="w-[90px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>구분</th>
                <th className={th}>평가 과목</th>
                <th className={th}>문항수</th>
                <th className={th}>제한시간</th>
                <th className={th}>진행상태</th>
                <th className={th}>제출일시</th>
                <th className={th}>응시</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => {
                const rec = record.subjects[s.id];
                const answered = hydrated
                  ? questionsOf(s.id).filter((q) => isAnswered(q, rec.answers[q.id])).length
                  : 0;
                const reflecting = rec.status === "submitted" && !rec.reflectionAt;
                const st = reflecting
                  ? stateText.reflecting
                  : (stateText[rec.status] ?? stateText.ready);
                const exhausted = rec.status === "forfeited" && rec.attemptsLeft <= 0;

                return (
                  <tr key={s.id}>
                    {i === 0 && (
                      <td className={`${td} bg-slate-50/60 font-bold text-soft-ink`} rowSpan={3}>
                        필수 평가
                      </td>
                    )}
                    <td className={`${tdStrong} text-left`}>
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
                        {s.name}
                      </span>
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {answered}/{QUESTIONS_PER_SUBJECT}
                    </td>
                    <td className={`${td} tabular-nums`}>{s.limitMin}분</td>
                    <td className={td}>
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{fmt(rec.submittedAt)}</td>
                    <td className={td}>
                      {asGuardian ? (
                        <span className={btnSmMuted}>열람 불가</span>
                      ) : reflecting ? (
                        <button type="button" onClick={() => openExam(s.id)} className={btnSm}>
                          해석 작성
                        </button>
                      ) : rec.status === "submitted" ? (
                        <span className={btnSmMuted}>완료</span>
                      ) : exhausted ? (
                        <span className={btnSmMuted}>기회 소진</span>
                      ) : (
                        <button type="button" onClick={() => openExam(s.id)} className={btnSm}>
                          {answered > 0 ? "이어서" : "평가 시작"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 표 2 — 설문 */}
      <section className="mt-9">
        <SectionTitle note="어머니·아버지 각각 따로 제출할 수 있고, 한 분만 하셔도 됩니다. 설문 버튼을 누르면 별도 창이 열립니다.">
          설문 제출 현황
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <caption className="sr-only">보호자·교사 설문 제출 현황</caption>
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>구분</th>
                <th className={th}>설문 종류</th>
                <th className={th}>대상</th>
                <th className={th}>진행상태</th>
                <th className={th}>제출일시</th>
                <th className={th}>설문</th>
              </tr>
            </thead>
            <tbody>
              {surveyKeys.map((key, i) => {
                const meta = surveyMeta[key];
                const state = record.surveys[key];
                const st = stateText[state] ?? stateText.none;
                return (
                  <tr key={key}>
                    {i === 0 && (
                      <td className={`${td} bg-slate-50/60 font-bold text-soft-ink`} rowSpan={3}>
                        선택 설문
                      </td>
                    )}
                    <td className={`${tdStrong} text-left`}>{meta.label}</td>
                    <td className={td}>{meta.who}</td>
                    <td className={td}>
                      <span className={st.className}>{st.label}</span>
                    </td>
                    <td className={`${td} tabular-nums`}>{fmt(record.surveyAt[key])}</td>
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => openSurvey(key)}
                        className={state === "done" ? btnSmGhost : btnSm}
                      >
                        {state === "done" ? "다시 작성" : "설문하기"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-soft-muted">
          설문은 필수가 아닙니다. 다만 제출된 설문이 많을수록 결과 해석의 근거가 넓어지며, 리포트의
          &lsquo;발견의 순간&rsquo;과 발현 조건 항목은 보호자 설문이 있어야 제공됩니다.
        </p>
      </section>

      {/* 최종 제출 */}
      <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-soft-line pt-6">
        <div>
          <p className="text-[13px] font-bold text-soft-ink">
            {record.finalized
              ? "최종 제출이 완료되었습니다."
              : examDone
                ? "세 과목의 답안과 해석이 모두 제출되었습니다. 최종 제출하면 결과 분석이 시작됩니다."
                : "세 과목을 모두 제출하고 문항별 해석까지 작성해야 최종 제출할 수 있습니다."}
          </p>
          <p className="mt-1 text-[12px] text-soft-muted">
            최종 제출 후에는 답안을 수정할 수 없습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => resetStudent(studentId)}
            className="rounded border border-soft-line bg-white px-4 py-2 text-[12px] font-bold text-soft-muted transition-colors hover:bg-slate-50"
          >
            시연용 초기화
          </button>
          {record.finalized ? (
            <Link href="/exam/result" className={btnPrimary}>
              결과 확인
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => examDone && setAskFinal(true)}
              aria-disabled={!examDone}
              className={
                examDone
                  ? btnPrimary
                  : "inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-soft-line bg-slate-50 px-6 py-3 text-sm font-bold text-soft-muted"
              }
            >
              제출 완료
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {askFinal && (
        <FinalDialog
          missing={missing}
          onCancel={() => setAskFinal(false)}
          onSurvey={(key) => {
            setAskFinal(false);
            openSurvey(key);
          }}
          onConfirm={() => {
            finalize(studentId);
            setAskFinal(false);
            router.push("/exam/result");
          }}
        />
      )}

      {guardianPick && (
        <GuardianDialog
          onCancel={() => setGuardianPick(false)}
          onPick={(key) => {
            setGuardianPick(false);
            openSurvey(key);
          }}
        />
      )}
    </div>
  );
}

function FinalDialog({
  missing,
  onCancel,
  onConfirm,
  onSurvey,
}: {
  missing: SurveyKey[];
  onCancel: () => void;
  onConfirm: () => void;
  onSurvey: (key: SurveyKey) => void;
}) {
  const guardians = missing.filter((k) => k !== "teacher");
  const teacherMissing = missing.includes("teacher");

  const headline =
    guardians.length > 0 && teacherMissing
      ? "학부모 설문과 지도교사 설문이 모두 빠져 있습니다."
      : guardians.length > 0
        ? "학부모 설문이 빠져 있습니다."
        : teacherMissing
          ? "지도교사 설문이 빠져 있습니다."
          : "모든 설문이 제출되었습니다.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
    >
      <div className="w-full max-w-lg rounded-md border border-soft-line bg-white">
        <div className="border-b border-soft-line px-7 py-5">
          <p className={eyebrow}>최종 제출 확인</p>
          <h2 id="final-title" className="mt-2 text-[19px] font-bold text-soft-ink">
            지금 제출하고 결과를 받을까요?
          </h2>
        </div>

        <div className="px-7 py-6">
          {missing.length > 0 ? (
            <>
              <p className="text-[14px] font-bold text-rose-600">{headline}</p>
              <ul className="mt-3 space-y-1.5">
                {missing.map((k) => (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-soft-ink">
                      · {surveyMeta[k].label} <span className="text-rose-600">미제출</span>
                    </span>
                    <button type="button" onClick={() => onSurvey(k)} className={btnSmGhost}>
                      지금 설문하기
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded border border-rose-300 bg-rose-50 px-4 py-3.5 text-[13px] leading-relaxed text-rose-700">
                <b>설문이 빠진 상태로도 결과는 발행됩니다.</b> 다만 보호자·교사 관찰은 학생 응답만으로
                확인하기 어려운 <b>발현 조건</b>을 보는 자료이므로, 빠지면 해당 해석 항목이 제외되고
                리포트의 신뢰도 표기가 &lsquo;참고&rsquo; 수준으로 내려갑니다. 가능하면 설문을 마친 뒤
                제출하시길 권합니다.
              </p>
            </>
          ) : (
            <p className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-[13px] leading-relaxed text-emerald-800">
              학생 응답과 관찰 설문이 모두 모였습니다. 교차 검증이 가능한 상태로 분석이 진행됩니다.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-soft-line px-7 py-5">
          <button type="button" onClick={onCancel} className={btnGhost}>
            취소
          </button>
          <button type="button" onClick={onConfirm} className={btnPrimary}>
            제출하고 결과 보기
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GuardianDialog({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (key: SurveyKey) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardian-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-soft-ink/40 p-5"
    >
      <div className="w-full max-w-sm rounded-md border border-soft-line bg-white p-7 text-center">
        <p className={eyebrow}>보호자 확인</p>
        <h2 id="guardian-title" className="mt-3 text-[19px] font-bold text-soft-ink">
          어느 보호자이신가요?
        </h2>
        <p className="mt-2.5 text-[13px] leading-relaxed text-soft-muted">
          선택하신 분의 설문 창이 열립니다. 두 분 모두 각각 제출하실 수 있습니다.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onPick("mother")} className={btnPrimary}>
            어머니
          </button>
          <button type="button" onClick={() => onPick("father")} className={btnPrimary}>
            아버지
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 text-[13px] text-soft-muted hover:text-soft-ink"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
