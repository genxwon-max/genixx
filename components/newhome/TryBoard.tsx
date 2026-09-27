"use client";

import { Fragment, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "@/components/Icons";
import { circled, subjects } from "@/lib/exam";
import { axes } from "@/lib/result";
import { markKinds, tryItems, type MarkKind, type Seg, type TryItem } from "@/lib/tryItems";
import ReportPanel from "./ReportPanel";
import Rise from "./Rise";

/** 밑줄 세 갈래의 색 — newhome.css의 --nh-*와 짝을 맞춘다 */
const kindTone: Record<MarkKind, { chip: string; bar: string }> = {
  base: { chip: "bg-brand-50 text-brand-700", bar: "bg-brand-500" },
  creative: { chip: "bg-accent-100 text-accent-600", bar: "bg-accent-500" },
  talent: { chip: "bg-surface-mint text-emerald-700", bar: "bg-emerald-500" },
};

/** 글 토막을 그린다. 밑줄 자리는 답을 고른 뒤에야 그어진다 */
function Marked({ segs, item, on }: { segs: Seg[]; item: TryItem; on: boolean }) {
  return (
    <>
      {segs.map((s, i) =>
        typeof s === "string" ? (
          <Fragment key={i}>{s}</Fragment>
        ) : (
          <span
            key={i}
            className={`nh-mark nh-mark--${item.marks[s.mark].kind} ${on ? "is-on" : ""}`}
            /* 밑줄은 한꺼번에 긋지 않는다 — 차례로 그어져야 눈이 따라간다 */
            style={{ "--d": `${180 + s.mark * 220}ms` } as CSSProperties}
          >
            {s.t}
          </span>
        ),
      )}
    </>
  );
}

/**
 * 체험 문항 판 — /newhome 첫 화면.
 *
 * 들어오면 아래에서 올라오고, 다섯 보기 가운데 하나를 고르면 ① 정답 여부 ② 자료·발문의
 * 밑줄 ③ 「진단서 보기」 단추가 차례로 나타난다. 단추를 누르면 문항 판과 같은 크기의
 * 간단 진단서가 그 자리에 살짝 어긋나게 겹쳐 뜨고, 아래의 문항은 희미해진다(ReportPanel).
 *
 * 문항·보기·밑줄 문안은 전부 lib/tryItems.ts에 있다. 여기는 고른 뒤에 무엇을 언제 보여
 * 줄지만 정한다.
 *
 * ⚠ 고른 답은 어디에도 저장하지 않는다. 체험이지 응시가 아니다.
 */
export default function TryBoard() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const item = tryItems[idx];
  const subject = subjects.find((s) => s.id === item.subject)!;
  const axis = axes.find((a) => a.id === item.axis)!;
  const on = picked !== null;
  const right = picked === item.answer;

  /* 다음 문항으로 — 고른 답과 진단서를 함께 접는다 */
  const next = () => {
    setOpen(false);
    setPicked(null);
    setIdx((i) => (i + 1) % tryItems.length);
  };

  /* 진단서를 열 때 문항 판의 머리가 화면에 들어오게 한다. 판이 길어서 「진단서 보기」가
     화면 아래쪽에 있을 때 그대로 열면, 겹쳐 뜬 진단서의 머리는 화면 위로 벗어나 있다 */
  const boardRef = useRef<HTMLDivElement>(null);
  const openReport = () => {
    setOpen(true);
    boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={boardRef} className="relative scroll-mt-24">
      <Rise now lg>
        {/* 진단서가 떠 있는 동안 문항은 비쳐만 보인다 — 무엇에 대한 진단서인지 눈으로
            이어지되, 읽을 것은 위의 판 하나뿐이라는 것이 분명해진다 */}
        <article
          aria-hidden={open}
          className={`overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-float transition duration-500 ${
            open ? "pointer-events-none opacity-30 blur-[1.5px] select-none" : "opacity-100"
          }`}
        >
          {/* ── 머리띠 ── */}
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-brand-100 bg-brand-50/70 px-5 py-3 sm:px-6">
            {/* 머리띠에는 과목과 체험용 표시만 둔다. 위계 이름과 그 설명은 답을 고르기
                전에 읽을 말이 아니다 — 무엇을 재는지는 답을 고른 뒤 밑줄 이름표가 적는다.
                둘 다 알약·면을 두르지 않고 글자만 세운다 */}
            <span className="type-tag text-brand-900">{subject.short}</span>
            <span className="type-caption ml-auto text-slate-500">
              체험용 · 실제 회차에 나오지 않습니다
            </span>
          </header>

          {/* 자료 위, 발문 아래 — 한 단으로 세운다. 두 단으로 벌리면 판이 화면을 가로로
              다 먹어 버려서, 옆에 둔 말이 문항 아래로 밀려난다 */}
          <div>
            {/* ── 자료 ── */}
            <div className="border-b border-brand-100 bg-brand-50/30 px-5 py-5 sm:px-6">
              <p className="type-tag text-brand-500">{item.material.label}</p>
              <p className="type-h3 mt-1.5 font-black text-brand-950">{item.material.title}</p>
              {item.material.paras.map((p, i) => (
                <p key={i} className="type-body mt-3 text-slate-700">
                  <Marked segs={p} item={item} on={on} />
                </p>
              ))}
            </div>

            {/* ── 발문과 보기 ── */}
            <div className="px-5 py-5 sm:px-6">
              <p className="type-h3 font-black text-brand-950">
                <Marked segs={item.stem} item={item} on={on} />
              </p>

              <ol className="mt-4 space-y-1.5">
                {item.choices.map((c, i) => {
                  const isPicked = picked === i;
                  const isAnswer = item.answer === i;
                  /* 고르기 전에는 전부 같은 모양. 고른 뒤에는 정답과 내가 고른 것만 남기고
                     나머지는 뒤로 물린다 — 다섯 줄이 모두 강조되면 아무것도 안 읽힌다 */
                  const tone = !on
                    ? "border-brand-100 bg-white hover:border-brand-300 hover:bg-brand-50/60"
                    : isAnswer
                      ? "border-emerald-300 bg-surface-mint"
                      : isPicked
                        ? "border-amber-300 bg-surface-amber"
                        : "border-transparent bg-white opacity-55";
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={on}
                        onClick={() => setPicked(i)}
                        aria-pressed={isPicked}
                        className={`nh-choice flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left disabled:cursor-default ${tone}`}
                      >
                        <span
                          aria-hidden
                          className={`type-meta mt-px shrink-0 font-bold tabular-nums ${
                            on && isAnswer
                              ? "text-emerald-600"
                              : on && isPicked
                                ? "text-amber-600"
                                : "text-brand-400"
                          }`}
                        >
                          {circled(i)}
                        </span>
                        <span className="type-body text-slate-700">{c.text}</span>
                      </button>

                      {/* 고른 보기와 정답에만 한 줄을 붙인다 */}
                      {on && (isPicked || isAnswer) && (
                        <p className="type-caption mt-1.5 pr-1 pl-9 text-slate-600">
                          {isAnswer && !isPicked && (
                            <span className="font-bold text-emerald-700">정답 · </span>
                          )}
                          {c.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>

              {!on && (
                <p className="type-caption mt-4 text-slate-500">
                  하나를 고르면 정답 여부와 함께, 자료에서 무엇을 보고 있었는지 밑줄로 표시됩니다.
                </p>
              )}
            </div>
          </div>

          {/* ── 고른 뒤 ── */}
          <div
            aria-live="polite"
            className={`border-t border-brand-100 px-5 py-5 sm:px-6 ${
              on ? (right ? "bg-surface-mint/50" : "bg-surface-amber/40") : "bg-white"
            }`}
          >
            {!on ? (
              <p className="type-meta text-slate-500">
                {subject.name} · {axis.label} 축 · 이 문항 하나로 여덟 축을 다 보지는 않습니다.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className={`type-tag rounded-full px-3 py-1.5 text-white ${
                      right ? "bg-emerald-600" : "bg-amber-600"
                    }`}
                  >
                    {right ? "정답입니다" : "정답은 " + circled(item.answer) + "번"}
                  </span>
                  <p className="type-meta text-slate-700">
                    {right
                      ? "맞고 틀림은 학력 축입니다. 재능 축은 아래 밑줄이 그어진 자리에서 봅니다."
                      : "틀린 답도 버리지 않습니다. 어느 설명을 먼저 떠올렸는지가 기록됩니다."}
                  </p>
                </div>

                {/* 밑줄 이름표 — 본문의 밑줄이 다 그어진 뒤 차례로 뜬다 */}
                {/* 판이 한 단으로 좁아져 이름표도 세로로 쌓는다 — 세 칸으로 벌리면
                    한 줄에 서너 글자씩만 들어가 읽히지 않는다 */}
                <ul className="mt-4 grid gap-2.5">
                  {item.marks.map((m, i) => (
                    <li
                      key={m.label}
                      className="nh-tag rounded-xl border border-white bg-white/80 px-3.5 py-3"
                      style={{ "--d": `${700 + i * 140}ms` } as CSSProperties}
                    >
                      <span
                        className={`type-tag inline-block rounded-full px-2 py-0.5 ${kindTone[m.kind].chip}`}
                      >
                        {markKinds[m.kind].name}
                      </span>
                      <p className="type-caption mt-1.5 font-black text-brand-950">{m.label}</p>
                      <p className="type-caption mt-1 text-slate-600">{m.why}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={openReport}
                    className="btn btn-md nh-breathe bg-accent-600 text-white hover:bg-accent-500"
                  >
                    진단서 보기
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPicked(null)}
                    className="btn btn-md border border-brand-200 bg-white text-brand-800 hover:border-brand-400"
                  >
                    다시 풀기
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="type-meta ml-auto rounded-lg px-2.5 py-2 font-bold text-brand-700 underline-offset-4 hover:underline"
                  >
                    다른 문항으로 ({idx + 1}/{tryItems.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </article>
      </Rise>

      <ReportPanel item={item} picked={picked} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
