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
  blocksOf,
  isSurveyLink,
  modeOf,
  useSurveyDoc,
  type SurveyChoice,
  type SurveyForm as SurveyFormValue,
  type SurveyItem,
  type SurveyOpen,
  type SurveySection,
} from "@/lib/surveyStore";
import { bandFromGrade } from "@/lib/surveyBands";
import { findById, formatCode } from "@/lib/roster";
import { CheckIcon } from "@/components/Icons";
import { btnDisabled, btnGhost, btnPrimary } from "./ui";

/** 설문지 v1.0의 5점 척도. 눈금 글도 설문지에 적힌 그대로다. */
export const surveyScale = ["전혀 그렇지 않다", "그렇지 않은 편이다", "보통이다", "그런 편이다", "매우 그렇다"];

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
  const done = record.surveys[surveyKey] === "done";

  if (hydrated && done) {
    return (
      <Page>
        {/* 다 낸 자리에서는 필수 안내를 걷는다 — 이제 답할 것이 없다 */}
        <PopupHeader
          form={config}
          version={doc.liveVersion}
          studentName={student?.name}
          askingNow={false}
        />
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
              onClick={() => reopenSurvey(studentId, surveyKey, false)}
              className="text-[12px] text-soft-muted hover:underline"
            >
              처음부터 다시 답하기
            </button>
          </div>
        </div>
      </Page>
    );
  }

  /* 바깥 설문(구글 설문 등)으로 받는 판 — 문항 대신 여는 단추와 「제출했어요」를 둔다 */
  if (modeOf(config) === "link") {
    return (
      <LinkSurvey
        form={config}
        version={doc.liveVersion}
        studentName={student?.name}
        studentCode={student ? formatCode(student.code) : null}
        onDone={() => setSurvey(studentId, surveyKey, "done", doc.liveVersion, { items: {} })}
      />
    );
  }

  return (
    <FormScreen
      /* 앞서 낸 답은 저장소를 읽은 뒤에야 보인다 — 읽고 나면 그 답으로 다시 연다 */
      key={hydrated ? "ready" : "first"}
      form={config}
      version={doc.liveVersion}
      studentName={student?.name}
      saved={saved}
      onSubmit={(answers) =>
        setSurvey(studentId, surveyKey, "done", doc.liveVersion, answers)
      }
    />
  );
}

/**
 * 관리자 화면의 설문 미리보기 (ADM-14, 2026-10-28).
 *
 * 응답자 창과 **같은 조각**으로 그린다 — 미리보기를 따로 그리면 둘이 조금씩 어긋나고, 어긋난 미리보기는
 * 없느니만 못하다. 눌러 보고 적어 볼 수 있지만 아무것도 저장하지 않는다. 「설문 제출」은 빈 척도 문항을
 * 짚는 것까지 실제와 같고, 다 채우면 저장하지 않았다고만 알린다.
 */
export function SurveyPreview({
  form,
  version,
  studentName,
}: {
  form: SurveyFormValue;
  version: number;
  studentName?: string;
}) {
  if (modeOf(form) === "link") {
    return (
      <LinkSurvey form={form} version={version} studentName={studentName} studentCode="000-000" onDone={() => {}} preview />
    );
  }
  return <FormScreen form={form} version={version} studentName={studentName} preview />;
}

type Answers = {
  items: Record<string, number>;
  choices?: Record<string, string[]>;
  texts?: Record<string, string>;
};

/**
 * 문항을 받는 화면 — 응답자 창과 관리자 미리보기가 함께 쓴다.
 *
 * 구역 차례(lib/surveyStore.ts blocksOf)대로 구역 머리와 문항 카드를 쌓는다. 구역 하나는 한 가지 방식으로
 * 묻고, 문항이 없는 구역은 그리지 않는다.
 */
function FormScreen({
  form,
  version,
  studentName,
  saved,
  onSubmit,
  preview = false,
}: {
  form: SurveyFormValue;
  version: number;
  studentName?: string;
  saved?: Answers;
  onSubmit?: (answers: Required<Answers>) => void;
  /** 관리자 미리보기 — 창을 닫거나 저장하지 않는다 */
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...saved?.items }));
  const [picks, setPicks] = useState<Record<string, string[]>>(() => ({ ...saved?.choices }));
  const [texts, setTexts] = useState<Record<string, string>>(() => ({ ...saved?.texts }));
  const [warn, setWarn] = useState(false);
  const [tried, setTried] = useState(false);

  const blocks = blocksOf(form).filter((b) => b.rows.length > 0);
  /* 화면에 서는 차례대로의 척도 문항 — 지운 문항의 옛 답이 남아 있어도 「다 답했다」가 되지 않는다 */
  const scaleRows = blocks.flatMap((b) => (b.kind === "scale" ? b.rows : []));
  const answered = scaleRows.filter((it) => answers[it.id] !== undefined).length;
  const complete = answered === scaleRows.length;

  const submit = () => {
    if (!complete) {
      setWarn(true);
      return;
    }
    if (preview) {
      setTried(true);
      return;
    }
    onSubmit?.({ items: answers, choices: picks, texts });
  };

  /* 안 답한 첫 문항으로 보내 준다. 서른 줄에서 빠뜨린 한 줄을 눈으로 찾게 두면
     그 사람은 제출을 포기한다. */
  const jumpToFirstBlank = () => {
    const miss = scaleRows.find((it) => answers[it.id] === undefined);
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
                width: `${scaleRows.length ? (answered / scaleRows.length) * 100 : 0}%`,
              }}
            />
          </span>
          <p className="shrink-0 text-[12px] font-semibold tabular-nums text-soft-muted">
            {answered} / {scaleRows.length}
          </p>
        </div>
      </div>

      <Page>
        <PopupHeader form={form} version={version} studentName={studentName} />

        {scaleRows.length > 0 && <ScaleLegend note={form.note} />}

        {blocks.map((b) => (
          <div key={b.section.id} className="space-y-3">
            <SectionHead title={b.section.title} hint={b.section.hint} />
            {b.kind === "scale" &&
              b.rows.map((item) => (
                <ScaleCard
                  key={item.id}
                  item={item}
                  value={answers[item.id]}
                  onPick={(v) => {
                    setWarn(false);
                    setTried(false);
                    setAnswers((a) => ({ ...a, [item.id]: v }));
                  }}
                />
              ))}
            {b.kind === "choice" &&
              b.rows.map((c) => (
                <ChoiceCard
                  key={c.id}
                  choice={c}
                  picked={picks[c.id] ?? []}
                  onToggle={(option) =>
                    setPicks((p) => {
                      const had = p[c.id] ?? [];
                      return {
                        ...p,
                        [c.id]: had.includes(option)
                          ? had.filter((o) => o !== option)
                          : [...had, option],
                      };
                    })
                  }
                />
              ))}
            {b.kind === "open" &&
              b.rows.map((o) => (
                <OpenCard
                  key={o.id}
                  open={o}
                  value={texts[o.id] ?? ""}
                  onWrite={(v) => setTexts((t) => ({ ...t, [o.id]: v }))}
                />
              ))}
          </div>
        ))}

        {blocks.length === 0 && (
          <p className={`${card} text-center text-[13px] text-soft-muted`}>
            아직 문항이 없습니다.
          </p>
        )}

        {warn && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-[13px] leading-relaxed text-rose-700"
          >
            아직 답하지 않은 문항이 {scaleRows.length - answered}개 있습니다. 5점 척도 문항은
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
        {tried && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-soft-line bg-white px-5 py-4 text-[13px] leading-relaxed text-soft-muted"
          >
            미리보기라 제출하지 않았습니다. 응답자 창에서는 여기서 제출이 끝납니다.
          </p>
        )}
      </Page>

      <div className="sticky bottom-0 border-t border-soft-line bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-[640px] gap-2">
          <button
            type="button"
            onClick={() => !preview && window.close()}
            className={`flex-1 ${btnGhost}`}
          >
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

/**
 * 바깥 설문으로 받는 판 (2026-10-28).
 *
 * 관리자가 설문 관리(ADM-14)에서 응답 방식을 「외부 설문 링크」로 두면, 문항 대신 그 설문을 새 창으로 여는
 * 단추가 선다. 답은 바깥 서비스에 쌓여 이 창은 냈는지 알 수 없다 — 그래서 다 낸 뒤 「제출했어요」를 눌러
 * 달라고 하고, 그것을 제출로 적는다. 바깥 설문 쪽에서 누구의 답인지 가려야 하므로 학생 이름과 접속코드를
 * 함께 보여 준다.
 */
export function LinkSurvey({
  form,
  version,
  studentName,
  studentCode,
  onDone,
  preview = false,
}: {
  form: SurveyFormValue;
  version: number;
  studentName?: string;
  studentCode: string | null;
  onDone: () => void;
  /** 관리자 미리보기 — 창을 닫지 않는다 */
  preview?: boolean;
}) {
  const link = form.link ?? "";
  const ready = isSurveyLink(link);
  const [opened, setOpened] = useState(false);
  return (
    <Page>
      <PopupHeader form={form} version={version} studentName={studentName} askingNow={false} />
      <div className={card}>
        <h2 className="text-[17px] font-bold text-soft-ink">이 설문은 구글 설문 같은 바깥 설문으로 받습니다</h2>
        <ol className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-soft-muted">
          <li>1. 「설문 열기」를 누르면 새 창에서 설문이 열립니다.</li>
          <li>
            2. 설문에서 학생 이름{studentName ? <b className="text-soft-ink"> {studentName}</b> : null}
            {studentCode ? (
              <>
                과 접속코드 <b className="tabular-nums text-soft-ink">{studentCode}</b>
              </>
            ) : null}
            를 물으면 그대로 적어 주세요.
          </li>
          <li>3. 설문을 다 낸 뒤 이 창으로 돌아와 「제출했어요」를 눌러 주세요.</li>
        </ol>
        {ready ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
            className={`mt-5 w-full ${btnPrimary}`}
          >
            설문 열기
          </a>
        ) : (
          <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            설문 주소가 아직 준비되지 않았습니다. 잠시 뒤 다시 열어 주세요.
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => !preview && window.close()} className={btnGhost}>
          나중에 하기
        </button>
        <button
          type="button"
          onClick={() => ready && onDone()}
          aria-disabled={!ready}
          className={ready ? (opened ? btnPrimary : btnGhost) : btnDisabled}
        >
          제출했어요
        </button>
      </div>
    </Page>
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
  form,
  version,
  studentName,
  askingNow = true,
}: {
  form: SurveyFormValue;
  version: number;
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
          {form.title}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-soft-muted">{form.desc}</p>
        <div className="mt-4 border-t border-soft-line pt-3 text-[12px] text-soft-muted">
          <p>
            대상 학생 <b className="text-soft-ink">{studentName ?? "-"}</b> · 응답자{" "}
            {form.who}
          </p>
          {/* 판 번호를 여기 적어 둔다. 응답자에게는 쓸모없어 보여도, 문의가 들어왔을 때
              「어느 판을 보고 계셨는지」를 화면 사진 한 장으로 알 수 있다. */}
          <p className="mt-1 tabular-nums">설문 v{version}</p>
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
        {surveyScale.map((label, v) => (
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

/** 구역 머리 — 왼쪽 세로 띠 하나로 카드 사이에서 갈라진다 */
function SectionHead({ title, hint }: Pick<SurveySection, "title" | "hint">) {
  if (!title && !hint) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-soft-line bg-white">
      <div className="border-l-4 border-soft-primary px-4 py-3.5">
        {title && <h2 className="text-[15px] font-bold text-soft-ink">{title}</h2>}
        {hint && <p className="mt-1 text-[12px] leading-relaxed text-soft-muted">{hint}</p>}
      </div>
    </div>
  );
}

function ScaleCard({
  item,
  value,
  onPick,
}: {
  item: SurveyItem;
  value: number | undefined;
  onPick: (v: number) => void;
}) {
  return (
    <section id={`item-${item.id}`} className={card}>
      <p className="text-[15px] font-medium leading-relaxed text-soft-ink">
        {item.text}
        <span aria-hidden className="ml-1 text-rose-600">
          *
        </span>
      </p>
      {/* 문항 번호와 측정 역량(「P07 · C04 비판적 사고」)은 응답자에게 보이지 않는다(2026-10-28 사용자
          지시) — 무엇을 재는지 알려 주면 답이 그쪽으로 기운다. 관리 화면에만 둔다. */}

      {/* 양 끝 말을 눈금 위에 둔다. 왼쪽·오른쪽에 세우면 좁은 창에서 눈금이
          찌그러지는데, 이 창은 620px이고 팝업이 막히면 더 좁아질 수도 있다. */}
      <div className="mt-4 flex justify-between px-1 text-[11px] text-soft-muted">
        <span>{surveyScale[0]}</span>
        <span>{surveyScale[surveyScale.length - 1]}</span>
      </div>
      <div className="mt-1 grid grid-cols-5">
        {surveyScale.map((label, v) => {
          const on = value === v;
          return (
            <label
              key={label}
              title={label}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md py-2 transition-colors hover:bg-soft-primary-soft"
            >
              <span className="text-[12px] font-medium tabular-nums text-soft-muted">{v + 1}</span>
              <input
                type="radio"
                name={`q-${item.id}`}
                checked={on}
                onChange={() => onPick(v)}
                aria-label={`${v + 1} ${label}`}
                className="sr-only"
              />
              <Radio on={on} />
            </label>
          );
        })}
      </div>
    </section>
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

function ChoiceCard({
  choice: c,
  picked,
  onToggle,
}: {
  choice: SurveyChoice;
  picked: string[];
  onToggle: (option: string) => void;
}) {
  /* 빈 보기는 그리지 않는다 — 관리자가 「+ 보기 추가」만 눌러 둔 자리다 */
  const options = c.options.filter((o) => o.trim());
  return (
    <section className={card}>
      <p className="text-[15px] font-medium leading-relaxed text-soft-ink">{c.label}</p>
      <div className="mt-3 grid gap-0.5">
        {options.map((option) => {
          const on = picked.includes(option);
          return (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-soft-primary-soft"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(option)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[3px] border-2 transition-colors ${
                  on ? "border-soft-primary bg-soft-primary" : "border-slate-400"
                }`}
              >
                {on && <CheckIcon className="h-3 w-3 text-white" />}
              </span>
              <span className="text-[14px] leading-relaxed text-soft-ink">{option}</span>
            </label>
          );
        })}
      </div>
    </section>
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

function OpenCard({
  open: o,
  value,
  onWrite,
}: {
  open: SurveyOpen;
  value: string;
  onWrite: (v: string) => void;
}) {
  return (
    <section className={card}>
      <label
        htmlFor={`open-${o.id}`}
        className="block text-[15px] font-medium leading-relaxed text-soft-ink"
      >
        {o.label}
      </label>
      {o.hint && <p className="mt-1.5 text-[12px] leading-relaxed text-soft-muted">{o.hint}</p>}
      <GrowingText
        id={`open-${o.id}`}
        value={value}
        onChange={onWrite}
        placeholder={o.placeholder || "내 답변"}
      />
      {value.length > 0 && (
        <p className="mt-1 text-right text-[11px] tabular-nums text-slate-400">{value.length}자</p>
      )}
    </section>
  );
}
