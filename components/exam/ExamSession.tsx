"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  levelOf,
  pageIndexOf,
  pagesOf,
  QUESTIONS_PER_SUBJECT,
  questionsByLevel,
  questionsOf,
  subjectOf,
  type Brief,
  type Question,
  type SubjectId,
} from "@/lib/exam";
import {
  finishReflection,
  forfeitSubject,
  restartSubject,
  reflectionReasons,
  setAnswer,
  setReflection,
  setReflectionPick,
  startSubject,
  submitSubject,
  useExamRecord,
  useHydrated,
} from "@/lib/examStore";
import { useSession } from "@/lib/authStore";
import { useExamConfig } from "@/lib/roundStore";
import { enterFullscreen, leaveFullscreen } from "@/lib/fullscreen";
import { ArrowRight, CheckIcon } from "@/components/Icons";
import { btnDanger, btnDisabled, btnGhost, btnPrimary, eyebrow, panel } from "./ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 응답으로 인정되는지 — 객관식은 선택, 서술형은 최소 글자 수 */
export function isAnswered(q: Question, value: number | string | undefined) {
  if (value === undefined) return false;
  if (q.type === "choice") return typeof value === "number";
  return typeof value === "string" && value.trim().length >= (q.minLength ?? 1);
}

export default function ExamSession({ subject }: { subject: SubjectId }) {
  const hydrated = useHydrated();
  const session = useSession();
  const studentId = session?.studentId ?? "demo";
  const record = useExamRecord(studentId);
  const config = useExamConfig();
  const [index, setIndex] = useState(0);
  /**
   * 이동판에서 방금 고른 문항.
   *
   * 쪽 단위로 넘기게 되면서 「몇 쪽인가」만으로는 이동판이 하는 일을 못 하게 되었다.
   * 세트 한 쪽에 다섯 문항이 서면 그 다섯이 모두 같은 쪽이라, 7번을 눌러도 쪽 번호가
   * 안 바뀌어 화면이 꿈쩍도 하지 않는다. 고른 문항을 따로 들고 그 자리로 데려간다.
   */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [askForfeit, setAskForfeit] = useState(false);
  const [askSubmit, setAskSubmit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** 안내 화면을 지나 실제 응시를 시작했는지 */
  const [entered, setEntered] = useState(false);

  const meta = subjectOf(subject)!;
  const list = questionsOf(subject);
  const rec = record.subjects[subject];
  const running = rec.status === "ready" || rec.status === "in-progress";

  /**
   * 제한 시간은 **시작할 때의 값**을 쓴다.
   *
   * 회차 설정(ADM-05)에서 관리자가 도중에 시간을 줄여도 지금 풀고 있는 아이의 시계는
   * 줄지 않는다. 아직 시작하지 않았으면 지금 설정을 그대로 보여 준다.
   */
  const limitMin = rec.limitMin ?? config.limits[subject];

  useEffect(() => {
    if (!running || !entered) return;
    const tick = () => {
      const started = rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now();
      setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [running, entered, rec.startedAt]);

  /**
   * 시간이 다 되면 자동 제출.
   *
   * 마무리 시간을 함께 두는 까닭은 서술형 때문이다. 문장 한가운데서 잘린 답은
   * 채점자가 무슨 말인지 읽을 수 없고, 그러면 그 아이는 쓸 줄 몰라서가 아니라
   * 시계 때문에 낮은 값을 받는다.
   */
  useEffect(() => {
    if (!running || !entered || !config.autoSubmit) return;
    if (elapsed < (limitMin + config.graceMin) * 60) return;
    submitSubject(studentId, subject);
  }, [running, entered, elapsed, limitMin, config.autoSubmit, config.graceMin, studentId, subject]);

  if (!hydrated) {
    return (
      <div className="container-x py-20 text-center text-[13px] text-exam-muted">
        응시 정보를 불러오는 중입니다…
      </div>
    );
  }

  // 제출 후 → 문항별 해석 작성 → 완료
  if (rec.status === "submitted") {
    return rec.reflectionAt ? (
      <Submitted subject={subject} />
    ) : (
      <ReflectionStep subject={subject} studentId={studentId} />
    );
  }
  if (rec.status === "forfeited")
    return <Forfeited subject={subject} studentId={studentId} attemptsLeft={rec.attemptsLeft} />;

  /* 이번 회차에서 뺀 과목 — 주소를 직접 쳐서 들어오는 길도 막는다. 다만 이미 시작한
     아이는 그대로 마치게 둔다. 중간에 문이 닫히면 그 아이의 답은 갈 곳이 없다. */
  if (!config.enabled[subject] && !rec.startedAt) {
    return (
      <div className="container-x flex min-h-[calc(100dvh-4rem)] items-center py-10">
        <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
          <p className={eyebrow}>응시 안내</p>
          <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
            {meta.name}은 이번 회차에 보지 않습니다
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
            이번 회차의 응시 과목에서 빠져 있습니다. 지금까지 본 과목의 기록은 그대로 남아 있습니다.
          </p>
          <Link href="/exam" className={`mt-8 ${btnPrimary}`}>
            응시 현황으로 돌아가기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 응시 전 안내 화면 (전체화면 진입 지점)
  if (!entered) {
    return (
      <StartGate
        subject={subject}
        onStart={async () => {
          await enterFullscreen();
          startSubject(studentId, subject);
          setEntered(true);
        }}
      />
    );
  }

  /* 넘기는 단위는 **쪽**이다 — 세트 하나(자료 + 문항 여럿)이거나 낱개 문항 하나.
     세는 단위는 그대로 문항이다. 아이가 넘기는 것과 우리가 세는 것은 다른 층이다 */
  const pages = pagesOf(subject);
  const page = pages[Math.min(index, pages.length - 1)];
  const doneCount = list.filter((q) => isAnswered(q, rec.answers[q.id])).length;
  const remain = Math.max(0, limitMin * 60 - elapsed);
  const isLast = index === pages.length - 1;
  const unanswered = list.length - doneCount;
  const isSet = page.items.length > 1;
  /* 이동판이 짚는 문항 — 고른 것이 이 쪽에 없으면(다음 단추로 넘어온 참) 첫 문항 */
  const hereId = page.items.some((q) => q.id === focusId) ? focusId! : page.items[0].id;
  /* 세트는 층이 여럿일 수 있다(자료 하나로 S1과 S3를 묻는 것이 세트를 두는 까닭이다).
     머리에는 그 쪽이 걸친 층을 한 줄로 적는다 */
  const levelsHere = [...new Set(page.items.map((q) => q.level))];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* 문항 머리 — 과목과 지금 문항의 위계를 적는다. 점(●)은 두지 않는다:
          과목은 이름으로 충분하고, 시험지에 색점이 박혀 있을 이유가 없다. */}
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{meta.name}</p>
            <span className="hidden text-[12px] text-exam-muted sm:block">
              총 {QUESTIONS_PER_SUBJECT}문항 · 제한 {limitMin}분
              {isSet && ` · 이 쪽은 한 자료로 ${page.items.length}문항`}
            </span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {levelsHere.map((l) => `${l} ${levelOf(l).name}`).join(" · ")} · {index + 1} /{" "}
            {pages.length}쪽
          </p>
        </div>
      </div>

      {/* 본문 — 좌: 자료 / 가운데: 문제(세트면 여럿) / 우: 문항 이동판 */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_15.5rem] lg:overflow-hidden">
        <BriefPanel brief={page.brief} />

        {/* 가운데 — 세트면 이 쪽의 문항이 차례로 선다. 낱개면 하나뿐이다.
            한 문항씩 넘기지 않는 까닭은 자료 때문이다: 2번을 풀다가 자료를 다시 보려고
            앞 쪽으로 돌아가야 한다면 「두 번 읽히지 않는다」가 지켜지지 않는다 */}
        <div className="order-3 divide-y divide-exam-line lg:order-2 lg:overflow-y-auto">
          {page.items.map((q) => (
            <QuestionBody
              key={q.id}
              q={q}
              subject={subject}
              studentId={studentId}
              value={rec.answers[q.id]}
              focus={q.id === focusId}
            />
          ))}
        </div>

        <QuestionPad
          subject={subject}
          /* 세트면 그 쪽의 문항이 모두 「지금 보이는 것」이다. 그중 어디를 짚고 있는지는
             isCurrent가 따로 말한다 — 다섯을 한꺼번에 「지금 여기」라고 하면 낭독기가
             현재 단계 다섯 개를 읽는다 */
          isHere={(q) => q.setId === page.id}
          isCurrent={(q) => q.id === hereId}
          isDone={(q) => isAnswered(q, rec.answers[q.id])}
          onPick={(q) => {
            setIndex(pageIndexOf(subject, q));
            setFocusId(q.id);
          }}
          doneLabel="답한 문항"
          doneVerb="응답함"
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAskForfeit(true)} className={btnDanger}>
              포기하기
            </button>
            <p className="hidden text-[12px] leading-tight text-exam-muted sm:block">
              포기하면 <b className="text-rose-600">이 과목의 응시 기회가 사라집니다.</b>
              <br />
              지금까지 쓴 답안도 저장되지 않습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              응답 {doneCount}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>

            {isLast ? (
              <button type="button" onClick={() => setAskSubmit(true)} className={btnPrimary}>
                제출하기
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {askForfeit && (
        <ForfeitDialog
          subjectName={meta.name}
          remain={`${pad(Math.floor(remain / 60))}:${pad(remain % 60)}`}
          onCancel={() => setAskForfeit(false)}
          onConfirm={() => forfeitSubject(studentId, subject)}
        />
      )}

      {askSubmit && (
        <SubmitDialog
          subjectName={meta.name}
          unanswered={unanswered}
          onCancel={() => setAskSubmit(false)}
          onConfirm={() => {
            submitSubject(studentId, subject);
            setAskSubmit(false);
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── 문항 이동판 ───────────────────────── */

/**
 * 오른쪽에 붙는 문항 이동판.
 *
 * 문항이 열 개가 되면 「이전·다음」만으로는 6번에서 2번으로 돌아갈 수가 없다. 번호를
 * 늘어놓아 아무 데나 바로 갈 수 있게 하고, S위계 단위로 묶어 지금 어느 층을 풀고
 * 있는지 함께 보이게 했다.
 *
 * 응답 여부를 색으로만 알리지 않는다. 채운 문항은 번호가 진해지고 밑에 짧은 줄이
 * 그어진다. 색을 못 보는 아이도 같은 정보를 얻어야 한다.
 */
function QuestionPad({
  subject,
  isHere,
  isCurrent,
  isDone,
  onPick,
  doneLabel,
  doneVerb,
}: {
  subject: SubjectId;
  /**
   * 지금 화면에 서 있는 문항인가.
   *
   * 번호(index)를 받던 것을 바꿨다. 응시 화면은 **쪽** 단위로 넘어가고(세트면 한 쪽에
   * 문항이 여럿) 해석 화면은 여전히 문항 단위라, 같은 번호가 두 화면에서 다른 것을
   * 가리키게 되었다. 「이 문항이 지금 보이는가」만 물으면 두 화면이 같은 판을 쓴다.
   */
  isHere: (q: Question) => boolean;
  /** 그중에서도 지금 짚고 있는 하나 — 낭독기에 「현재 단계」로 읽히는 자리 */
  isCurrent: (q: Question) => boolean;
  /** 이 문항을 채웠는가 — 응시 때는 「답했는가」, 해석 때는 「해석을 적었는가」 */
  isDone: (q: Question) => boolean;
  onPick: (q: Question) => void;
  doneLabel: string;
  doneVerb: string;
}) {
  const groups = questionsByLevel(subject);
  const list = questionsOf(subject);
  const doneCount = list.filter(isDone).length;

  return (
    <aside
      aria-label="문항 이동"
      className="order-1 border-b border-exam-line bg-exam-panel px-6 py-5 lg:order-3 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:px-5 lg:py-7"
    >
      <p className="text-[12px] font-semibold tracking-[0.06em] text-exam-muted">문항 이동</p>

      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <div key={g.level.id}>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-[12px] font-semibold text-exam-text">
                {g.level.id} {g.level.name}
              </span>
              <span className="text-[11px] tabular-nums text-exam-muted">{g.items.length}문항</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-exam-muted">{g.level.desc}</p>

            <ol className="mt-2.5 flex flex-wrap gap-1.5">
              {g.items.map((q) => {
                const ok = isDone(q);
                const here = isHere(q);
                const current = isCurrent(q);
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => onPick(q)}
                      aria-current={current ? "step" : undefined}
                      aria-label={`${q.no}번 ${ok ? doneVerb : "아직 " + doneVerb.replace("함", "하지 않음")}`}
                      title={`${q.no}번 · ${q.type === "essay" ? "서술형" : "객관식"} · ${
                        ok ? doneVerb : "아직 " + doneVerb.replace("함", "하지 않음")
                      }`}
                      className={`flex h-9 w-9 flex-col items-center justify-center rounded-[6px] border text-[13px] tabular-nums transition-colors ${
                        current
                          ? "border-exam-text bg-exam-text font-bold text-white"
                          : here
                            ? /* 같은 쪽에 함께 서 있는 문항 — 지금 보이지만 짚은 것은 아니다 */
                              "border-exam-text font-bold text-exam-text hover:bg-exam-raised"
                            : ok
                              ? "border-exam-muted font-bold text-exam-text hover:bg-exam-raised"
                              : "border-exam-line font-medium text-exam-muted hover:bg-exam-raised"
                      }`}
                    >
                      {q.no}
                      {/* 응답 표시 — 색이 아니라 형태로도 남긴다 */}
                      <span
                        aria-hidden
                        className={`mt-0.5 h-px w-3.5 ${
                          ok ? (current ? "bg-white" : "bg-exam-text") : "bg-transparent"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <dl className="mt-6 border-t border-exam-line pt-4 text-[12px]">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">{doneLabel}</dt>
          <dd className="font-semibold tabular-nums text-exam-text">
            {doneCount} / {list.length}
          </dd>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <dt className="text-exam-muted">남은 문항</dt>
          <dd className="font-semibold tabular-nums text-exam-text">{list.length - doneCount}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-exam-muted">
        번호 아래 줄이 있으면 {doneLabel}입니다. 순서대로 하지 않아도 되고, 언제든 돌아올 수
        있습니다.
      </p>
    </aside>
  );
}

/* ───────────────────────── 응시 전 안내 ───────────────────────── */

function StartGate({ subject, onStart }: { subject: SubjectId; onStart: () => void }) {
  const meta = subjectOf(subject)!;
  const config = useExamConfig();
  const limitMin = config.limits[subject];
  return (
    <div className="container-x flex min-h-[calc(100dvh-4rem)] items-center py-10">
      <div className={`mx-auto w-full max-w-xl p-8 md:p-10 ${panel}`}>
        <p className={eyebrow}>응시 안내</p>
        <h1 className="mt-3 text-[24px] font-black tracking-tight text-exam-text">
          {meta.name} 평가를 시작합니다
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
          시작 버튼을 누르면 <b className="text-exam-text">전체화면</b>으로 전환되고 제한 시간이
          흐르기 시작합니다.
        </p>

        <ul className="mt-6 space-y-2.5 border-t border-exam-line pt-6 text-[13px] leading-relaxed text-exam-muted">
          <li>
            · 문항 <b className="text-exam-text">{QUESTIONS_PER_SUBJECT}개</b> · 제한 시간{" "}
            <b className="text-exam-text">{limitMin}분</b> (남은 시간은 오른쪽 위에 표시됩니다)
          </li>
          <li>
            {config.autoSubmit
              ? `· 시간이 다 되면 ${config.graceMin > 0 ? `${config.graceMin}분 뒤에 ` : ""}쓰던 답 그대로 자동으로 제출됩니다.`
              : "· 시간이 다 되어도 답을 계속 쓸 수 있습니다. 다만 걸린 시간은 기록에 남습니다."}
          </li>
          <li>· 답을 고르지 않아도 다음 문항으로 넘어갈 수 있습니다.</li>
          <li>· 제출 후에는 문항마다 왜 그렇게 답했는지 적는 단계가 이어집니다.</li>
          <li>· 중간에 포기하면 이 과목의 응시 기회가 사라집니다.</li>
          <li>· 보호자는 문제 풀이에 개입할 수 없습니다.</li>
        </ul>

        <button
          type="button"
          onClick={onStart}
          className={`mt-8 w-full py-4 text-[16px] ${btnPrimary}`}
        >
          전체화면으로 평가 시작
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-2.5 text-center text-[11px] text-exam-muted">
          브라우저가 전체화면을 막는 경우에는 일반 창으로 진행됩니다.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── 제출 후 해석 작성 ───────────────────────── */

/**
 * 제출 후 해석 작성.
 *
 * 응시 화면과 같은 틀을 쓴다 — 왼쪽에 자료, 가운데에 문항, 오른쪽에 이동판. 다른
 * 화면으로 옮겨 가면 아이는 시험이 한 번 더 시작되는 줄 알고, 방금 무엇을 보고 답했는지
 * 다시 찾아야 한다. 지문이 그대로 옆에 있어야 "그때 무엇을 보고 그렇게 생각했는지"를
 * 쓸 수 있다.
 *
 * 답안은 이미 제출되어 고칠 수 없다. 고른 보기는 그대로 보여 주되 입력은 잠그고,
 * 그 아래에 칸 하나가 새로 열린다 — 왜 그 답을 골랐는지.
 *
 * 정답은 알려 주지 않는다. 맞았는지 틀렸는지를 먼저 알려 주면 아이는 자기 생각을 적는
 * 대신 오답 노트를 쓴다. 여기서 받고 싶은 것은 채점 결과가 아니라 그때의 생각이다.
 */
function ReflectionStep({ subject, studentId }: { subject: SubjectId; studentId: string }) {
  const record = useExamRecord(studentId);
  const rec = record.subjects[subject];
  const meta = subjectOf(subject)!;
  const list = questionsOf(subject);
  const [index, setIndex] = useState(0);
  const [warn, setWarn] = useState(false);

  const question = list[index];
  /* 고르기만 해도, 쓰기만 해도, 둘 다 해도 된다. 쓰기가 어려운 것과 할 말이 없는
     것은 다른데, 글만 받으면 둘이 똑같이 빈칸으로 남는다. */
  const written = (q: Question) =>
    Boolean(rec.reflectionPicks[q.id]) || (rec.reflections[q.id] ?? "").trim().length >= 5;
  const writtenCount = list.filter(written).length;
  const complete = writtenCount === list.length;
  const isLast = index === list.length - 1;

  const value = rec.answers[question.id];
  const picked = question.type === "choice" && typeof value === "number" ? value : null;
  const essayText = question.type === "essay" && typeof value === "string" ? value.trim() : "";
  const blank = question.type === "choice" ? picked === null : essayText.length === 0;
  const text = rec.reflections[question.id] ?? "";
  /* 물음이 셋으로 갈린다 — 못 낸 답 / 고른 답 / 쓴 답 */
  const kind = blank ? "blank" : question.type === "choice" ? "choice" : "essay";
  const reasons = reflectionReasons[kind];
  const pick = rec.reflectionPicks[question.id];

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <div className="flex items-baseline gap-3">
            <p className="text-[14px] font-bold tracking-tight text-exam-text">{meta.name}</p>
            <span className="text-[12px] text-exam-muted">제출 완료 · 해석 작성</span>
          </div>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {question.level} {levelOf(question.level).name} · {index + 1} / {list.length}
          </p>
        </div>
      </div>

      <div className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_15.5rem] lg:overflow-hidden">
        {/* 왼쪽 — 응시 때 보던 자료를 그대로 둔다 */}
        <section className="order-2 border-b border-exam-line bg-exam-raised px-6 py-7 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
          <p className={eyebrow}>{question.brief.label}</p>
          <h2 className="mt-3 text-[20px] font-black tracking-tight text-exam-text md:text-[22px]">
            {question.brief.title}
          </h2>

          <div className="mt-5 space-y-4">
            {question.brief.paragraphs.map((p) => (
              <p key={p} className="text-[15px] leading-[1.95] text-exam-text/90">
                {p}
              </p>
            ))}
          </div>

          {question.brief.list && (
            <ul className="mt-5 space-y-2.5 border-t border-exam-line pt-5">
              {question.brief.list.map((l) => (
                <li key={l} className="text-[15px] leading-relaxed text-exam-text">
                  {l}
                </li>
              ))}
            </ul>
          )}

          {question.brief.table && (
            <div className="mt-5 overflow-x-auto border-t border-exam-line pt-5">
              <table className="w-full text-left text-[14px]">
                <thead>
                  <tr className="border-b border-exam-line">
                    {question.brief.table.head.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 font-black tabular-nums text-exam-text"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.brief.table.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className={`whitespace-nowrap px-4 py-3 tabular-nums ${
                            c === 0 ? "font-bold text-exam-text" : "text-exam-muted"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 가운데 — 문항과 내가 낸 답, 그 아래 새로 열리는 칸 하나 */}
        <section className="order-3 px-6 py-7 lg:order-2 lg:overflow-y-auto lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
            <p className="text-[13px] font-semibold text-exam-text">
              <span className="tabular-nums">{question.no}</span>번
              <span className="ml-2 font-medium text-exam-muted">
                {question.type === "essay" ? "서술형" : "객관식"}
              </span>
            </p>
            <p className="text-[12px] font-medium text-exam-muted">제출완료 · 수정 불가</p>
          </div>

          <h1 className="mt-5 whitespace-pre-line text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]">
            {question.stem}
          </h1>

          {/* 낸 답 — 응시 때와 같은 모양으로 두되 잠근다 */}
          {question.type === "choice" ? (
            <ul className="mt-7 grid gap-2">
              {question.choices?.map((c, i) => {
                const on = picked === i;
                return (
                  <li
                    key={c}
                    className={`flex items-start gap-4 rounded-[6px] border p-4 ${
                      on ? "border-exam-text" : "border-exam-line opacity-60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                        on
                          ? "border-exam-text bg-exam-text text-white"
                          : "border-exam-line text-exam-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[15px] leading-[1.7] ${
                        on ? "font-semibold text-exam-text" : "text-exam-muted"
                      }`}
                    >
                      {c}
                    </span>
                    {on && (
                      <span className="ml-auto shrink-0 self-center text-[12px] font-semibold text-exam-text">
                        내가 고른 답
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-7">
              <p className="text-[12px] font-semibold text-exam-muted">내가 쓴 답</p>
              <p className="mt-2 min-h-[6rem] whitespace-pre-line rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text">
                {essayText || <span className="text-exam-muted">답을 작성하지 않았습니다.</span>}
              </p>
            </div>
          )}

          {blank && question.type === "choice" && (
            <p className="mt-3 text-[13px] font-semibold text-exam-text">
              이 문항은 답을 고르지 않으셨습니다.
            </p>
          )}

          {/* 새로 열리는 칸 — 고르기가 먼저, 쓰기가 그다음 */}
          <div className="mt-8 border-t border-exam-line pt-6">
            <p className="text-[15px] font-bold text-exam-text">
              {blank
                ? "왜 풀지 못했는지 알려 주세요"
                : picked !== null
                  ? `${picked + 1}번을 고른 까닭을 알려 주세요`
                  : "왜 그렇게 썼는지 알려 주세요"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-exam-muted">
              가까운 것을 하나 고르거나, 아래에 직접 써도 됩니다. 둘 다 해도 좋습니다.
            </p>

            <ul className="mt-4 grid gap-2">
              {reasons.map((r, n) => {
                const on = pick === r.id;
                return (
                  <li key={r.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-4 rounded-[6px] border p-3.5 transition-colors ${
                        on ? "border-exam-text" : "border-exam-line hover:bg-exam-raised"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`reason-${question.id}`}
                        checked={on}
                        /* 같은 것을 다시 누르면 지워진다 — 잘못 골랐을 때
                           되돌릴 길이 없으면 아이는 거기서 멈춘다 */
                        onClick={() =>
                          setReflectionPick(studentId, subject, question.id, on ? null : r.id)
                        }
                        onChange={() => {}}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                          on
                            ? "border-exam-text bg-exam-text text-white"
                            : "border-exam-line text-exam-muted"
                        }`}
                      >
                        {n + 1}
                      </span>
                      <span
                        className={`text-[15px] leading-[1.7] ${
                          on ? "font-semibold text-exam-text" : "text-exam-text/90"
                        }`}
                      >
                        {r.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <label
              htmlFor={`ref-${question.id}`}
              className="mt-6 block text-[13px] font-bold text-exam-text"
            >
              더 하고 싶은 말이 있으면 써 주세요{" "}
              <span className="font-medium text-exam-muted">(안 써도 괜찮아요)</span>
            </label>
            <textarea
              id={`ref-${question.id}`}
              rows={4}
              value={text}
              onChange={(e) => {
                setWarn(false);
                setReflection(studentId, subject, question.id, e.target.value);
              }}
              placeholder={
                blank
                  ? "예) 표에서 무엇을 빼야 하는지 몰라서 못 풀었습니다."
                  : "예) 지문에 '씨앗이 자랐는지 보려고'라는 말이 있어서 2번을 골랐습니다."
              }
              className="mt-3 w-full rounded-[6px] border border-exam-line px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-exam-text"
            />
            <p className="mt-2 flex items-center justify-between gap-3 text-[12px] tabular-nums text-exam-muted">
              <span>맞고 틀리고를 보는 칸이 아닙니다. 점수에 반영되지 않습니다.</span>
              <span>
                {written(question) ? "다 되었습니다" : `${text.trim().length}자 · 고르거나 5자 이상`}
              </span>
            </p>
          </div>
        </section>

        <QuestionPad
          subject={subject}
          isHere={(q) => q.id === question.id}
          isCurrent={(q) => q.id === question.id}
          isDone={written}
          onPick={(q) => setIndex(list.indexOf(q))}
          doneLabel="해석을 남긴 문항"
          doneVerb="작성함"
        />
      </div>

      {/* 하단 바 */}
      <div className="shrink-0 border-t border-exam-line bg-exam-panel">
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-6 lg:px-10">
          <p className="hidden text-[12px] leading-tight text-exam-muted sm:block">
            {warn
              ? "아직 답하지 않은 문항이 있습니다. 번호판에서 줄이 없는 번호를 확인하세요."
              : "고르거나 쓰는 대로 저장됩니다. 모든 문항에 답하면 이 과목이 끝납니다."}
          </p>

          <div className="flex items-center gap-2">
            <span className="mr-1 hidden text-[12px] font-bold tabular-nums text-exam-muted md:block">
              작성 {writtenCount}/{list.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              이전
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={async () => {
                  if (!complete) {
                    setWarn(true);
                    return;
                  }
                  await leaveFullscreen();
                  finishReflection(studentId, subject);
                }}
                aria-disabled={!complete}
                className={complete ? btnPrimary : btnDisabled}
              >
                해석 제출하고 마치기
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
                className={btnPrimary}
              >
                다음
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 다이얼로그 ───────────────────────── */

function SubmitDialog({
  subjectName,
  unanswered,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-exam-line bg-exam-panel p-7">
        <p className={eyebrow}>제출 확인</p>
        <h2 id="submit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 답안을 제출할까요?
        </h2>

        {/* 색면을 깔지 않는다. 아이가 제출을 앞두고 보는 마지막 화면이라,
            노란 상자가 서면 「잘못했다」로 읽힌다. 답을 비운 것은 잘못이 아니다. */}
        {unanswered > 0 ? (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            아직 <b className="text-exam-text">{unanswered}문항</b>에 답하지 않았습니다. 그대로
            제출해도 되며, 제출 후 <b className="text-exam-text">왜 풀지 못했는지</b>를 적는 단계가
            이어집니다.
          </p>
        ) : (
          <p className="mt-4 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            모든 문항에 답했습니다. 제출 후에는 답안을 수정할 수 없습니다.
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            더 풀기
          </button>
          <button type="button" onClick={onConfirm} className={btnPrimary}>
            제출하기
          </button>
        </div>
      </div>
    </div>
  );
}

function ForfeitDialog({
  subjectName,
  remain,
  onCancel,
  onConfirm,
}: {
  subjectName: string;
  remain: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forfeit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-exam-text/40 p-5"
    >
      <div className="w-full max-w-md rounded-md border border-rose-300 bg-exam-panel p-7">
        <p className={eyebrow}>경고 · 되돌릴 수 없음</p>
        <h2 id="forfeit-title" className="mt-3 text-[20px] font-black text-exam-text">
          {subjectName} 응시를 포기할까요?
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-exam-muted">
          아직 <b className="tabular-nums text-exam-text">{remain}</b> 남았습니다. 지금 나가지 않고
          계속 풀 수 있습니다.
        </p>
        <ul className="mt-5 space-y-2 border-t border-exam-line pt-5 text-[13px] leading-relaxed text-exam-muted">
          <li>
            · 이 과목의 응시 기회가 <b className="text-rose-600">사라집니다.</b>
          </li>
          <li>· 지금까지 선택하거나 작성한 답안은 저장되지 않습니다.</li>
          <li>· 세 과목을 모두 제출해야 결과 리포트가 발행됩니다.</li>
        </ul>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className={btnPrimary}>
            계속 응시하기
          </button>
          <button type="button" onClick={onConfirm} className={btnDanger}>
            포기하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 결과 화면 ───────────────────────── */

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x py-16 md:py-24">
      <div className={`mx-auto max-w-xl p-8 text-center md:p-12 ${panel}`}>{children}</div>
    </div>
  );
}

function Submitted({ subject }: { subject: SubjectId }) {
  const meta = subjectOf(subject)!;
  return (
    <Result>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-exam-line text-exam-text">
        <CheckIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-6 text-[24px] font-black text-exam-text">{meta.name} 응시가 끝났습니다</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        답안과 해석이 모두 저장되었습니다. 이 창을 닫으면 진단 현황 화면에서 제출 상태가 갱신됩니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={async () => {
            await leaveFullscreen();
            window.close();
          }}
          className={btnPrimary}
        >
          창 닫기
        </button>
        <Link href="/exam" className={btnGhost}>
          진단 현황으로
        </Link>
      </div>
    </Result>
  );
}

function Forfeited({
  subject,
  studentId,
  attemptsLeft,
}: {
  subject: SubjectId;
  studentId: string;
  attemptsLeft: number;
}) {
  const meta = subjectOf(subject)!;
  return (
    <Result>
      <p className={eyebrow}>응시 중단</p>
      <h1 className="mt-3 text-[24px] font-black text-exam-text">
        {meta.name} 응시를 포기했습니다
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-exam-muted">
        이 과목의 응시 기회가 소모되었습니다. 남은 기회는{" "}
        <b className="tabular-nums text-rose-600">{attemptsLeft}회</b>입니다.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {attemptsLeft > 0 && (
          <button
            type="button"
            onClick={() => restartSubject(studentId, subject)}
            className={btnPrimary}
          >
            남은 기회로 다시 응시
          </button>
        )}
        <Link href="/exam" className={btnGhost}>
          진단 현황으로
        </Link>
      </div>
    </Result>
  );
}

/* ───────────────────────── 함께 읽는 자료 ───────────────────────── */

/**
 * 왼쪽에 붙는 자료 칸.
 *
 * 응시와 해석 두 화면이 같은 것을 그리고, 세트면 그 쪽의 문항 여럿이 이 하나를 나눠
 * 읽는다. 조각으로 뽑아 둔 까닭이 그것이다 — 같은 자료를 두 곳이 각자 그리면 표가
 * 한쪽에만 붙는 날이 온다.
 */
function BriefPanel({ brief }: { brief: Brief }) {
  return (
    <section className="order-2 border-b border-exam-line bg-exam-raised px-6 py-7 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
        <p className={eyebrow}>{brief.label}</p>
        <h2 className="mt-3 text-[20px] font-black tracking-tight text-exam-text md:text-[22px]">
          {brief.title}
        </h2>

        <div className="mt-5 space-y-4">
          {brief.paragraphs.map((p) => (
            <p key={p} className="text-[15px] leading-[1.95] text-exam-text/90">
              {p}
            </p>
          ))}
        </div>

        {brief.list && (
          <ul className={`mt-5 space-y-2.5 p-5 ${panel}`}>
            {brief.list.map((l) => (
              <li key={l} className="text-[15px] leading-relaxed text-exam-text">
                {l}
              </li>
            ))}
          </ul>
        )}

        {brief.table && (
          <div className={`mt-5 overflow-x-auto ${panel}`}>
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-exam-line">
                  {brief.table.head.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 font-black tabular-nums text-exam-text"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brief.table.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`whitespace-nowrap px-4 py-3 tabular-nums ${
                          c === 0 ? "font-bold text-exam-text" : "text-exam-muted"
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {brief.note && (
          <p className="mt-5 border-t border-exam-line pt-4 text-[13px] leading-relaxed text-exam-muted">
            {brief.note}
          </p>
        )}
    </section>
  );
}

/* ───────────────────────── 문항 한 덩이 ───────────────────────── */

/**
 * 발문 · 보기 · 답 쓰는 칸.
 *
 * 세트면 이것이 한 쪽에 여럿 선다. 낱개면 하나뿐이다 — 어느 쪽이든 그리는 것은 같고,
 * 다른 것은 머리줄에 번호를 세우는가뿐이다.
 */
function QuestionBody({
  q,
  subject,
  studentId,
  value,
  focus,
}: {
  q: Question;
  subject: SubjectId;
  studentId: string;
  value: number | string | undefined;
  /** 이동판에서 방금 고른 문항인가 — 그러면 제 자리로 화면을 끌어온다 */
  focus: boolean;
}) {
  const box = useRef<HTMLElement>(null);

  /* 같은 쪽 안의 문항을 골랐을 때도 화면이 움직여야 한다. 쪽 번호는 그대로라
     아무것도 다시 그려지지 않으므로, 끌어오는 일은 이쪽에서 한다 */
  useEffect(() => {
    /* 부드럽게 굴리지 않는다 — 시간을 재는 시험이고, 2천 픽셀을 애니메이션으로 넘기는
       동안 다음 문항을 또 누르면 두 굴림이 겹쳐 엉뚱한 자리에 선다 */
    if (focus) box.current?.scrollIntoView({ block: "start" });
  }, [focus]);

  return (
    <section ref={box} className="scroll-mt-2 px-6 py-7 lg:px-10 lg:py-9">
        <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
          <p className="text-[13px] font-semibold text-exam-text">
            <span className="tabular-nums">{q.no}</span>번
            <span className="ml-2 font-medium text-exam-muted">
              {q.type === "essay" ? "서술형" : "객관식"}
            </span>
          </p>
          <p className="text-[12px] font-medium tabular-nums text-exam-muted">
            {q.level} {levelOf(q.level).name}
          </p>
        </div>

        <h1 className="mt-5 whitespace-pre-line text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]">
          {q.stem}
        </h1>

        {q.type === "choice" ? (
          <fieldset className="mt-7">
            <legend className="sr-only">보기 선택</legend>
            <ul className="grid gap-2">
              {q.choices?.map((c, i) => {
                const on = value === i;
                return (
                  <li key={c}>
                    {/* 고른 보기는 면을 물들이지 않고 테두리와 글자 굵기로 세운다.
                        답안지에 형광펜을 칠하지는 않는다. */}
                    <label
                      className={`flex cursor-pointer items-start gap-4 rounded-[6px] border p-4 transition-colors ${
                        on
                          ? "border-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
                          : "border-exam-line hover:border-exam-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={i}
                        checked={on}
                        onChange={() => setAnswer(studentId, subject, q.id, i)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                          on
                            ? "border-exam-text bg-exam-text text-white"
                            : "border-exam-line text-exam-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`text-[15px] leading-[1.7] ${
                          on ? "font-semibold text-exam-text" : "text-exam-text"
                        }`}
                      >
                        {c}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : (
          <div className="mt-7">
            {q.guide && (
              <ol className={`mb-4 space-y-2 p-5 ${panel}`}>
                <li className={eyebrow}>이렇게 써 보세요</li>
                {q.guide.map((g, i) => (
                  <li key={g} className="flex gap-2.5 text-[14px] leading-relaxed text-exam-text">
                    <span className="font-bold tabular-nums text-exam-muted">{i + 1}.</span>
                    {g}
                  </li>
                ))}
              </ol>
            )}
            <textarea
              rows={9}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setAnswer(studentId, subject, q.id, e.target.value)}
              placeholder={q.placeholder}
              aria-label="서술형 답안"
              className="w-full rounded-md border border-exam-line bg-exam-panel px-4 py-3.5 text-[15px] leading-[1.9] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-brand-500"
            />
            <p className="mt-2 text-right text-[12px] tabular-nums text-exam-muted">
              {(typeof value === "string" ? value : "").trim().length}자
            </p>
          </div>
        )}

        <p className="mt-6 border-t border-exam-line pt-4 text-[12px] leading-relaxed text-exam-muted">
          답을 고르지 않아도 다음 문항으로 넘어갈 수 있습니다. 제출한 뒤에는 문항마다 왜 그렇게
          답했는지(또는 왜 풀지 못했는지) 적는 단계가 이어집니다.
        </p>
    </section>
  );
}
