"use client";

import type { Level } from "@/lib/blueprint";
import { findUnit, unitPlace } from "@/lib/curriculumUnits";
import type { ItemDraft } from "@/lib/itemStore";
import { Blue, Red } from "@/components/admin2/Guide";
import { FormRow } from "@/components/admin2/ui";
import BandUnitRows from "./BandUnitRows";

/**
 * 문항 상세를 원안지 모양으로 — 종이 「Genixx 지필 진단 문항 출제 원안지 양식」(2026-10-22 최종)의
 * 머리와 장 제목, 그리고 세트가 통째로 쥐는 ① · ② 칸(2026-10-28 요청).
 *
 * 원안지는 한 장짜리 문서다. 맨 위에 제목과 파란 머리(「3학년 국어 1학기 1단원 「생생하게
 * 표현해요」」), 「Ⅰ. 문항 원안」 아래 「1. 문항 S1」 · 「2. 문항 S2」 … 표가 하나씩, 맨 끝에
 * 「Ⅱ. 제출 전 자가 체크리스트」. 화면도 이 차례로 흰 종이(admin2.css .a2-paper) 위에 선다.
 *
 * 실제 문항 상세(ItemDetail)와 디자인 보기(components/design/screens/ItemSlots)가 같이 쓴다.
 */

/** 원안지 머리 — 제목과, 학년 · 과목 · 학기 · 단원을 파란 글로 */
export function PaperHead({
  item,
}: {
  item: Pick<ItemDraft, "gradeNo" | "subject" | "unit" | "unitNo" | "unitTerm">;
}) {
  /* 교과서 단원 목록에서 고른 단원이면 학기 · 몇 단원을 거기서 읽는다(② 칸 옆에 적는 것과 같은 값).
     목록 밖 단원(손으로 적은 것 · 1·2학년)은 적어 둔 단원 번호만 붙인다 — 학기를 모른다 */
  const picked = findUnit(item, item.gradeNo);
  const no = Number(item.unitNo);
  const place = picked ? ` ${picked.term}학기 ${unitPlace(picked)}` : no > 0 ? ` ${no}단원` : "";
  const unit = item.unit.trim();
  return (
    <header className="a2-paper-head">
      <h2 className="a2-paper-title">Genixx 지필 진단 문항 출제 원안지 양식</h2>
      <p className="a2-paper-lead">
        <Blue>
          {item.gradeNo}학년 {item.subject}
          {place}
          {unit ? ` 「${unit}」` : ""}
        </Blue>
        {/* 단원을 아직 고르지 않았으면 원안지의 안내를 그대로 — ②에서 고르면 사라진다 */}
        {!unit && <Red> (과목, 단원에 따라 수정 사용)</Red>}
      </p>
    </header>
  );
}

/** 원안지의 장 제목 — 「Ⅰ. 문항 원안」 · 「Ⅱ. 제출 전 자가 체크리스트」 */
export function PaperChapter({ children }: { children: React.ReactNode }) {
  return <h3 className="a2-paper-chapter">{children}</h3>;
}

/** 문항 하나의 머리 — 「1. 문항 S1」 */
export function PaperItemTitle({ no, level }: { no: number; level: Level }) {
  return (
    <h4 className="a2-paper-item">
      {no}. 문항 {level}
    </h4>
  );
}

/**
 * ① 문항 ID · ② 대상·교과·단원 — 세트가 통째로 쥐는 두 칸.
 *
 * 문항 ID는 손으로 적는 칸이 아니다. 코드에 담기는 것이 전부 이 화면의 다른 칸에 이미 있어서,
 * 적게 하면 그 둘이 어긋나기만 한다(lib/itemStore.ts 문항 ID). 학년 · 과목 · 형식 · 단계를 바꾸면
 * 저장할 때 번호가 다시 매겨진다.
 *
 * 과목 칸은 없다. 교과 단원을 고르면 과목이 따라온다 — 둘을 따로 고르게 두면 「수학 · 생생하게
 * 표현해요」가 생길 수 있다.
 */
export function SharedRows({
  item,
  disabled,
  bandHint,
  onChange,
}: {
  item: ItemDraft;
  disabled: boolean;
  bandHint?: React.ReactNode;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  return (
    <>
      <FormRow label="① 문항 ID">
        <span className="a2-cell-pad flex items-center a2-mono a2-t-md font-bold text-(--a2-ink)">
          {item.code || "저장하면 부여됩니다"}
        </span>
      </FormRow>
      <BandUnitRows
        value={item}
        disabled={disabled}
        label="② 대상·교과·단원"
        bandHint={bandHint}
        onChange={onChange}
      />
    </>
  );
}
