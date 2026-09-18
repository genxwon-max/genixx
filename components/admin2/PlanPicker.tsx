"use client";

import { useState } from "react";
import { gradeBands, type GradeBand } from "@/lib/blueprint";
import { planSubjects } from "@/lib/roundPlanStore";
import type { ItemDraft } from "@/lib/itemStore";
import { FormRow } from "@/components/admin2/ui";

/**
 * 학년을 먼저 고르고, 평가 과목을 하나씩 넣는다.
 *
 * ── 왜 격자가 아니라 목록인가 ──
 * 한동안 과목 × 학년 여섯 칸을 체크상자 격자로 두었다. 고르는 일은 빨랐지만 두 가지를
 * 못 했다. 첫째, **차례를 못 정한다** — 응시자가 국어부터 보는지 수학부터 보는지가 격자에는
 * 없다. 둘째, 학년이 과목마다 따로 서서 「이번 회차는 3·4학년만」이라는 흔한 편성을
 * 여섯 칸 중 셋을 꺼서 표현해야 했다.
 *
 * ── 학년은 하나 ──
 * 고르개 하나로 받는다. 한 회차가 한 학년을 본다 — 3·4학년과 5·6학년은 응시 기간도
 * 문항 재고도 따로 굴러가고, 둘을 한 회차에 묶으면 제출률·판정 진행이 두 학년의 평균이
 * 되어 어느 쪽이 밀렸는지가 사라진다. 둘 다 볼 일이 있으면 회차를 둘 만든다.
 *
 * ── 순서를 오른쪽에 둔 까닭 ──
 * 왼쪽은 「무엇을」이고 오른쪽은 「어떻게」다. 이 콘솔의 표는 전부 그 차례이고(줄의 동작이
 * 늘 오른쪽 끝), 순서 단추도 같은 자리에 있어야 손이 헤매지 않는다.
 *
 * ⚠ 표에 과목별 승인 문항 수를 세워 두었다가 뺐다. 고를 때 필요한 값이 아니라 짤 때 필요한
 *   값이고(편성판의 「남은 승인」이 이미 적는다), 학년마다 한 칸씩 붙어 세 과목이 다섯 칸을
 *   차지했다. 여기서 답할 것은 「무엇을 몇 번째로 낼까」뿐이다.
 *
 * ⚠ **폼 줄 둘(학년 · 평가 과목)을 내놓는다.** 반드시 .a2-form 안에서 쓰고, 바깥에서 또
 *   「편성」 같은 이름표로 감싸지 말 것 — 감싸면 이름표가 두 겹이 되고 오른쪽 칸이 그만큼
 *   좁아진다. 세우는 두 화면(회차 생성 · 회차 편성)이 같은 줄을 쓰는 것이 요점이다.
 */
export default function PlanPicker({
  band,
  subjects,
  onChange,
  disabled = false,
  /** 이미 담긴 문항 수 — 뺄 때 무엇을 잃는지(잃지는 않지만) 알려 준다 */
  pickedOf,
  hint,
}: {
  band: GradeBand;
  subjects: ItemDraft["subject"][];
  onChange: (next: { band: GradeBand; subjects: ItemDraft["subject"][] }) => void;
  disabled?: boolean;
  pickedOf?: (subject: ItemDraft["subject"], band: GradeBand) => number;
  /** 세우는 화면만 아는 말 — 과목 줄 아래에 덧붙는다 */
  hint?: React.ReactNode;
}) {
  const [adding, setAdding] = useState<ItemDraft["subject"] | "">("");

  const left = planSubjects.filter((s) => !subjects.includes(s));

  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= subjects.length) return;
    const next = [...subjects];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ band, subjects: next });
  };

  const drop = (subject: ItemDraft["subject"]) => {
    const held = pickedOf?.(subject, band) ?? 0;
    if (held > 0) {
      const ok = window.confirm(
        `${subject}에는 이미 ${held}문항이 담겨 있습니다.\n\n빼도 담아 둔 검사지는 지우지 않습니다 — 다시 넣으면 그대로 돌아옵니다. 이번 회차에서만 내보내지 않습니다.\n\n뺄까요?`,
      );
      if (!ok) return;
    }
    onChange({ band, subjects: subjects.filter((s) => s !== subject) });
  };

  return (
    <>
      {/* ── 학년 — 먼저, 그리고 하나만 ── */}
      <FormRow label="학년" req>
        <select
          className="a2-select"
          style={{ maxWidth: "14rem" }}
          aria-label="학년"
          value={band}
          disabled={disabled}
          onChange={(e) => onChange({ band: e.target.value as GradeBand, subjects })}
        >
          {gradeBands.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </FormRow>

      {/* ── 평가 과목 — 넣은 차례가 곧 순서 ── */}
      <FormRow
        label="평가 과목"
        req
        hint={hint}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <select
            className="a2-select h-[28px] w-auto text-[0.6875rem]"
            value={adding}
            disabled={disabled || left.length === 0}
            onChange={(e) => setAdding(e.target.value as ItemDraft["subject"])}
          >
            <option value="">과목 고르기</option>
            {left.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="a2-btn a2-btn-sm"
            disabled={disabled || !adding}
            onClick={() => {
              if (!adding) return;
              onChange({ band, subjects: [...subjects, adding] });
              setAdding("");
            }}
          >
            추가
          </button>
          {left.length === 0 && <span className="a2-t-xs text-(--a2-ink-4)">세 과목을 모두 넣었습니다</span>}
        </span>

        <div className="w-full overflow-x-auto">
          <table className="a2-table" style={{ width: "auto", minWidth: "20rem" }}>
            <thead>
              <tr>
                <th scope="col" style={{ width: "3.5rem" }} className="a2-th-num">
                  차례
                </th>
                <th scope="col" style={{ width: "8rem" }}>
                  과목
                </th>
                {/* 순서와 빼기는 오른쪽 끝 */}
                <th scope="col" style={{ width: "8rem" }}>
                  순서
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s}>
                  <td className="a2-td-num a2-nowrap">{i + 1}</td>
                  <td className="a2-td-key a2-nowrap">{s}</td>
                  <td className="a2-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled || i === 0}
                        aria-label={`${s} 위로`}
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled || i === subjects.length - 1}
                        aria-label={`${s} 아래로`}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm a2-btn-danger"
                        disabled={disabled}
                        onClick={() => drop(s)}
                      >
                        빼기
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-(--a2-ink-4)">
                    <span className="block py-5">
                      넣은 과목이 없습니다. 위에서 과목을 고르고 추가를 누르세요.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FormRow>
    </>
  );
}
