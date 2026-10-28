"use client";

import { useState } from "react";
import {
  OX_CHOICES,
  difficulties,
  difficultyPicked,
  formatIssue,
  hasChoices,
  needsRubric,
  questionHasContent,
  questionStandardIssue,
  slotted,
  stemIsEmpty,
  stemSummary,
  typeLabel,
  type Question,
} from "@/lib/itemStore";
import {
  fitSlots,
  hasAnswerArea,
  hasSlots,
  legacySlots,
  numberSlots,
  oldAnswerArea,
  scanSlots,
  slotType,
  takeSlotAnswers,
  withSlotAnswers,
  type SlotAnswer,
  type SlotKind,
} from "@/lib/answerSlots";
import {
  LEVELS,
  cardExamples,
  cardLevelText,
  codeSamples,
  figureChecks,
  levelAllowed,
  perspectiveExamples,
  subskillsOf,
  talentOf,
  talents,
  type GradeBand,
  type TalentId,
} from "@/lib/blueprint";
import { toneColor } from "@/lib/admin2";
import { splitPastedItem } from "@/lib/choicePaste";
import { LegacyAnswers, SlotAnswers, SlotStart, SlotText } from "@/components/admin2/SlotFields";
import DocEditor from "@/components/admin2/DocEditor";
import DocBox from "@/components/admin2/DocBox";
import { BlockList, WithBlanks } from "@/components/exam/ExamSession";
import { renderDetail } from "@/lib/richText";
import { htmlToQuestion, questionToHtml, textToHtml } from "@/lib/docBlocks";
import type { Block } from "@/lib/content";
import type { ContentQuestion } from "@/lib/content";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { BlockPart, CellLine, FormBlock, FormRow, SubRow, SubRows } from "@/components/admin2/ui";
import { Blue, Guided, Red } from "@/components/admin2/Guide";

/**
 * 문항 상세의 본문 — 세트의 문항 목록 · 문항 하나의 분류 줄 · 문항 줄.
 * 지문·발문 편집기는 components/admin2/BodyEditor.tsx에 있다.
 *
 * ── 줄의 차례는 원안지의 차례다 ──
 * 출제위원이 받는 종이 「Genixx 지필 진단 문항 출제 원안지 양식」(2026-10-22 최종)과 칸 이름 · 번호 ·
 * 차례를 똑같이 맞춘다(2026-10-28 요청). 출제위원은 원안지를 옆에 펴 놓고 칸을 옮겨 적는다 —
 * 화면 차례가 원안지와 다르면 칸을 찾아 화면을 오르내린다. 코드에서는 둘로 편다.
 *
 *   분류  (① 문항 ID · ② 대상·교과·단원은 묶음이 쥔다 — Paper.tsx SharedRows)
 *         ③ 인지단계 · ④ Tag A (학력) · ⑤ Tag B (재능) · ⑥ 형식·배점·난이도
 *   문항  ⑦ 문항(단일이면 지문도 이 칸에) · ⑧ 그림·삽화 사양 · ⑨ 정답 · 채점 기준 ·
 *         ⑩ 인정 불인정 예 · ⑪ 재능 평가 관점 · ⑫ 오답 설계 의도 · ⑬ 이 문항의 특성
 *
 * ── 칸은 형식과 상관없이 전부 열어 둔다 ──
 * 한동안 객관식은 인정·불인정 예와 부분점수 칸을 잠그고 「선택형은 정오로 채점해…」를
 * 적어 두었다. 출제위원이 선택형에도 채점 메모를 남기고 싶어 해서 잠금을 풀었다. 대신
 * 선택형에서 비어 있다고 제출을 막지는 않는다(lib/itemStore.ts missingCard) — 필수 표시(*)가
 * 형식을 따라 붙었다 떨어진다. 유형을 바꿔도 줄이 났다 들었다 하지 않아 카드의 차례는 그대로다.
 *
 * ── 칸이 곧 입력이다 ──
 * 줄은 전부 문항 카드(.a2-card) 안에 선다. 값 칸에 여백을 두지 않고 입력의 테두리를 걷어,
 * 종이 카드의 칸에 바로 쓰듯 칸의 선이 입력의 테두리 노릇을 한다(admin2.css .a2-card).
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
              <th className="a2-nowrap" style={{ width: "7.5rem" }}>
                문항
              </th>
              <th className="a2-nowrap" style={{ width: "7rem" }}>
                유형
              </th>
              <th className="a2-nowrap" style={{ width: "5.5rem" }}>
                난이도
              </th>
              <th>발문</th>
              <th className="a2-nowrap" style={{ width: "9rem" }}>
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, k) => {
              const summary = stemSummary(q);
              return (
                /* 줄을 누르면 그 문항이 열린다 — 콘솔의 다른 목록과 같은 동작이다. 「수정하기 ·
                   열어 보기」 단추는 걷었다. 여기는 주소로 가는 것이 아니라 같은 화면에서
                   펴는 것이라 링크 대신 문항 번호를 단추로 세운다 — Tab으로 닿는 길이다.
                   줄 안의 단추(차례 · 지우기)와 끌어 고른 글자는 누른 것으로 치지 않는다 */
                <tr
                  key={q.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a, button, input, select, textarea, label")) return;
                    if (window.getSelection()?.toString()) return;
                    onOpen(q.id);
                  }}
                >
                  <td className="a2-td-key a2-nowrap">
                    <button type="button" className="font-semibold" onClick={() => onOpen(q.id)}>
                      {k + 1}. 문항 {q.level}
                    </button>
                  </td>
                  <td className="a2-nowrap a2-t-sm text-(--a2-ink-2)">{typeLabel(q.type)}</td>
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
                      <span className="text-(--a2-ink-4)">미작성</span>
                    )}
                  </td>
                  <td className="a2-nowrap">
                    <span className="flex gap-1">
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

const talentName = (id: TalentId) => talents.find((t) => t.id === id)?.name ?? id;

/** 형식이 아직 정해지지 않았는가 — 발문도 보기도 쓰지 않은 문항 */
const typeUnset = (q: Question) => !slotted(q) && stemIsEmpty(q) && !q.choices.some((c) => c.trim());

/** 원안지 ⑥의 형식 다섯 칸 */
const CARD_FORMS = [
  { id: "pick", label: "선택형" },
  { id: "short", label: "단답형" },
  { id: "match", label: "연결형" },
  { id: "write", label: "서술형" },
  { id: "essay", label: "논술형" },
] as const;
type CardForm = (typeof CARD_FORMS)[number]["id"];

/** 답 칸 표시 · 형식이 원안지의 어느 칸인가 — 그리기 · 사진은 서술과 같이 센다(formatIssue) */
const formOfKind: Record<SlotKind, CardForm> = {
  short: "short",
  ox: "pick",
  pick: "pick",
  write: "write",
  essay: "essay",
  draw: "write",
  photo: "write",
  match: "match",
};
const formOfType: Record<Question["type"], CardForm> = {
  choice: "pick",
  ox: "pick",
  short: "short",
  descriptive: "write",
  essay: "essay",
  image: "write",
};

/**
 * 문항에 쓴 것이 원안지의 어느 형식 칸에 드는가.
 *
 * 형식은 고르지 않는다 — 문항에 쓴 것이 정한다(2026-10-16 요청). 답 칸 표시가 있으면 표시마다
 * (「[정답1]」과 「{서술형1}」을 함께 쓴 문항은 단답형 · 서술형 두 칸이 켜진다), 줄 맨 앞에 ① ② ③ …이
 * 있으면 선택형이다. 아직 아무것도 쓰지 않은 문항은 한 칸도 켜지 않는다 — 새 문항이 처음 받는
 * 형식(typeForLevel)을 켜 두면 쓰지도 않은 형식이 정해진 것처럼 읽힌다.
 */
function cardFormsOf(q: Question): Set<CardForm> {
  if (typeUnset(q)) return new Set();
  if (slotted(q)) return new Set(scanSlots(q.stem).marks.map((m) => formOfKind[m.kind]));
  return new Set([formOfType[q.type]]);
}

/** 칸 아래 경고 한 줄 — 막는 것은 빨강, 봐 둘 것은 노랑 */
const Danger = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: toneColor.danger }}>{children}</span>
);

/** 원안지 칸 이름 — 종이 양식처럼 ① ② …을 붙인다. 원안지 밖(AI 문항 출제 판)에서는 이름만 */
const named = (paper: boolean, no: string, label: string) => (paper ? `${no} ${label}` : label);

/**
 * 문항 하나의 분류 줄 — ③ 인지단계 · ④ Tag A (학력) · ⑤ Tag B (재능) · ⑥ 형식·배점·난이도.
 *
 * ① 문항 ID · ② 대상·교과·단원은 이 위에 선다. 그 둘은 묶음이 통째로 쥐는 값이라 문항 상세
 * (ItemDetail → Paper.tsx SharedRows)가 그리고, 세트에서도 문항마다 다르지 않다.
 *
 * 단일이면 문항 상세에, 세트면 목록에서 들어간 문항 상세에 선다. 세트의 바깥 화면에는
 * 분류가 아예 없다 — 분류는 세트가 아니라 그 안의 문항에 붙는 것이라, 바깥에 세우면 어느
 * 문항의 것인지 말할 수 없는 값이 된다.
 *
 * ── 원안지 그대로 (2026-10-28 요청) ──
 * 칸 이름 · 차례 · 한 칸 안의 줄을 종이 「Genixx 지필 진단 문항 출제 원안지 양식」(2026-10-22 최종)에
 * 맞춘다. 인지단계는 네 칸 체크, 출제 의도는 Tag A 칸 안의 한 줄(파란 「반드시 기록하여 주세요.」),
 * Tag B는 「3원 좌표 : 재능 [ ] · 하위요소코드 [ ] · 단계 [ ]」 한 줄, 형식은 다섯 칸 체크다.
 * 원안지의 빨간 글씨(「(수정 사용)」 · 「(해당 과목에 따라 체크 및 입력 사용)」)는 칸이 비어 있는
 * 동안만 선다(components/admin2/Guide.tsx).
 *
 * AI 문항 출제 판(authoring/Generator)도 같은 줄로 뽑을 문항의 분류를 받는다 — paper를 끄면
 * 번호 · NCIC 확인 · 빨간 안내 없이 선다.
 *
 * ⚠ 문항 카드(.a2-card) 안에서만 쓴다. 입력에 테두리가 없고 칸의 선이 그 노릇을 한다.
 */
export function QuestionClassRows({
  q,
  band,
  disabled,
  withLevel = true,
  paper = true,
  onChange,
}: {
  q: Question;
  /** 성취기준 코드가 맞는지는 학년을 알아야 본다. 학년은 세트가 통째로 쥐고 있다 */
  band: GradeBand;
  disabled: boolean;
  /**
   * 인지단계 · 형식 · 배점 줄을 세우는가. 여러 단계를 한꺼번에 뽑는 생성 판(단일 · 세트 모두)은
   * 끈다 — 단계별 문항 수가 단계를 정하고, 형식 · 배점은 단계마다 고정 매핑을 따라서 한 벌로 고를
   * 값이 아니다.
   */
  withLevel?: boolean;
  /** 원안지 칸으로 그리는가 — 번호 · NCIC 확인 · 빨간 안내. 생성 판은 끈다 */
  paper?: boolean;
  onChange: (next: Question) => void;
}) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const std = questionStandardIssue(q, band);
  const outOfRange = withLevel && !levelAllowed(q.talent, q.level);
  /* 아직 형식이 정해지지 않은 문항(아무것도 안 쓴 새 문항)에는 고정 매핑을 따지지 않는다 — 처음 받은
     형식으로 「선택형 2점입니다」를 띄우면 고르지도 않은 형식을 나무란다 */
  const unset = typeUnset(q);
  const format = unset ? "" : formatIssue(q);
  const forms = cardFormsOf(q);
  const talent = talentOf(q.talent);
  const picked = difficultyPicked(q.b);
  const pickedLabel = difficulties.find((d) => d.b === q.b)?.label;

  /* 치는 중인 글자. 바깥에서 배점이 바뀌면(취소 · 다른 문항) 그 글자는 버리고 값을 그린다 —
     글자가 나타내는 수와 지금 배점이 같을 때만 글자를 믿는다 */
  const [pointsText, setPointsText] = useState(q.points === 0 ? "" : String(q.points));
  const textValue = pointsText === "" || pointsText === "." ? 0 : Number(pointsText);
  const pointsShown = textValue === q.points ? pointsText : q.points === 0 ? "" : String(q.points);

  /* 난이도 — 넷 중 하나. 원안지의 「예상 난이도 b ≈ -1.5 (학력 난이도: 하)」 꼴로 b를 고르고 이름을
     괄호에 붙인다. 아무도 안 고른 문항(b = null)은 빈 고르개로 선다 */
  const difficultyLine = (
    <div className="a2-cell-pad a2-paper-line">
      <span>예상 난이도 b ≈</span>
      <select
        className="a2-select a2-select-fit a2-paper-value a2-mono"
        value={q.b === null ? "" : String(q.b)}
        disabled={disabled}
        aria-label="예상 난이도"
        aria-invalid={!picked}
        onChange={(e) => set({ b: Number(e.target.value) })}
      >
        <option value="" disabled>
          고르기
        </option>
        {difficulties.map((d) => (
          <option key={d.b} value={String(d.b)}>
            {d.b > 0 ? `+${d.b}` : d.b} ({d.label})
          </option>
        ))}
      </select>
      {pickedLabel && <span>(학력 난이도: {pickedLabel})</span>}
      {paper && !disabled && !picked && <Red>(해당 과목에 따라 체크 및 입력 사용)</Red>}
    </div>
  );

  return (
    <>
      {/* 네 칸 중 하나 — 체크 상자 모양이지만 하나만 켜진다(원안지가 ☐ 넷을 나란히 둔다).
          재능 축이 낼 수 없는 단계(자기-성찰의 S4)는 잠근다 */}
      {withLevel && (
        <FormRow label={named(paper, "③", "인지단계")} req>
          <div className="a2-cell-pad a2-paper-boxes a2-paper-boxes-2">
            {LEVELS.map((l) => {
              const allowed = levelAllowed(q.talent, l);
              return (
                <label
                  key={l}
                  className="a2-paper-box"
                  title={
                    allowed ? undefined : `${talentName(q.talent)} 축은 ${l}을 출제할 수 없습니다`
                  }
                >
                  <input
                    type="checkbox"
                    checked={q.level === l}
                    disabled={disabled || !allowed}
                    onChange={() => set({ level: l })}
                    aria-label={`${l} ${cardLevelText[l]}`}
                  />
                  <span>
                    {l} {cardLevelText[l]}
                  </span>
                </label>
              );
            })}
          </div>
        </FormRow>
      )}

      {/* 종이 카드의 Tag A 칸 한 칸을 그대로 옮긴다 — 성취기준 코드(코드 + 내용) · 학습 요소 · 출제 의도 ·
          NCIC 확인을 한 칸 안에 줄로 쌓는다.

          출제 의도는 한동안 제 줄로 따로 세웠다가 원안지대로 Tag A 칸 안으로 되돌렸다(2026-10-28).
          성취기준 코드 · 학습 요소의 예시는 칸 안의 회색 글(placeholder)로 둔다 — 치기 시작하면 저절로
          사라진다(lib/blueprint.ts cardExamples).

          학습 요소는 옛 「Tag A 세부」 칸(tagADetail)을 그대로 쓴다. 목록·검수 화면이 Tag A 한
          줄을 그 칸으로 짓는다(lib/itemStore.ts syncTags) */}
      <FormRow label={named(paper, "④", "Tag A (학력)")} req>
        <CellLine label="성취기준 코드">
          <div className="a2-cell-split" style={{ gridTemplateColumns: "9rem minmax(0, 1fr)" }}>
            <input
              className="a2-input a2-input-lg a2-mono self-center"
              value={q.standardCode}
              disabled={disabled}
              onChange={(e) => set({ standardCode: e.target.value })}
              placeholder={`예) ${codeSamples[band][0]}`}
              aria-invalid={!std.ok}
              aria-label="성취기준 코드"
            />
            <GrowTextarea
              line
              className="a2-textarea a2-textarea-lg"
              value={q.standardText}
              disabled={disabled}
              onChange={(e) => set({ standardText: e.target.value })}
              placeholder={`예) ${cardExamples.standardText}`}
              aria-label="성취기준 내용"
            />
          </div>
        </CellLine>
        <CellLine label="학습 요소">
          <GrowTextarea
            line
            className="a2-textarea a2-textarea-lg"
            value={q.tagADetail}
            disabled={disabled}
            onChange={(e) => set({ tagADetail: e.target.value })}
            placeholder={`예) ${cardExamples.tagADetail}`}
            aria-label="학습 요소"
          />
        </CellLine>
        <CellLine label="출제 의도">
          <Guided
            show={!disabled && !q.tagAIntent}
            guide={
              paper ? (
                <Blue>반드시 기록하여 주세요.</Blue>
              ) : (
                <span>예) {cardExamples.tagAIntent}</span>
              )
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={2}
              value={q.tagAIntent}
              disabled={disabled}
              onChange={(e) => set({ tagAIntent: e.target.value })}
              aria-label="출제 의도"
            />
          </Guided>
        </CellLine>
        {paper && (
          <div className="a2-cell-pad a2-paper-boxes">
            <label className="a2-paper-box">
              <input
                type="checkbox"
                checked={q.ncicChecked}
                disabled={disabled}
                onChange={(e) => set({ ncicChecked: e.target.checked })}
              />
              <span>NCIC(국가교육과정정보센터) 원문 대조 완료.</span>
            </label>
            <label className="a2-paper-box">
              <input
                type="checkbox"
                checked={q.code2022Checked}
                disabled={disabled}
                onChange={(e) => set({ code2022Checked: e.target.checked })}
              />
              <span>2022 개정 코드 확인</span>
            </label>
          </div>
        )}
      </FormRow>

      {/* 원안지의 「3원 좌표 : 재능 [언어·기호] · 하위요소코드 [LANG-01] · 단계 [S1]」 한 줄. 고르개는
          테두리 없이 글 사이에 서서 파란 값으로 읽힌다. 단계는 ③에서 고른 것을 그대로 읽는다 — 여기서 또
          고르게 두면 두 칸이 어긋날 수 있다.

          「(수정 사용)」은 문항에 아직 아무것도 적지 않았을 때만 선다. 고르개는 늘 값이 있어 「비었을 때」가
          없다 — 새 문항은 앞 문항의 재능 축을 물려받으므로, 적기 시작하기 전에 고쳐 쓰라는 말이다 */}
      <FormRow
        label={named(paper, "⑤", "Tag B (재능)")}
        req
        hint={
          outOfRange ? (
            <Danger>
              {talent.name} 축은 {q.level}을 출제할 수 없습니다 — 인지단계를 다시 고르세요.
            </Danger>
          ) : undefined
        }
      >
        <div className="a2-cell-pad a2-paper-line">
          <span>3원 좌표 :</span>
          <span>재능</span>
          <select
            className="a2-select a2-select-fit a2-paper-value"
            value={q.talent}
            disabled={disabled}
            aria-invalid={outOfRange}
            aria-label="재능"
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
          <span>·</span>
          <span>하위요소코드</span>
          <select
            className="a2-select a2-select-fit a2-paper-value a2-mono"
            value={q.subskill}
            disabled={disabled}
            aria-label="하위요소"
            onChange={(e) => set({ subskill: e.target.value })}
          >
            {subskillsOf(q.talent).map((sk) => (
              <option key={sk.code} value={sk.code}>
                {sk.code} {sk.name}
              </option>
            ))}
          </select>
          {withLevel && (
            <>
              <span>·</span>
              <span>
                단계 <b className="a2-guide-blue a2-mono">[{q.level}]</b>
              </span>
            </>
          )}
          {paper && !disabled && !questionHasContent(q) && <Red>(수정 사용)</Red>}
        </div>
      </FormRow>

      {/* 형식은 고르지 않는다 — 문항에 쓴 것이 정한다(2026-10-16 요청). 다섯 칸은 읽기만 하는 체크로
          서서 ⑦에 쓴 것이 어느 형식인지 보여 준다. 배점은 운영자가 직접 적는다 — 인지단계를 바꿔도
          적어 둔 배점을 덮지 않는다. 새 문항만 원안지의 고정 배점(lib/blueprint.ts cardPoints)으로 시작한다.

          배점 칸은 치는 글자를 따로 들고 있다(pointsText) — 숫자만 들고 다시 그리면 「0.5」를 치는
          도중의 「0」과 「0.」이 0으로 굳어 빈칸이 되고, 소수점을 칠 수가 없다. 소수점 배점은 매핑에
          없지만 칸에서 막지는 않는다 — 형식 칸이 짚는다. 비운 칸은 0으로 들고, 0 이하는 제출 문턱이
          막는다(missingContent) */}
      {withLevel ? (
        <FormRow
          label={named(paper, "⑥", "형식·배점·난이도")}
          req
          hint={
            format || !(q.points > 0) ? (
              <Danger>
                {format}
                {format && !(q.points > 0) ? " " : ""}
                {q.points > 0 ? "" : "0보다 큰 배점을 적어야 검수로 제출할 수 있습니다."}
              </Danger>
            ) : undefined
          }
        >
          <div className="a2-cell-pad a2-paper-line">
            <span>형식:</span>
            {CARD_FORMS.map((f) => (
              <label key={f.id} className="a2-paper-box a2-paper-box-read">
                <input
                  type="checkbox"
                  checked={forms.has(f.id)}
                  disabled
                  readOnly
                  aria-label={f.label}
                />
                <span>{f.label}</span>
              </label>
            ))}
            <span className="a2-paper-points">
              <b>배점:</b>
              <input
                type="text"
                inputMode="decimal"
                className="a2-input a2-num a2-paper-value"
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
              <b>점</b>
            </span>
          </div>
          {difficultyLine}
          {/* 형식이 아직 안 정해진 문항 — 어떻게 정해지는지를 빨간 안내로. 쓰기 시작하면 사라진다 */}
          {paper && !disabled && unset && (
            <div className="a2-cell-pad a2-paper-line">
              <Red>
                (⑦ 문항에 [정답1] · {"{서술형1}"} 같은 답 칸 표시를 넣거나 ① ② ③ … 보기를 쓰면
                형식이 체크됩니다)
              </Red>
            </div>
          )}
        </FormRow>
      ) : (
        <FormRow label="난이도" req>
          {difficultyLine}
        </FormRow>
      )}
    </>
  );
}

/** 원안지가 빈 칸에 적어 둔 예시 — 「1. 문항 S1」(3학년 국어 「빗방울 악단」)에서 옮겼다 */
const PAPER_EXAMPLES = {
  explain:
    "② 우산 위 — 2연에 “우산 위에서는 / 토독토독 / 작은 북을 두드려요”라고 그대로 나와 있다. 시에 적힌 장소와 악기의 짝을 그대로 지목하는 문항으로, 어떤 추론도 필요하지 않다.",
  accept: "· 인정할 만한 유사답으로 봐 줄 수 있는 것이 이 지문에 없음",
  reject: "· 작은 북 위 — 악기 이름을 장소로 착각한 답",
  wrong:
    "①은 시의 첫 장소이자 ‘소리’가 가장 먼저 나오는 곳이어서 앞부분만 읽은 학생이 고르기 쉬운 매력적인 오답이다.",
};

/**
 * 문항 하나의 문항 줄 — ⑦ 문항 · ⑧ 그림·삽화 사양 · ⑨ 정답 · 채점 기준 · ⑩ 인정 불인정 예 ·
 * ⑪ 재능 평가 관점 · ⑫ 오답 설계 의도 · ⑬ 이 문항의 특성.
 *
 * 단일 문항의 지문은 ⑦ 칸 맨 위에 선다(passage) — 원안지가 지시문 · 지문 · 발문 · 보기를 「⑦ 문항 S1」
 * 한 칸에 이어 적는다. 세트면 지문은 문항들이 함께 읽는 것이라 묶음이 쥐고 바깥 화면에 선다.
 *
 * ⑨ · ⑩은 원안지처럼 이름을 칸 위 띠에 얹는다(FormBlock). 모범답안 · 루브릭 · 예시는 한 줄에 마흔 자가
 * 넘는 글이라 왼쪽 이름 기둥만큼 칸을 좁히면 줄이 두 배로 접힌다. 한동안(2026-09-22 요청) 다른 칸처럼
 * 이름을 왼쪽에 두었는데, 원안지를 그대로 따르면서 되돌렸다(2026-10-28).
 *
 * 원안지의 빨간 글씨(「(지우고 사용)」 · 「S1, S2도 기록하고 …」)는 칸이 빈 동안만 선다. 회색 예시가
 * 함께 서는 칸은 그 예시를 지우고 쓰라는 뜻이고, 적기 시작하면 둘 다 사라진다(Guide.tsx).
 */
export function QuestionContentRows({
  q,
  content,
  marks = [],
  disabled,
  passage,
  onChange,
  onContent,
  startDoc,
  startGuide = false,
}: {
  q: Question;
  /** 이 문항을 학생이 보는 모양 — 발문 아래 자료와 답 칸이 여기 담긴다(lib/content.ts) */
  content?: ContentQuestion;
  /** 지문에 적힌 빈칸 표지(「( ㄱ )」) — 문서 편집기가 한 줄씩 정답 칸으로 넣어 준다 */
  marks?: string[];
  disabled: boolean;
  /** ⑦ 칸 맨 위에 세울 지문 상자 — 단일 문항만. 세트는 바깥 화면에 지문이 있다 */
  passage?: React.ReactNode;
  onChange: (next: Question) => void;
  onContent?: (next: ContentQuestion) => void;
  /**
   * 문서 편집기를 연 채로 그린다 — 넘긴 글이 편집기에 펴진다. 디자인 보기가 「편집기에 표지를
   * 넣는 중」을 주소로 굳힐 때만 넘긴다. 실제 화면은 넘기지 않는다.
   */
  startDoc?: string;
  /** 문서 편집기의 「표지 안내」를 편 채로 연다 — startDoc과 함께, 디자인 보기만 */
  startGuide?: boolean;
}) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  /* 답 칸 표지로 쓴 문항 — 형식이 객관식 · OX여도(「[선택1]」 · 「[OX1]」) 보기 칸은 쓰지 않는다 */
  const marked = slotted(q);
  const choice = q.type === "choice" && !marked;
  const picks = hasChoices(q.type) && !marked;
  /** 지금 답 칸과 칸마다의 정답 — 학생이 보는 모양에 담겨 있다 */
  const fit: SlotAnswer = {
    response: content?.response ?? { kind: "blanks", blanks: [] },
    answers: content?.sampleAnswer ?? [],
  };
  /*
    표지 없이 만든 답 칸이 있는 문항 — 표지로 옮긴 꼴(legacySlots). 「표지로 바꾸기」가 이것을 담고,
    문서 편집기도 이 꼴로 연다(적용하면 바뀐다). 아직 아무것도 쓰지 않은 새 문항은 옮기지 않는다 —
    처음 받은 형식(typeForLevel)으로 표지를 미리 넣어 두면 고르지도 않은 칸이 선다.
  */
  /* 잠긴 문항은 칸이 있으면 무엇이든 요약하고(옛 문항이다), 고칠 수 있는 문항은 예전 답 칸 편집기로 만든
     칸만 요약한다 — 형식에 따라 저절로 선 빈 칸뿐인 새 문항에는 표시 쓰는 법을 세운다(oldAnswerArea).
     고칠 수 있는 옛 문항은 대개 읽을 때 이미 표시로 옮겨져 온다(lib/itemStore.ts withSlots) */
  const oldArea =
    !marked &&
    !hasChoices(q.type) &&
    !stemIsEmpty(q) &&
    (disabled ? hasAnswerArea(fit.response) : oldAnswerArea(fit.response));
  const legacy = oldArea && q.stemMode === "text" ? legacySlots(q.stem, q.type, fit) : null;
  const putFit = (next: SlotAnswer) =>
    content &&
    onContent?.({
      ...content,
      response: next.response,
      sampleAnswer: next.answers.some((a) => a.trim()) ? next.answers : undefined,
    });

  /*
    문항을 문서 편집기로 열었는가 — 발문 · 보기 · 발문 아래 자료를 한 장에 편다.
    base는 표지마다 적어 둔 것(정답 · 예시 답 · 밑그림 · 고를 것)을 옮겨 올 답 칸이다 — 옛 문항이면
    표지로 옮긴 꼴이다. 적용할 때 표지 이름이 같은 칸에 그것을 그대로 담는다(fitSlots).
  */
  const [doc, setDoc] = useState<{ html: string; atoms: Block[]; base?: SlotAnswer } | null>(
    startDoc !== undefined ? { html: startDoc, atoms: [] } : null,
  );
  const stemHtml =
    q.stemMode === "text"
      ? ""
      : q.stemMode === "images"
        ? q.stemImages.map((src) => `<img src="${src}" alt="">`).join("")
        : renderDetail(q.stemMode, q.stem, q.stemImages);
  const openDoc = () => {
    if (marked || legacy) {
      /* 짧은 칸의 정답은 표지 안에 펴 둔다(「[정답1: A]」) — 문서에서 바로 고치고 적용한다 */
      const base = legacy ?? fit;
      const body = questionToHtml(
        textToHtml(withSlotAnswers(legacy ? legacy.stem : q.stem, base)),
        [],
        content?.blocks ?? [],
      );
      setDoc({ ...body, base });
      return;
    }
    setDoc(
      questionToHtml(
        /* 그림으로 쓴 발문은 그림을 문서에 펴 둔다 — 적용하면 발문 아래 자료로 들어간다 */
        q.stemMode === "text" ? textToHtml(q.stem) : stemHtml,
        choice ? q.choices.filter((c) => c.trim()) : [],
        content?.blocks ?? [],
      ),
    );
  };

  /**
   * 문서 → 문항.
   *
   *   표지가 있으면   표지마다 칸을 세운다. 번호 없는 표지 · 겹친 번호에는 빈 번호를 주고
   *                   (numberSlots), 표지 안에 적은 정답을 그 칸에 담고(takeSlotAnswers), 형식을
   *                   표지에서 읽는다(slotType)
   *   ① ② ③ … 이면   붙여 넣기 규칙으로 발문 · 보기 · 정답을 가르고 객관식이 된다
   *   둘 다 없으면    발문만 바꾼다
   *
   * 표 · 그림 · 상자는 발문 아래 자료로 보낸다. 보기가 바뀌면 보기마다 적은 오답 설계 의도는 옛
   * 보기를 가리키므로 비운다.
   */
  const applyDoc = (html: string) => {
    if (!doc) return;
    const { text, extra } = htmlToQuestion(html, doc.atoms);
    const blocks = extra.length > 0 ? extra : undefined;
    if (hasSlots(text)) {
      const { text: stem, given } = takeSlotAnswers(numberSlots(text));
      const next = fitSlots(stem, doc.base ?? fit, given);
      set({ stemMode: "text", stem: stem.trim(), type: slotType(scanSlots(stem).marks) ?? q.type });
      if (content && onContent) {
        onContent({
          ...content,
          blocks,
          response: next.response,
          sampleAnswer: next.answers.some((a) => a.trim()) ? next.answers : undefined,
        });
      }
      return;
    }
    const split = splitPastedItem(text);
    if (split) {
      const same = split.choices.join("\n") === q.choices.join("\n");
      set({
        stemMode: "text",
        stem: split.stem,
        type: "choice",
        choices: split.choices,
        answer: split.answer ?? Math.min(q.answer, split.choices.length - 1),
        distractorIntent: same ? q.distractorIntent : [],
      });
    } else {
      set({ stemMode: "text", stem: text.trim() });
    }
    /* 표지를 모두 지운 문항 — 표지로 세웠던 칸도 걷는다. 이름 없는 칸만 남기면 아이 화면에 어느
       괄호의 것인지 모를 칸이 줄줄이 선다. 칸이 없으면 제출 문턱이 「답 칸」으로 짚는다 */
    const orphan = fit.response.kind === "blanks" && fit.response.blanks.some((b) => b.slot);
    if (content && onContent) {
      onContent({
        ...content,
        blocks,
        ...(orphan ? { response: { kind: "blanks" as const, blanks: [] }, sampleAnswer: undefined } : {}),
      });
    }
  };

  /** 「표지로 바꾸기」 — 옛 답 칸을 표지로 옮겨 문항 글 끝에 붙인다 */
  const convert = () => {
    if (!legacy) return;
    set({ stemMode: "text", stem: legacy.stem, type: slotType(scanSlots(legacy.stem).marks) ?? q.type });
    putFit(legacy);
  };

  const toggleFigure = (id: string, on: boolean) =>
    set({ figureChecks: on ? [...q.figureChecks, id] : q.figureChecks.filter((x) => x !== id) });

  return (
    <>
      {/* 문항은 상자 하나 — 발문 · 발문 아래 자료 · 보기를 응시 화면 차례 그대로 그린다(2026-09-22 요청).
          쓰는 곳은 문서 편집기다. 답 칸은 문항 글에 적은 표지가 세우고(2026-10-16 요청), 상자는 표지
          자리에 이름표와 정답을 그린다. 정답은 아래 ⑨에서도 고친다.
          빈 상자의 쓰는 법은 원안지의 빨간 글처럼 빨갛게 — 적용하면 사라진다 */}
      <FormRow label={`⑦ 문항 ${q.level}`} req>
        {passage}
        <DocBox
          label="문항"
          empty={
            disabled ? (
              "비어 있습니다."
            ) : (
              <Red>
                (지우고 사용) 눌러서 문서 편집기로 문항을 씁니다 — 답이 들어갈 자리에는 [정답1] ·{" "}
                {"{서술형1}"} 같은 표시를, 객관식은 보기(① ② ③ …)를 씁니다.
              </Red>
            )
          }
          disabled={disabled}
          filled={!!q.stem.trim() || q.stemImages.length > 0 || q.choices.some((c) => c.trim())}
          onOpen={openDoc}
        >
          {q.stemMode === "text" ? (
            marked ? (
              <SlotText text={q.stem} fit={fit} />
            ) : (
              <p className="whitespace-pre-line font-semibold">
                <WithBlanks text={q.stem} />
              </p>
            )
          ) : (
            <div className="font-semibold" dangerouslySetInnerHTML={{ __html: stemHtml }} />
          )}
          {(content?.blocks?.length ?? 0) > 0 && (
            <div className="mt-3">
              <BlockList blocks={content!.blocks!} />
            </div>
          )}
          {choice && (
            <ol className="a2-docbox-choices">
              {q.choices.map((c, k) => (
                <li key={k} className="a2-docbox-choice">
                  <span className={`a2-docbox-mark${q.answer === k ? " on" : ""}`}>{k + 1}</span>
                  <span>{c.trim() || <span className="text-(--a2-ink-4)">(빈 보기)</span>}</span>
                </li>
              ))}
            </ol>
          )}
        </DocBox>
      </FormRow>

      {/* ⑧ 그림·삽화 사양 — 원안지의 체크 다섯 칸을 한 덩이 글처럼 이어 적는다. 그림 없음 · 그림 있음은
          둘 중 하나(다시 누르면 풀린다), 아래 세 칸은 그림 있음일 때만 짚는다 — 양식의 「아래 확인 필수」.
          그림 파일은 ⑦ 문항 · 지문에 넣는다(별도 파일 첨부, 파일명=문항 ID는 종이 원안지의 약속이다) */}
      <FormRow label="⑧ 그림·삽화 사양" req>
        <div className="a2-cell-pad a2-paper-boxes a2-paper-flow">
          <label className="a2-paper-box">
            <input
              type="checkbox"
              checked={q.figure === "none"}
              disabled={disabled}
              onChange={(e) => set({ figure: e.target.checked ? "none" : "" })}
            />
            <span>그림 없음</span>
          </label>
          <label className="a2-paper-box">
            <input
              type="checkbox"
              checked={q.figure === "has"}
              disabled={disabled}
              onChange={(e) => set({ figure: e.target.checked ? "has" : "" })}
            />
            <span>그림 있음(별도 파일 첨부, 파일명=문항 ID) — 아래 확인 필수</span>
          </label>
          {figureChecks.map((c) => (
            <label key={c.id} className="a2-paper-box">
              <input
                type="checkbox"
                checked={q.figureChecks.includes(c.id)}
                disabled={disabled || q.figure !== "has"}
                onChange={(e) => toggleFigure(c.id, e.target.checked)}
              />
              <span>{c.text}</span>
            </label>
          ))}
          {!disabled && !q.figure && <Red>(해당하는 곳에 체크)</Red>}
        </div>
      </FormRow>

      {/* 「답 칸 — 학생이 채우는 칸과 칸마다의 정답」 판(AnswerEditor)은 걷었다(2026-10-16 요청).
          칸은 문항 글의 표지가 세우고, 정답은 ㉠에서 표지마다 적는다. 고르는 문항은 고른 정답을 그 자리에서
          고른다 */}
      <FormBlock title="⑨ 정답 · 채점 기준" req>
        <BlockPart title="㉠ 모범답안(단답·서술형)">
          {content && onContent && marked && (
            <SlotAnswers stem={q.stem} fit={fit} disabled={disabled} onChange={putFit} />
          )}
          {content &&
            onContent &&
            !marked &&
            !picks &&
            (oldArea ? (
              <LegacyAnswers
                fit={fit}
                canConvert={!!legacy}
                disabled={disabled}
                onConvert={convert}
              />
            ) : (
              <SlotStart />
            ))}
          {picks && (
            <CellLine label="정답">
              {/* 보기 칸이 문항 상자로 들어가면서 정답은 여기서 고른다. 문서 편집기에서 「정답: ③」 줄을
                  적어도 여기에 켜진다 */}
              <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
                {(q.type === "ox" ? [...OX_CHOICES] : q.choices).map((c, k) => (
                  <label key={k} className="a2-choice">
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      checked={q.answer === k}
                      disabled={disabled}
                      onChange={() => set({ answer: k })}
                      aria-label={`${k + 1}번을 정답으로`}
                    />
                    {q.type === "ox" ? c : <span className="a2-mono">{k + 1}번</span>}
                  </label>
                ))}
              </div>
            </CellLine>
          )}
          {/* 답 칸 편집기가 서면 허용 답안은 칸마다 거기서 받는다 */}
          {q.type === "short" && !(content && onContent) && (
            <CellLine label="허용 답안">
              <GrowTextarea
                line
                className="a2-textarea a2-textarea-lg"
                value={q.shortAnswers}
                disabled={disabled}
                onChange={(e) => set({ shortAnswers: e.target.value })}
                aria-label="허용 답안"
              />
            </CellLine>
          )}
          <CellLine label="정답 및 해설">
            <Guided
              show={!disabled && !q.explain}
              guide={
                <>
                  예) {PAPER_EXAMPLES.explain} <Red>(지우고 사용)</Red>
                </>
              }
            >
              <GrowTextarea
                className="a2-textarea a2-textarea-lg"
                rows={4}
                value={q.explain}
                disabled={disabled}
                onChange={(e) => set({ explain: e.target.value })}
                aria-label="정답 및 해설"
              />
            </Guided>
          </CellLine>
        </BlockPart>
        <BlockPart title="㉡ 부분점수/루브릭" req={needsRubric(q.type)}>
          <Guided
            show={!disabled && !q.rubric}
            guide={<Red>S1, S2도 기록하고, S3, S4 문항은 상세하게 기록</Red>}
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={4}
              value={q.rubric}
              disabled={disabled}
              onChange={(e) => set({ rubric: e.target.value })}
              aria-label="부분점수/루브릭"
            />
          </Guided>
        </BlockPart>
      </FormBlock>

      {/* 원안지대로 인정 · 불인정을 한 띠 아래 둔다. 불인정 예 칸은 2026-09-21 협의로 걷었다가 원안지
          (2026-10-22)가 다시 묻게 되어 되돌렸다 — 체크리스트 「인정 예 2개 이상 · 불인정 예 1건 이상」.
          제출 문턱은 여전히 인정 예만 막는다(missingCard). 기계가 채점하는 형식(객관식 · OX)은 묻지 않는다 */}
      <FormBlock title="⑩ 인정 불인정 예 (2개 이상)" req={!hasChoices(q.type)}>
        <CellLine label="인정 예">
          <Guided
            show={!disabled && !q.acceptExamples}
            guide={
              <>
                예) {PAPER_EXAMPLES.accept} <Red>(지우고 사용)</Red>
              </>
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={3}
              value={q.acceptExamples}
              disabled={disabled}
              onChange={(e) => set({ acceptExamples: e.target.value })}
              aria-label="인정 예"
            />
          </Guided>
        </CellLine>
        <CellLine label="불인정 예">
          <Guided
            show={!disabled && !q.rejectExamples}
            guide={
              <>
                예) {PAPER_EXAMPLES.reject} <Red>(지우고 사용)</Red>
              </>
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={2}
              value={q.rejectExamples}
              disabled={disabled}
              onChange={(e) => set({ rejectExamples: e.target.value })}
              aria-label="불인정 예"
            />
          </Guided>
        </CellLine>
      </FormBlock>

      <FormRow label="⑪ 재능 평가 관점" req>
        <SubRows>
          <SubRow label="인지 처리 위계 구체">
            <Guided
              show={!disabled && !q.perspectiveHierarchy}
              guide={
                <>
                  예) {perspectiveExamples[q.level].hierarchy} <Red>(지우고 사용)</Red>
                </>
              }
            >
              <GrowTextarea
                className="a2-textarea a2-textarea-lg"
                rows={2}
                value={q.perspectiveHierarchy}
                disabled={disabled}
                onChange={(e) => set({ perspectiveHierarchy: e.target.value })}
                aria-label="인지 처리 위계 구체"
              />
            </Guided>
          </SubRow>
          <SubRow label="인지 능력 관련 수준">
            <Guided
              show={!disabled && !q.perspectiveAbility}
              guide={
                <>
                  예) {perspectiveExamples[q.level].ability} <Red>(지우고 사용)</Red>
                </>
              }
            >
              <GrowTextarea
                className="a2-textarea a2-textarea-lg"
                rows={2}
                value={q.perspectiveAbility}
                disabled={disabled}
                onChange={(e) => set({ perspectiveAbility: e.target.value })}
                aria-label="인지 능력 관련 수준"
              />
            </Guided>
          </SubRow>
        </SubRows>
      </FormRow>

      {/* 객관식은 보기마다 적는다(distractorIntent) — 미리보기가 보기 밑에 붙이고 검수가 오답마다
          본다. 보기 글을 옆에 다시 적는 것은 위 문항 칸에서 한참 내려온 자리라 번호만으로는 어느
          보기의 오개념을 적는지 모르기 때문이다. 보기가 없는 형식은 예상 오답을 글로 적는다
          (wrongIntent) — 종이 카드에서도 이 칸은 글 한 덩이다 */}
      <FormRow label="⑫ 오답 설계 의도" req={choice}>
        {choice ? (
          q.choices.map((c, k) => (
            <div key={k} className="a2-cell-split a2-cell-intent">
              <span className="flex items-center justify-center a2-mono a2-t-sm text-(--a2-ink-3)">
                {k + 1}
              </span>
              {/* 보기 글은 말줄임으로 자르지 않고 접는다. 옆 의도 칸은 적은 만큼 늘어나는데 보기
                  글만 잘려 있으면, 어느 보기의 오개념을 적는지 한 번에 읽히지 않는다 */}
              <span className="flex min-w-0 items-center px-3 py-2 a2-t-sm text-(--a2-ink-2)">
                <span className="min-w-0 break-words">{c.trim() || "—"}</span>
              </span>
              <GrowTextarea
                line
                className="a2-textarea a2-textarea-lg"
                value={q.distractorIntent[k] ?? ""}
                disabled={disabled}
                placeholder={q.answer === k ? "정답" : undefined}
                aria-label={`${k + 1}번 오답 설계 의도`}
                onChange={(e) => {
                  const next = [...q.distractorIntent];
                  while (next.length < q.choices.length) next.push("");
                  next[k] = e.target.value;
                  set({ distractorIntent: next });
                }}
              />
            </div>
          ))
        ) : (
          <Guided
            show={!disabled && !q.wrongIntent}
            guide={
              <>
                예) {PAPER_EXAMPLES.wrong} <Red>(지우고 사용)</Red>
              </>
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={3}
              value={q.wrongIntent}
              disabled={disabled}
              onChange={(e) => set({ wrongIntent: e.target.value })}
              aria-label="오답 설계 의도"
            />
          </Guided>
        )}
      </FormRow>

      {/* ⑬ — 원안지(2026-10-22)에 새로 생긴 칸. 양식의 빨간 글을 그대로 안내로 둔다. 제출 문턱에는
          넣지 않았다 — 무엇을 적는 칸인지 양식이 아직 정하지 않았다 */}
      <FormRow label="⑬ 이 문항의 특성">
        <Guided
          show={!disabled && !q.trait}
          guide={<Red>기존의 양식에는 없던 것인데 새로 신설됨</Red>}
        >
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={2}
            value={q.trait}
            disabled={disabled}
            onChange={(e) => set({ trait: e.target.value })}
            aria-label="이 문항의 특성"
          />
        </Guided>
      </FormRow>

      {doc && (
        <DocEditor
          title="문항 — 발문 · 답 칸 표시 · 보기 · 발문 아래 자료"
          initialHtml={doc.html}
          mode="question"
          passageMarks={marks}
          startGuide={startGuide}
          onClose={() => setDoc(null)}
          onApply={applyDoc}
        />
      )}
    </>
  );
}
