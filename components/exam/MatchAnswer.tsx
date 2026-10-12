"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  connectPair,
  joinPairs,
  matchLeftName,
  matchRightName,
  splitPairs,
  type Match,
  type MatchItem,
  type Pair,
} from "@/lib/exam";

/**
 * 선 잇기 — 왼쪽 항목과 오른쪽 항목을 선으로 잇는 답 칸.
 *
 * 종이 시험지의 「알맞은 것끼리 선으로 이으시오」다. 두 줄의 항목이 마주 보고, 마주 보는
 * 모서리에 점이 하나씩 있다. 잇는 방법은 둘이다 —
 *
 *   차례로 누른다   한쪽 항목을 누르고 맞은편 항목을 누른다. 키보드로도 같다
 *   끌어서 잇는다   점(또는 항목)에서 맞은편 항목까지 끈다. 끄는 동안 점선이 손끝을 따라온다
 *
 * 선을 하나만 받는 항목에 다시 이으면 앞의 선이 옮겨 간다(lib/exam.ts의 connectPair) — 잘못
 * 이은 것은 지우지 않고 다시 이어서 고친다. 선을 그냥 지우려면 그 선을 누른다.
 *
 * ── 항목 수가 달라도 된다 ──
 * 왼쪽 둘 · 오른쪽 다섯이면 왼쪽 두 항목이 오른쪽 줄의 높이에 고르게 나뉘어 선다. 선이 한
 * 점에 여럿 모여도 점은 하나다.
 *
 * ── 선은 잰 자리에 그린다 ──
 * 항목의 글이 길면 줄이 바뀌어 높이가 달라진다. 그래서 점의 자리를 화면에서 재고 그 위에 SVG로
 * 선을 긋는다. 칸이나 항목의 크기가 바뀔 때마다 다시 잰다.
 *
 * 안내와 단추는 고딕으로 적는다 — 항목은 시험지의 글이고 안내는 화면이 하는 말이다.
 *
 * ⚠ 항목의 사진(MatchItem.image)은 출제 화면이 아직 받지 않아 여기서도 그리지 않는다.
 */

type Side = "left" | "right";

/** 고른 항목 — 맞은편 항목을 기다리는 중이다 */
export type MatchPick = { side: Side; index: number };

type Pt = { x: number; y: number };

/** 선의 색 — 응시 중에는 먹빛 하나, 채점한 모양에서는 셋으로 갈린다 */
type Tone = "ink" | "right" | "wrong" | "missing";

const toneStroke: Record<Tone, string> = {
  ink: "stroke-exam-text",
  right: "stroke-emerald-600",
  wrong: "stroke-rose-600",
  missing: "stroke-emerald-600",
};

const same = (a: Pair, b: Pair) => a[0] === b[0] && a[1] === b[1];
const has = (list: Pair[], p: Pair) => list.some((x) => same(x, p));
const otherSide = (side: Side) => (side === "left" ? "오른쪽" : "왼쪽");

export default function MatchAnswer({
  match,
  value,
  onAnswer,
  readOnly = false,
  answer,
  pick,
}: {
  match: Match;
  value: number | string | undefined;
  onAnswer: (value: string) => void;
  /** 낸 답을 보기만 한다(답안 풀이 · 채점) — 항목이 눌리지 않고 안내와 지우는 단추를 걷는다 */
  readOnly?: boolean;
  /**
   * 정답인 선 — 넘기면 **채점한 모양**으로 선다. 바르게 이은 선은 초록, 잘못 이은 선은 빨강,
   * 잇지 않은 정답은 초록 점선이다.
   */
  answer?: Pair[];
  /**
   * 고른 항목을 밖에서 정한다 — 디자인 보기가 「항목을 고른 상태」를 주소로 굳힐 때 쓴다.
   * null이면 아무것도 고르지 않은 채로 둔다. 넘기지 않으면 누르는 대로 바뀐다.
   */
  pick?: MatchPick | null;
}) {
  const pairs = splitPairs(value, match);
  const [own, setOwn] = useState<MatchPick | null>(null);
  const picked = pick !== undefined ? pick : own;
  /** 끌어서 잇는 중 — 어디서 시작했고 손끝이 어디 있는가(칸 안의 좌표) */
  const [drag, setDrag] = useState<{ from: MatchPick; at: Pt } | null>(null);
  /** 잰 점의 자리 — 칸의 왼쪽 위에서부터 */
  const [dots, setDots] = useState<Record<Side, Pt[]> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  /** 방금 끌었는가 — 끌고 나서 같은 항목 위에서 손을 떼면 따라오는 click을 누른 것으로 세지 않는다 */
  const dragged = useRef(false);

  const leftCount = match.left.length;
  const rightCount = match.right.length;

  useEffect(() => {
    const el = box.current;
    if (!el || leftCount === 0 || rightCount === 0) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const read = (side: Side) =>
        Array.from(el.querySelectorAll<HTMLElement>(`[data-dot="${side}"]`)).map((d) => {
          const r = d.getBoundingClientRect();
          return {
            x: Math.round((r.left + r.width / 2 - base.left) * 10) / 10,
            y: Math.round((r.top + r.height / 2 - base.top) * 10) / 10,
          };
        });
      const next = { left: read("left"), right: read("right") };
      /* 같은 자리면 다시 그리지 않는다 */
      setDots((was) => (JSON.stringify(was) === JSON.stringify(next) ? was : next));
    };
    /* 처음 붙일 때 한 번 불리고, 그 뒤로는 칸이나 항목의 크기가 바뀔 때마다 불린다 */
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    el.querySelectorAll("[data-item]").forEach((n) => watch.observe(n));
    return () => watch.disconnect();
  }, [leftCount, rightCount]);

  const link = (a: MatchPick, b: MatchPick) => {
    const l = a.side === "left" ? a.index : b.index;
    const r = a.side === "left" ? b.index : a.index;
    onAnswer(joinPairs(connectPair(match, pairs, [l, r])));
  };
  const cut = (p: Pair) => onAnswer(joinPairs(pairs.filter((x) => !same(x, p))));

  const tap = (it: MatchPick) => {
    if (dragged.current) return;
    if (!picked) return setOwn(it);
    if (picked.side === it.side) return setOwn(picked.index === it.index ? null : it);
    link(picked, it);
    setOwn(null);
  };

  const start = (from: MatchPick) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    /* 잠긴 문항(해석 화면의 fieldset disabled)에서는 끌리지 않는다 */
    if (e.button !== 0 || e.currentTarget.matches(":disabled")) return;
    dragged.current = false;
    const origin = { x: e.clientX, y: e.clientY };
    const move = (ev: PointerEvent) => {
      /* 조금 움직인 것은 누른 것으로 본다 — 손이 떨려도 고르기가 끊기지 않는다 */
      if (!dragged.current && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < 6) return;
      const base = box.current?.getBoundingClientRect();
      if (!base) return;
      dragged.current = true;
      setOwn(from);
      setDrag({ from, at: { x: ev.clientX - base.left, y: ev.clientY - base.top } });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!dragged.current) return;
      setDrag(null);
      setOwn(null);
      /* 손을 뗀 뒤에 오는 click까지 지나고 나서 푼다 */
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
      if (ev.type === "pointercancel") return;
      const hit = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>("[data-item]");
      if (!hit || !box.current?.contains(hit)) return;
      const side = hit.dataset.side as Side;
      if (side !== from.side) link(from, { side, index: Number(hit.dataset.index) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  /* 그릴 선 — 채점한 모양에서는 낸 선을 정답과 견주고, 잇지 않은 정답을 점선으로 더한다 */
  const lines: { pair: Pair; tone: Tone }[] = answer
    ? [
        ...pairs.map((pair) => ({ pair, tone: has(answer, pair) ? ("right" as const) : ("wrong" as const) })),
        ...answer.filter((p) => !has(pairs, p)).map((pair) => ({ pair, tone: "missing" as const })),
      ]
    : pairs.map((pair) => ({ pair, tone: "ink" as const }));

  const nameOf = (it: MatchPick) =>
    it.side === "left" ? matchLeftName(it.index) : matchRightName(it.index);

  const item = (side: Side, index: number, it: MatchItem) => {
    const on = picked?.side === side && picked.index === index;
    const mine = pairs.filter((p) => p[side === "left" ? 0 : 1] === index);
    const shell = `relative flex min-h-[3.25rem] w-full items-center gap-2.5 rounded-[2px] border bg-exam-panel py-2.5 text-left text-[14px] leading-[1.7] text-exam-text transition-colors ${
      side === "left" ? "pl-3.5 pr-6" : "pl-6 pr-3.5"
    } ${
      on
        ? "border-exam-text shadow-[inset_0_0_0_1px_var(--color-exam-text)]"
        : "border-exam-line"
    }`;
    const body = (
      <>
        {/* 항목의 이름 — 왼쪽 (1) · (2), 오른쪽 ㄱ · ㄴ. 두 줄이 같은 글꼴로 서도록 고딕으로 적는다
            (명조에는 낱자 ㄱ · ㄴ의 굵은 글자가 없어 그대로 두면 오른쪽만 다른 글꼴로 바뀐다) */}
        <span className="shrink-0 font-sans text-[13px] font-bold tabular-nums">
          {nameOf({ side, index })}
        </span>
        <span className={`min-w-0 [overflow-wrap:anywhere] ${on ? "font-semibold" : ""}`}>
          {it.text}
        </span>
        {mine.length > 0 && (
          <span className="sr-only">
            {" "}
            —{" "}
            {mine
              .map((p) => (side === "left" ? matchRightName(p[1]) : matchLeftName(p[0])))
              .join(" · ")}
            에 이었습니다
          </span>
        )}
        {/* 점 — 선이 닿는 자리. 손가락으로 끌 때는 점 둘레를 잡는다(before로 잡는 자리를 넓힌다) */}
        <span
          data-dot={side}
          aria-hidden
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 touch-none rounded-full border border-exam-text before:absolute before:-inset-3 before:content-[''] ${
            side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
          } ${mine.length > 0 || on ? "bg-exam-text" : "bg-exam-panel"} ${
            on ? "ring-4 ring-exam-text/15" : ""
          }`}
        />
      </>
    );
    if (readOnly) {
      return (
        <div data-item className={shell}>
          {body}
        </div>
      );
    }
    return (
      <button
        type="button"
        data-item
        data-side={side}
        data-index={index}
        aria-pressed={on}
        onClick={() => tap({ side, index })}
        onPointerDown={start({ side, index })}
        className={`${shell} cursor-pointer select-none outline-none hover:border-exam-muted focus-visible:ring-2 focus-visible:ring-exam-text disabled:cursor-default disabled:hover:border-exam-line`}
      >
        {body}
      </button>
    );
  };

  const from = drag && dots ? dots[drag.from.side][drag.from.index] : null;

  return (
    <div className="mt-7 max-w-[46rem]">
      <div
        ref={box}
        className="relative grid grid-cols-[minmax(0,1fr)_clamp(2.75rem,14%,6.5rem)_minmax(0,1fr)]"
      >
        <ul aria-label="왼쪽 항목" className="flex flex-col justify-around gap-3">
          {match.left.map((it, i) => (
            <li key={i}>{item("left", i, it)}</li>
          ))}
        </ul>
        <div aria-hidden />
        <ul aria-label="오른쪽 항목" className="flex flex-col justify-around gap-3">
          {match.right.map((it, i) => (
            <li key={i}>{item("right", i, it)}</li>
          ))}
        </ul>

        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {dots &&
            lines.map(({ pair, tone }) => {
              const a = dots.left[pair[0]];
              const b = dots.right[pair[1]];
              if (!a || !b) return null;
              const at = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
              const key = `${pair[0]}-${pair[1]}`;
              if (readOnly) {
                return (
                  <line
                    key={key}
                    {...at}
                    className={toneStroke[tone]}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeDasharray={tone === "missing" ? "5 5" : undefined}
                  />
                );
              }
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                /* 이은 선 — 누르면 지워진다. 가는 선은 잡기 어려워 보이지 않는 굵은 선을 겹쳐 둔다 */
                <g
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${matchLeftName(pair[0])} · ${matchRightName(pair[1])} 선 지우기`}
                  onClick={() => cut(pair)}
                  onKeyDown={(e) => {
                    if (!["Enter", " ", "Delete", "Backspace"].includes(e.key)) return;
                    e.preventDefault();
                    cut(pair);
                  }}
                  className="group pointer-events-auto cursor-pointer outline-none [fieldset:disabled_&]:pointer-events-none"
                >
                  <line {...at} stroke="transparent" strokeWidth={16} pointerEvents="stroke" />
                  <line
                    {...at}
                    className="stroke-exam-text transition-colors group-hover:stroke-rose-600 group-focus-visible:stroke-rose-600"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                  />
                  <g className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <circle cx={mx} cy={my} r={9} className="fill-white stroke-rose-600" strokeWidth={1.5} />
                    <path
                      d={`M${mx - 3.5} ${my - 3.5}L${mx + 3.5} ${my + 3.5}M${mx + 3.5} ${my - 3.5}L${mx - 3.5} ${my + 3.5}`}
                      className="stroke-rose-600"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              );
            })}
          {drag && from && (
            <line
              x1={from.x}
              y1={from.y}
              x2={drag.at.x}
              y2={drag.at.y}
              className="stroke-exam-text"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>

      {!readOnly && (
        <div className="relative z-20 mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 font-sans [fieldset:disabled_&]:hidden">
          <p
            aria-live="polite"
            className="min-w-0 flex-1 basis-64 text-[12px] leading-relaxed text-exam-muted"
          >
            {picked ? (
              <>
                <b className="text-exam-text">{nameOf(picked)}</b> 항목을 골랐습니다. 이을{" "}
                {otherSide(picked.side)} 항목을 누르세요.
              </>
            ) : (
              <>
                두 항목을 차례로 누르거나 점에서 점으로 끌어서 잇습니다.
                {match.many.left && match.many.right
                  ? " 한 항목에 선을 여러 개 이을 수 있습니다."
                  : match.many.left
                    ? " 왼쪽 항목에는 선을 여러 개 이을 수 있습니다."
                    : match.many.right
                      ? " 오른쪽 항목에는 선을 여러 개 이을 수 있습니다."
                      : ""}{" "}
                이은 선을 누르면 지워집니다.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              onAnswer(joinPairs([]));
              setOwn(null);
            }}
            disabled={pairs.length === 0}
            className="inline-flex h-8 shrink-0 items-center rounded-[2px] border border-exam-line bg-exam-panel px-3 text-[12px] font-bold text-exam-text outline-none transition-colors hover:border-exam-muted hover:bg-exam-raised focus-visible:ring-2 focus-visible:ring-exam-text disabled:cursor-default disabled:opacity-40 disabled:hover:border-exam-line disabled:hover:bg-exam-panel"
          >
            모두 지우기
          </button>
        </div>
      )}

      {answer && (
        <ul className="relative z-20 mt-4 flex flex-wrap gap-x-5 gap-y-1 font-sans text-[12px] text-exam-muted">
          <Legend tone="right" label="바르게 이은 선" />
          <Legend tone="wrong" label="잘못 이은 선" />
          <Legend tone="missing" label="잇지 않은 정답" />
        </ul>
      )}
    </div>
  );
}

/** 채점한 모양의 선 색이 무엇을 뜻하는지 — 선 한 토막과 글 */
function Legend({ tone, label }: { tone: Tone; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <svg aria-hidden width="22" height="8" className="shrink-0">
        <line
          x1="1"
          y1="4"
          x2="21"
          y2="4"
          className={toneStroke[tone]}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeDasharray={tone === "missing" ? "5 5" : undefined}
        />
      </svg>
      {label}
    </li>
  );
}
