"use client";

import { useState } from "react";
import { setSurvey, useExamRecord, useHydrated } from "@/lib/examStore";
import type { SurveyConfig } from "@/lib/survey";
import { findById } from "@/lib/roster";
import { CheckIcon } from "@/components/Icons";
import { btnDisabled, btnGhost, btnPrimary, eyebrow, input, panel } from "./ui";

const scale = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];

/** 고정 크기 팝업 창 안에서 도는 설문 폼 */
export default function SurveyForm({
  config,
  studentId,
}: {
  config: SurveyConfig;
  studentId: string;
}) {
  const hydrated = useHydrated();
  const record = useExamRecord(studentId);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);

  const student = hydrated ? findById(studentId) : null;
  const done = record.surveys[config.key] === "done";
  const answered = Object.keys(answers).length;
  const complete = answered === config.items.length;

  if (hydrated && done) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PopupHeader config={config} studentName={student?.name} />
        <div className="flex flex-1 items-center px-5 py-10">
          <div className={`mx-auto w-full max-w-md p-8 text-center ${panel}`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-600">
              <CheckIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-6 text-[20px] font-black text-exam-text">설문이 제출되었습니다</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
              이 창을 닫으면 응시 현황 표의 제출 상태가 <b>제출완료</b>로 바뀝니다.
            </p>
            <div className="mt-7 grid gap-2">
              <button type="button" onClick={() => window.close()} className={btnPrimary}>
                창 닫기
              </button>
              <button
                type="button"
                onClick={() => setSurvey(studentId, config.key, "none")}
                className={btnGhost}
              >
                다시 작성하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!complete) {
      setWarn(true);
      return;
    }
    setSurvey(studentId, config.key, "done");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PopupHeader config={config} studentName={student?.name} />

      <div className="sticky top-0 z-10 border-b border-exam-line bg-exam-panel px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold tabular-nums text-exam-text">
            {answered} / {config.items.length} 문항 응답
          </p>
          <span className="h-1 w-28 overflow-hidden bg-exam-raised">
            <span
              className="block h-full bg-brand-600 transition-[width]"
              style={{ width: `${(answered / config.items.length) * 100}%` }}
            />
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5">
        <p className="rounded border border-exam-line bg-exam-raised px-4 py-3.5 text-[12px] leading-relaxed text-exam-muted">
          {config.note}
        </p>

        <ol className="mt-4 space-y-2.5">
          {config.items.map((item, i) => (
            <li key={item} className={`p-4 ${panel}`}>
              <p className="text-[14px] font-medium leading-relaxed text-exam-text">
                <span className="mr-1.5 font-bold tabular-nums text-exam-muted">{i + 1}.</span>
                {item}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1">
                {scale.map((label, v) => {
                  const on = answers[i] === v;
                  return (
                    <label
                      key={label}
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded border px-1 py-2 text-center text-[10px] font-medium leading-tight transition-colors ${
                        on
                          ? "border-brand-700 bg-brand-50 text-exam-text"
                          : "border-exam-line text-exam-muted hover:border-brand-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${i}`}
                        checked={on}
                        onChange={() => {
                          setWarn(false);
                          setAnswers((a) => ({ ...a, [i]: v }));
                        }}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold tabular-nums ${
                          on
                            ? "border-brand-700 bg-brand-900 text-white"
                            : "border-exam-line text-exam-muted"
                        }`}
                      >
                        {v + 1}
                      </span>
                      {label}
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        <div className={`mt-2.5 p-4 ${panel}`}>
          <label htmlFor="survey-open" className="text-[14px] font-bold text-exam-text">
            {config.openLabel}
            <span className="ml-1.5 rounded border border-exam-line px-1.5 py-0.5 text-[10px] font-medium text-exam-muted">
              선택
            </span>
          </label>
          <p className="mt-1.5 text-[12px] leading-relaxed text-exam-muted">{config.openHint}</p>
          <textarea
            id="survey-open"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={config.placeholder}
            className={`mt-2.5 text-[14px] leading-relaxed ${input}`}
          />
          <p className="mt-1.5 text-right text-[11px] tabular-nums text-exam-muted">
            {text.length}자
          </p>
        </div>

        {warn && (
          <p
            role="alert"
            className="mt-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800"
          >
            아직 응답하지 않은 문항이 있습니다. 모든 문항에 답해야 제출할 수 있습니다.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-exam-line bg-exam-panel px-5 py-3.5">
        <div className="flex gap-2">
          <button type="button" onClick={() => window.close()} className={`flex-1 ${btnGhost}`}>
            나중에 하기
          </button>
          <button
            type="button"
            onClick={submit}
            aria-disabled={!complete}
            className={`flex-1 ${complete ? btnPrimary : btnDisabled}`}
          >
            설문 제출
          </button>
        </div>
      </div>
    </div>
  );
}

function PopupHeader({ config, studentName }: { config: SurveyConfig; studentName?: string }) {
  return (
    <header className="border-b-2 border-exam-text/80 bg-exam-panel px-5 py-4">
      <p className={eyebrow}>{config.code} · 설문</p>
      <h1 className="mt-2 text-[18px] font-black tracking-tight text-exam-text">{config.title}</h1>
      <p className="mt-1.5 text-[12px] text-exam-muted">
        대상 학생 <b className="text-exam-text">{studentName ?? "-"}</b> · 응답자 {config.who}
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-exam-muted">{config.desc}</p>
    </header>
  );
}
