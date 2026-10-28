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
  slotName,
  slotType,
  takeSlotAnswers,
  withSlotAnswers,
  type SlotAnswer,
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
import type { UnitStandard } from "@/lib/curriculumUnits";
import GrowTextarea from "@/components/admin2/GrowTextarea";
import { Blue, Guided, Red } from "@/components/admin2/Guide";
import { CellLine, FormRow, FormRowPair, SubRow, SubRows } from "@/components/admin2/ui";

/**
 * 문항 상세의 본문 — 세트의 문항 목록 · 문항 하나의 분류 줄 · 문항 줄.
 * 지문·발문 편집기는 components/admin2/BodyEditor.tsx에 있다.
 *
 * ── 줄의 차례는 문항 카드의 차례다 ──
 * 출제위원이 받는 종이 문항 카드와 같은 차례로 선다. 한동안 「쓰기 전에 정할 것 / 쓰고 나서
 * 붙일 것」으로 분류를 문항 앞뒤로 갈랐는데, 출제위원은 카드를 옆에 펴 놓고 칸을 옮겨
 * 적는다 — 화면 차례가 카드와 다르면 칸을 찾아 화면을 오르내린다. 그래서 둘로 편다.
 *
 *   분류  (문항 ID · 학년 · 교과 단원은 묶음이 쥔다) 인지단계 · Tag A · 출제 의도 · Tag B ·
 *         형식 · 난이도|배점
 *   문항  (지문은 묶음이 쥔다) 문항 · 정답·채점 기준 · 인정 예 ·
 *         재능 평가 관점 · 오답 설계 의도
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
                      문항 {k + 1}
                    </button>
                  </td>
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

/**
 * 형식 칸 — 문항에 쓴 것에서 읽은 형식과 그 근거.
 *
 * 형식은 문항을 쓰면 정해진다 — 답 칸 표지가 있으면 표지가(칸이 여럿이면 사람이 채점하는 칸이),
 * 줄 맨 앞에 ① ② ③ …이 있으면 객관식이다(QuestionContentRows의 applyDoc). 아직 아무것도 쓰지
 * 않은 문항은 「정해지지 않음」으로 둔다 — 새 문항이 처음 받는 형식(typeForLevel)을 그대로 적으면
 * 쓰지도 않은 형식이 정해진 것처럼 읽힌다.
 */
function TypeLine({ q }: { q: Question }) {
  const marks = slotted(q) ? scanSlots(q.stem).marks : [];
  const empty = typeUnset(q);
  const why =
    marks.length > 0
      ? `답 칸 표시로 정해집니다 — ${marks.map((m) => slotName(m.key)).join(" · ")}`
      : empty
        ? "문항에 [정답1] · {서술형1} 같은 답 칸 표시를 넣거나 ① ② ③ … 보기를 쓰면 정해집니다"
        : q.type === "choice"
          ? "줄 맨 앞의 ① ② ③ … 보기로 정해집니다"
          : q.type === "ox"
            ? "맞다 · 아니다 두 보기로 정해집니다"
            : "아직 답 칸 표시가 없습니다 — 문항에 [정답1] · {서술형1} 같은 표시를 넣으면 표시에 맞게 정해집니다";
  return (
    <div className="a2-cell-pad flex flex-wrap items-center gap-x-3 gap-y-1">
      {empty ? (
        <span className="a2-t-md text-(--a2-ink-4)">정해지지 않음</span>
      ) : (
        <b className="a2-t-md text-(--a2-ink)">{typeLabel(q.type)}</b>
      )}
      <span className="a2-t-sm text-(--a2-ink-3)">{why}</span>
    </div>
  );
}

/** 칸 아래 경고 한 줄 — 막는 것은 빨강, 봐 둘 것은 노랑 */
const Danger = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: toneColor.danger }}>{children}</span>
);

/**
 * 문항 하나의 분류 줄 — 인지단계 · Tag A · 출제 의도 · Tag B · 형식 · 난이도|배점.
 *
 * 문항 ID · 학년 · 교과 단원은 이 위에 선다. 그 셋은 묶음이 통째로 쥐는 값이라 문항 상세
 * (ItemDetail)가 그리고, 세트에서도 문항마다 다르지 않다.
 *
 * 단일이면 문항 상세에, 세트면 목록에서 들어간 문항 상세에 선다. 세트의 바깥 화면에는
 * 분류가 아예 없다 — 분류는 세트가 아니라 그 안의 문항에 붙는 것이라, 바깥에 세우면 어느
 * 문항의 것인지 말할 수 없는 값이 된다. 두 자리가 같은 줄을 쓰는 것이 요점이다 — 단일로
 * 쓰던 사람이 세트로 넘어갔을 때 칸이 다르면 같은 것을 두 번 배워야 한다.
 *
 * AI 문항 출제 판(authoring/Generator)도 같은 줄로 뽑을 문항의 분류를 받는다. 생성 판이 따로
 * 칸을 세웠을 때는 거기서 고른 것과 문항 상세에서 고치는 것의 이름 · 차례가 달랐다.
 *
 * ⚠ 문항 카드(.a2-card) 안에서만 쓴다. 입력에 테두리가 없고 칸의 선이 그 노릇을 한다.
 */
export function QuestionClassRows({
  q,
  band,
  disabled,
  withLevel = true,
  guides = true,
  standards = [],
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
  /**
   * 원안지의 빨간 안내(「(수정 사용)」 · 「(해당 과목에 따라 체크 및 입력 사용)」)를 세우는가. 칸이 빈 동안만
   * 선다. 잠긴 문항과 생성 판(아직 문항이 없는 분류만 고른다)은 끈다.
   */
  guides?: boolean;
  /**
   * 고른 교과 단원이 다루는 성취기준(lib/curriculumUnits.ts standardsOfUnit). 단원을 고르면 첫 코드가 칸에
   * 들어가고(withUnitStandard), 칸을 누르면 이 목록에서 같은 단원의 다른 코드를 고를 수 있다.
   */
  standards?: UnitStandard[];
  onChange: (next: Question) => void;
}) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const guide = guides && !disabled;
  const std = questionStandardIssue(q, band);
  const outOfRange = withLevel && !levelAllowed(q.talent, q.level);
  /* 아직 형식이 정해지지 않은 문항(아무것도 안 쓴 새 문항)에는 고정 매핑을 따지지 않는다 — 처음 받은
     형식으로 「선택 1점입니다」를 띄우면 고르지도 않은 형식을 나무란다 */
  const format = typeUnset(q) ? "" : formatIssue(q);
  const talent = talentOf(q.talent);

  /* 치는 중인 글자. 바깥에서 배점이 바뀌면(취소 · 다른 문항) 그 글자는 버리고 값을 그린다 —
     글자가 나타내는 수와 지금 배점이 같을 때만 글자를 믿는다 */
  const [pointsText, setPointsText] = useState(q.points === 0 ? "" : String(q.points));
  const textValue = pointsText === "" || pointsText === "." ? 0 : Number(pointsText);
  const pointsShown = textValue === q.points ? pointsText : q.points === 0 ? "" : String(q.points);

  const difficultyRadios = (
    <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
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
      {guide && !difficultyPicked(q.b) && <Red>(해당 과목에 따라 체크 및 입력 사용)</Red>}
    </div>
  );

  return (
    <>
      {withLevel && (
        <FormRow label="인지단계" req>
          {/* 네 단계를 다 펴 두고 하나만 고른다 — 난이도와 같은 꼴(2026-10-28 요청). 고르개에 접어 두면
              단계마다 무엇을 하는지(원안지의 괄호 글)를 열어 봐야 알았다. 재능 축이 낼 수 없는 단계
              (자기-성찰의 S4)는 잠근다 */}
          <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
            {LEVELS.map((l) => {
              const allowed = levelAllowed(q.talent, l);
              return (
                <label
                  key={l}
                  className="a2-choice"
                  title={allowed ? undefined : `${talentName(q.talent)} 축은 출제할 수 없습니다`}
                >
                  <input
                    type="radio"
                    name={`level-${q.id}`}
                    checked={q.level === l}
                    disabled={disabled || !allowed}
                    onChange={() => set({ level: l })}
                  />
                  {l} {cardLevelText[l]}
                </label>
              );
            })}
          </div>
        </FormRow>
      )}

      {/* 종이 카드의 Tag A 칸 한 칸을 그대로 옮긴다 — 성취기준 코드(코드 + 내용)와 학습 요소를
          한 칸 안에 줄로 쌓는다. 줄마다 따로 줄을 세우면 카드의 한 칸이 화면에서 두 칸이 된다.

          NCIC 원문 대조 · 2022 개정 코드 확인 체크는 한동안 걷었다(옛 체크리스트 01이 같은 것을 물었다).
          원안지 양식(2026-10-22)의 체크리스트에서 그 줄이 빠지고 Tag A 칸에 두 체크가 들어가 되돌렸다.
          코드 형식이 틀렸다는 줄도 칸 아래에 적지 않는다 — 제출 단추의 풍선 도움말이 짚고,
          학년을 벗어난 코드는 학년 줄이 짚는다.

          예시는 칸 안의 회색 글(placeholder)로 둔다 — 치기 시작하면 저절로 사라진다(2026-09-22 요청,
          lib/blueprint.ts cardExamples). 칸 아래 줄로 두었을 때는 다 적은 뒤에도 남아 화면을 길게 했다.

          학습 요소는 옛 「Tag A 세부」 칸(tagADetail)을 그대로 쓴다. 목록·검수 화면이 Tag A 한
          줄을 그 칸으로 짓는다(lib/itemStore.ts syncTags) */}
      <FormRow label="Tag A (학력)" req>
        <CellLine label="성취기준 코드">
          <div className="a2-cell-split" style={{ gridTemplateColumns: "9rem minmax(0, 1fr)" }}>
            <input
              className="a2-input a2-input-lg a2-mono self-center"
              value={q.standardCode}
              disabled={disabled}
              list={standards.length > 0 ? `standards-${q.id}` : undefined}
              onChange={(e) => {
                /* 목록에서 고른 코드면 성취기준 내용도 따라 바꾼다 — 비었거나 목록의 다른 코드 원문일 때만.
                   손으로 적은 내용은 덮지 않는다 */
                const code = e.target.value;
                const hit = standards.find((x) => x.code === code);
                const auto = !q.standardText.trim() || standards.some((x) => x.text === q.standardText);
                set(hit?.text && auto ? { standardCode: code, standardText: hit.text } : { standardCode: code });
              }}
              placeholder={`예) ${codeSamples[band][0]}`}
              aria-invalid={!std.ok}
              aria-label="성취기준 코드"
            />
            {standards.length > 0 && (
              <datalist id={`standards-${q.id}`}>
                {standards.map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.text}
                  </option>
                ))}
              </datalist>
            )}
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
        {guides && (
          <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
            <label className="a2-choice">
              <input
                type="checkbox"
                checked={q.ncicChecked}
                disabled={disabled}
                onChange={(e) => set({ ncicChecked: e.target.checked })}
              />
              NCIC(국가교육과정정보센터) 원문 대조 완료
            </label>
            <label className="a2-choice">
              <input
                type="checkbox"
                checked={q.code2022Checked}
                disabled={disabled}
                onChange={(e) => set({ code2022Checked: e.target.checked })}
              />
              2022 개정 코드 확인
            </label>
          </div>
        )}
      </FormRow>

      {/* 출제 의도는 Tag A 칸에서 빼내 제 줄로 세운다. 성취기준 코드·학습 요소는 교육과정 문서에서
          옮겨 적는 칸이지만 출제 의도는 출제자가 직접 쓰는 글이라, 한 칸 안에 끼워 두면 이름표가
          없는 셋째 줄처럼 읽히고 검수가 무엇을 봐야 하는지도 흐려진다 */}
      <FormRow label="출제 의도" req>
        <Guided
          show={guide && !q.tagAIntent}
          guide={
            <>
              예) {cardExamples.tagAIntent} <Blue>반드시 기록하여 주세요.</Blue>
            </>
          }
        >
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={2}
            value={q.tagAIntent}
            disabled={disabled}
            onChange={(e) => set({ tagAIntent: e.target.value })}
            placeholder={guides ? undefined : `예) ${cardExamples.tagAIntent}`}
            aria-label="출제 의도"
          />
        </Guided>
      </FormRow>

      {/* 칸 아래에는 축과 단계가 어긋났을 때만 적는다. 한동안 3원 좌표와 격자 지표를 늘
          적어 두었는데, 두 고르개가 이미 그 값을 보여 주고 있어 같은 말을 한 번 더 하는 줄이었다 */}
      <FormRow
        label="Tag B (재능)"
        req
        hint={
          outOfRange ? (
            <Danger>
              {talent.name} 축은 {q.level}을 출제할 수 없습니다 — 인지단계를 다시 고르세요.
            </Danger>
          ) : guide && !questionHasContent(q) ? (
            /* 고르개는 늘 값이 있어 「빈 때」가 없다 — 새 문항은 앞 문항의 축을 물려받으므로, 아직 아무것도
               적지 않은 문항에만 원안지의 안내를 세운다 */
            <Red>(수정 사용)</Red>
          ) : undefined
        }
      >
        <div className="a2-cell-split">
          <select
            className="a2-select a2-input-lg"
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
          <select
            className="a2-select a2-input-lg"
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
        </div>
      </FormRow>

      {/* 형식은 고르지 않는다 — 문항에 쓴 것이 정한다(2026-10-16 요청). 답 칸 표지([정답1] ·
          {서술형1} …)를 쓰면 표지가, 줄 맨 앞에 ① ② ③ …을 쓰면 객관식이 된다(lib/answerSlots.ts).
          한동안은 여기서 형식을 고르고 그 형식에 맞는 답 칸을 문항 아래에 따로 만들었는데, 형식을 바꿀
          때마다 답 칸이 통째로 바뀌었고 문항 글과 칸이 떨어져 있었다. 단계와 어긋나면(고정 매핑)
          여기와 체크리스트에 적는 것은 그대로다 */}
      {withLevel && (
        <FormRow label="형식" req hint={format ? <Danger>{format}</Danger> : undefined}>
          <TypeLine q={q} />
        </FormRow>
      )}

      {/* 운영자가 직접 적는다. 인지단계를 바꿔도 적어 둔 배점을 덮지 않는다 — 덮으면 단계를
          한 번 고친 것만으로 매겨 둔 배점이 소리 없이 사라진다. 새 문항만 원안지의 고정 배점
          (lib/blueprint.ts의 cardPoints — S1 · S2 2점, S3 4점, S4 6점)으로 시작한다.

          비운 칸은 0으로 든다. 0 이하는 제출 문턱이 막는다(missingContent).
          칸은 치는 글자를 따로 들고 있다(pointsText) — 숫자만 들고 다시 그리면 「0.5」를 치는
          도중의 「0」과 「0.」이 0으로 굳어 빈칸이 되고, 소수점을 칠 수가 없다.
          0.5점 단위는 고정 매핑에 없지만 칸에서 막지는 않는다 — 형식 칸이 짚는다 */}
      {!withLevel ? (
        <FormRow label="난이도" req>
          {difficultyRadios}
        </FormRow>
      ) : (
        <FormRowPair
          left={{
            label: "난이도",
            req: true,
            children: difficultyRadios,
          }}
          right={{
            label: "배점",
            req: true,
            hint:
              q.points > 0 ? undefined : (
                <Danger>0보다 큰 배점을 적어야 검수로 제출할 수 있습니다.</Danger>
              ),
            children: (
              <div className="a2-cell-unit">
                <input
                  type="text"
                  inputMode="decimal"
                  className="a2-input a2-input-lg a2-num"
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
                <span>점</span>
              </div>
            ),
          }}
        />
      )}
    </>
  );
}

/**
 * 문항 하나의 문항 줄 — 문항 · 정답·채점 기준 · 인정 예 · 재능 평가 관점 ·
 * 오답 설계 의도.
 *
 * 지문은 이 위에 선다. 세트면 문항들이 함께 읽는 것이라 묶음이 쥐고, 문항 상세(ItemDetail)가
 * 그린다.
 *
 * 모든 칸이 이름을 왼쪽에, 값을 오른쪽에 둔다(FormRow). 답 칸만 칸 편집기가 넓어 이름을 위에 얹는다.
 * 모범답안 · 부분점수 · 예시는 한 줄에 마흔 자가 넘는 글이라, 왼쪽 이름 기둥만큼 칸을 좁히면
 * 줄이 두 배로 접힌다. 종이 문항 카드도 이 칸들만 머리 띠를 위에 얹는다.
 */
export function QuestionContentRows({
  q,
  content,
  marks = [],
  disabled,
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

  return (
    <>
      {/* 문항은 상자 하나 — 발문 · 발문 아래 자료 · 보기를 응시 화면 차례 그대로 그린다(2026-09-22 요청).
          쓰는 곳은 문서 편집기다. 발문 칸 · 보기 칸 넷 · 자료 칸을 따로 두던 때는 한글 원고를 칸마다
          나눠 옮겨 적어야 했다. 답 칸은 문항 글에 적은 표지가 세우고(2026-10-16 요청), 상자는 표지
          자리에 이름표와 정답을 그린다. 정답은 아래 「정답 및 채점기준」에서도 고친다 */}
      <FormRow label="문항" req>
        <DocBox
          label="문항"
          empty="비어 있습니다. 눌러서 문서 편집기로 문항을 씁니다 — 답이 들어갈 자리에는 [정답1] · {서술형1} 같은 표시를, 객관식은 보기(① ② ③ …)를 씁니다."
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

      {/* 그림·삽화 사양 — 원안지 양식(2026-10-22)에 생긴 칸. 그림 없음 · 그림 있음 중 하나를 짚고, 그림 있음이면
          양식의 「아래 확인 필수」 세 칸을 모두 짚어야 낸다(lib/itemStore.ts missingCard). 다시 누르면 풀린다 */}
      <FormRow
        label="그림·삽화 사양"
        req
        hint={!disabled && !q.figure ? <Red>(해당하는 곳에 체크)</Red> : undefined}
      >
        <div className="a2-cell-pad flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <label className="a2-choice">
              <input
                type="checkbox"
                checked={q.figure === "none"}
                disabled={disabled}
                onChange={(e) => set({ figure: e.target.checked ? "none" : "" })}
              />
              그림 없음
            </label>
            <label className="a2-choice">
              <input
                type="checkbox"
                checked={q.figure === "has"}
                disabled={disabled}
                onChange={(e) => set({ figure: e.target.checked ? "has" : "" })}
              />
              그림 있음(별도 파일 첨부, 파일명=문항 ID) — 아래 확인 필수
            </label>
          </span>
          {figureChecks.map((c) => (
            <label key={c.id} className="a2-choice">
              <input
                type="checkbox"
                checked={q.figureChecks.includes(c.id)}
                disabled={disabled || q.figure !== "has"}
                onChange={(e) =>
                  set({
                    figureChecks: e.target.checked
                      ? [...q.figureChecks, c.id]
                      : q.figureChecks.filter((x) => x !== c.id),
                  })
                }
              />
              {c.text}
            </label>
          ))}
        </div>
      </FormRow>

      {/* 「답 칸 — 학생이 채우는 칸과 칸마다의 정답」 판(AnswerEditor)은 걷었다(2026-10-16 요청).
          답하는 방식 → 칸 추가 → 칸 이름 → 칸 모양 → 정답을 차례로 골라야 칸 하나가 섰고, 형식을 바꾸면
          칸이 통째로 바뀌었다. 칸은 문항 글의 표지가 세우고, 정답은 바로 아래 줄에서 표지마다 적는다 */}

      {/* 정답 · 채점 기준도 다른 칸처럼 이름을 왼쪽에, 값을 오른쪽에 둔다(2026-09-22 요청). 머리 띠를
          위에 얹던 때는 이 덩이만 다른 모양이라 카드를 훑는 눈이 여기서 한 번 끊겼다 */}
      {/* 정답과 모범답안은 한 줄 「정답 및 채점기준」으로 합친다(2026-09-22 요청). 고르는 문항은 칸 안
          첫 줄에 고른 정답을 읽기로 세우고, 표지로 쓴 문항은 표지마다 한 줄, 그 아래에 모범답안을 적는다 */}
      <FormRow label="정답 및 채점기준" req>
        {content && onContent && marked && (
          <SlotAnswers stem={q.stem} fit={fit} disabled={disabled} onChange={putFit} />
        )}
        {content &&
          onContent &&
          !marked &&
          !picks &&
          (oldArea ? (
            <LegacyAnswers fit={fit} canConvert={!!legacy} disabled={disabled} onConvert={convert} />
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
        <CellLine label="모범답안">
          <Guided
            show={!disabled && !q.explain}
            guide={
              <>
                정답과 해설을 적습니다.
              </>
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={4}
              value={q.explain}
              disabled={disabled}
              onChange={(e) => set({ explain: e.target.value })}
              aria-label="모범답안"
            />
          </Guided>
        </CellLine>
      </FormRow>
      <FormRow label="부분점수/루브릭" req={needsRubric(q.type)}>
        <Guided
          show={!disabled && !q.rubric}
          guide={<Red>S1, S2도 기록하고, S3, S4 문항은 상세하게 기록</Red>}
        >
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={5}
            value={q.rubric}
            disabled={disabled}
            onChange={(e) => set({ rubric: e.target.value })}
            aria-label="부분점수/루브릭"
          />
        </Guided>
      </FormRow>

      {/* 「2개 이상」은 이름에 적고, 개수는 체크리스트가 사람에게 묻는다. 선택형이 아닌 문항에서 인정 예가
          비어 있을 때만 제출이 막힌다(missingCard).

          불인정 예 칸은 2026-09-21 협의로 걷었다가, 원안지 양식(2026-10-22)이 「인정 불인정 예」 한 칸으로
          다시 묻게 되어 한 줄 안에 되돌렸다(체크리스트 「인정 예 2개 이상 · 불인정 예 1건 이상」). 제출 문턱에는
          넣지 않았다 */}
      {/* 필수 표시는 제출 문턱(missingCard)과 같은 셈 — 기계가 채점하는 형식(객관식 · OX)은 묻지 않는다.
          「[선택1]」 · 「[OX1]」만 쓴 문항도 형식이 그것이라 같다 */}
      <FormRow label="인정 · 불인정 예 (2개 이상)" req={!hasChoices(q.type)}>
        <CellLine label="인정 예">
          <Guided
            show={!disabled && !q.acceptExamples}
            guide={
              <>
                {"예) · 밝다 – 어둡다\n· 높다 – 낮다 "}
               
              </>
            }
          >
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={4}
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
                예) · 밝다 – 맑다 (반대말이 아님)
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
      </FormRow>

      <FormRow label="재능 평가 관점" req>
        <SubRows>
          <SubRow label="인지 처리 위계 구체">
            <Guided
              show={!disabled && !q.perspectiveHierarchy}
              guide={
                <>
                  예) {perspectiveExamples[q.level].hierarchy}
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
                  예) {perspectiveExamples[q.level].ability}
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
          (wrongIntent) — 종이 카드에서도 서술형의 이 칸은 글 한 덩이다 */}
      <FormRow
        label="오답 설계 의도"
        req={choice}
      >
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
                예상되는 오답과 그 오답이 노리는 오개념을 적습니다.
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

      {/* 이 문항의 특성 — 원안지 양식(2026-10-22)에 새로 생긴 칸. 양식의 빨간 글을 그대로 안내로 둔다.
          제출 문턱에는 넣지 않았다 — 무엇을 적는 칸인지 양식이 아직 정하지 않았다 */}
      <FormRow label="이 문항의 특성">
        <Guided show={!disabled && !q.trait} guide={<Red>기존의 양식에는 없던 것인데 새로 신설됨</Red>}>
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
