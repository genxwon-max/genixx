"use client";

import { useState } from "react";
import {
  reopenSurvey,
  setSurvey,
  useExamRecord,
  useHydrated,
  type SurveyKey,
} from "@/lib/examStore";
import {
  useSurveyDoc,
  type SurveyChoice,
  type SurveyDoc,
  type SurveyItem,
  type SurveyOpen,
} from "@/lib/surveyStore";
import { bandFromGrade } from "@/lib/surveyBands";
import { findById } from "@/lib/roster";
import { CheckIcon } from "@/components/Icons";
import { btnDisabled, btnGhost, btnPrimary, eyebrow, input, panel } from "./ui";

/** 설문지 v1.0의 5점 척도. 눈금 글도 설문지에 적힌 그대로다. */
const scale = ["전혀 그렇지 않다", "그렇지 않은 편이다", "보통이다", "그런 편이다", "매우 그렇다"];

/**
 * 고정 크기 팝업 창 안에서 도는 설문 폼.
 *
 * 문항을 코드에서 읽지 않고 설문 저장소에서 「지금 나가고 있는 판」을 받아 온다.
 * 관리자가 고치고 있는 초안은 여기 오지 않는다 — 발행한 것만 응답자에게 간다.
 * 제출할 때 판 번호를 함께 적어, 뒤에 문항이 바뀌어도 이 응답이 무엇에 대한
 * 답이었는지 남게 한다.
 *
 * ── 묻는 방식이 셋이다 ──
 *
 *   척도    5점으로 답한다. 역량 점수(S·P)가 되는 것은 이것뿐이라 **다 답해야** 낸다.
 *   고르기  해당되는 것을 모두 고른다.
 *   서술    글로 적는다.
 *
 * 뒤의 둘은 비워 두어도 제출된다. 설문지가 그 둘을 「점수화보다 근거와 상담 포인트를
 * 보완하기 위한 참고 정보」로 두었기 때문이다 — 참고 자료를 필수로 걸면, 쓸 말이 없는
 * 사람은 아무 말이나 채워 넣고 그 글이 면담 자리에 올라온다.
 *
 * ── 수정과 재응시 ──
 * 앞서 제출한 답이 있으면 그것을 띄운 채 연다(절차 8단계의 「설문 수정」). 답은 문항의
 * 차례가 아니라 **문항 열쇠**(SurveyItem.id)로 담아 둔다 — 관리자가 문항 하나를 지우거나
 * 차례를 바꿔도 남은 답이 엉뚱한 문항에 붙지 않는다.
 */
export default function SurveyForm({
  surveyKey,
  studentId,
}: {
  surveyKey: SurveyKey;
  studentId: string;
}) {
  const hydrated = useHydrated();
  const record = useExamRecord(studentId);
  const student = hydrated ? findById(studentId) : null;
  /* 학년대마다 설문이 한 벌씩이라, 이 아이의 학년으로 어느 벌인지 고른다.
     명부를 아직 못 읽은 첫 렌더에는 가장 어린 칸이 잡히고, 읽고 나면 제 벌로
     바뀐다 — 그 사이에 답을 고를 수는 없으므로(하이드레이션 전) 안전하다. */
  const doc = useSurveyDoc(surveyKey, bandFromGrade(student?.grade));
  const config = doc.live;
  /* 앞서 낸 답 — 다시 열었을 때 이것이 첫 값이 된다. 모두 열쇠로 담는다 */
  const saved = record.surveyAnswers[surveyKey];
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...saved?.items }));
  const [picks, setPicks] = useState<Record<string, string[]>>(() => ({ ...saved?.choices }));
  const [texts, setTexts] = useState<Record<string, string>>(() => ({ ...saved?.texts }));
  const [warn, setWarn] = useState(false);

  const done = record.surveys[surveyKey] === "done";
  /* 지금 판에 있는 문항만 센다 — 지워진 문항의 옛 답이 남아 있어도 「다 답했다」가 되지 않는다 */
  const answered = config.items.filter((it) => answers[it.id] !== undefined).length;
  const complete = answered === config.items.length;

  if (hydrated && done) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PopupHeader doc={doc} studentName={student?.name} />
        <div className="flex flex-1 items-center px-5 py-10">
          <div className={`mx-auto w-full max-w-md p-8 text-center ${panel}`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[2px] border border-emerald-300 bg-emerald-50 text-emerald-600">
              <CheckIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-6 text-[20px] font-black text-exam-text">설문이 제출되었습니다</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
              이 창을 닫으면 응시 현황 표의 제출 상태가 <b>제출완료</b>로 바뀝니다. 나중에 생각이
              달라지면 현황 표에서 다시 열어 고칠 수 있습니다.
            </p>
            <div className="mt-7 grid gap-2">
              <button type="button" onClick={() => window.close()} className={btnPrimary}>
                창 닫기
              </button>
              {/* 고칠 길과 처음부터 다시 할 길을 갈라 둔다 — 고치려던 사람이 답을 다 잃으면
                  그 사람은 두 번 다시 고치지 않는다 */}
              <button
                type="button"
                onClick={() => reopenSurvey(studentId, surveyKey, true)}
                className={btnGhost}
              >
                답을 그대로 두고 수정하기
              </button>
              <button
                type="button"
                onClick={() => {
                  reopenSurvey(studentId, surveyKey, false);
                  setAnswers({});
                  setPicks({});
                  setTexts({});
                }}
                className="text-[12px] text-exam-muted hover:underline"
              >
                처음부터 다시 답하기
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
    setSurvey(studentId, surveyKey, "done", doc.liveVersion, {
      items: answers,
      choices: picks,
      texts,
    });
  };

  /* 안 답한 첫 문항으로 보내 준다. 스물여덟 줄에서 빠뜨린 한 줄을 눈으로 찾게 두면
     그 사람은 제출을 포기한다. */
  const jumpToFirstBlank = () => {
    const miss = config.items.find((it) => answers[it.id] === undefined);
    if (!miss) return;
    const el = document.getElementById(`item-${miss.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PopupHeader doc={doc} studentName={student?.name} />

      <div className="sticky top-0 z-10 border-b border-exam-line bg-exam-panel px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold tabular-nums text-exam-text">
            {answered} / {config.items.length} 문항 응답
          </p>
          <span className="h-1 w-28 overflow-hidden bg-exam-raised">
            <span
              className="block h-full bg-brand-600 transition-[width]"
              style={{
                width: `${config.items.length ? (answered / config.items.length) * 100 : 0}%`,
              }}
            />
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 py-5">
        <p className="rounded border border-exam-line bg-exam-raised px-4 py-3.5 text-[12px] leading-relaxed text-exam-muted">
          {config.note}
        </p>

        <ScaleSection items={config.items} answers={answers} onPick={(id, v) => {
          setWarn(false);
          setAnswers((a) => ({ ...a, [id]: v }));
        }} />

        <ChoiceSection
          choices={config.choices}
          picks={picks}
          onToggle={(id, option) =>
            setPicks((p) => {
              const had = p[id] ?? [];
              return {
                ...p,
                [id]: had.includes(option) ? had.filter((o) => o !== option) : [...had, option],
              };
            })
          }
        />

        <OpenSection
          opens={config.opens}
          texts={texts}
          onWrite={(id, v) => setTexts((t) => ({ ...t, [id]: v }))}
        />

        {warn && (
          <div
            role="alert"
            className="mt-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800"
          >
            아직 답하지 않은 문항이 {config.items.length - answered}개 있습니다. 5점 척도 문항은 모두
            답해야 제출할 수 있습니다.
            <button type="button" onClick={jumpToFirstBlank} className="ml-2 font-bold underline">
              첫 빈 문항으로 가기
            </button>
          </div>
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
            {saved ? "수정 제출" : "설문 제출"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 구역 ─────────────────────────
   설문지가 문항을 구역으로 묶어 두었고, 그 묶음이 곧 「무엇을 묻는 대목인가」다.
   스물여덟 줄을 한 덩어리로 흘려 두면 어디까지 왔는지 알 수 없다. */

/** 이어지는 같은 구역끼리 묶는다. 차례를 흩지 않으려고 정렬하지 않는다. */
function groupBySection<T extends { section: string }>(list: T[]): [string, T[]][] {
  const out: [string, T[]][] = [];
  for (const v of list) {
    const last = out[out.length - 1];
    if (last && last[0] === v.section) last[1].push(v);
    else out.push([v.section, [v]]);
  }
  return out;
}

function SectionHead({ title }: { title: string }) {
  if (!title) return null;
  return (
    <h2 className="mt-5 border-b border-exam-line pb-1.5 text-[13px] font-black text-exam-text">
      {title}
    </h2>
  );
}

function ScaleSection({
  items,
  answers,
  onPick,
}: {
  items: SurveyItem[];
  answers: Record<string, number>;
  onPick: (id: string, v: number) => void;
}) {
  return (
    <>
      {groupBySection(items).map(([section, rows]) => (
        <section key={section || "-"}>
          <SectionHead title={section} />
          <ol className="mt-2.5 space-y-2.5">
            {rows.map((item) => (
              <li key={item.id} id={`item-${item.id}`} className={`p-4 ${panel}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold tabular-nums text-exam-muted">
                    {item.no}
                  </span>
                  {item.group && (
                    <span className="rounded border border-exam-line px-1.5 py-0.5 text-[10px] font-medium text-exam-muted">
                      {item.group}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-exam-text">
                  {item.text}
                </p>
                <div className="mt-3 grid grid-cols-5 gap-1">
                  {scale.map((label, v) => {
                    const on = answers[item.id] === v;
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
                          name={`q-${item.id}`}
                          checked={on}
                          onChange={() => onPick(item.id, v)}
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
        </section>
      ))}
    </>
  );
}

function ChoiceSection({
  choices,
  picks,
  onToggle,
}: {
  choices: SurveyChoice[];
  picks: Record<string, string[]>;
  onToggle: (id: string, option: string) => void;
}) {
  if (choices.length === 0) return null;
  return (
    <>
      {groupBySection(choices).map(([section, rows]) => (
        <section key={section || "-"}>
          <SectionHead title={section} />
          <p className="mt-1.5 text-[12px] text-exam-muted">
            해당되는 것을 모두 고르세요. 없으면 비워 두어도 됩니다.
          </p>
          <div className="mt-2.5 space-y-2.5">
            {rows.map((c) => {
              const on = picks[c.id] ?? [];
              return (
                <div key={c.id} className={`p-4 ${panel}`}>
                  <p className="text-[14px] font-medium leading-relaxed text-exam-text">{c.label}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {c.options.map((option) => {
                      const picked = on.includes(option);
                      return (
                        <label
                          key={option}
                          className={`cursor-pointer rounded border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                            picked
                              ? "border-brand-700 bg-brand-50 text-exam-text"
                              : "border-exam-line text-exam-muted hover:border-brand-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={picked}
                            onChange={() => onToggle(c.id, option)}
                            className="sr-only"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function OpenSection({
  opens,
  texts,
  onWrite,
}: {
  opens: SurveyOpen[];
  texts: Record<string, string>;
  onWrite: (id: string, v: string) => void;
}) {
  if (opens.length === 0) return null;
  return (
    <>
      {groupBySection(opens).map(([section, rows]) => (
        <section key={section || "-"}>
          <SectionHead title={section} />
          <div className="mt-2.5 space-y-2.5">
            {rows.map((o) => {
              const value = texts[o.id] ?? "";
              return (
                <div key={o.id} className={`p-4 ${panel}`}>
                  <label
                    htmlFor={`open-${o.id}`}
                    className="text-[14px] font-bold leading-relaxed text-exam-text"
                  >
                    {o.label}
                    <span className="ml-1.5 rounded border border-exam-line px-1.5 py-0.5 text-[10px] font-medium text-exam-muted">
                      선택
                    </span>
                  </label>
                  {o.hint && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-exam-muted">{o.hint}</p>
                  )}
                  <textarea
                    id={`open-${o.id}`}
                    rows={3}
                    value={value}
                    onChange={(e) => onWrite(o.id, e.target.value)}
                    placeholder={o.placeholder}
                    className={`mt-2.5 text-[14px] leading-relaxed ${input}`}
                  />
                  {value.length > 0 && (
                    <p className="mt-1.5 text-right text-[11px] tabular-nums text-exam-muted">
                      {value.length}자
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function PopupHeader({ doc, studentName }: { doc: SurveyDoc; studentName?: string }) {
  return (
    <header className="border-b-2 border-exam-text/80 bg-exam-panel px-5 py-4">
      {/* 판 번호를 여기 적어 둔다. 응답자에게는 쓸모없어 보여도, 문의가 들어왔을 때
          「어느 판을 보고 계셨는지」를 화면 사진 한 장으로 알 수 있다. */}
      <p className={eyebrow}>
        {doc.code} · 설문 <span className="font-medium">v{doc.liveVersion}</span>
      </p>
      <h1 className="mt-2 text-[18px] font-black tracking-tight text-exam-text">{doc.live.title}</h1>
      <p className="mt-1.5 text-[12px] text-exam-muted">
        대상 학생 <b className="text-exam-text">{studentName ?? "-"}</b> · 응답자 {doc.live.who}
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-exam-muted">{doc.live.desc}</p>
    </header>
  );
}
