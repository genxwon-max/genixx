"use client";

import Link from "next/link";
import { designLinks } from "@/lib/designScreens";
import { seedItems } from "@/lib/itemStore";
import { PageHead } from "@/components/admin2/ui";
import Generator, { type GenStart } from "@/app/(admin2)/admin2/authoring/Generator";
import ItemBank from "@/app/(admin2)/admin2/items/ItemBank";
import ConsoleFrame from "../ConsoleFrame";

/**
 * AI 문항 출제(실제 주소 /admin2/authoring)와 문항 은행의 「비슷한 문항 만들기」(/admin2/items) — 디자인
 * (2026-10-28, /design2).
 *
 *   AI 출제 판   고정 배점 안내를 얹고, 맨 위 「만드는 방법」으로 새로 만들기 / 비슷한 문항 만들기를 고른다.
 *                원안지 항목 판(그림·삽화 사양 · 이 문항의 특성)은 두었다가 사용자 지시로 걷었다(같은 날)
 *   문항 은행    줄을 체크로 여럿 고르고 「고른 N개로 비슷한 문항 만들기」 → AI 출제 판이 그 문항을 고른 채 열린다
 *
 * 화면은 실제 조각(app/(admin2)/admin2/authoring/Generator.tsx · items/ItemBank.tsx)이고, 문항은 저장소를
 * 읽지 않고 처음 값(seedItems)을 넘긴다. 「생성」 · 「만들기」는 초안을 만들지 않는다.
 */

const authoringTo = designLinks("ai-authoring");
const bankTo = designLinks("item-bank-similar");

/** 예시로 골라 둔 원본 — 승인된 문항 가운데 앞의 셋 */
const picked = seedItems.filter((i) => i.state === "approved").slice(0, 3).map((i) => i.id);

const starts: Record<string, GenStart> = {
  "": {},
  similar: { mode: "similar" },
  "similar/picked": { mode: "similar", chosen: picked, per: 2 },
};

export function AiAuthoring({ state }: { state: string }) {
  return (
    <ConsoleFrame at="/admin2/authoring">
      <PageHead
        title="AI 문항 출제"
        actions={
          <>
            <Link href={bankTo()} className="a2-btn">
              문항 은행
            </Link>
            <button type="button" className="a2-btn" aria-expanded>
              AI 문항 출제
            </button>
            <button type="button" className="a2-btn a2-btn-primary">
              새 문항
            </button>
          </>
        }
      />
      <Generator
        key={state}
        items={seedItems}
        make={() => []}
        makeSimilar={() => []}
        onDone={() => {}}
        onCancel={() => {}}
        start={starts[state] ?? {}}
      />
    </ConsoleFrame>
  );
}

export function ItemBankSimilar({ state }: { state: string }) {
  return (
    <ConsoleFrame at="/admin2/items">
      <ItemBank
        key={state}
        items={seedItems}
        chosen={state === "select/picked" ? picked : []}
        hrefOf={() => authoringTo("similar/picked")}
      />
    </ConsoleFrame>
  );
}
