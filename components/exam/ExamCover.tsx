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
 * ── 표는 읽기만 한다 ──
 * 한동안 셋트 창이 이 표를 고르개로 썼다 — 학년 칸과 응시 교과 칸을 눌러 채워야 시작할 수
 * 있었다. 이제 그 둘은 표지를 넘긴 뒤 1번 · 2번 문항으로 묻는다(TrialSession). 표지에서
 * 고를 것이 없어졌으므로 표는 이미 정해진 것(응시 창의 학년 · 이름 · 접속코드 · 과목)을
 * 적어 보이는 자리로만 남는다. 적을 것이 하나도 없는 셋트 창은 표를 세우지 않는다.
 *
 * 채울 수 없는 칸(비어 있는 수강학원)은 비워 둔다. 비어 있다는 것 자체가 「여기는 아직
 * 없다」를 말한다. 명부에 없는 사람의 이름·ID처럼 왜 비었는지가 따로 있는 칸에는 그 까닭을
 * 옅은 글씨로 적는다(muted).
 */

/** 표의 한 칸 */
export type CoverCell =
  /** 회색 이름 칸 — 「학년」·「이름」 */
  | { kind: "label"; text: string }
  /** 값 칸. on이면 채워진 칸, muted면 아직 없는 값 */
  | { kind: "value"; key: string; text: string; on?: boolean; muted?: boolean; width?: string };

/** 테두리로 묶인 표 하나 — 「이름 김하늘 ID RXP6-N9TR」 */
export type CoverGroup = {
  id: string;
  cells: CoverCell[];
  /** 좁은 화면에서 감춘다 — 적을 것이 없는 칸이 종이 밖으로 삐져나가면 종이로 안 보인다 */
  hideOnNarrow?: boolean;
};

/* 좁은 화면에서는 좌우 여백을 줄인다 — 인적사항 한 줄(이름 · ID)이 종이 폭을 넘으면
   표가 종이 밖으로 비어져 나간다. 줄이는 것은 여백뿐이고, 칸의 최소 폭(min-w-[3.5rem])과
   높이(h-12)는 그대로다 */
const labelCell =
  "flex h-12 items-center justify-center whitespace-nowrap bg-slate-100 px-3 text-[14.5px] font-medium text-exam-text md:h-14 md:px-5 md:text-[15.5px]";

/**
 * 값 칸의 꼴.
 *
 * ── 채워진 칸을 먹칠하지 않는다 ──
 * 예전에는 채워진 칸(지금 보는 과목)을 시험지 글자색(짙은 남색)으로 통째로 채웠다. 표에서
 * 그 칸만 먼저 읽히고, 종이 위에 검은 딱지를 붙인 꼴이 된다. 옅게 깔고 테두리를 한 겹 더
 * 두른다 — 종이에서 칸에 동그라미를 치는 것과 같은 말이다.
 */
function valueClass(on: boolean, muted: boolean, width?: string) {
  /* 줄을 바꾸지 않는다 — 접속코드(RXP6-N9TR)가 붙임표에서 두 줄로 갈려 칸 높이가
     옆 칸과 어긋났다. 종이의 인적사항 칸은 한 줄로 적는 자리다. 칸이 좁으면 글자를
     접을 것이 아니라 칸이 넓어져야 하므로, 폭은 아래에서 min-w로 준다 */
  const base = `flex h-12 items-center justify-center whitespace-nowrap border-l border-exam-text/70 px-3 text-[16px] md:h-14 md:px-5 md:text-[17px] ${
    width ?? "min-w-[3.5rem]"
  }`;
  if (on)
    return `${base} bg-soft-primary-soft font-bold text-soft-primary shadow-[inset_0_0_0_2px_var(--color-soft-primary)]`;
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
  /** 회차 줄 — 「2026학년도 3분기 GENIXX 재능 진단 무료 문항지」 */
  headline: string;
  /** 검사 이름 — 「TalentMe」 */
  title: string;
  /** 비스듬한 워터마크 글자 */
  watermark: string;
  /** 인적사항 표 — 적을 것이 없으면(셋트 창) 비워 넘기고, 그때는 표를 세우지 않는다 */
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

        {/* 원본 종이에는 검사 이름 오른쪽에 「수강학원」 칸이 있었다. 학원이 아이를 데리고
            와 단체로 보는 검사라 종이에 그 칸이 필요했던 것인데, 여기는 보호자가 직접
            접수해 아이가 자기 화면에서 보는 자리다. 채울 사람이 없는 빈 칸을 종이에
            남겨 두면 「여기에 무엇을 적어야 하나」를 한 번 묻게 된다 */}
        <h1 className="mt-5 text-center text-[32px] font-bold tracking-[0.22em] text-exam-text md:text-[42px]">
          {title}
        </h1>

        {groups.length > 0 && (
          <div className="mt-7 flex flex-wrap items-start gap-x-3 gap-y-3">
            {groups.map((g) => (
              <div
                key={g.id}
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
                  ) : (
                    <span key={c.key} className={valueClass(!!c.on, !!c.muted, c.width)}>
                      {c.text}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        )}

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
