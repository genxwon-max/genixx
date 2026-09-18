"use client";

import { gradeBands, type GradeBand } from "@/lib/blueprint";
import {
  findUnit,
  termOf,
  unitGroups,
  unitKey,
  unitLabel,
  unitNoOf,
  unitPlace,
} from "@/lib/curriculumUnits";
import type { ItemDraft } from "@/lib/itemStore";
import { FormRow } from "@/components/admin2/ui";

/** 학년 · 교과 단원 두 줄이 읽고 쓰는 값 */
export type BandUnit = Pick<ItemDraft, "band" | "subject" | "unit" | "unitNo" | "unitTerm">;

/**
 * 분류 판의 학년 · 교과 단원 줄 — 묶음이 통째로 쥐는 값.
 *
 * 문항 상세(ItemDetail)와 AI 문항 출제 판(authoring/Generator)이 같은 두 줄을 쓴다. 생성 판이
 * 과목 고르개와 손으로 적는 단원 칸을 따로 두었을 때는, 생성한 문항의 단원이 교과서 단원 목록에
 * 없어 문항 상세를 열자마자 「목록 밖」으로 섰다.
 *
 * 과목 줄은 없다. 교과 단원을 고르면 과목이 따라온다 — 둘을 따로 고르게 두면
 * 「수학 · 생생하게 표현해요」가 생길 수 있다.
 *
 * ⚠ 문항 카드(.a2-card) 안에서만 쓴다.
 */
export default function BandUnitRows({
  value,
  disabled,
  bandHint,
  onChange,
}: {
  value: BandUnit;
  disabled: boolean;
  /** 학년 줄 아래 한 줄 — 문항 상세가 학년을 벗어난 성취기준 코드를 센다 */
  bandHint?: React.ReactNode;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  /* 교과 단원 — 학년에 드는 교과서 단원 중에서 고른다(lib/curriculumUnits.ts).
     목록에 없는 단원이 적힌 문항(고르개 전에 손으로 적은 것 · 학년을 옮긴 것)은 그 값을
     「목록 밖」으로 세워 둔다. 고르개에 없는 값을 value로 주면 브라우저가 첫 항목을 고른 것처럼
     그려서, 적힌 단원과 화면에 보이는 단원이 다른 문항이 된다 */
  const groups = unitGroups(value.band);
  const pickedUnit = findUnit(value, value.band);
  const unitValue = pickedUnit ? unitKey(pickedUnit) : value.unit.trim() ? "outside" : "";
  /* 목록 밖이라는 안내 줄(「교과서 단원 목록에 없는 단원입니다…」 · 「고른 단원은 n학년
     교과서입니다…」)은 걷었다. 닫힌 고르개에 선 「(목록 밖)」이 같은 것을
     말하고, 생성 판은 checkSpec이 학년에 맞지 않는 단원을 막는다 */

  return (
    <>
      <FormRow label="학년" req hint={bandHint}>
        <select
          className="a2-select a2-input-lg a2-select-fit"
          value={value.band}
          disabled={disabled}
          onChange={(e) => {
            const band = e.target.value as GradeBand;
            onChange({
              band,
              grade: band === "3-4" ? "초등 3~4학년" : "초등 5~6학년",
            });
          }}
        >
          {gradeBands.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </FormRow>

      {/* 고르개는 고른 단원 폭만큼만 선다(a2-select-fit). 칸 끝까지 늘였더니 화살표가 글에서
          멀리 떨어져 읽기 불편했다. 학년·학기는 그 바로 뒤에 선 없이 붙인다 — 선을 그으면
          칸 중간에서 끝나는 반쪽 칸이 된다 */}
      <FormRow label="교과 단원" req>
        <div className="flex flex-wrap items-center">
          <select
            className="a2-select a2-input-lg a2-select-fit"
            value={unitValue}
            disabled={disabled}
            aria-invalid={unitValue === "outside"}
            onChange={(e) => {
              const u = groups.flatMap((g) => g.units).find((x) => unitKey(x) === e.target.value);
              if (!u) return;
              onChange({
                subject: u.subject,
                unit: u.title,
                unitNo: unitNoOf(u),
                unitTerm: termOf(u),
              });
            }}
          >
            <option value="" disabled>
              단원을 고르세요
            </option>
            {unitValue === "outside" && (
              <option value="outside" disabled>
                {unitLabel({ subject: value.subject, title: value.unit.trim() })} (목록 밖)
              </option>
            )}
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.units.map((u) => (
                  <option key={unitKey(u)} value={unitKey(u)}>
                    {unitLabel(u)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* 닫힌 고르개에는 「국어 - 생생하게 표현해요」만 선다. 몇 학년 몇 학기 몇 단원인지는
              묶음 이름에만 있어서, 옆에 한 번 더 적는다 */}
          {pickedUnit && (
            <span className="a2-cell-pad flex items-center a2-t-sm text-(--a2-ink-3)">
              {pickedUnit.grade}학년 {pickedUnit.term}학기 · {unitPlace(pickedUnit)}
            </span>
          )}
        </div>
      </FormRow>
    </>
  );
}
