"use client";

import type { ReactNode } from "react";

/**
 * 시험지 **표지**.
 *
 * 의뢰인이 건넨 실제 검사지 표지(2024 한국창의영재교육원 영재성검사 Ⅰ)의 짜임을 그대로
 * 옮긴 것이다. 왼쪽 위 교시 딱지, 가운데 회차 줄과 검사 이름, 오른쪽 기관 칸, 그 아래
 * 인적사항 표, 비스듬한 워터마크, 맨 아래 「넘기지 마시오」 상자.
 *
 * 셋트 창과 응시 창이 같은 표지를 쓴다. 아이가 가입 전에 본 종이와 가입한 뒤 받는 종이가
 * 다르면, 같은 검사를 두 번 처음 보는 셈이 된다. 갈래마다 다른 것은 **표에 무엇이 적히는가**
 * 뿐이라 그 부분만 밖에서 넘긴다.
 *
 * ── 표를 고르개로 쓴다 ──
 * 종이에서 손으로 적는 칸이 화면에서는 곧 고르개다. 칸에 onPick이 있으면 누를 수 있고, 고른
 * 칸은 채워진다. 표를 그려 놓고 그 아래에 따로 고르개를 두면 같은 것을 두 번 묻는 꼴이 된다.
 *
 * 채울 수 없는 칸(비어 있는 수강학원)은 비워 둔다. 비어 있다는 것 자체가 「여기는 아직
 * 없다」를 말한다. 가입 전의 이름·ID처럼 왜 비었는지가 따로 있는 칸에는 그 까닭을 옅은
 * 글씨로 적는다(muted).
 */

/** 표의 한 칸 */
export type CoverCell =
  /** 회색 이름 칸 — 「학년」·「이름」 */
  | { kind: "label"; text: string }
  /** 값 칸. onPick이 있으면 고르개, on이면 채워진 칸, muted면 아직 없는 값 */
  | {
      kind: "value";
      key: string;
      text: string;
      on?: boolean;
      muted?: boolean;
      width?: string;
      onPick?: () => void;
    };

/** 테두리로 묶인 표 하나 — 「학년 3 4 5 6」 */
export type CoverGroup = {
  id: string;
  cells: CoverCell[];
  /** 고르개인 표에만 — 낭독기가 무엇을 고르는 자리인지 말한다 */
  ariaLabel?: string;
  /** 좁은 화면에서 감춘다 — 적을 것이 없는 칸이 종이 밖으로 삐져나가면 종이로 안 보인다 */
  hideOnNarrow?: boolean;
};

const labelCell =
  "flex h-12 items-center justify-center bg-slate-100 px-4 text-[14.5px] font-medium text-exam-text md:h-14 md:px-5 md:text-[15.5px]";

/**
 * 값 칸의 꼴.
 *
 * ── 고른 칸을 먹칠하지 않는다 ──
 * 예전에는 고른 칸을 시험지 글자색(짙은 남색)으로 통째로 채웠다. 표에서 그 칸만 먼저
 * 읽히고, 종이 위에 검은 딱지를 붙인 꼴이 된다. 옅게 깔고 테두리를 한 겹 더 두른다 —
 * 종이에서 답을 고를 때 칸에 동그라미를 치는 것과 같은 말이다.
 *
 * ── 칸을 크게 둔다 ──
 * 학년 넷과 교과 셋은 이 표에서 **누르는 자리**다. 글씨만 적어 두는 칸과 같은 크기면
 * 누를 것이 있다는 것이 보이지 않고, 손가락으로 누르기에도 좁다.
 */
function valueClass(on: boolean, pickable: boolean, muted: boolean, width?: string) {
  const base = `flex h-12 items-center justify-center border-l border-exam-text/70 px-4 text-[16px] md:h-14 md:px-5 md:text-[17px] ${
    width ?? "min-w-[3.5rem]"
  }`;
  if (on)
    return `${base} bg-soft-primary-soft font-bold text-soft-primary shadow-[inset_0_0_0_2px_var(--color-soft-primary)] transition-colors`;
  if (pickable) return `${base} text-exam-text transition-colors hover:bg-exam-raised`;
  return `${base} ${muted ? "text-[13px] text-exam-muted" : "text-exam-text"}`;
}

export default function ExamCover({
  badge,
  headline,
  title,
  watermark,
  groups,
  notice,
  action,
}: {
  /** 왼쪽 위 딱지 — 「제1교시」 */
  badge: string;
  /** 회차 줄 — 「2026학년도 3분기 GENIXX 진단평가 무료시험 문항지」 */
  headline: string;
  /** 검사 이름 — 「TalentMe」 */
  title: string;
  /** 비스듬한 워터마크 글자 */
  watermark: string;
  groups: CoverGroup[];
  /** 「넘기지 마시오」 상자 아래 괄호 줄 */
  notice: ReactNode;
  /**
   * 시작 단추 — 「넘기지 마시오」 상자 **바로 아래 오른쪽**, 종이 안에 선다.
   *
   * 종이 바깥에 두면 「이 면을 넘기지 마시오」와 「시작」이 서로 다른 자리에서 말하게
   * 되어, 넘기라는 말인지 넘기지 말라는 말인지 한 번 더 읽어야 한다. 넘기지 말라는
   * 줄 끝에 붙여 두면 그것이 곧 **면을 넘기는 손잡이**로 읽힌다.
   */
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border border-exam-line bg-white px-7 py-10 shadow-sm md:px-14 md:py-14">
      {/* 워터마크 — 종이의 그것처럼 읽히되 읽는 것을 가리지 않는다 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="-rotate-[28deg] whitespace-nowrap text-[68px] font-black tracking-[0.06em] text-exam-text/[0.055] md:text-[104px]">
          {watermark}
        </span>
      </span>

      <div className="relative font-myeongjo">
        <p className="inline-flex items-center rounded-full border-2 border-exam-text px-6 py-1.5 text-[19px] font-bold tracking-[0.3em] text-exam-text md:text-[22px]">
          {badge}
        </p>

        <p className="mt-10 border-b border-exam-text/25 pb-3 text-center text-[15px] text-exam-text md:mt-12 md:text-[17px]">
          {headline}
        </p>

        <div className="mt-5 flex items-center gap-4">
          <h1 className="flex-1 text-center text-[32px] font-bold tracking-[0.22em] text-exam-text md:text-[42px]">
            {title}
          </h1>
          <div className="hidden shrink-0 border border-exam-text/70 sm:flex">
            <span className={labelCell}>수강학원</span>
            <span className="h-10 w-[7rem] border-l border-exam-text/70" />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-start gap-x-3 gap-y-3">
          {groups.map((g) => (
            <div
              key={g.id}
              role={g.ariaLabel ? "group" : undefined}
              aria-label={g.ariaLabel}
              className={`border border-exam-text/70 ${g.hideOnNarrow ? "hidden sm:flex" : "flex"}`}
            >
              {g.cells.map((c, i) =>
                c.kind === "label" ? (
                  <span
                    key={`l-${i}`}
                    className={`${labelCell} ${i > 0 ? "border-l border-exam-text/70" : ""}`}
                  >
                    {c.text}
                  </span>
                ) : c.onPick ? (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={!!c.on}
                    onClick={c.onPick}
                    className={valueClass(!!c.on, true, false, c.width)}
                  >
                    {c.text}
                  </button>
                ) : (
                  <span
                    key={c.key}
                    className={valueClass(!!c.on, false, !!c.muted, c.width)}
                  >
                    {c.text}
                  </span>
                ),
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 border border-exam-text/70 md:mt-16">
          <p className="bg-slate-100 px-4 py-3 text-center text-[15px] font-bold tracking-tight text-exam-text md:text-[19px]">
            ※ 시작하기 전에는 이 면을 넘기지 마시오.
          </p>
          <p className="border-t border-exam-text/70 px-4 py-2.5 text-center text-[12px] leading-relaxed text-exam-text md:text-[13px]">
            {notice}
          </p>
        </div>

        {action && <div className="mt-5 flex justify-end">{action}</div>}
      </div>
    </div>
  );
}
