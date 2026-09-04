"use client";

import { useRef, useState } from "react";
import { detailModes, renderDetail, type DetailMode } from "@/lib/richText";
import { IMAGE_MAX_BYTES, dataUrlBytes, shrinkImage } from "@/lib/productStore";
import {
  OX_CHOICES,
  difficulties,
  difficultyPicked,
  itemTypes,
  levelPatch,
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
import { FormRow } from "@/components/admin2/ui";

/**
 * 문항 상세의 본문 — 지문 편집기 · 문항 목록 · 문항 하나의 줄들.
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

export type BodyValue = { mode: DetailMode; body: string; images: string[] };

/** 갈래를 고르고 그 갈래로 쓰는 한 덩이. 이름표는 감싸는 폼 줄(FormRow)이 맡는다 */
export function BodyEditor({
  name,
  value,
  disabled,
  rows = 6,
  placeholder,
  onChange,
}: {
  /**
   * 라디오 묶음 이름 — 화면 안에서 겹치면 안 된다.
   *
   * 지문 편집기와 문항 폼이 한 화면에 같이 설 수 있다. 이름을 하나로 두면 브라우저가
   * 전부 한 묶음으로 보고, 한쪽에서 마크다운을 고르는 순간 다른 쪽 갈래가 꺼진다.
   */
  name: string;
  value: BodyValue;
  disabled: boolean;
  rows?: number;
  placeholder?: string;
  onChange: (patch: Partial<BodyValue>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const { mode, body, images } = value;

  /** 그림을 줄여 담는다. 이미지 갈래는 목록에, 글 갈래는 본문 끝에 표기로 넣는다 */
  async function load(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const made: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const url = await shrinkImage(file);
          if (dataUrlBytes(url) > IMAGE_MAX_BYTES) {
            setError(`${file.name}은(는) 줄여도 너무 큽니다. 더 작은 그림으로 올려 주세요.`);
            continue;
          }
          made.push(url);
        } catch {
          setError(`${file.name}을(를) 읽지 못했습니다.`);
        }
      }
      if (made.length === 0) return;

      if (mode === "images") {
        onChange({ images: [...images, ...made] });
        return;
      }
      const tag = (url: string) =>
        mode === "markdown" ? `![](${url})` : `<img src="${url}" alt="">`;
      const gap = body === "" || body.endsWith("\n") ? "" : "\n";
      onChange({ body: `${body}${gap}${made.map(tag).join("\n")}\n` });
    } finally {
      setBusy(false);
    }
  }

  const html = renderDetail(mode, body, images);

  return (
    <div className="w-full">
      {/* 갈래 고르개 — 무엇으로 쓸지가 먼저 정해져야 아래 칸이 정해진다 */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1">
        {detailModes.map((m) => (
          <label key={m.id} className="a2-choice">
            <input
              type="radio"
              name={name}
              checked={mode === m.id}
              disabled={disabled}
              onChange={() => onChange({ mode: m.id })}
            />
            {m.label}
          </label>
        ))}
      </div>

      {mode === "images" ? (
        <div className="mt-3 grid gap-2">
          {images.length === 0 ? (
            <p className="a2-preview a2-t-sm text-(--a2-ink-4)">아직 올린 그림이 없습니다.</p>
          ) : (
            <ul className="grid gap-2">
              {images.map((src, k) => (
                <li
                  key={`${k}-${src.slice(-16)}`}
                  className="flex items-start gap-2.5 rounded border border-(--a2-line) p-2"
                >
                  <span className="a2-mono a2-t-xs w-5 shrink-0 pt-1 text-(--a2-ink-4)">
                    {k + 1}
                  </span>
                  {/* 미리보기라 next/image를 쓰지 않는다 — data URL은 최적화를 못 거친다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="max-h-48 rounded border border-(--a2-line)" />
                  <span className="ml-auto flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm"
                      disabled={disabled || k === 0}
                      aria-label={`그림 ${k + 1} 위로`}
                      onClick={() => {
                        const next = [...images];
                        [next[k - 1], next[k]] = [next[k], next[k - 1]];
                        onChange({ images: next });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="a2-btn a2-btn-sm a2-btn-danger"
                      disabled={disabled}
                      aria-label={`그림 ${k + 1} 지우기`}
                      onClick={() => onChange({ images: images.filter((_, n) => n !== k) })}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <textarea
          className={`a2-textarea a2-textarea-lg mt-3 ${mode === "text" ? "" : "a2-mono"}`}
          rows={rows}
          value={body}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="a2-btn"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "줄이는 중…" : mode === "images" ? "그림 추가" : "그림 넣기"}
        </button>
        {mode !== "images" && (
          <button
            type="button"
            className="a2-btn"
            aria-pressed={preview}
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? "미리보기 접기" : "미리보기"}
          </button>
        )}
      </div>

      {preview && mode !== "images" && (
        <div className="mt-2 w-full">
          {html.trim() === "" ? (
            <p className="a2-preview a2-t-sm text-(--a2-ink-4)">아직 채운 것이 없습니다.</p>
          ) : (
            /* 소독을 거친 값만 넣는다 — renderDetail 안에서 sanitizeHtml을 지난다 */
            <div className="a2-preview a2-prose" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      )}

      {error && (
        <p className="a2-hint" style={{ color: "var(--a2-danger)" }}>
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={mode === "images"}
        className="sr-only"
        onChange={(e) => {
          void load(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

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
 * 문항 하나의 분류 줄 — 이 문항이 무엇을 재나.
 *
 * 내용 줄과 갈라 둔 것은 세우는 자리가 다르기 때문이다. 단일이면 문항 상세의 「분류」 판
 * 안에서 과목·학년군과 나란히 서고, 세트면 목록에서 들어간 문항 상세에 선다. 세트의
 * 바깥 화면에는 분류가 아예 없다 — 분류는 세트가 아니라 그 안의 문항에 붙는 것이라,
 * 바깥에 세우면 어느 문항의 것인지 말할 수 없는 값이 된다.
 *
 * 두 자리가 같은 줄을 쓰는 것이 요점이다 — 단일로 쓰던 사람이 세트로 넘어갔을 때 칸이
 * 다르면 같은 것을 두 번 배워야 한다.
 */
export function QuestionTagRows({ q, band, disabled, onChange }: RowProps) {
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });
  const std = questionStandardIssue(q, band);

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

      <FormRow label="재능 축 (Tag B)" req>
        <select
          className="a2-select a2-input-lg"
          value={q.talent}
          disabled={disabled}
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

      {/* 단계를 고르면 배점이 따라온다(§1 고정 매핑). 난이도는 따라오지 않는다 */}
      <FormRow
        label="인지단계"
        req
        hint={`${levelSpecs[q.level].format} │ 채점 ${levelSpecs[q.level].scoring} │ 배점 ${q.points}점`}
      >
        <select
          className="a2-select a2-input-lg"
          value={q.level}
          disabled={disabled}
          onChange={(e) => set(levelPatch(e.target.value as Level))}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l} disabled={!levelAllowed(q.talent, l)}>
              {l} {levelSpecs[l].name}
              {levelAllowed(q.talent, l) ? "" : " — 이 축은 출제 불가"}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow
        label="난이도"
        req
        hint={
          difficultyPicked(q.b)
            ? undefined
            : `넷 중 하나를 골라야 검수로 제출할 수 있습니다. ${levelSpecs[q.level].name}(${q.level})의 앵커값은 b ${levelSpecs[q.level].b}입니다.`
        }
      >
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
