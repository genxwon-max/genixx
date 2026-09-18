"use client";

import { Fragment } from "react";
import { groupSpans, regroup, type ContentSet, type GroupSpan } from "@/lib/content";
import BlockEditor from "./BlockEditor";
import { FormBlock, FormRow } from "./ui";

/**
 * 묶음 — 세트 안의 작은 세트(시험지의 「[2 ~ 3] 다음은 …」).
 *
 * 이어진 문항 몇 개를 골라 묶고, 그 묶음만 함께 읽는 자료를 더 얹는다. 응시 화면은 묶인
 * 문항을 **오른쪽에 한 화면으로** 세우고, 그 위에 묶음 자료를 둔다. 왼쪽의 세트 자료는 그대로다.
 *
 * 묶음은 이어진 문항만 된다 — 2번과 4번을 묶으면 3번이 어느 화면에 설지 말할 수 없다.
 * 범위를 고치면 묶음 경계만 바뀌고 문항 차례는 그대로다(lib/content.ts regroup).
 */
export default function GroupEditor({
  content,
  count,
  disabled,
  onChange,
}: {
  content: ContentSet;
  /** 세트의 문항 수 */
  count: number;
  disabled: boolean;
  onChange: (next: ContentSet) => void;
}) {
  const spans = groupSpans(content);
  const apply = (next: GroupSpan[]) => onChange(regroup(content, next));
  const put = (k: number, patch: Partial<GroupSpan>) =>
    apply(spans.map((g, n) => (n === k ? { ...g, ...patch } : g)));

  /** 아직 어느 묶음에도 들지 않은 첫 두 문항 — 새 묶음의 시작 범위 */
  const taken = (i: number) => spans.some((g) => i >= g.from && i <= g.to);
  const start = Array.from({ length: count - 1 }, (_, i) => i).find(
    (i) => !taken(i) && !taken(i + 1),
  );

  const numbers = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="a2-form a2-form-lg a2-card">
      {spans.length === 0 && (
        <FormRow label="묶음">
          <p className="a2-cell-pad a2-t-sm text-(--a2-ink-3)">
            없습니다. 두 문항 이상이 같은 추가 자료(측정 방법 · 결과 표 등)를 함께 읽으면 묶습니다.
          </p>
        </FormRow>
      )}

      {spans.map((g, k) => {
        /* 다른 묶음이 쥔 문항은 고를 수 없다 */
        const free = (i: number) => !spans.some((o, n) => n !== k && i >= o.from && i <= o.to);
        return (
          <Fragment key={g.id}>
            <FormRow label={`묶음 [${g.from + 1}~${g.to + 1}]`} req>
              <div className="a2-cell-pad flex flex-wrap items-center gap-2">
                <select
                  className="a2-select a2-select-fit rounded border! border-(--a2-line)!"
                  value={g.from}
                  disabled={disabled}
                  aria-label="묶음 시작 문항"
                  onChange={(e) => {
                    const from = Number(e.target.value);
                    put(k, { from, to: Math.max(from + 1, g.to) });
                  }}
                >
                  {numbers.slice(0, -1).map((i) => (
                    <option key={i} value={i} disabled={!free(i)}>
                      문항 {i + 1}
                    </option>
                  ))}
                </select>
                <span className="a2-t-sm">부터</span>
                <select
                  className="a2-select a2-select-fit rounded border! border-(--a2-line)!"
                  value={g.to}
                  disabled={disabled}
                  aria-label="묶음 끝 문항"
                  onChange={(e) => put(k, { to: Number(e.target.value) })}
                >
                  {numbers
                    .filter((i) => i > g.from)
                    .map((i) => (
                      <option
                        key={i}
                        value={i}
                        /* 사이에 다른 묶음이 끼면 이을 수 없다 */
                        disabled={numbers.slice(g.from, i + 1).some((x) => !free(x))}
                      >
                        문항 {i + 1}
                      </option>
                    ))}
                </select>
                <span className="a2-t-sm">까지 한 화면에 함께 섭니다</span>
                <button
                  type="button"
                  className="a2-btn a2-btn-sm a2-btn-danger ml-auto"
                  disabled={disabled}
                  onClick={() => apply(spans.filter((_, n) => n !== k))}
                >
                  묶음 풀기
                </button>
              </div>
            </FormRow>
            <FormRow
              label="묶음 지시문"
              hint={`응시 화면에서 「[${g.from + 1}~${g.to + 1}] 지시문」으로 섭니다`}
            >
              <input
                className="a2-input"
                value={g.material.lead ?? ""}
                disabled={disabled}
                placeholder="다음은 어떤 진자 운동에서 학생 A와 학생 B가 주기를 구한 방법과 실험 결과입니다."
                onChange={(e) =>
                  put(k, { material: { ...g.material, lead: e.target.value || undefined } })
                }
              />
            </FormRow>
            <FormBlock
              title={`묶음 [${g.from + 1}~${g.to + 1}] 자료 — 묶인 문항 위 네모 상자 안에 들어갈 것`}
            >
              <BlockEditor
                blocks={g.material.blocks}
                disabled={disabled}
                kinds={["list", "table", "text", "box", "images", "note"]}
                onChange={(blocks) => put(k, { material: { ...g.material, blocks } })}
              />
            </FormBlock>
          </Fragment>
        );
      })}

      <div className="a2-cell-pad flex items-center gap-2">
        <button
          type="button"
          className="a2-btn"
          disabled={disabled || start === undefined}
          title={start === undefined ? "묶을 수 있는 이어진 두 문항이 없습니다" : undefined}
          onClick={() =>
            start !== undefined &&
            apply([
              ...spans,
              {
                id: `g${Date.now().toString(36)}`,
                from: start,
                to: start + 1,
                material: { blocks: [] },
              },
            ])
          }
        >
          + 묶음 만들기
        </button>
      </div>
    </div>
  );
}
