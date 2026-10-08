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
import { btnDisabled, btnGhost, btnPrimary } from "./ui";

/** 설문지 v1.0의 5점 척도. 눈금 글도 설문지에 적힌 그대로다. */
const scale = ["전혀 그렇지 않다", "그렇지 않은 편이다", "보통이다", "그런 편이다", "매우 그렇다"];

/* ───────────────────────── 이 화면만의 모양 ─────────────────────────

   설문지는 응시 화면이 아니다. 응시 존의 각진 시험지 말투(components/exam/ui.ts의
   --ui-r-box)를 그대로 쓰면 「채점받는 자리」로 읽히는데, 이 설문에는 정답이 없다.
   그래서 카드 · 모서리 · 눈금은 사람들이 이미 수백 번 채워 본 설문 양식의 모양을
   따른다 — 흰 카드를 세로로 쌓고, 고르는 자리는 동그라미와 네모로만 말한다.

   단추와 색은 ui.ts에서 그대로 가져온다. 모양만 이 화면 것이고 팔레트는 제품 것이다. */

/** 흰 카드 한 장 */
const card = "rounded-lg border border-soft-line bg-white px-5 py-5";

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
 * ── 눈금의 말은 위에 한 번만 적는다 ──
 *
 * 문항마다 다섯 칸에 「그렇지 않은 편이다」까지 적어 두었더니, 620px 창에서 칸마다
 * 두 줄로 접히고 서른 번 되풀이되어 정작 물음이 묻혔다. 설문지 원본도 눈금 설명을
 * 맨 앞에 표 하나로 두고, 문항 줄에는 네모 다섯 개만 그린다. 그 방식을 따른다 —
 * 위에 한 번 펴 두고, 문항에서는 양 끝 말과 숫자만 남긴다.
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
      <Page>
        {/* 다 낸 자리에서는 필수 안내를 걷는다 — 이제 답할 것이 없다 */}
        <PopupHeader doc={doc} studentName={student?.name} askingNow={false} />
        <div className={`mt-3 text-center ${card} py-10`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-6 text-[20px] font-bold text-soft-ink">설문이 제출되었습니다</h2>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-soft-muted">
            이 창을 닫으면 응시 현황 표의 제출 상태가 <b className="text-soft-ink">제출완료</b>로
            바뀝니다. 나중에 생각이 달라지면 현황 표에서 다시 열어 고칠 수 있습니다.
          </p>
          <div className="mx-auto mt-7 grid max-w-xs gap-2">
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
              className="text-[12px] text-soft-muted hover:underline"
            >
              처음부터 다시 답하기
            </button>
          </div>
        </div>
      </Page>
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

  /* 안 답한 첫 문항으로 보내 준다. 서른 줄에서 빠뜨린 한 줄을 눈으로 찾게 두면
     그 사람은 제출을 포기한다. */
  const jumpToFirstBlank = () => {
    const miss = config.items.find((it) => answers[it.id] === undefined);
    if (!miss) return;
    document.getElementById(`item-${miss.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-soft-line bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-3">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <span
              className="block h-full rounded-full bg-soft-primary transition-[width]"
              style={{
                width: `${config.items.length ? (answered / config.items.length) * 100 : 0}%`,
              }}
            />
          </span>
          <p className="shrink-0 text-[12px] font-semibold tabular-nums text-soft-muted">
            {answered} / {config.items.length}
          </p>
        </div>
      </div>

      <Page>
        <PopupHeader doc={doc} studentName={student?.name} />

        <ScaleLegend note={config.note} />

        <ScaleSection
          items={config.items}
          answers={answers}
          onPick={(id, v) => {
            setWarn(false);
            setAnswers((a) => ({ ...a, [id]: v }));
          }}
        />

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
            className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-[13px] leading-relaxed text-rose-700"
          >
            아직 답하지 않은 문항이 {config.items.length - answered}개 있습니다. 5점 척도 문항은
            모두 답해야 제출할 수 있습니다.
            <button
              type="button"
              onClick={jumpToFirstBlank}
              className="ml-1.5 font-bold underline underline-offset-2"
            >
              첫 빈 문항으로 가기
            </button>
          </div>
        )}
      </Page>

      <div className="sticky bottom-0 border-t border-soft-line bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-[640px] gap-2">
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
    </>
  );
}

/** 카드를 쌓는 한 줄 기둥. 창이 넓어져도 글줄이 늘어나지 않게 폭을 묶는다. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-8 pt-5">
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function PopupHeader({
  doc,
  studentName,
  askingNow = true,
}: {
  doc: SurveyDoc;
  studentName?: string;
  /** 지금 답을 받고 있는가 — 다 낸 화면에서는 필수 안내를 걷는다 */
  askingNow?: boolean;
}) {
  return (
    <header className="overflow-hidden rounded-lg border border-soft-line bg-white">
      {/* 맨 위 색 띠 — 설문 양식의 표지 구실을 한다 */}
      <div className="h-2.5 bg-soft-primary" />
      <div className="px-5 py-5">
        <h1 className="text-[22px] font-bold leading-snug tracking-tight text-soft-ink">
          {doc.live.title}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">{doc.live.desc}</p>
        <div className="mt-4 border-t border-soft-line pt-3 text-[12px] text-soft-muted">
          <p>
            대상 학생 <b className="text-soft-ink">{studentName ?? "-"}</b> · 응답자{" "}
            {doc.live.who}
          </p>
          {/* 판 번호를 여기 적어 둔다. 응답자에게는 쓸모없어 보여도, 문의가 들어왔을 때
              「어느 판을 보고 계셨는지」를 화면 사진 한 장으로 알 수 있다. */}
          <p className="mt-1 tabular-nums">설문 v{doc.liveVersion}</p>
          {askingNow && (
            <p className="mt-2 text-rose-600">
              <span aria-hidden>*</span> 표시는 반드시 답해야 하는 문항입니다
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * 눈금 설명과 고지 문구.
 *
 * 문항마다 되풀이하지 않고 여기 한 번만 편다. 다섯 칸을 가로로 늘어놓지 않고 줄로
 * 쌓는 것은 창이 620px이어서다 — 가로로 다섯이면 어느 폭에서든 한 칸은 두 줄이 된다.
 */
function ScaleLegend({ note }: { note: string }) {
  return (
    <section className={card}>
      <h2 className="text-[13px] font-bold text-soft-ink">응답 방법</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-soft-muted">
        각 문장을 읽고 평소에 가장 가까운 번호를 고르세요. 맞고 틀리는 답은 없습니다.
      </p>
      <ol className="mt-3 grid gap-1.5">
        {scale.map((label, v) => (
          <li key={label} className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-300 text-[11px] font-bold tabular-nums text-soft-muted">
              {v + 1}
            </span>
            <span className="text-[13px] text-soft-ink">{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-soft-line pt-3 text-[12px] leading-relaxed text-soft-muted">
        {note}
      </p>
    </section>
  );
}

/* ───────────────────────── 구역 ─────────────────────────
   설문지가 문항을 구역으로 묶어 두었고, 그 묶음이 곧 「무엇을 묻는 대목인가」다.
   서른 줄을 한 덩어리로 흘려 두면 어디까지 왔는지 알 수 없다. */

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

/** 구역 머리 — 왼쪽 세로 띠 하나로 카드 사이에서 갈라진다 */
function SectionHead({ title, hint }: { title: string; hint?: string }) {
  if (!title) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-soft-line bg-white">
      <div className="border-l-4 border-soft-primary px-4 py-3.5">
        <h2 className="text-[15px] font-bold text-soft-ink">{title}</h2>
        {hint && <p className="mt-1 text-[12px] leading-relaxed text-soft-muted">{hint}</p>}
      </div>
    </div>
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
        <div key={section || "-"} className="space-y-3">
          <SectionHead title={section} />
          {rows.map((item) => (
            <section key={item.id} id={`item-${item.id}`} className={card}>
              <p className="text-[15px] font-medium leading-relaxed text-soft-ink">
                {item.text}
                <span aria-hidden className="ml-1 text-rose-600">
                  *
                </span>
              </p>
              {/* 문항 번호와 재는 칸. 응답자가 고르는 데 쓰는 값은 아니지만, 문의가 들어왔을 때
                  「몇 번이 이상하다」로 말이 통한다. 눈에 띄지 않게 회색으로만 둔다. */}
              {(item.no || item.group) && (
                <p className="mt-1.5 text-[11px] tabular-nums text-slate-400">
                  {[item.no, item.group].filter(Boolean).join(" · ")}
                </p>
              )}

              {/* 양 끝 말을 눈금 위에 둔다. 왼쪽·오른쪽에 세우면 좁은 창에서 눈금이
                  찌그러지는데, 이 창은 620px이고 팝업이 막히면 더 좁아질 수도 있다. */}
              <div className="mt-4 flex justify-between px-1 text-[11px] text-soft-muted">
                <span>{scale[0]}</span>
                <span>{scale[scale.length - 1]}</span>
              </div>
              <div className="mt-1 grid grid-cols-5">
                {scale.map((label, v) => {
                  const on = answers[item.id] === v;
                  return (
                    <label
                      key={label}
                      title={label}
                      className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md py-2 transition-colors hover:bg-soft-primary-soft"
                    >
                      <span className="text-[12px] font-medium tabular-nums text-soft-muted">
                        {v + 1}
                      </span>
                      <input
                        type="radio"
                        name={`q-${item.id}`}
                        checked={on}
                        onChange={() => onPick(item.id, v)}
                        aria-label={`${v + 1} ${label}`}
                        className="sr-only"
                      />
                      <Radio on={on} />
                    </label>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ))}
    </>
  );
}

/** 고른 자리를 동그라미 하나로 말한다 */
function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 transition-colors ${
        on ? "border-soft-primary" : "border-slate-400"
      }`}
    >
      <span
        className={`h-[11px] w-[11px] rounded-full transition-colors ${
          on ? "bg-soft-primary" : "bg-transparent"
        }`}
      />
    </span>
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
        <div key={section || "-"} className="space-y-3">
          <SectionHead title={section} hint="해당되는 것을 모두 고르세요. 없으면 비워 두어도 됩니다." />
          {rows.map((c) => {
            const on = picks[c.id] ?? [];
            return (
              <section key={c.id} className={card}>
                <p className="text-[15px] font-medium leading-relaxed text-soft-ink">{c.label}</p>
                <div className="mt-3 grid gap-0.5">
                  {c.options.map((option) => {
                    const picked = on.includes(option);
                    return (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-soft-primary-soft"
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          onChange={() => onToggle(c.id, option)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[3px] border-2 transition-colors ${
                            picked ? "border-soft-primary bg-soft-primary" : "border-slate-400"
                          }`}
                        >
                          {picked && <CheckIcon className="h-3 w-3 text-white" />}
                        </span>
                        <span className="text-[14px] leading-relaxed text-soft-ink">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** 칸과 그림자 글이 **똑같이** 접혀야 높이가 맞는다. 둘이 나눠 쓰는 글자 규칙. */
const textShape = "px-0.5 py-2 text-[14px] leading-relaxed";

/**
 * 한 줄에서 시작해 적는 만큼 늘어나는 칸.
 *
 * 처음부터 두세 줄을 비워 두면 밑줄과 글 사이에 빈 띠가 생겨 「여기 뭘 더 적어야 하나」로
 * 읽힌다. 반대로 한 줄에 고정하면 긴 답이 칸 안에서 스크롤되어 쓴 글을 한눈에 못 본다.
 *
 * 높이를 재서 맞추지 않는다. scrollHeight로 맞춰 보았더니 첫 렌더에서 한 줄짜리 빈 칸이
 * 세 줄로 잡혔다 — 글꼴이 아직 안 실린 때의 값을 그대로 굳혀 버리기 때문이고, 그 뒤로는
 * 다시 재지 않으니 계속 틀린 채로 있었다.
 *
 * 그래서 같은 칸에 **보이지 않는 그림자 글**을 겹쳐 둔다. 높이는 그림자가 정하고 칸은
 * 거기 맞춰 늘어난다 — 재는 일이 없으니 글꼴이 늦게 실려도, 창 폭이 바뀌어도 어긋나지
 * 않는다. 끝의 공백 한 칸은 줄을 막 바꾼 순간에도 마지막 빈 줄이 남게 한다.
 */
function GrowingText({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-3 grid border-b border-slate-300 transition-colors focus-within:border-soft-primary">
      <div
        aria-hidden
        className={`invisible col-start-1 row-start-1 whitespace-pre-wrap break-words ${textShape}`}
      >
        {`${value} `}
      </div>
      <textarea
        id={id}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`col-start-1 row-start-1 w-full resize-none overflow-hidden border-0 bg-transparent text-soft-ink outline-none placeholder:text-slate-400 ${textShape}`}
      />
    </div>
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
        <div key={section || "-"} className="space-y-3">
          <SectionHead title={section} hint="점수에 반영되지 않습니다. 비워 두어도 제출됩니다." />
          {rows.map((o) => {
            const value = texts[o.id] ?? "";
            return (
              <section key={o.id} className={card}>
                <label
                  htmlFor={`open-${o.id}`}
                  className="block text-[15px] font-medium leading-relaxed text-soft-ink"
                >
                  {o.label}
                </label>
                {o.hint && (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-soft-muted">{o.hint}</p>
                )}
                <GrowingText
                  id={`open-${o.id}`}
                  value={value}
                  onChange={(v) => onWrite(o.id, v)}
                  placeholder={o.placeholder || "내 답변"}
                />
                {value.length > 0 && (
                  <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">
                    {value.length}자
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ))}
    </>
  );
}
