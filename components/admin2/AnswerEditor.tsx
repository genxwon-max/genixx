"use client";

import { useRef } from "react";
import { slotCount } from "@/lib/exam";
import type { Blank, Response, ResponseKind } from "@/lib/content";
import { shrinkImage } from "@/lib/productStore";
import GrowTextarea from "./GrowTextarea";

/**
 * 답 칸 편집기 — 보기 고르기가 아닌 문항이 **학생에게 어떤 칸을 열고, 무엇을 정답으로 보는가**.
 *
 * 시험지의 「○ 차이점 : (        )」 · 「강물은 (  )보다 (  )에서 …」 · 「ⓐ - ( ㄱ~ㄹ )」은
 * 긴 글 칸 하나로는 받을 수 없다. 칸마다 이름과 모양을 정하고, **칸마다 정답을 바로 옆에**
 * 적는다 — 정답을 칸에서 떼어 아래 한 칸에 몰아 쓰면 몇 번째 칸의 답인지 채점자가 다시 맞춰야 한다.
 *
 *   글로 쓰기     한 문장 이상. 정답 자리에는 예시 답을 쓴다(채점 기준은 루브릭 칸)
 *   짧은 값       숫자 · 낱말 하나. 단위를 붙이고, 허용 답을 여럿 적으면 기계가 먼저 맞춰 본다
 *   고르기        보기 중 하나를 누른다. 정답을 그 자리에서 고른다
 *   문장 속 괄호  「{}」 자리마다 짧은 칸이 선다. 괄호마다 정답을 적는다
 *   그리기        밑그림 위에 그린다. 비워 두어도 되는 칸으로 둘 수 있다
 *
 * 지문의 빈칸(( ㄱ ) · ( ㄴ ))은 「지문의 빈칸 불러오기」로 칸 이름을 한 번에 세운다.
 */

type Shape = "write" | "short" | "options" | "template" | "draw";

const shapes: { id: Shape; label: string }[] = [
  { id: "write", label: "글로 쓰기" },
  { id: "short", label: "짧은 값" },
  { id: "options", label: "고르기" },
  { id: "template", label: "문장 속 괄호" },
  { id: "draw", label: "그리기" },
];

const shapeOf = (b: Blank): Shape =>
  b.draw !== undefined
    ? "draw"
    : b.template !== undefined
      ? "template"
      : b.options
        ? "options"
        : b.short
          ? "short"
          : "write";

/** 모양을 바꾼 칸 — 이름과 자리표시만 남기고 모양 칸을 새로 세운다 */
function reshape(b: Blank, shape: Shape): Blank {
  const base: Blank = { label: b.label, placeholder: b.placeholder };
  switch (shape) {
    case "short":
      return { ...base, short: true };
    case "options":
      return { ...base, options: ["", ""] };
    case "template":
      return { ...base, template: "{}" };
    case "draw":
      return { ...base, draw: "" };
    default:
      return base;
  }
}

const modes: { id: ResponseKind; label: string }[] = [
  { id: "blanks", label: "괄호 칸" },
  { id: "essay", label: "긴 글 한 칸" },
  { id: "match", label: "선 잇기" },
  { id: "upload", label: "파일 제출" },
];

function blankResponse(kind: ResponseKind): Response {
  switch (kind) {
    case "essay":
      return { kind };
    case "match":
      return { kind, left: [{ text: "" }], right: [{ text: "" }], pairs: [] };
    case "upload":
      return { kind, media: "image" };
    case "choice":
      return { kind, choices: ["", ""], answer: 0 };
    default:
      return { kind: "blanks", blanks: [{ label: "" }] };
  }
}

export default function AnswerEditor({
  response,
  answers,
  marks,
  disabled,
  onChange,
}: {
  response: Response;
  /** 칸마다의 정답 · 예시 답 — 칸 순서대로 */
  answers: string[];
  /** 지문에 적힌 빈칸 표지 — 「( ㄱ )」 */
  marks: string[];
  disabled: boolean;
  onChange: (next: { response: Response; answers: string[] }) => void;
}) {
  const emit = (r: Response, a: string[] = answers) => onChange({ response: r, answers: a });

  return (
    <div className="a2-body-flush w-full">
      <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="a2-t-sm font-bold text-(--a2-ink-3)">답하는 방식</span>
        {modes.map((m) => (
          <label key={m.id} className="a2-choice">
            <input
              type="radio"
              checked={response.kind === m.id}
              disabled={disabled}
              onChange={() => emit(blankResponse(m.id), [])}
            />
            {m.label}
          </label>
        ))}
      </div>

      {response.kind === "blanks" && (
        <BlanksFields
          blanks={response.blanks}
          answers={answers}
          marks={marks}
          disabled={disabled}
          onChange={(blanks, a) => emit({ kind: "blanks", blanks }, a)}
        />
      )}

      {response.kind === "essay" && (
        <>
          <Line label="자리표시 글">
            <input
              className="a2-input"
              value={response.placeholder ?? ""}
              disabled={disabled}
              placeholder="예) 민서가 봉숭아 씨앗을 심고 …"
              onChange={(e) => emit({ ...response, placeholder: e.target.value || undefined })}
            />
          </Line>
          <Line label="쓰는 순서 안내">
            <GrowTextarea
              className="a2-textarea"
              rows={2}
              value={(response.guide ?? []).join("\n")}
              disabled={disabled}
              placeholder={"한 줄에 하나 — 답 칸 위 「이렇게 써 보세요」에 번호를 달아 섭니다"}
              onChange={(e) =>
                emit({
                  ...response,
                  guide: e.target.value ? e.target.value.split("\n") : undefined,
                })
              }
            />
          </Line>
          <Line label="예시 답">
            <GrowTextarea
              className="a2-textarea"
              rows={2}
              value={answers[0] ?? ""}
              disabled={disabled}
              onChange={(e) => emit(response, [e.target.value])}
            />
          </Line>
        </>
      )}

      {response.kind === "match" && (
        <MatchFields response={response} disabled={disabled} onChange={(r) => emit(r)} />
      )}

      {response.kind === "upload" && (
        <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="a2-t-sm font-bold text-(--a2-ink-3)">받는 파일</span>
          {(
            [
              ["image", "사진 · 그림"],
              ["audio", "녹음(말하기)"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="a2-choice">
              <input
                type="radio"
                checked={response.media === id}
                disabled={disabled}
                onChange={() => emit({ kind: "upload", media: id })}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** 칸 안의 이름 붙은 한 줄 */
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="a2-cell-line">
      <span className="a2-cell-line-label">{label}</span>
      <div className="a2-cell-line-field">{children}</div>
    </div>
  );
}

/* ───────────────────────── 괄호 칸 ───────────────────────── */

function BlanksFields({
  blanks,
  answers,
  marks,
  disabled,
  onChange,
}: {
  blanks: Blank[];
  answers: string[];
  marks: string[];
  disabled: boolean;
  onChange: (blanks: Blank[], answers: string[]) => void;
}) {
  const put = (k: number, b: Blank, a = answers[k] ?? "") =>
    onChange(
      blanks.map((x, n) => (n === k ? b : x)),
      blanks.map((_, n) => (n === k ? a : (answers[n] ?? ""))),
    );
  const missing = marks.filter((m) => !blanks.some((b) => b.label.trim() === m));

  return (
    <>
      {blanks.map((b, k) => (
        <BlankRow
          key={k}
          index={k}
          count={blanks.length}
          blank={b}
          answer={answers[k] ?? ""}
          disabled={disabled}
          onChange={(nb, a) => put(k, nb, a)}
          onMove={(dir) => {
            const nb = [...blanks];
            const na = blanks.map((_, n) => answers[n] ?? "");
            [nb[k + dir], nb[k]] = [nb[k], nb[k + dir]];
            [na[k + dir], na[k]] = [na[k], na[k + dir]];
            onChange(nb, na);
          }}
          onRemove={() =>
            onChange(
              blanks.filter((_, n) => n !== k),
              answers.filter((_, n) => n !== k),
            )
          }
        />
      ))}

      <div className="a2-cell-pad flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled}
          onClick={() => onChange([...blanks, { label: "" }], [...answers, ""])}
        >
          + 칸 더하기
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled || missing.length === 0}
          title={
            marks.length === 0
              ? "지문에 ( ㄱ ) 같은 빈칸이 없습니다"
              : missing.length === 0
                ? "지문의 빈칸이 이미 모두 칸으로 있습니다"
                : undefined
          }
          onClick={() =>
            onChange(
              [
                ...blanks.filter((b) => b.label.trim() || shapeOf(b) !== "write"),
                ...missing.map((label) => ({ label })),
              ],
              [
                ...blanks.flatMap((b, n) =>
                  b.label.trim() || shapeOf(b) !== "write" ? [answers[n] ?? ""] : [],
                ),
                ...missing.map(() => ""),
              ],
            )
          }
        >
          지문의 빈칸 불러오기{marks.length > 0 ? ` (${marks.join(" ")})` : ""}
        </button>
      </div>
    </>
  );
}

function BlankRow({
  index: k,
  count,
  blank: b,
  answer,
  disabled,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  blank: Blank;
  answer: string;
  disabled: boolean;
  onChange: (b: Blank, answer?: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const shape = shapeOf(b);
  const drawRef = useRef<HTMLInputElement>(null);
  const slots = b.template !== undefined ? slotCount(b.template) : 0;
  /* 문장 속 괄호의 정답은 괄호마다 — accept에 괄호 차례대로 둔다 */
  const fromSample = slotsFromSample(b.template ?? "", answer);
  const slotAnswers = Array.from({ length: slots }, (_, i) => b.accept?.[i] ?? fromSample[i] ?? "");
  const filled = (acc: string[]) => {
    let i = 0;
    return (b.template ?? "").replaceAll("{}", () => `( ${acc[i++] || " "} )`);
  };

  return (
    <div className="a2-block-part">
      <div className="a2-block-part-head">
        <span className="a2-mono text-(--a2-ink-4)">칸 {k + 1}</span>
        <span className="ml-2 font-normal text-(--a2-ink-3)">
          ○ {b.label || "(이름 없음)"} :{" "}
          {shape === "template" ? filled(slotAnswers.map(() => "")) : "(        )"}
          {b.suffix ? ` ${b.suffix}` : ""}
        </span>
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            className="a2-btn a2-btn-sm"
            disabled={disabled || k === 0}
            aria-label={`칸 ${k + 1} 위로`}
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-sm"
            disabled={disabled || k === count - 1}
            aria-label={`칸 ${k + 1} 아래로`}
            onClick={() => onMove(1)}
          >
            ↓
          </button>
          <button
            type="button"
            className="a2-btn a2-btn-sm a2-btn-danger"
            disabled={disabled || count <= 1}
            aria-label={`칸 ${k + 1} 지우기`}
            onClick={onRemove}
          >
            ×
          </button>
        </span>
      </div>

      <div className="a2-body-flush">
        <Line label="칸 이름">
          <input
            className="a2-input"
            value={b.label}
            disabled={disabled}
            placeholder="( ㄱ ) · 차이점 · 방위각 — 비우면 이름 없이 괄호만 섭니다"
            onChange={(e) => onChange({ ...b, label: e.target.value })}
          />
        </Line>

        <Line label="칸 모양">
          <div className="a2-cell-pad flex flex-wrap items-center gap-x-4 gap-y-1">
            {shapes.map((s) => (
              <label key={s.id} className="a2-choice">
                <input
                  type="radio"
                  checked={shape === s.id}
                  disabled={disabled}
                  onChange={() => onChange(reshape(b, s.id), "")}
                />
                {s.label}
              </label>
            ))}
          </div>
        </Line>

        {shape === "write" && (
          <Line label="예시 답">
            <GrowTextarea
              line
              className="a2-textarea"
              value={answer}
              disabled={disabled}
              placeholder="만점 답의 예 — 채점 기준은 아래 루브릭 칸에 적습니다"
              onChange={(e) => onChange(b, e.target.value)}
            />
          </Line>
        )}

        {shape === "short" && (
          <>
            <div className="a2-cell-split">
              <Line label="단위">
                <input
                  className="a2-input"
                  value={b.suffix ?? ""}
                  disabled={disabled}
                  placeholder="초 · ° · cm"
                  onChange={(e) => onChange({ ...b, suffix: e.target.value || undefined })}
                />
              </Line>
              <Line label="자리표시">
                <input
                  className="a2-input"
                  value={b.placeholder ?? ""}
                  disabled={disabled}
                  placeholder="0.0 · 숫자 · 낱말"
                  onChange={(e) => onChange({ ...b, placeholder: e.target.value || undefined })}
                />
              </Line>
            </div>
            <Line label="정답">
              <input
                className="a2-input"
                value={b.accept?.join(", ") ?? answer}
                disabled={disabled}
                placeholder="여럿이면 쉼표로 — 2.1, 2.10"
                onChange={(e) => {
                  const accept = e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean);
                  onChange({ ...b, accept: accept.length ? accept : undefined }, accept[0] ?? "");
                }}
              />
            </Line>
          </>
        )}

        {shape === "options" && (
          <Line label="고를 것 · 정답">
            <div className="a2-body-flush">
              {(b.options ?? []).map((o, i) => (
                <div
                  key={i}
                  className="grid items-center"
                  style={{ gridTemplateColumns: "3rem minmax(0,1fr) auto" }}
                >
                  <label className="flex justify-center">
                    <input
                      type="radio"
                      name={`blank-${k}-answer`}
                      checked={answer !== "" && answer === o}
                      disabled={disabled || !o.trim()}
                      aria-label={`${i + 1}번을 정답으로`}
                      onChange={() => onChange({ ...b, accept: [o] }, o)}
                    />
                  </label>
                  <input
                    className="a2-input"
                    value={o}
                    disabled={disabled}
                    placeholder={i === 0 ? "(ㄱ) (가) 이전" : "(ㄴ) …"}
                    onChange={(e) => {
                      const options = b.options!.map((x, n) => (n === i ? e.target.value : x));
                      const was = answer === o;
                      onChange(
                        { ...b, options, accept: was ? [e.target.value] : b.accept },
                        was ? e.target.value : answer,
                      );
                    }}
                  />
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm mr-2"
                    disabled={disabled || (b.options?.length ?? 0) <= 2}
                    aria-label={`${i + 1}번 고를 것 빼기`}
                    onClick={() =>
                      onChange(
                        { ...b, options: b.options!.filter((_, n) => n !== i) },
                        answer === o ? "" : answer,
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="a2-cell-pad">
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={disabled}
                  onClick={() => onChange({ ...b, options: [...(b.options ?? []), ""] })}
                >
                  고를 것 더하기
                </button>
              </div>
            </div>
          </Line>
        )}

        {shape === "template" && (
          <>
            <Line label="문장">
              <input
                className="a2-input"
                value={b.template ?? ""}
                disabled={disabled}
                placeholder="강물은 {}보다 {}에서 더 빠르게 흐른다."
                onChange={(e) => onChange({ ...b, template: e.target.value })}
              />
            </Line>
            <span className="a2-hint">
              {"{}"} 자리마다 괄호 칸이 섭니다 — 지금 {slots}개
            </span>
            {slots > 0 && (
              <Line label="괄호마다 정답">
                <div className="a2-cell-pad flex flex-wrap items-center gap-2">
                  {slotAnswers.map((v, i) => (
                    <label key={i} className="flex items-center gap-1 a2-t-sm">
                      <span className="text-(--a2-ink-4)">{i + 1}</span>
                      <input
                        className="w-20 rounded border border-(--a2-line) px-2 py-1 text-center"
                        value={v}
                        disabled={disabled}
                        aria-label={`${i + 1}번째 괄호 정답`}
                        onChange={(e) => {
                          const acc = slotAnswers.map((x, n) => (n === i ? e.target.value : x));
                          onChange({ ...b, accept: acc }, filled(acc));
                        }}
                      />
                    </label>
                  ))}
                  <span className="a2-t-sm text-(--a2-ink-3)">→ {filled(slotAnswers)}</span>
                </div>
              </Line>
            )}
          </>
        )}

        {shape === "draw" && (
          <>
            <Line label="밑그림">
              <div className="a2-cell-pad flex flex-wrap items-center gap-3">
                {b.draw ? (
                  // 올린 밑그림 미리보기 — data URL
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.draw} alt="" className="h-20 rounded border border-(--a2-line)" />
                ) : (
                  <span className="a2-t-sm text-(--a2-ink-4)">흰 종이</span>
                )}
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={disabled}
                  onClick={() => drawRef.current?.click()}
                >
                  밑그림 올리기
                </button>
                {b.draw && (
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm"
                    disabled={disabled}
                    onClick={() => onChange({ ...b, draw: "" })}
                  >
                    흰 종이로
                  </button>
                )}
                <label className="a2-choice">
                  <input
                    type="checkbox"
                    checked={!!b.optional}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...b, optional: e.target.checked || undefined })}
                  />
                  비워 두어도 됨
                </label>
              </div>
              <input
                ref={drawRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onChange({ ...b, draw: await shrinkImage(file) });
                }}
              />
            </Line>
            <Line label="채점 메모">
              <GrowTextarea
                line
                className="a2-textarea"
                value={answer}
                disabled={disabled}
                placeholder="그림에서 무엇을 보면 인정하는지"
                onChange={(e) => onChange(b, e.target.value)}
              />
            </Line>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 채워 둔 예시 답(「강물은 ( A )보다 ( B )에서 …」)에서 괄호마다의 답을 읽는다.
 * 괄호별 정답을 따로 적기 전에 쓴 문항도 칸마다 값이 서게 한다.
 */
function slotsFromSample(template: string, sample: string): string[] {
  if (!template.includes("{}") || !sample) return [];
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const pattern = template.split("{}").map(esc).join("\\(\\s*(.*?)\\s*\\)");
  const m = sample.match(new RegExp(`^${pattern}$`));
  return m ? m.slice(1) : [];
}

/* ───────────────────────── 선 잇기 ───────────────────────── */

/** 오른쪽 항목의 이름 */
const KOR = "ㄱㄴㄷㄹㅁㅂㅅㅇ";

/**
 * 선 잇기 — 왼쪽 항목마다 이어질 오른쪽 항목을 고른다.
 *
 * 응시 화면의 선 긋기는 아직 없다(점을 끌어 잇는 칸). 출제는 먼저 받아 둔다.
 */
function MatchFields({
  response: r,
  disabled,
  onChange,
}: {
  response: Extract<Response, { kind: "match" }>;
  disabled: boolean;
  onChange: (next: Response) => void;
}) {
  const side = (key: "left" | "right", title: string) => (
    <div className="a2-body-flush">
      <p className="a2-cell-pad a2-t-sm font-bold text-(--a2-ink-2)">{title}</p>
      {r[key].map((it, i) => (
        <div key={i} className="flex items-center">
          <span className="a2-mono a2-t-sm w-8 shrink-0 text-center text-(--a2-ink-4)">
            {key === "left" ? i + 1 : KOR[i % KOR.length]}
          </span>
          <input
            className="a2-input min-w-0 flex-1"
            value={it.text}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                ...r,
                [key]: r[key].map((x, n) => (n === i ? { ...x, text: e.target.value } : x)),
              })
            }
          />
          {key === "left" && (
            <select
              className="a2-select a2-select-fit"
              value={r.pairs.find((p) => p[0] === i)?.[1] ?? ""}
              disabled={disabled}
              aria-label={`${i + 1}번과 이을 항목`}
              onChange={(e) =>
                onChange({
                  ...r,
                  pairs: [
                    ...r.pairs.filter((p) => p[0] !== i),
                    ...(e.target.value === ""
                      ? []
                      : [[i, Number(e.target.value)] as [number, number]]),
                  ],
                })
              }
            >
              <option value="">정답 —</option>
              {r.right.map((x, n) => (
                <option key={n} value={n}>
                  → {KOR[n % KOR.length]} {x.text}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      <div className="a2-cell-pad">
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled}
          onClick={() => onChange({ ...r, [key]: [...r[key], { text: "" }] })}
        >
          항목 더하기
        </button>
      </div>
    </div>
  );
  return (
    <>
      <div className="a2-cell-split">
        {side("left", "왼쪽")}
        {side("right", "오른쪽")}
      </div>
      <span className="a2-hint">
        응시 화면에서는 왼쪽 점과 오른쪽 점을 선으로 잇습니다. 항목에 사진을 넣는 칸은 다음에
        붙습니다.
      </span>
    </>
  );
}
