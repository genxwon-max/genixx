"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assessment, subjects, tierOf, tierQuestions } from "@/lib/exam";
import {
  allSubmitted,
  finalize,
  isSelfSurvey,
  missingSurveys,
  reopenSurvey,
  resetStudent,
  submittedCount,
  surveyKeys,
  surveyMeta,
  useExamRecord,
  useHydrated,
  type SurveyKey,
} from "@/lib/examStore";
import { useClaimSet } from "@/lib/setStore";
import { useSession } from "@/lib/authStore";
import { formatCode, recordSurveySend, useRoster } from "@/lib/roster";
import { examWindow, surveyWindow } from "@/lib/popup";
import { phoneText } from "@/components/account/SendCodes";
import { ensureReport } from "@/lib/reportStore";
import { useExamConfig } from "@/lib/roundStore";
import { isAnswered } from "./ExamSession";
import SectionTitle from "./SectionTitle";
import Toast from "./Toast";
import StudentOnly from "./StudentOnly";
import { ArrowRight } from "@/components/Icons";
import {
  btnGhost,
  btnPrimary,
  btnSm,
  btnSmGhost,
  btnSmMuted,
  eyebrow,
  govTable,
  input,
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

/**
 * 과목을 하나씩 응시하는 판.
 *
 * 응시 첫 화면(ExamCatalog)에서 평가 카드의 「응시하기」를 누르면 여기로 온다. 머리에는
 * 고른 평가(회차 · 학년)를 적는다 — 넘겨받지 않으면 예전처럼 지금 회차 이름을 쓴다.
 */
export type StatusHeading = {
  eyebrow: string;
  title: string;
  /** 「2026.08.01 ~ 2026.08.31」 */
  period: string;
};

export default function StatusTable({ heading }: { heading?: StatusHeading }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const config = useExamConfig();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  /* 셋트를 풀고 가입한 학생이 이 화면에 바로 닿을 수 있다 — 그 답을 물려받아 둔다 */
  useClaimSet(session?.role === "student" ? studentId : null);
  const roster = useRoster();
  const student = hydrated ? (roster.find((r) => r.id === studentId) ?? null) : null;
  /** 문자를 보낼 설문 — 번호 받는 창이 열려 있다 */
  const [smsFor, setSmsFor] = useState<SurveyKey | null>(null);
  /* 명부에 없는 시연 계정도 「보냈다」가 남도록 화면에 따로 적어 둔다 */
  const [localSends, setLocalSends] = useState<Record<string, { phone: string; at: string }>>({});
  const sends = { ...student?.surveySends, ...localSends };
  const [toast, setToast] = useState<string | null>(null);

  const [askFinal, setAskFinal] = useState(false);

  // 세 과목 모두 제출 + 문항별 해석 작성까지 끝나야 최종 제출할 수 있다
  const examDone =
    allSubmitted(record) && subjects.every((s) => record.subjects[s.id].reflectionAt !== null);
  const missing = missingSurveys(record);
  const asGuardian = session?.asGuardian === true;

  // 학생 세션이 아니면 응시 현황을 볼 대상이 없다
  if (hydrated && session && session.role !== "student") {
    return <StudentOnly role={session.role} />;
  }

  const openExam = (subject: string) => examWindow(`/exam/session/${subject}`);
  const openSurvey = (key: SurveyKey) => surveyWindow(`/survey/${key}?student=${studentId}`);

  return (
    <div>
      {/* 응시자 정보 */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          <p className={eyebrow}>{heading?.eyebrow ?? "ASM-01 · 응시 현황"}</p>
          <h1 className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]">
            {heading?.title ?? `${assessment.name} ${config.roundLabel} 진단 현황`}
          </h1>
        </div>
        <p className="text-[12px] text-soft-muted">
          응시 기간 {heading?.period ?? `${config.opensAt} ~ ${config.closesAt}`} · 조회 기준{" "}
          {fmt(new Date().toISOString())}
        </p>
      </div>

      {asGuardian && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded border border-brand-300 bg-soft-primary-soft px-5 py-4">
          <p className="text-[13px] leading-relaxed text-soft-ink">
            <b>보호자로 접속하셨습니다.</b> 학생의 응시 답안은 열람할 수 없으며, 아래{" "}
            <b>학부모 설문</b>만 진행할 수 있습니다.
          </p>
          {/* 어머니·아버지를 고르던 창을 뺐다 — 학부모 설문이 한 벌이라 고를 것이 없다 */}
          <button type="button" onClick={() => openSurvey("guardian")} className={btnPrimary}>
            학부모 설문 진행
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <dl
        className={`mt-5 grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-3 lg:grid-cols-5 ${panel}`}
      >
        {[
          { t: "성명", v: student?.name ?? session?.name ?? "-" },
          { t: "학년", v: student?.grade ?? "초등 4학년" },
          { t: "접속코드", v: student ? formatCode(student.code) : "-" },
          { t: "응시 갈래", v: tierOf(record.tier).label },
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
        <SectionTitle
          note={`지금 ${tierOf(record.tier).label}으로 응시하고 있습니다. 과목마다 따로 응시하며, 문항 수와 제한 시간은 아래 표에 적었습니다. 응시 버튼을 누르면 별도 창이 열립니다.`}
        >
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
                const opened = tierQuestions(record.tier, s.id, record.setSubject);
                const answered = hydrated
                  ? opened.filter((q) => isAnswered(q, rec.answers[q.id])).length
                  : 0;
                const reflecting = rec.status === "submitted" && !rec.reflectionAt;
                const st = reflecting
                  ? stateText.reflecting
                  : (stateText[rec.status] ?? stateText.ready);
                const exhausted = rec.status === "forfeited" && rec.attemptsLeft <= 0;
                /* 이번 회차에서 뺀 과목. 이미 제출한 기록은 그대로 두고 새 응시만 막는다 —
                   줄을 아예 지우면 지난주에 본 아이가 자기 기록을 찾지 못한다. */
                const off = !config.enabled[s.id];

                return (
                  <tr key={s.id}>
                    {i === 0 && (
                      <td
                        className={`${td} bg-slate-50/60 font-bold text-soft-ink`}
                        rowSpan={subjects.length}
                      >
                        필수 평가
                      </td>
                    )}
                    {/* 과목 앞의 색점은 두지 않는다. 이름이 곧 구분이고,
                        색점은 뜻 없이 눈만 잡아끈다. */}
                    <td className={`${tdStrong} text-left`}>{s.name}</td>
                    <td className={`${td} tabular-nums`}>
                      {answered}/{opened.length}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {/* 이미 시작했다면 그 아이가 받은 시간을 적는다. 지금 설정을 적으면
                          45분에 푼 아이의 기록에 20분이라고 남는다. */}
                      {off && !rec.startedAt ? "—" : `${rec.limitMin ?? config.limits[s.id]}분`}
                    </td>
                    <td className={td}>
                      {off && rec.status === "ready" ? (
                        <span className="text-soft-muted">이번 회차 미포함</span>
                      ) : (
                        <span className={st.className}>{st.label}</span>
                      )}
                    </td>
                    <td className={`${td} tabular-nums`}>{fmt(rec.submittedAt)}</td>
                    <td className={td}>
                      {asGuardian ? (
                        <span className={btnSmMuted}>열람 불가</span>
                      ) : off && rec.status === "ready" ? (
                        <span className={btnSmMuted}>미포함</span>
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
        <SectionTitle note="학생 설문은 본인이 이 화면에서 바로 작성합니다. 학부모 설문은 한 벌이며 어머니·아버지 중 한 분이 대표로 답하셔도 됩니다. 설문 링크를 문자로 보내면 받은 분이 로그인 없이 자기 휴대전화에서 작성합니다. 낸 뒤에도 다시 열어 고칠 수 있습니다.">
          설문 제출 현황
        </SectionTitle>

        <div className="overflow-x-auto">
          <table className={govTable}>
            <caption className="sr-only">학생·보호자·교사 설문 제출 현황</caption>
            <colgroup>
              <col className="w-[110px]" />
              <col />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
              <col className="w-[150px]" />
              <col className="w-[170px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={th}>구분</th>
                <th className={th}>설문 종류</th>
                <th className={th}>대상</th>
                <th className={th}>진행상태</th>
                <th className={th}>제출일시</th>
                <th className={th}>작성 · 문자</th>
              </tr>
            </thead>
            <tbody>
              {surveyKeys.map((key, i) => {
                const meta = surveyMeta[key];
                const state = record.surveys[key];
                const st = stateText[state] ?? stateText.none;
                const sent = sends[key];
                return (
                  <tr key={key}>
                    {i === 0 && (
                      <td
                        className={`${td} bg-slate-50/60 font-bold text-soft-ink`}
                        rowSpan={surveyKeys.length}
                      >
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
                      {state === "done" ? (
                        /* 낸 뒤에도 고칠 길과 처음부터 다시 할 길을 둔다(절차 8단계) —
                           고치려던 사람이 답을 다 잃으면 그 사람은 두 번 다시 고치지 않는다 */
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              reopenSurvey(studentId, key, true);
                              openSurvey(key);
                            }}
                            className={btnSm}
                          >
                            수정하기
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              reopenSurvey(studentId, key, false);
                              openSurvey(key);
                            }}
                            className="text-[11px] text-soft-muted underline-offset-2 hover:text-soft-ink hover:underline"
                          >
                            처음부터 다시
                          </button>
                        </span>
                      ) : isSelfSurvey(key) ? (
                        /* 학생 설문은 보낼 곳이 없다 — 본인이 여기서 바로 연다 */
                        <button type="button" onClick={() => openSurvey(key)} className={btnSm}>
                          설문 작성
                        </button>
                      ) : sent ? (
                        /* 이미 보냈으면 보냈다는 표시를 세우고, 다시 보낼 길만 작게 둔다 */
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <span className="text-[12px] font-bold text-emerald-700">
                            발송완료{" "}
                            <span className="font-medium tabular-nums">
                              {fmt(sent.at).slice(5, 10).replace("-", ".")}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSmsFor(key)}
                            className="text-[11px] text-soft-muted underline-offset-2 hover:text-soft-ink hover:underline"
                          >
                            다시 보내기
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setSmsFor(key)} className={btnSm}>
                          문자 보내기
                        </button>
                      )}
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
            <Link href="/exam/report" className={btnPrimary}>
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
            /* 제출과 동시에 규칙이 리포트를 조립한다. 조립된 것은 「검토 대기」이지
               결과가 아니다 — 사람이 발행을 누르기 전까지 결과 화면은 닫혀 있다. */
            ensureReport(
              studentId,
              student?.name ?? "응시자",
              student?.grade ?? "",
              assessment.round,
              record,
            );
            setAskFinal(false);
            router.push("/exam/report");
          }}
        />
      )}

      {smsFor && (
        <SmsDialog
          label={surveyMeta[smsFor].label}
          /* 학부모 설문은 등록 때 받은 보호자 번호에서 출발한다. 교사 번호는 알 수 없다 */
          initial={
            sends[smsFor]?.phone ?? (smsFor === "teacher" ? "" : (student?.guardianPhone ?? ""))
          }
          onCancel={() => setSmsFor(null)}
          onSend={(phone) => {
            /* ⚠ 문자는 아직 나가지 않는다. 발송 API를 붙이면 그 결과가 돌아온 뒤에 기록한다 */
            if (student) recordSurveySend(student.id, smsFor, phone);
            setLocalSends((m) => ({ ...m, [smsFor]: { phone, at: new Date().toISOString() } }));
            setToast(`${phoneText(phone)}로 ${surveyMeta[smsFor].label} 링크를 보냈습니다.`);
            setSmsFor(null);
          }}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />

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
  /* 빠진 설문을 한 줄로 모아 말한다 — 세 줄로 적으면 읽는 사람은 무엇을 먼저 할지 못 고른다 */
  const names = [
    missing.includes("student") && "학생 설문",
    missing.includes("guardian") && "학부모 설문",
    missing.includes("teacher") && "지도교사 설문",
  ].filter((v): v is string => Boolean(v));

  const headline =
    names.length === 0 ? "모든 설문이 제출되었습니다." : `${names.join(" · ")}이 빠져 있습니다.`;

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
                <b>설문이 빠진 상태로도 결과는 발행됩니다.</b> 다만 학생 응답은 아이 자신만 아는
                것을, 보호자·교사 관찰은 지필만으로 확인하기 어려운 <b>발현 조건</b>을 보는
                자료입니다. 빠지면 해당 해석 항목이 제외되고 리포트의 신뢰도 표기가
                &lsquo;참고&rsquo; 수준으로 내려갑니다. 지금 내지 않으셔도 결과를 받은 뒤에 내거나
                고칠 수 있습니다.
              </p>
            </>
          ) : (
            <p className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-[13px] leading-relaxed text-emerald-800">
              학생 설문과 관찰 설문이 모두 모였습니다. 교차 검증이 가능한 상태로 분석이 진행됩니다.
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

function SmsDialog({
  label,
  initial,
  onCancel,
  onSend,
}: {
  label: string;
  initial: string;
  onCancel: () => void;
  onSend: (phone: string) => void;
}) {
  const [phone, setPhone] = useState(phoneText(initial));
  const digits = phone.replace(/\D/g, "");
  const ok = digits.length >= 10 && digits.length <= 11;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSend(digits);
        }}
        className="w-full max-w-md rounded-[12px] bg-white p-7 shadow-float"
      >
        <h2 id="sms-title" className="text-[19px] font-bold text-soft-ink">
          {label} 링크를 문자로 보냅니다
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-soft-muted">
          받은 분이 링크를 열면 로그인 없이 바로 설문을 작성할 수 있습니다.
        </p>
        <label htmlFor="sms-phone" className="mt-5 block text-[13px] font-bold text-soft-ink">
          휴대전화 번호
        </label>
        <input
          id="sms-phone"
          type="tel"
          inputMode="numeric"
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, "").slice(0, 13))}
          placeholder="010-1234-5678"
          className={`mt-2 tabular-nums ${input}`}
        />
        {phone && !ok && (
          <p className="mt-1.5 text-[12px] text-rose-600">휴대전화 번호를 정확히 입력해 주세요.</p>
        )}
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            취소
          </button>
          <button
            type="submit"
            disabled={!ok}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  );
}
