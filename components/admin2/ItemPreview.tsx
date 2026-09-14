"use client";

import { useEffect, useRef, useState } from "react";
import { assessment } from "@/lib/exam";
import { levelSpecs } from "@/lib/blueprint";
import { renderDetail } from "@/lib/richText";
import { choicesOf, typeLabel, type ItemDraft, type Question } from "@/lib/itemStore";

/**
 * 문항을 **아이가 보는 그대로** 띄운다 (EXP-03 검수의 미리보기).
 *
 * 검수 화면은 칸이 스물이 넘는 폼이다. 성취기준 코드와 b모수를 나란히 놓고 보기에는
 * 좋지만, 「이 발문이 초등 3학년에게 읽히는가」는 그 꼴로는 알 수 없다. 실제 응시
 * 화면은 글자가 훨씬 크고 자료와 발문이 갈려 있다 — 거기서만 보이는 것이 있다.
 * 줄이 잘리는지, 보기 다섯이 화면에 다 서는지, 그림 없이도 읽히는지.
 *
 * ── 세트와 단일을 다르게 편다 ──
 *   **세트**  왼쪽에 함께 읽는 자료, 오른쪽에 1번 · 2번 … 을 **한 화면에 이어서** 세운다.
 *            세트를 두는 까닭이 「자료를 두 번 읽히지 않고 단계를 올린다」이므로, 자료를
 *            붙들어 둔 채 문항을 차례로 내려가야 그 뜻이 화면에서 지켜진다. 한 문항씩
 *            넘기면 2번을 풀다가 자료를 다시 보려고 되돌아가게 된다.
 *   **단일**  가운데 한 칸. 자료가 있으면 발문 위에 얹는다. 좌우로 가르면 오른쪽 칸에
 *            문항 하나만 덩그러니 서고 왼쪽이 비거나, 짧은 자료가 반쪽을 차지한다.
 *
 * ── 응시 화면을 그대로 부르지 않는 까닭 ──
 * components/exam/ExamSession.tsx는 타이머·전체화면·답 저장·이탈 감시를 함께 든다.
 * 검수하다가 그것이 돌면 남의 응시 기록에 답이 쌓인다. 그래서 **보이는 것만** 같은
 * 규격으로 다시 그린다 — 색(--color-exam-*)과 글자 크기가 그쪽과 같다.
 *
 * ── 검수하는 사람만 보는 것 ──
 * 이 화면은 아이가 아니라 **검수자**가 연다. 그래서 아이 화면 위에 정답 · 오답 의도 ·
 * 모범답안 · 허용 답안 · 부분점수 · 인정/불인정 예 · 재능 평가 관점 · 출제자 유의를
 * 겹쳐 얹는다. 그것들을 보려고 폼으로 되돌아가야 하면 「이 오답이 정말 그 오개념을
 * 잡는가」를 발문 옆에 두고 볼 수가 없다.
 *
 * 겹친 것은 **아이 화면과 다르게 그린다** — 점선 테두리에 이름표를 달아, 지금 보는 것이
 * 시험지에 없는 글이라는 사실이 한눈에 보이게 한다. 머리의 단추로 걷어 내면 아이가 보는
 * 그대로가 남는다(줄이 잘리는지, 보기가 다 서는지는 그 상태로 봐야 한다).
 *
 * ⚠ 답은 고를 수 있지만 아무 데도 안 남는다. 채점도 하지 않는다.
 */
export default function ItemPreview({ item, onClose }: { item: ItemDraft; onClose: () => void }) {
  const qs = item.questions;
  const [pick, setPick] = useState<Record<string, number>>({});
  /* 검수하러 온 사람이 열므로 처음부터 켜 둔다. 아이 화면 그대로를 보려면 끈다 */
  const [reveal, setReveal] = useState(true);

  const box = useRef<HTMLDivElement>(null);

  /* 응시 화면은 전체를 덮는다. 여기서도 덮되 Esc로 빠져나갈 길을 둔다 —
     검수는 띄웠다 닫았다를 여러 번 하는 일이라 닫는 데 손이 가면 안 열어 본다 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * 초점을 이 판 안으로 들이고, 닫을 때 부른 자리로 돌려준다.
   *
   * 덮기만 하고 초점을 두고 오면 Tab 한 번에 **덮인 폼**으로 넘어간다. 미리보기를 연
   * 단추 바로 옆이 「검수로 제출」이라, 아무것도 안 보이는 채로 Enter 한 번에 문항이
   * 검수로 나가 버린다. 화면 찾기 판(Palette.tsx)이 쓰는 것과 같은 꼴이다.
   */
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.focus();
    return () => before?.focus?.();
  }, []);

  if (qs.length === 0) return null;

  const set = item.form === "set" && qs.length > 1;
  const passage = renderDetail(item.passageMode, item.passage, item.passageImages);
  const hasPassage = passage.trim() !== "";

  const one = (q: Question, k: number) => (
    <QuestionBlock
      key={q.id}
      q={q}
      no={k + 1}
      /* 세트에서만 번호를 세운다 — 단일에 「1번」을 붙이면 없는 2번을 찾게 된다 */
      numbered={set}
      reveal={reveal}
      picked={pick[q.id]}
      onPick={(i) => setPick((p) => ({ ...p, [q.id]: i }))}
    />
  );

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label="응시 화면 미리보기"
      tabIndex={-1}
      /* Tab이 이 판을 벗어나지 못하게 붙든다 — 덮인 폼의 단추가 눌리는 길을 막는다 */
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const able = box.current?.querySelectorAll<HTMLElement>(
          "button, input:not([type=radio]), input[type=radio]:checked, [href], [tabindex]:not([tabindex='-1'])",
        );
        if (!able?.length) return;
        const first = able[0];
        const last = able[able.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col bg-exam-bg text-exam-text outline-none"
    >
      {/* 머리 — 응시 화면의 띠를 흉내 내되, 남은 시간 자리에 「미리보기」를 세운다.
          여기에 시간을 그리면 진짜 응시로 보인다 */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 bg-exam-panel px-5 shadow-[inset_0_-1px_0_var(--color-exam-line)] md:px-8">
        <div className="flex items-center gap-3">
          <span className="font-brand text-[1.0625rem] font-semibold leading-none">GENIXX</span>
          <span aria-hidden className="hidden h-5 w-px bg-exam-line sm:block" />
          <span className="hidden text-[13px] font-bold text-exam-muted sm:inline">
            {assessment.name} 재능진단
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-exam-bg px-3 py-1 text-[12px] font-bold text-exam-muted sm:inline">
            미리보기 · 답은 저장되지 않습니다
          </span>
          <button
            type="button"
            aria-pressed={reveal}
            onClick={() => setReveal((v) => !v)}
            className={`rounded-[6px] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              reveal
                ? "border-exam-text bg-exam-text text-white"
                : "border-exam-line bg-exam-panel text-exam-text hover:border-exam-muted"
            }`}
          >
            {reveal ? "정답·해설 켬" : "정답·해설 끔"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] border border-exam-line bg-exam-panel px-3 py-1.5 text-[13px] font-semibold text-exam-text transition-colors hover:border-exam-muted"
          >
            닫기 (Esc)
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {set ? (
          /* ── 세트 — 왼쪽 자료, 오른쪽 문항 여럿 ──
             자료 칸은 화면에 붙여 둔다(sticky). 오른쪽을 3번까지 내려가도 왼쪽 글이
             따라와야 「두 번 읽히지 않는다」가 지켜진다 */
          <div className="mx-auto grid min-h-full max-w-[80rem] gap-px bg-exam-line lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <section className="bg-exam-panel px-6 py-7 md:px-9 md:py-9 lg:sticky lg:top-0 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto">
              <p className="text-[12px] font-bold tracking-wide text-exam-muted">함께 읽는 자료</p>
              {hasPassage ? (
                <div
                  className="a2-prose mt-4 text-[15px] leading-[1.85] text-exam-text"
                  dangerouslySetInnerHTML={{ __html: passage }}
                />
              ) : (
                <p className="mt-4 rounded-[6px] border border-dashed border-exam-line p-4 text-[14px] text-exam-muted">
                  아직 자료를 쓰지 않았습니다. 세트는 함께 읽을 것이 있어야 성립합니다.
                </p>
              )}
            </section>

            <div className="grid gap-px bg-exam-line">
              {qs.map(one)}
              {reveal && (item.guidance.trim() !== "" || item.reviewRequest.trim() !== "") && (
                <section className="grid gap-3 bg-exam-panel px-6 py-6 md:px-9">
                  <AuthorNotes item={item} />
                </section>
              )}
            </div>
          </div>
        ) : (
          /* ── 단일 — 가운데 한 칸 ── */
          <div className="mx-auto min-h-full max-w-[46rem] px-4 py-7 md:py-10">
            {hasPassage && (
              <section className="rounded-[8px] bg-exam-panel px-6 py-7 md:px-9">
                <p className="text-[12px] font-bold tracking-wide text-exam-muted">지문 · 자료</p>
                <div
                  className="a2-prose mt-4 text-[15px] leading-[1.85] text-exam-text"
                  dangerouslySetInnerHTML={{ __html: passage }}
                />
              </section>
            )}
            <div className={`overflow-hidden rounded-[8px] ${hasPassage ? "mt-4" : ""}`}>
              {one(qs[0], 0)}
              {reveal && (item.guidance.trim() !== "" || item.reviewRequest.trim() !== "") && (
                <section className="grid gap-3 bg-exam-panel px-6 pb-7 md:px-9">
                  <AuthorNotes item={item} />
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 문항 한 덩이 — 머리줄 · 발문 · 보기(또는 답 쓰는 칸) */
function QuestionBlock({
  q,
  no,
  numbered,
  reveal,
  picked,
  onPick,
}: {
  q: Question;
  no: number;
  numbered: boolean;
  /** 검수자만 보는 것(정답·오답 의도·해설)을 겹쳐 그릴지 */
  reveal: boolean;
  picked: number | undefined;
  onPick: (i: number) => void;
}) {
  /* 보기를 여기서 갈아 끼우지 않는다 — OX는 저장된 보기를 그대로 두고 화면에서만
     「맞다·아니다」로 바꾸는 규칙이 이미 있다(lib/itemStore.ts choicesOf). 여기서 따로
     바꾸면 보기만 갈리고 오답 의도·정답 번호는 옛 보기를 가리킨 채 남는다 */
  const choices = choicesOf(q);
  const writing = q.type !== "choice" && q.type !== "ox";
  /* 오답 의도는 **객관식에만** 적는다. 객관식으로 쓰다 OX로 돌린 문항은 옛 보기의
     의도를 그대로 들고 있어(retypeQuestion), 그것을 「맞다·아니다」 밑에 붙이면
     검수자가 없는 보기의 오개념을 읽는다 */
  const showIntent = q.type === "choice";
  const stem = renderDetail(q.stemMode, q.stem, q.stemImages);

  return (
    <section className="bg-exam-panel px-6 py-7 md:px-9 md:py-9">
      <div className="flex items-center justify-between gap-3 border-b border-exam-line pb-3">
        <p className="text-[13px] font-semibold text-exam-text">
          {numbered && <span className="tabular-nums">{no}번</span>}
          <span className={`font-medium text-exam-muted ${numbered ? "ml-2" : ""}`}>
            {typeLabel(q.type)}
          </span>
        </p>
        <p className="text-[12px] font-medium tabular-nums text-exam-muted">
          {q.level} {levelSpecs[q.level].name}
        </p>
      </div>

      <div
        className="a2-prose mt-5 text-[19px] font-bold leading-[1.75] text-exam-text md:text-[21px]"
        dangerouslySetInnerHTML={{ __html: stem }}
      />

      {writing ? (
        <div className="mt-7">
          <div className="min-h-[10rem] w-full rounded-[6px] border border-exam-line bg-exam-bg/40 p-4 text-[15px] leading-[1.8] text-exam-muted">
            여기에 답을 씁니다.
          </div>
          {q.type === "image" && (
            <p className="mt-3 text-[13px] text-exam-muted">
              풀이 과정을 찍어 올리는 칸이 함께 섭니다.
            </p>
          )}
        </div>
      ) : (
        <fieldset className="mt-7">
          <legend className="sr-only">{numbered ? `${no}번 보기 선택` : "보기 선택"}</legend>
          <ul className="grid gap-2">
            {choices.map((c, i) => {
              const on = picked === i;
              /* 정답 번호가 보기 수를 넘어갈 수 있다(유형을 바꾸며 보기가 줄어든 문항).
                 그때는 어느 것에도 배지가 안 붙으므로 아래에서 따로 짚어 준다 */
              const answerHere = q.answer === i;
              return (
                <li key={`${q.id}-${i}`}>
                  <label
                    className={`flex cursor-pointer items-start gap-4 rounded-[6px] border p-4 transition-colors ${
                      on
                        ? "border-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
                        : "border-exam-line hover:border-exam-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pv-${q.id}`}
                      checked={on}
                      onChange={() => onPick(i)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${
                        on ? "border-exam-text bg-exam-text text-white" : "border-exam-line text-exam-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15px] leading-[1.7] ${on ? "font-semibold" : ""}`}>
                        {c || <span className="text-exam-muted">보기 {i + 1} — 아직 안 씀</span>}
                      </span>
                      {/* 오답 의도 — 이 오답이 무슨 오개념을 잡으려는 것인가.
                          보기 바로 아래 붙여야 「그 오개념이 이 문장으로 잡히는가」를 본다 */}
                      {reveal && showIntent && !answerHere && q.distractorIntent[i]?.trim() && (
                        <span className="mt-2 block border-l-2 border-dashed border-exam-muted/60 pl-3 text-[13px] leading-[1.6] text-exam-muted">
                          <b className="font-bold">오답 의도</b> {q.distractorIntent[i]}
                        </span>
                      )}
                    </span>
                    {reveal && answerHere && (
                      <span className="shrink-0 self-center rounded-full border border-exam-text px-2 py-0.5 text-[11px] font-bold text-exam-text">
                        정답
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
            {choices.length === 0 && (
              <li className="rounded-[6px] border border-dashed border-exam-line p-4 text-[14px] text-exam-muted">
                아직 보기를 쓰지 않았습니다. 응시 화면에서는 고를 것이 없습니다.
              </li>
            )}
          </ul>
        </fieldset>
      )}

      {/* 검수자만 보는 것 — 답과 채점 기준. 아이 화면에는 없는 글이라 점선으로 가른다 */}
      {reveal && (
        <div className="mt-6 grid gap-3">
          {q.type === "short" && q.shortAnswers.trim() !== "" && (
            <Keyed label="허용 답안">{q.shortAnswers}</Keyed>
          )}
          {!writing && (q.answer < 0 || q.answer >= choices.length) && (
            <Keyed label="정답">
              정답 번호({q.answer + 1})가 보기 수({choices.length})를 벗어났습니다. 유형을 바꾸면서 보기가
              줄었을 수 있습니다.
            </Keyed>
          )}
          {q.explain.trim() !== "" && <Keyed label="모범답안">{q.explain}</Keyed>}
          {/* 부분점수 · 인정/불인정 예는 형식을 가리지 않고 적은 것이 있으면 그린다. 한동안 쓰는
              형식에서만 그렸는데, 선택형에도 그 칸을 열어 두어(QuestionEditor) 적은 것이 검수자에게
              안 보이게 된다. 서술형에서 돌린 문항의 옛 기준도 편집 화면에 그대로 보여 지울 수 있다 */}
          {q.rubric.trim() !== "" && <Keyed label="부분점수">{q.rubric}</Keyed>}
          {(q.acceptExamples.trim() !== "" || q.rejectExamples.trim() !== "") && (
            <div className="grid gap-3 md:grid-cols-2">
              <Keyed label="인정 예">{q.acceptExamples.trim() || "—"}</Keyed>
              <Keyed label="불인정 예">{q.rejectExamples.trim() || "—"}</Keyed>
            </div>
          )}
          {(q.perspectiveHierarchy.trim() !== "" || q.perspectiveAbility.trim() !== "") && (
            <Keyed label="재능 평가 관점">
              {[
                q.perspectiveHierarchy.trim() && `인지 처리 위계 — ${q.perspectiveHierarchy.trim()}`,
                q.perspectiveAbility.trim() && `인지 능력 수준 — ${q.perspectiveAbility.trim()}`,
              ]
                .filter(Boolean)
                .join("\n")}
            </Keyed>
          )}
        </div>
      )}
    </section>
  );
}

/** 출제위원이 검수자에게 건넨 말 — 출제자 유의와 검토 요청 */
function AuthorNotes({ item }: { item: ItemDraft }) {
  return (
    <>
      {item.guidance.trim() !== "" && <Keyed label="출제자 유의">{item.guidance}</Keyed>}
      {item.reviewRequest.trim() !== "" && <Keyed label="검토 요청">{item.reviewRequest}</Keyed>}
    </>
  );
}

/**
 * 시험지에 없는 글 한 덩이 — 검수자만 본다.
 *
 * 점선과 이름표로 아이 화면과 가른다. 같은 꼴로 그리면 검수자가 「이것도 아이가 보나」를
 * 매번 되묻게 되고, 한 번이라도 그렇게 읽히면 미리보기가 미리보기가 아니게 된다.
 */
function Keyed({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-exam-muted/50 bg-exam-bg/40 px-4 py-3">
      <p className="text-[11px] font-bold tracking-wide text-exam-muted">{label}</p>
      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.75] text-exam-text">{children}</p>
    </div>
  );
}
