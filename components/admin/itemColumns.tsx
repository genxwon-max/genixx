"use client";

import Link from "next/link";
import { levelSpecs, talentOf } from "@/lib/blueprint";
import { stateLabel, stateTone, typeLabel, type ItemDraft } from "@/lib/itemStore";
import type { Column } from "./DataList";
import * as a from "./ui";

/**
 * 문항 목록의 공통 열.
 *
 * 출제 워크벤치(EXP-02) · 검수 워크벤치(EXP-03) · 문항 은행(ADM-04-1) 셋은 같은
 * 문항을 저마다 다른 일로 본다. 그래서 열은 겹치는데 화면마다 따로 짜 두면 —
 * 실제로 그랬다 — 같은 「문항 ID」가 한 화면에서는 굵은 링크, 다른 화면에서는 그냥
 * 글자, 또 다른 화면에서는 목록도 표도 아닌 줄로 나온다. 매일 세 화면을 오가는
 * 사람은 그때마다 눈을 다시 맞춰야 한다.
 *
 * 겹치는 열을 여기 한 벌만 두고 세 화면이 가져다 쓴다. 화면마다 다른 것은 그
 * 화면의 일뿐이다 — 출제는 「남은 칸」, 검수는 「AI 검수」, 은행은 「정답률」.
 *
 * 값이 쪼개지면 뜻이 상하는 열에는 nowrap을 준다(ui.ts 참고). 발문만 접힌다.
 */

/** 문항 ID — 누르면 그 화면의 상세로 간다 */
export const codeCol = (hrefOf: (i: ItemDraft) => string): Column<ItemDraft> => ({
  key: "code",
  head: "문항 ID",
  nowrap: true,
  cell: (i) => (
    <>
      <Link
        href={hrefOf(i)}
        className="adm-t-md font-black tabular-nums text-brand-800 underline underline-offset-4 hover:text-brand-600"
      >
        {i.code || i.id}
      </Link>
      {/* AI가 낸 초안인지 목록에서 바로 보이게 한다 — 손볼 양이 다르다 */}
      {i.origin === "ai" && (
        <span className="mt-0.5 block adm-t-sm font-bold text-violet-700">AI 초안</span>
      )}
    </>
  ),
});

/** 발문 — 이 목록에서 유일하게 접히는 열 */
export const stemCol: Column<ItemDraft> = {
  key: "stem",
  head: "발문",
  cell: (i) => (
    /* 다른 칸이 모두 nowrap이라 좁아지면 이 칸만 줄어든다. 바닥을 정해 두지 않으면
       한 줄에 두세 글자만 남아 발문이 아니라 얼룩처럼 보인다. */
    <span className="block min-w-[13rem]">
      {/* 한 줄만 두고 넘치면 …으로 자른다. 발문은 목록에서 「이게 그 문항인가」를
          가리는 데만 쓰이고, 전문은 눌러 들어가면 있다. 두 줄로 두면 문항마다 줄
          높이가 달라져 세로로 훑는 눈이 매번 걸린다.

          truncate(=nowrap)가 아니라 line-clamp-1을 쓴다. 표 안에서 nowrap을 주면
          이 칸의 최소 폭이 발문 전체 길이가 되어 칸이 줄어들지 못한다. */}
      <span className="line-clamp-1 adm-t-md font-bold text-exam-text" title={i.stem || undefined}>
        {i.stem || "발문을 아직 쓰지 않았습니다"}
      </span>
      {/* truncate(=nowrap)를 쓰지 않는다. 표 안에서 nowrap을 주면 이 줄의 최소 폭이
          문장 전체 길이가 되어 발문 칸이 줄어들지 못하고, 표가 옆으로 밀린다. */}
      <span className="mt-0.5 line-clamp-1 adm-t-sm">
        {[i.subject, i.grade, i.unit || "단원 미정"].join(" · ")}
      </span>
    </span>
  ),
};

export const typeCol: Column<ItemDraft> = {
  key: "type",
  head: "유형 · 단계",
  hide: "md",
  nowrap: true,
  cell: (i) => (
    <>
      <span className="adm-t-md text-exam-text">{typeLabel(i.type)}</span>
      <span className="mt-0.5 block adm-t-sm">
        {i.level} {levelSpecs[i.level].name}
      </span>
    </>
  ),
};

export const talentCol: Column<ItemDraft> = {
  key: "talent",
  head: "재능 축",
  hide: "xl",
  nowrap: true,
  cell: (i) => (
    <>
      <span className="adm-t-md text-exam-text">{talentOf(i.talent).name}</span>
      <span className="mt-0.5 block adm-t-sm">{i.subskill}</span>
    </>
  ),
};

export const authorCol: Column<ItemDraft> = {
  key: "author",
  head: "출제자",
  hide: "lg",
  nowrap: true,
  cell: (i) => <span className="adm-t-md text-exam-text">{i.authorName}</span>,
};

/**
 * 시각 한 줄과 그 아래 한 마디.
 *
 * 「2026-08-10 14:20」은 통짜 값이라 접히면 안 된다. 아래 줄은 그 시각이 무슨
 * 뜻인지 — 며칠째 대기인지 — 를 적는 자리다.
 */
export const whenCol = (
  head: string,
  note?: (i: ItemDraft) => { text: string; tone?: string } | null,
): Column<ItemDraft> => ({
  key: "when",
  head,
  hide: "md",
  nowrap: true,
  cell: (i) => {
    const n = note?.(i) ?? null;
    return (
      <>
        <span className="adm-t-md tabular-nums text-exam-text">{i.updatedAt}</span>
        {n && (
          <span className={`mt-0.5 block adm-t-sm font-bold ${n.tone ?? "text-exam-muted"}`}>
            {n.text}
          </span>
        )}
      </>
    );
  },
});

/** 상태 — 면을 두지 않고 글자에만 색을 얹는다 */
export const stateCol = (note?: (i: ItemDraft) => string | null): Column<ItemDraft> => ({
  key: "state",
  head: "상태",
  nowrap: true,
  cell: (i) => {
    const n = note?.(i) ?? null;
    return (
      <>
        <span className={`adm-t-md font-bold ${stateTone[i.state]}`}>{stateLabel[i.state]}</span>
        {n && <span className="mt-0.5 block adm-t-sm">{n}</span>}
      </>
    );
  },
});

/** 표 안 버튼 한 개짜리 「할 일」 열 */
export const actionCol = (
  head: string,
  render: (i: ItemDraft) => React.ReactNode,
): Column<ItemDraft> => ({
  key: "act",
  head,
  nowrap: true,
  cell: render,
});

export const linkBtn = (href: string, label: string, strong = false) => (
  <Link href={href} className={strong ? a.btnRow : a.btnRowGhost}>
    {label}
  </Link>
);

/* ───────────────────────── 표를 직접 짠 화면을 위한 조각 ─────────────────────────
   검사지 조립(ADM-04-3)·문항 회전(ADM-04-4)은 고르기와 조립 같은 제 일이 있어
   DataList로 갈아입히지 않았다. 다만 문항번호·단계·상태처럼 목록과 겹치는 칸은
   같은 모양이어야 한다 — 문항 은행 안을 오가며 같은 문항이 화면마다 다르게 보이면
   그게 같은 것인지 먼저 의심하게 된다. */

/** 문항번호 — 목록의 문항 ID 칸과 같은 모양 */
export function ItemCode({ item, href }: { item: ItemDraft; href?: string }) {
  return (
    <Link
      href={href ?? `/admin/items/${item.id}`}
      className="adm-t-md font-black tabular-nums text-brand-800 underline underline-offset-4 hover:text-brand-600"
    >
      {item.code || item.id}
    </Link>
  );
}

/** 단계 — 「S1」만 적으면 무슨 뜻인지 알려면 다른 화면을 봐야 한다 */
export function LevelText({ item }: { item: ItemDraft }) {
  return (
    <>
      <span className="adm-t-md text-exam-text">{item.level}</span>
      <span className="mt-0.5 block adm-t-sm">{levelSpecs[item.level].name}</span>
    </>
  );
}

/** 상태 — 색은 글자에만 얹는다 */
export function StateText({ item, note }: { item: ItemDraft; note?: string | null }) {
  return (
    <>
      <span className={`adm-t-md font-bold ${stateTone[item.state]}`}>{stateLabel[item.state]}</span>
      {note && <span className="mt-0.5 block adm-t-sm">{note}</span>}
    </>
  );
}

/** 정답률 — 너무 쉽거나 너무 어려우면 붉게 짚는다 */
export function RateText({ item }: { item: ItemDraft }) {
  if (item.correctRate === null) return <span className="adm-t-md">출제 전</span>;
  const odd = item.correctRate > 90 || item.correctRate < 40;
  return (
    <span
      className={`adm-t-md font-bold tabular-nums ${odd ? "text-rose-700" : "text-exam-text"}`}
    >
      {item.correctRate}%
    </span>
  );
}
