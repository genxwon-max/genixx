"use client";

import { useState } from "react";
import {
  OX_CHOICES,
  difficulties,
  difficultyPicked,
  itemTypes,
  needsRubric,
  questionStandardIssue,
  retypeQuestion,
  stemSummary,
  typeLabel,
  type ItemType,
  type Question,
} from "@/lib/itemStore";
import {
  LEVELS,
  levelAllowed,
  levelSpecs,
  subskillsOf,
  talents,
  type GradeBand,
  type Level,
  type TalentId,
} from "@/lib/blueprint";
import { toneColor } from "@/lib/admin2";
import BodyEditor from "@/components/admin2/BodyEditor";
import { FormRow } from "@/components/admin2/ui";

/**
 * 문항 상세의 본문 — 세트의 문항 목록 · 문항 하나의 분류 줄 · 세부 분류 줄 · 내용 줄.
 * 지문·발문 편집기는 components/admin2/BodyEditor.tsx에 있다.
 *
 * ── 왜 편집기를 갈래로 나누나 ──
 * 발문을 글 한 칸으로만 받던 때는 수학·과학 문항이 화면에서 성립하지 않았다. 「아래
 * 그림에서」로 시작하는 발문에 그림이 없고, 표를 넣어야 하는 문항은 표를 글자로 그려
 * 붙였다. 그렇다고 그림만 받으면 반대가 된다 — 오탈자 하나를 고치려고 디자이너를
 * 거쳐야 하고, 화면 낭독기를 쓰는 아이에게는 문항이 아예 없는 것이 된다.
 *
 * 그래서 상품 상세와 같은 네 갈래를 그대로 쓴다(lib/richText.ts). 한 덩이는 한 갈래만
 * 쓰고, 마크다운·HTML 안에서 그림을 넣는 길은 열어 둔다.
 *
 * ── 왜 세트는 목록인가 ──
 * 세트 안의 문항을 한 화면에 죄다 펼쳐 놓았더니, 문항이 셋만 되어도 분류·발문·보기·
 * 루브릭·해설로 서른 칸이 넘어가 지금 몇 번을 고치고 있는지 알 수 없었다. 문항 은행이
 * 「목록에서 골라 상세로 들어간다」로 푸는 것과 같은 문제라, 같은 방식으로 푼다 —
 * 여기서는 몇 번 문항이 무슨 유형이고 무엇을 묻는지만 보고, 고치는 것은 들어가서 한다.
 *
 * ⚠ 그림은 지금 data URL로 문항 안에 들어간다. 파일 서버가 붙으면 짧은 주소로 바뀐다.
 *   그때까지는 저장소가 5MB에서 끊기므로 올릴 때 캔버스로 줄인다(lib/productStore.ts).
 */

/**
 * 세트에 든 문항 목록.
 *
 * 문항 은행 목록과 같은 꼴이다 — 몇 번인지, 무슨 유형인지, 무엇을 묻는지만 세우고 고치는
 * 것은 상세로 들어가서 한다. 발문이 비어 있으면 「아직 안 씀」이라고 적는다. 빈칸으로
 * 두면 목록에서는 다 쓴 문항과 손도 안 댄 문항이 똑같이 보인다.
 */
export function QuestionList({
  questions,
  disabled,
  onOpen,
  onMove,
  onRemove,
  onAdd,
  max,
}: {
  questions: Question[];
  disabled: boolean;
  onOpen: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  max: number;
}) {
  return (
    <>
      <div className="a2-table-wrap">
        <table className="a2-table">
          <thead>
            <tr>
              <th className="a2-nowrap" style={{ width: "6.5rem" }}>
                문항
              </th>
              <th className="a2-nowrap" style={{ width: "7rem" }}>
                유형
              </th>
              <th className="a2-nowrap" style={{ width: "5rem" }}>
                단계
              </th>
              <th className="a2-nowrap" style={{ width: "5.5rem" }}>
                난이도
              </th>
              <th>발문</th>
              <th className="a2-nowrap" style={{ width: "13rem" }}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, k) => {
              const summary = stemSummary(q);
              return (
                <tr key={q.id}>
                  <td className="a2-td-key a2-nowrap">문항 {k + 1}</td>
                  <td className="a2-nowrap a2-t-sm text-(--a2-ink-2)">{typeLabel(q.type)}</td>
                  <td className="a2-nowrap a2-mono a2-t-sm text-(--a2-ink-2)">{q.level}</td>
                  <td className="a2-nowrap a2-mono a2-t-sm text-(--a2-ink-2)">
                    {difficultyPicked(q.b) ? (
                      `b ${q.b}`
                    ) : (
                      <span className="text-(--a2-ink-4)">미정</span>
                    )}
                  </td>
                  <td className="a2-clip">
                    {summary ? (
                      <span title={summary}>{summary}</span>
                    ) : (
                      <span className="text-(--a2-ink-4)">아직 안 씀</span>
                    )}
                  </td>
                  <td className="a2-nowrap">
                    <span className="flex gap-1">
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        onClick={() => onOpen(q.id)}
                      >
                        {disabled ? "열어 보기" : "수정하기"}
                      </button>
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled || k === 0}
                        aria-label={`문항 ${k + 1} 위로`}
                        onClick={() => onMove(k, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled || k === questions.length - 1}
                        aria-label={`문항 ${k + 1} 아래로`}
                        onClick={() => onMove(k, 1)}
                      >
                        ↓
                      </button>
                      {/* 마지막 하나는 지우지 못한다. 문항이 하나도 없는 세트는 세트가 아니다 */}
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm a2-btn-danger"
                        disabled={disabled || questions.length <= 1}
                        onClick={() => onRemove(k)}
                      >
                        지우기
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-4">
        <button
          type="button"
          className="a2-btn a2-btn-primary"
          disabled={disabled || questions.length >= max}
          onClick={onAdd}
        >
          문항 추가
        </button>
        {questions.length >= max && (
          <span className="a2-t-xs text-(--a2-ink-4)">
            한 세트에 {max}문항까지 담을 수 있습니다.
          </span>
        )}
      </div>
    </>
  );
}

type RowProps = {
  q: Question;
  /** 성취기준 코드가 맞는지는 학년군을 알아야 본다. 학년군은 세트가 통째로 쥐고 있다 */
  band: GradeBand;
  disabled: boolean;
  onChange: (next: Question) => void;
};

/**
 * 문항 하나의 분류 줄 — 배점 · 인지단계 · 난이도.
 *
 * 분류는 두 판으로 갈린다. 문항을 쓰기 **전에** 정해야 하는 것(과목 · 학년군 · 배점 ·
 * 인지단계 · 난이도)은 문항 위 「분류」 판에, 문항을 쓰고 **나서** 붙이는 것(단원 · 성취기준 ·
 * 재능 축 …)은 문항 아래 「세부 분류」 판에 선다. 단계와 난이도를 모르고는 발문을 쓸 수
 * 없지만, 성취기준 코드는 다 쓴 문항을 보고 찾아 붙이는 것이 실제 차례다.
 *
 * 단일이면 문항 상세에, 세트면 목록에서 들어간 문항 상세에 선다. 세트의 바깥 화면에는
 * 분류가 아예 없다 — 분류는 세트가 아니라 그 안의 문항에 붙는 것이라, 바깥에 세우면 어느
 * 문항의 것인지 말할 수 없는 값이 된다. 두 자리가 같은 줄을 쓰는 것이 요점이다 — 단일로
 * 쓰던 사람이 세트로 넘어갔을 때 칸이 다르면 같은 것을 두 번 배워야 한다.
 */
export function QuestionCoreRows({ q, disabled, onChange }: Omit<RowProps, "band">) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const outOfRange = !levelAllowed(q.talent, q.level);

  /* 치는 중인 글자. 바깥에서 배점이 바뀌면(취소 · 다른 문항) 그 글자는 버리고 값을 그린다 —
     글자가 나타내는 수와 지금 배점이 같을 때만 글자를 믿는다 */
  const [pointsText, setPointsText] = useState(q.points === 0 ? "" : String(q.points));
  const textValue = pointsText === "" || pointsText === "." ? 0 : Number(pointsText);
  const pointsShown = textValue === q.points ? pointsText : q.points === 0 ? "" : String(q.points);

  return (
    <>
      {/* 운영자가 직접 적는다. 인지단계를 바꿔도 적어 둔 배점을 덮지 않는다 — 덮으면 단계를
          한 번 고친 것만으로 매겨 둔 배점이 소리 없이 사라진다. 새 문항만 단계의 기본 배점
          (lib/blueprint.ts의 levelSpecs)으로 시작한다.

          비운 칸은 0으로 든다. 0 이하는 제출 문턱이 막는다(missingContent).
          칸은 치는 글자를 따로 들고 있다(pointsText) — 숫자만 들고 다시 그리면 「0.5」를 치는
          도중의 「0」과 「0.」이 0으로 굳어 빈칸이 되고, 소수점을 칠 수가 없다 */}
      <FormRow
        label="배점"
        req
        hint={
          q.points > 0 ? undefined : (
            <span style={{ color: toneColor.danger }}>0보다 큰 배점을 적어야 검수로 제출할 수 있습니다.</span>
          )
        }
      >
        <span className="flex min-h-10 items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            className="a2-input a2-input-lg a2-num"
            style={{ maxWidth: "8rem" }}
            value={pointsShown}
            disabled={disabled}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value.trim();
              /* 숫자와 소수점 하나만 받는다. 다른 글자는 칸에 들이지 않는다 */
              if (!/^\d*\.?\d*$/.test(raw)) return;
              setPointsText(raw);
              set({ points: raw === "" || raw === "." ? 0 : Number(raw) });
            }}
            aria-invalid={!(q.points > 0)}
            aria-label="배점"
          />
          <span className="a2-t-sm text-(--a2-ink-3)">점</span>
        </span>
      </FormRow>

      <FormRow
        label="인지단계"
        req
        hint={
          outOfRange ? (
            <span style={{ color: toneColor.danger }}>
              아래 세부 분류의 재능 축({talentName(q.talent)})은 {q.level}을 낼 수 없습니다.
            </span>
          ) : undefined
        }
      >
        <select
          className="a2-select a2-input-lg"
          value={q.level}
          disabled={disabled}
          onChange={(e) => set({ level: e.target.value as Level })}
          aria-invalid={outOfRange}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l} disabled={!levelAllowed(q.talent, l)}>
              {l} {levelSpecs[l].name}
              {levelAllowed(q.talent, l) ? "" : ` — ${talentName(q.talent)} 축은 출제 불가`}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="난이도" req>
        <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1">
          {difficulties.map((d) => (
            <label key={d.b} className="a2-choice">
              <input
                type="radio"
                name={`b-${q.id}`}
                checked={q.b === d.b}
                disabled={disabled}
                onChange={() => set({ b: d.b })}
              />
              {d.label}
              <span className="a2-mono font-normal text-(--a2-ink-4)">b {d.b}</span>
            </label>
          ))}
        </div>
      </FormRow>
    </>
  );
}

const talentName = (id: TalentId) => talents.find((t) => t.id === id)?.name ?? id;

/**
 * 문항 하나의 세부 분류 줄 — 성취기준 · 재능 축 · 하위요소.
 *
 * 문항 아래 「세부 분류」 판에 선다(차례의 까닭은 QuestionCoreRows 참조).
 *
 * ⚠ 재능 축과 인지단계가 두 판으로 떨어졌다. 축마다 낼 수 있는 단계가 달라서, 여기서 축을
 *   바꾸면 위 판의 단계가 범위를 벗어날 수 있다 — 붙어 있을 때는 보였지만 이제는 판 하나를
 *   건너야 보이므로 두 칸 모두에 같은 경고를 띄운다.
 */
export function QuestionTagRows({ q, band, disabled, onChange }: RowProps) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const std = questionStandardIssue(q, band);
  const outOfRange = !levelAllowed(q.talent, q.level);

  return (
    <>
      {/* 한 지문을 놓고 「무엇이라고 했나」와 「왜 그런가」를 이어 물으면 두 문항은 재는
          것도 단계도 다르다 — 그게 세트를 두는 까닭이다 */}
      <FormRow
        label="성취기준 코드 (Tag A)"
        req
        hint={std.ok ? undefined : <span style={{ color: toneColor.danger }}>{std.why}</span>}
      >
        <input
          className="a2-input a2-input-lg a2-mono"
          value={q.standardCode}
          disabled={disabled}
          onChange={(e) => set({ standardCode: e.target.value })}
          placeholder="[4국04-02]"
          aria-invalid={!std.ok}
        />
      </FormRow>

      <FormRow label="성취기준 내용" req>
        <input
          className="a2-input a2-input-lg"
          value={q.standardText}
          disabled={disabled}
          onChange={(e) => set({ standardText: e.target.value })}
          placeholder="낱말과 낱말의 의미 관계를 파악한다."
        />
      </FormRow>

      <FormRow label="Tag A 세부" req>
        <input
          className="a2-input a2-input-lg"
          value={q.tagADetail}
          disabled={disabled}
          onChange={(e) => set({ tagADetail: e.target.value })}
          placeholder="비슷한 말 짝 식별"
        />
      </FormRow>

      <FormRow
        label="재능 축 (Tag B)"
        req
        hint={
          outOfRange ? (
            <span style={{ color: toneColor.danger }}>
              이 축은 위 분류의 인지단계({q.level})를 낼 수 없습니다.
            </span>
          ) : undefined
        }
      >
        <select
          className="a2-select a2-input-lg"
          value={q.talent}
          disabled={disabled}
          aria-invalid={outOfRange}
          onChange={(e) => {
            /* 축을 바꾸면 하위요소는 그 축의 것으로 갈아 끼운다. 그대로 두면
               LANG-01이 수리-논리 문항에 붙어 좌표가 통째로 어긋난다. */
            const next = e.target.value as TalentId;
            set({ talent: next, subskill: subskillsOf(next)[0].code });
          }}
        >
          {talents.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="하위요소" req>
        <select
          className="a2-select a2-input-lg"
          value={q.subskill}
          disabled={disabled}
          onChange={(e) => set({ subskill: e.target.value })}
        >
          {subskillsOf(q.talent).map((sk) => (
            <option key={sk.code} value={sk.code}>
              {sk.code} {sk.name}
            </option>
          ))}
        </select>
      </FormRow>
    </>
  );
}

/** 문항 하나의 내용 줄 — 무엇을 어떻게 묻나 */
export function QuestionBodyRows({ q, disabled, onChange }: Omit<RowProps, "band">) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });

  return (
    <>
      <FormRow label="문항 유형" req>
        <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1">
          {itemTypes.map((t) => (
            <label key={t.id} className="a2-choice">
              <input
                type="radio"
                name={`type-${q.id}`}
                checked={q.type === t.id}
                disabled={disabled}
                onChange={() => onChange(retypeQuestion(q, t.id as ItemType))}
              />
              {t.label}
            </label>
          ))}
        </div>
      </FormRow>

      <FormRow label="발문" req>
        {/* 발문은 대개 한두 문장이다. 지문만큼 열어 두면 화면에서 가장 큰 덩어리가
            대부분 비어 있는 칸이 된다 — 길게 쓸 일이 있으면 오른쪽 아래로 늘린다 */}
        <BodyEditor
          name={`stem-mode-${q.id}`}
          value={{ mode: q.stemMode, body: q.stem, images: q.stemImages }}
          disabled={disabled}
          rows={3}
          placeholder="다음 중 두 낱말의 뜻이 서로 비슷한 것은?"
          onChange={(patch) =>
            set({
              stemMode: patch.mode ?? q.stemMode,
              stem: patch.body ?? q.stem,
              stemImages: patch.images ?? q.stemImages,
            })
          }
        />
      </FormRow>

      {q.type === "choice" && (
        <FormRow label="보기 · 정답 · 오답 의도" req>
          <ul className="grid w-full gap-2">
            {q.choices.map((c, k) => (
              <li
                key={k}
                className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-center"
              >
                <label className="flex items-center gap-2 pl-0.5">
                  <input
                    type="radio"
                    name={`answer-${q.id}`}
                    checked={q.answer === k}
                    disabled={disabled}
                    onChange={() => set({ answer: k })}
                    aria-label={`${k + 1}번을 정답으로`}
                  />
                  <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{k + 1}</span>
                </label>
                <input
                  className="a2-input a2-input-lg"
                  value={c}
                  disabled={disabled}
                  placeholder={`${k + 1}번 보기`}
                  onChange={(e) =>
                    set({
                      choices: q.choices.map((x, n) => (n === k ? e.target.value : x)),
                    })
                  }
                />
                <input
                  className="a2-input a2-input-lg"
                  value={q.distractorIntent[k] ?? ""}
                  disabled={disabled || q.answer === k}
                  placeholder={q.answer === k ? "정답 — 적지 않습니다" : "이 오답이 잡는 오개념"}
                  onChange={(e) => {
                    const next = [...q.distractorIntent];
                    while (next.length < q.choices.length) next.push("");
                    next[k] = e.target.value;
                    set({ distractorIntent: next });
                  }}
                />
              </li>
            ))}
          </ul>
          <span className="flex w-full flex-wrap gap-2">
            <button
              type="button"
              className="a2-btn"
              disabled={disabled || q.choices.length >= 6}
              onClick={() => set({ choices: [...q.choices, ""] })}
            >
              보기 추가
            </button>
            <button
              type="button"
              className="a2-btn"
              disabled={disabled || q.choices.length <= 2}
              onClick={() =>
                set({
                  choices: q.choices.slice(0, -1),
                  distractorIntent: q.distractorIntent.slice(0, q.choices.length - 1),
                  answer: Math.min(q.answer, q.choices.length - 2),
                })
              }
            >
              마지막 보기 지우기
            </button>
          </span>
        </FormRow>
      )}

      {q.type === "ox" && (
        <FormRow label="정답" req>
          <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1">
            {OX_CHOICES.map((c, k) => (
              <label key={c} className="a2-choice">
                <input
                  type="radio"
                  name={`answer-${q.id}`}
                  checked={q.answer === k}
                  disabled={disabled}
                  onChange={() => set({ answer: k })}
                />
                {c}
              </label>
            ))}
          </div>
        </FormRow>
      )}

      {q.type === "short" && (
        <FormRow label="허용 답안" req>
          <input
            className="a2-input a2-input-lg"
            value={q.shortAnswers}
            disabled={disabled}
            placeholder="늘어난다, 커진다, 증가한다"
            onChange={(e) => set({ shortAnswers: e.target.value })}
          />
        </FormRow>
      )}

      {needsRubric(q.type) && (
        <FormRow label="채점 루브릭" req>
          <textarea
            className="a2-textarea a2-textarea-lg"
            rows={6}
            value={q.rubric}
            disabled={disabled}
            placeholder={"근거 1점 + 일반화 1점 + 정당화 1점\n인정 예: …\n불인정 예: …"}
            onChange={(e) => set({ rubric: e.target.value })}
          />
        </FormRow>
      )}

      <FormRow label="정답 · 해설" req>
        <textarea
          className="a2-textarea a2-textarea-lg"
          rows={5}
          value={q.explain}
          disabled={disabled}
          placeholder="정답 ②. 까닭까지 함께 적습니다."
          onChange={(e) => set({ explain: e.target.value })}
        />
      </FormRow>
    </>
  );
}
