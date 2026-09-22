"use client";

import { useEffect, useRef, useState } from "react";
import {
  assessment,
  flattenSets,
  screensOf,
  subjects,
  type Question as ExamQuestion,
} from "@/lib/exam";
import { questionsIn, type ContentQuestion } from "@/lib/content";
import { choicesOf, contentFor, type ItemDraft, type Question } from "@/lib/itemStore";
import { BriefPanel, QuestionBody, ScreenColumn } from "@/components/exam/ExamSession";

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
 * 모범답안 · 허용 답안 · 부분점수 · 인정 예 · 재능 평가 관점 · 출제자 유의를
 * 겹쳐 얹는다. 그것들을 보려고 폼으로 되돌아가야 하면 「이 오답이 정말 그 오개념을
 * 잡는가」를 발문 옆에 두고 볼 수가 없다.
 *
 * 겹친 것은 **아이 화면과 다르게 그린다** — 점선 테두리에 이름표를 달아, 지금 보는 것이
 * 시험지에 없는 글이라는 사실이 한눈에 보이게 한다. 머리의 단추로 걷어 내면 아이가 보는
 * 그대로가 남는다(줄이 잘리는지, 보기가 다 서는지는 그 상태로 봐야 한다).
 *
 * ⚠ 답은 고를 수 있지만 아무 데도 안 남는다. 채점도 하지 않는다.
 */
/**
 * 검사지 한 벌을 넘겨 보는 자리 — 평가별 문항관리의 「평가 미리보기」가 넘긴다.
 *
 * 응시 화면처럼 문항(세트) 하나씩 넘긴다. 번호는 검사지 전체에서 이어진다 — 3번째 문항 묶음의
 * 첫 문항이 1번으로 서면 아이가 받는 번호와 달라진다.
 */
export type PreviewNav = {
  /** 머리에 서는 이름 — 「국어 · 3학년」 */
  title: string;
  at: number;
  total: number;
  go: (k: number) => void;
  /** 이 문항 앞에 선 문항 수 — 번호를 잇는다 */
  offset: number;
};

/* ⚠ 넘기는 쪽은 문항마다 key를 바꿔 이 판을 새로 세운다(FormSlot). 풀던 답이 같은 id(q1 · q2 …)의
     다음 문항에 남지 않게 — 판 안에서 답을 비우는 effect를 두는 것보다 곧다 */

export default function ItemPreview({
  item,
  onClose,
  nav,
}: {
  item: ItemDraft;
  onClose: () => void;
  nav?: PreviewNav;
}) {
  const qs = item.questions;
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
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

  /* 응시 화면과 **같은 컴포넌트**로 그린다 — 자료 블록 · 〈보기〉 상자 · 괄호 칸 · 묶음이 시험지와
     똑같이 서는지를 여기서 본다. 답 저장 · 시계 · 전체화면은 부르지 않는다(답은 이 판 안에만) */
  const content = contentFor(item);
  const subject = subjects.find((s) => s.short === item.subject)?.id ?? "science";
  const bank = flattenSets([{ ...content, subject }]);
  const screens = screensOf(subject, bank);
  const set = bank.length > 1;
  const hasBrief = content.material.blocks.length > 0 || !!content.material.lead;
  const byId = new Map(qs.map((q) => [q.id, q]));
  const contentById = new Map(questionsIn(content).map((c) => [c.id, c]));

  const one = (q: ExamQuestion) => (
    <div key={q.id}>
      <QuestionBody
        q={q}
        num={(nav?.offset ?? 0) + bank.indexOf(q) + 1}
        value={answers[q.id]}
        onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
      />
      {reveal && byId.get(q.id) && (
        <div className="grid gap-3 px-6 pb-7 lg:px-10">
          <RevealNotes q={byId.get(q.id)!} cq={contentById.get(q.id)} />
        </div>
      )}
    </div>
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
          <span className="hidden whitespace-nowrap text-[13px] font-bold text-exam-muted sm:inline">
            {nav ? nav.title : `${assessment.name} 재능진단`}
          </span>
        </div>
        {nav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={nav.at === 0}
              onClick={() => nav.go(nav.at - 1)}
              className="whitespace-nowrap rounded-[6px] border border-exam-line bg-exam-panel px-3 py-1.5 text-[13px] font-semibold text-exam-text disabled:opacity-40"
            >
              ← 이전
            </button>
            <span className="whitespace-nowrap text-[13px] font-bold tabular-nums text-exam-text">
              {nav.at + 1} / {nav.total}
            </span>
            <button
              type="button"
              disabled={nav.at === nav.total - 1}
              onClick={() => nav.go(nav.at + 1)}
              className="whitespace-nowrap rounded-[6px] border border-exam-line bg-exam-panel px-3 py-1.5 text-[13px] font-semibold text-exam-text disabled:opacity-40"
            >
              다음 →
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* 넘김 단추가 선 머리에서는 넓은 화면에서만 — 좁으면 단추 글자가 두 줄로 접힌다 */}
          <span
            className={`hidden whitespace-nowrap rounded-full bg-exam-bg px-3 py-1 text-[12px] font-bold text-exam-muted ${
              nav ? "xl:inline" : "sm:inline"
            }`}
          >
            미리보기 · 답은 저장되지 않습니다
          </span>
          <button
            type="button"
            aria-pressed={reveal}
            onClick={() => setReveal((v) => !v)}
            className={`whitespace-nowrap rounded-[6px] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
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
            className="whitespace-nowrap rounded-[6px] border border-exam-line bg-exam-panel px-3 py-1.5 text-[13px] font-semibold text-exam-text transition-colors hover:border-exam-muted"
          >
            닫기 (Esc)
          </button>
        </div>
      </header>

      <div
        className={`mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 overflow-y-auto bg-exam-panel ${
          hasBrief ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:overflow-hidden" : ""
        }`}
      >
        {hasBrief && (
          <BriefPanel
            brief={content.material}
            range={
              set
                ? `${(nav?.offset ?? 0) + 1}~${(nav?.offset ?? 0) + bank.length}`
                : null
            }
          />
        )}
        {/* 오른쪽 — 응시 화면은 한 화면씩 넘기지만, 미리보기는 화면들을 이어서 세운다 */}
        <div className="order-3 lg:order-2 lg:overflow-y-auto">
          {screens.map((screen) => (
            <div key={screen[0].id} className="border-b border-exam-line">
              <ScreenColumn order={bank} screen={screen} renderQuestion={one} />
            </div>
          ))}
          {reveal && (item.guidance.trim() !== "" || item.reviewRequest.trim() !== "") && (
            <section className="grid gap-3 px-6 py-6 lg:px-10">
              <AuthorNotes item={item} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** 줄바꿈 — 칸마다의 답을 한 줄씩 */
const NL = String.fromCharCode(10);

/**
 * 검수자만 보는 것 — 정답 · 칸마다의 답 · 채점 기준. 아이 화면에는 없는 글이라 점선으로 가른다.
 */
function RevealNotes({ q, cq }: { q: Question; cq?: ContentQuestion }) {
  const choices = choicesOf(q);
  const picks = q.type === "choice" || q.type === "ox";
  const blanks = cq?.response.kind === "blanks" ? cq.response.blanks : [];
  const answers = cq?.sampleAnswer ?? [];
  return (
    <>
      {picks && (
        <Keyed label="정답">
          {choices[q.answer] !== undefined
            ? `${q.answer + 1}번 ${choices[q.answer]}`
            : `정답 번호(${q.answer + 1})가 보기 수(${choices.length})를 벗어났습니다.`}
        </Keyed>
      )}
      {/* 오답 의도 — 이 오답이 무슨 오개념을 잡으려는 것인가 */}
      {q.type === "choice" && q.distractorIntent.some((d, i) => i !== q.answer && d.trim()) && (
        <Keyed label="오답 의도">
          {q.distractorIntent
            .map((d, i) => (i !== q.answer && d.trim() ? `${i + 1}번 — ${d.trim()}` : ""))
            .filter(Boolean)
            .join(NL)}
        </Keyed>
      )}
      {blanks.length > 0 && answers.some((a) => a.trim()) && (
        <Keyed label="칸마다 정답 · 예시 답">
          {blanks
            .map((b, i) => `${b.label || `칸 ${i + 1}`} : ${answers[i]?.trim() || "—"}`)
            .join(NL)}
        </Keyed>
      )}
      {blanks.length === 0 && !picks && answers.some((a) => a.trim()) && (
        <Keyed label="예시 답">{answers.join(NL)}</Keyed>
      )}
      {q.explain.trim() !== "" && <Keyed label="모범답안">{q.explain}</Keyed>}
      {q.rubric.trim() !== "" && <Keyed label="부분점수">{q.rubric}</Keyed>}
      {/* 불인정 예는 출제 화면에서 걷었다 — 인정 예만 보인다 */}
      {q.acceptExamples.trim() !== "" && <Keyed label="인정 예">{q.acceptExamples.trim()}</Keyed>}
      {(q.perspectiveHierarchy.trim() !== "" || q.perspectiveAbility.trim() !== "") && (
        <Keyed label="재능 평가 관점">
          {[
            q.perspectiveHierarchy.trim() && `인지 처리 위계 — ${q.perspectiveHierarchy.trim()}`,
            q.perspectiveAbility.trim() && `인지 능력 수준 — ${q.perspectiveAbility.trim()}`,
          ]
            .filter(Boolean)
            .join(NL)}
        </Keyed>
      )}
    </>
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
      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.75] text-exam-text">
        {children}
      </p>
    </div>
  );
}
