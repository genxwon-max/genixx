"use client";

import { useState } from "react";
import { useSession } from "@/lib/authStore";
import { QUESTIONS_PER_SUBJECT, levelOf, questionsOf, subjects, type SubjectId } from "@/lib/exam";
import { useExamRecord, type ExamRecord } from "@/lib/examStore";
import { GoApply, PageTitle, RegTable, useRegistrations, type Registration } from "./Registrations";
import StudentOnly from "./StudentOnly";
import { eyebrow } from "./ui";

/**
 * 정답과 해설 탭 (/exam/answers).
 *
 * 접수한 평가 표를 펴고, **최종 제출을 마친 평가만** 정답을 연다. 풀기 전에 정답이 보이면
 * 시험이 되지 않는다.
 *
 * 문항마다 내 답과 정답을 나란히 둔다. 서술형은 정답이 하나로 정해지지 않아 전문가가
 * 채점하므로, 내가 쓴 답과 문항의 작성 안내만 다시 보여 준다.
 *
 * ⚠ 문항 자료(lib/examQuestions.ts)에는 해설 문장이 아직 없다. 없는 해설을 지어 넣지
 *   않고, 해설 칸이 생기면 이 화면에 붙인다.
 */
export default function AnswerKey() {
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const rows = useRegistrations(studentId);
  const [open, setOpen] = useState<string | null>(null);

  if (session && session.role !== "student") return <StudentOnly role={session.role} />;

  const key = (r: Registration) => `${r.round}-${r.track}`;
  const picked = rows.find((r) => key(r) === open) ?? null;

  return (
    <div>
      <PageTitle>정답과 해설</PageTitle>
      <div className="mt-10">
        <RegTable
          caption="정답과 해설을 볼 수 있는 평가"
          rows={rows}
          lastHead="정답"
          renderLast={(row) =>
            record.finalized ? (
              <button
                type="button"
                aria-expanded={open === key(row)}
                onClick={() => setOpen(open === key(row) ? null : key(row))}
                className={`inline-flex items-center justify-center rounded-[4px] px-4 py-2 text-[13px] font-semibold transition-colors ${
                  open === key(row)
                    ? "border border-soft-line bg-white text-soft-ink hover:bg-slate-50"
                    : "bg-soft-primary text-white hover:bg-soft-primary-dark"
                }`}
              >
                {open === key(row) ? "닫기" : "보기"}
              </button>
            ) : (
              <span>응시 완료 후 공개</span>
            )
          }
        />
      </div>
      {rows.length === 0 && <GoApply />}

      {picked && record.finalized && <Sheet key={key(picked)} row={picked} record={record} />}
    </div>
  );
}

function Sheet({ row, record }: { row: Registration; record: ExamRecord }) {
  const available = subjects.filter(
    (s) => !row.info || row.info.subjects.some((x) => x.id === s.id),
  );
  const [subject, setSubject] = useState<SubjectId>(available[0]?.id ?? "korean");
  const list = questionsOf(subject);
  const answers = record.subjects[subject].answers;

  const choices = list.filter((q) => q.type === "choice");
  const right = choices.filter((q) => answers[q.id] === q.answer).length;
  const essays = list.length - choices.length;

  return (
    <section className="mt-12" aria-labelledby="answer-sheet">
      {/* 머리는 결과 리포트(ResultView)와 같은 모양으로 둔다 — 두 탭에서 펼치는 것이 같은
          평가의 다른 면이라, 펼친 뒤의 화면이 서로 남처럼 보이면 안 된다 */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-soft-line pb-5">
        <div>
          <p className={eyebrow}>정답과 해설</p>
          <h2
            id="answer-sheet"
            className="mt-2.5 text-[24px] font-bold tracking-tight text-soft-ink md:text-[28px]"
          >
            {row.title}
          </h2>
          <p className="mt-2 text-[12px] text-soft-muted">
            최종 제출{" "}
            {record.finalizedAt ? new Date(record.finalizedAt).toLocaleDateString("ko-KR") : "-"} ·
            과목 {available.length}개 · 과목당 {QUESTIONS_PER_SUBJECT}문항
          </p>
        </div>
      </div>

      <div role="group" aria-label="과목" className="mt-7 flex flex-wrap gap-2">
        {available.map((s) => {
          const on = s.id === subject;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => setSubject(s.id)}
              className={`rounded-[4px] border px-5 py-2.5 text-[14px] transition-colors ${
                on
                  ? "border-soft-primary bg-soft-primary font-semibold text-white"
                  : "border-soft-line bg-white text-soft-ink hover:bg-slate-50"
              }`}
            >
              {s.short}
            </button>
          );
        })}
      </div>

      <p className="mt-5 border-y border-soft-line bg-white px-4 py-3 text-[14px] text-soft-ink">
        객관식 {choices.length}문항 중 <b className="tabular-nums">{right}문항</b> 정답
        {essays > 0 && (
          <span className="text-soft-muted"> · 서술형 {essays}문항은 전문가가 채점합니다</span>
        )}
      </p>

      <ol className="mt-5 space-y-4">
        {list.map((q) => {
          const mine = answers[q.id];
          return (
            <li key={q.id} className="rounded-[4px] border border-soft-line bg-white px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <p className="text-[14px] font-bold text-soft-ink">
                  <span className="tabular-nums">{q.no}</span>번
                  <span className="ml-2 font-medium text-soft-muted">
                    {q.type === "essay" ? "서술형" : "객관식"}
                  </span>
                </p>
                <p className="text-[12px] tabular-nums text-soft-muted">
                  {q.level} {levelOf(q.level).name}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-soft-ink">
                {q.stem}
              </p>

              {q.type === "choice" ? (
                <>
                  <ul className="mt-3 space-y-1.5">
                    {q.choices?.map((c, i) => {
                      const isAnswer = i === q.answer;
                      const isMine = mine === i;
                      return (
                        <li
                          key={c}
                          className={`flex items-start gap-3 rounded-[4px] border px-3.5 py-2.5 text-[14px] leading-relaxed ${
                            isAnswer
                              ? "border-emerald-500 bg-emerald-50 text-soft-ink"
                              : isMine
                                ? "border-rose-300 bg-rose-50 text-soft-ink"
                                : "border-slate-100 text-soft-muted"
                          }`}
                        >
                          <span className="w-4 shrink-0 font-bold tabular-nums">{i + 1}</span>
                          <span className="flex-1">{c}</span>
                          {isAnswer && (
                            <span className="shrink-0 text-[12px] font-bold text-emerald-700">
                              정답
                            </span>
                          )}
                          {isMine && (
                            <span
                              className={`shrink-0 text-[12px] font-bold ${
                                isAnswer ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              내 답
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[13px] font-semibold">
                    {typeof mine !== "number" ? (
                      <span className="text-soft-muted">
                        답을 고르지 않았습니다 · 정답 {q.answer! + 1}번
                      </span>
                    ) : mine === q.answer ? (
                      <span className="text-emerald-700">맞았습니다</span>
                    ) : (
                      <span className="text-rose-600">
                        틀렸습니다 · 내 답 {mine + 1}번, 정답 {q.answer! + 1}번
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-[4px] border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[12px] font-bold text-soft-muted">내 답</p>
                    <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-soft-ink">
                      {typeof mine === "string" && mine.trim() ? mine : "쓰지 않았습니다."}
                    </p>
                  </div>
                  {q.guide && (
                    <div className="px-1">
                      <p className="text-[12px] font-bold text-soft-muted">작성 안내</p>
                      <ol className="mt-1 space-y-1">
                        {q.guide.map((g, i) => (
                          <li
                            key={g}
                            className="flex gap-2 text-[14px] leading-relaxed text-soft-ink"
                          >
                            <span className="font-bold tabular-nums text-soft-muted">{i + 1}.</span>
                            {g}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <p className="text-[13px] text-soft-muted">
                    서술형은 전문가가 채점하며 결과보기에서 확인합니다.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
