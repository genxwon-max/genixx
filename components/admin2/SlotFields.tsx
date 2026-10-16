"use client";

import { useRef, useState } from "react";
import {
  acceptOf,
  fitSlots,
  putSlotAnswer,
  scanSlots,
  slotFlows,
  slotName,
  slotSpec,
  slotSpecs,
  slotToken,
  type SlotAnswer,
  type SlotMark,
} from "@/lib/answerSlots";
import type { Blank, Response } from "@/lib/content";
import { shrinkImage } from "@/lib/productStore";
import { WithBlanks } from "@/components/exam/ExamSession";
import GrowTextarea from "./GrowTextarea";
import { CellLine } from "./ui";

/**
 * 출제 화면의 답 칸 — 문항 글에 적은 표지(lib/answerSlots.ts)마다 정답을 적는 줄 (2026-10-16 요청).
 *
 * 예전 「답 칸 편집기」는 답하는 방식(괄호 칸 · 긴 글 · 선 잇기 · 파일) → 칸 추가 → 칸 이름 → 칸 모양
 * (글로 쓰기 · 단답형 · 선택형 · 문장 속 괄호 · 그리기) → 정답 차례로 골라야 칸 하나가 섰다. 이제 칸은
 * 문항 글에 적은 표지가 세우고, 여기서는 **표지마다 정답만** 적는다. 줄은 표지가 글에 적힌 차례로
 * 서고, 줄 머리의 이름표(「정답 1」)가 문항 상자 안의 이름표와 같은 모양이라 어느 괄호의 정답인지
 * 바로 짝이 맞는다.
 *
 *   SlotText       문항 상자 — 표지 자리에 이름표(짧은 칸은 정답까지)와 큰 칸 자리를 그린다
 *   SlotAnswers    정답 줄 — 표지마다 한 줄
 *   LegacyAnswers  표지 없이 만든 문항 — 지금 칸을 요약하고 「표지로 바꾸기」
 *   SlotStart      아직 아무 칸도 없는 문항 — 표지를 쓰는 법
 *   SlotGuide      표지 안내표 — 문서 편집기의 「표지 안내」와 SlotStart가 쓴다
 */

const blanksOf = (r: Response) => (r.kind === "blanks" ? r.blanks : []);

/** 짧은 칸 이름표에 함께 적는 정답 — 정답은 쉼표로 다 적고, OX · 선택은 고른 것 */
function chipAnswer(m: SlotMark, b: Blank | undefined) {
  if (!b) return "";
  const accept = (b.accept ?? []).filter((a) => a.trim());
  if (m.kind === "short") return accept.join(", ") + (accept.length > 0 && b.suffix ? ` ${b.suffix}` : "");
  return accept[0] ?? "";
}

/* ───────────────────────── 문항 상자 ───────────────────────── */

/**
 * 표지로 쓴 문항 글 — 문장 안 칸은 이름표로, 큰 칸은 그 자리에 점선 상자로 그린다.
 *
 * 짧은 칸의 이름표에는 정답을 함께 적는다(「정답 1 · A」). 문항 상자가 답안지가 되어, 정답 줄까지
 * 내려가지 않고도 괄호마다 무엇이 정답인지 맞춰 볼 수 있다. 정답이 비었으면 이름표가 노랗게 선다.
 * 칸이 서지 않는 표지(번호 없음 · 겹친 번호 · 함께 쓸 수 없는 표지)는 붉게 남긴다.
 */
export function SlotText({ text, fit }: { text: string; fit: SlotAnswer }) {
  const blanks = blanksOf(fit.response);
  const find = (m: SlotMark) => blanks.find((b) => b.slot === m.key);
  return (
    <div className="font-semibold">
      {slotFlows(text, { keepBad: true }).map((f, k) => {
        if ("block" in f) {
          const m = f.block;
          const memo = m.kind === "photo" ? fit.answers[0] : fit.answers[blanks.findIndex((b) => b.slot === m.key)];
          return (
            <span key={k} className="a2-slot-block">
              <span className="a2-slot-chip">{slotName(m.key)}</span>
              <span>{slotSpec(m.kind).shows}</span>
              {m.kind !== "match" && memo?.trim() && (
                <span className="a2-slot-block-memo">
                  {m.kind === "write" || m.kind === "essay" ? "예시 답" : "채점 메모"} 있음
                </span>
              )}
            </span>
          );
        }
        return (
          <p key={k} className="whitespace-pre-line">
            {f.line.map((r, n) => {
              if ("text" in r) return <WithBlanks key={n} text={r.text} />;
              if ("bad" in r) {
                return (
                  <span key={n} className="a2-slot-chip is-bad" title={r.bad.problem}>
                    {r.bad.raw}
                  </span>
                );
              }
              const answer = chipAnswer(r.mark, find(r.mark));
              return (
                <span key={n} className={`a2-slot-chip${answer ? "" : " is-empty"}`}>
                  {slotName(r.mark.key)}
                  <span className="a2-slot-answer">{answer || "정답 없음"}</span>
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

/* ───────────────────────── 정답 줄 ───────────────────────── */

/** 줄 머리 — 문항 상자 안의 이름표와 같은 모양 · 그 아래 칸 종류 */
function SlotLine({ mark, children }: { mark: SlotMark; children: React.ReactNode }) {
  return (
    <CellLine
      label={
        <span className="flex flex-col items-start gap-1 py-2.5">
          <span className="a2-slot-chip">{slotName(mark.key)}</span>
          <span className="a2-t-xs font-normal text-(--a2-ink-4)">{slotSpec(mark.kind).name}</span>
        </span>
      }
    >
      {children}
    </CellLine>
  );
}

/**
 * 쉼표로 적는 정답 칸 — 치는 글자를 따로 들고 있는다.
 * 정답 목록만 들고 다시 그리면 「A,」를 치는 순간 쉼표가 지워져 둘째 정답을 칠 수 없다.
 */
function AcceptInput({
  accept,
  disabled,
  label,
  onChange,
}: {
  accept: string[];
  disabled: boolean;
  label: string;
  onChange: (text: string) => void;
}) {
  const joined = accept.join(", ");
  const [text, setText] = useState(joined);
  const shown = acceptOf(text).join(", ") === joined ? text : joined;
  return (
    <input
      className="a2-input a2-input-lg"
      value={shown}
      disabled={disabled}
      placeholder="정답 — 여럿이면 쉼표로 · 늘어난다, 커진다"
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value);
      }}
    />
  );
}

/**
 * 표지마다 정답을 적는 줄.
 *
 * 받는 칸(fit)을 먼저 문항 글의 표지에 맞춘다(fitSlots) — 문항 글을 고친 뒤 칸이 아직 옛 차례로
 * 남아 있어도 줄은 지금 글의 차례로 선다.
 */
export function SlotAnswers({
  stem,
  fit,
  disabled,
  onChange,
}: {
  stem: string;
  fit: SlotAnswer;
  disabled: boolean;
  onChange: (next: SlotAnswer) => void;
}) {
  const { marks, issues, notes } = scanSlots(stem);
  const now = fitSlots(stem, fit);
  const blanks = blanksOf(now.response);
  const drawRef = useRef<Record<string, HTMLInputElement | null>>({});

  const put = (k: number, b: Blank, a: string) =>
    onChange({
      response: { kind: "blanks", blanks: blanks.map((x, n) => (n === k ? b : x)) },
      answers: blanks.map((_, n) => (n === k ? a : (now.answers[n] ?? ""))),
    });

  const rows = marks.map((m) => {
    if (m.kind === "photo") {
      return (
        <SlotLine key={m.key} mark={m}>
          <GrowTextarea
            line
            className="a2-textarea a2-textarea-lg"
            value={now.answers[0] ?? ""}
            disabled={disabled}
            placeholder="채점 메모 — 사진에서 무엇을 보면 인정하는지"
            aria-label={`${slotName(m.key)} 채점 메모`}
            onChange={(e) => onChange({ response: now.response, answers: [e.target.value] })}
          />
        </SlotLine>
      );
    }
    if (m.kind === "match") {
      return (
        <SlotLine key={m.key} mark={m}>
          {now.response.kind === "match" && (
            <MatchFields
              response={now.response}
              disabled={disabled}
              onChange={(r) => onChange({ response: r, answers: [] })}
            />
          )}
        </SlotLine>
      );
    }

    const k = blanks.findIndex((b) => b.slot === m.key);
    const b = blanks[k];
    const a = now.answers[k] ?? "";
    const name = slotName(m.key);

    switch (m.kind) {
      case "short":
        return (
          <SlotLine key={m.key} mark={m}>
            <div className="a2-cell-split" style={{ gridTemplateColumns: "minmax(0, 1fr) 7.5rem" }}>
              <AcceptInput
                accept={b.accept ?? []}
                disabled={disabled}
                label={`${name}에 들어갈 정답`}
                onChange={(text) => put(k, ...putSlotAnswer("short", b, text))}
              />
              <input
                className="a2-input a2-input-lg"
                value={b.suffix ?? ""}
                disabled={disabled}
                placeholder="단위 · cm"
                aria-label={`${name} 단위`}
                onChange={(e) => put(k, { ...b, suffix: e.target.value || undefined }, a)}
              />
            </div>
          </SlotLine>
        );
      case "ox":
        return (
          <SlotLine key={m.key} mark={m}>
            <div className="a2-cell-pad flex flex-wrap items-center gap-x-6 gap-y-1">
              {(["O", "X"] as const).map((o) => (
                <label key={o} className="a2-choice">
                  <input
                    type="radio"
                    name={`slot-${m.key}`}
                    checked={b.accept?.[0] === o}
                    disabled={disabled}
                    onChange={() => put(k, ...putSlotAnswer("ox", b, o))}
                    aria-label={`${name}의 정답을 ${o}로`}
                  />
                  <span className="a2-mono">{o}</span>
                </label>
              ))}
            </div>
          </SlotLine>
        );
      case "pick": {
        const options = b.options ?? [];
        return (
          <SlotLine key={m.key} mark={m}>
            <div className="a2-body-flush">
              {options.map((o, i) => (
                <div
                  key={i}
                  className="grid items-center"
                  style={{ gridTemplateColumns: "2.75rem minmax(0,1fr) auto" }}
                >
                  <label className="flex justify-center" title="정답으로">
                    <input
                      type="radio"
                      name={`slot-${m.key}`}
                      checked={!!o.trim() && b.accept?.[0] === o}
                      disabled={disabled || !o.trim()}
                      aria-label={`${i + 1}번째 고를 것을 정답으로`}
                      onChange={() => put(k, { ...b, accept: [o] }, o)}
                    />
                  </label>
                  <input
                    className="a2-input"
                    value={o}
                    disabled={disabled}
                    placeholder={i === 0 ? "고를 것 — 동의함" : "동의하지 않음"}
                    aria-label={`${name} ${i + 1}번째 고를 것`}
                    onChange={(e) => {
                      const was = b.accept?.[0] === o && !!o;
                      const next = options.map((x, n) => (n === i ? e.target.value : x));
                      put(k, { ...b, options: next, accept: was ? [e.target.value] : b.accept }, was ? e.target.value : a);
                    }}
                  />
                  <button
                    type="button"
                    className="a2-btn a2-btn-sm mr-2"
                    disabled={disabled || options.length <= 2}
                    aria-label={`${i + 1}번째 고를 것 지우기`}
                    onClick={() => {
                      const gone = b.accept?.[0] === o;
                      put(
                        k,
                        { ...b, options: options.filter((_, n) => n !== i), accept: gone ? undefined : b.accept },
                        gone ? "" : a,
                      );
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="a2-cell-pad flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={disabled}
                  onClick={() => put(k, { ...b, options: [...options, ""] }, a)}
                >
                  + 고를 것 추가
                </button>
                <span className="a2-t-xs text-(--a2-ink-4)">정답인 것의 동그라미를 누릅니다</span>
              </div>
            </div>
          </SlotLine>
        );
      }
      case "draw":
        return (
          <SlotLine key={m.key} mark={m}>
            <div className="a2-cell-pad flex flex-wrap items-center gap-3">
              {b.draw ? (
                // 올린 밑그림 미리보기 — data URL
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.draw} alt="" className="h-16 rounded border border-(--a2-line)" />
              ) : (
                <span className="a2-t-sm text-(--a2-ink-4)">밑그림 없음 · 흰 종이</span>
              )}
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={disabled}
                onClick={() => drawRef.current[m.key]?.click()}
              >
                밑그림 올리기
              </button>
              {b.draw && (
                <button
                  type="button"
                  className="a2-btn a2-btn-sm"
                  disabled={disabled}
                  onClick={() => put(k, { ...b, draw: "" }, a)}
                >
                  흰 종이로
                </button>
              )}
              <label className="a2-choice">
                <input
                  type="checkbox"
                  checked={!!b.optional}
                  disabled={disabled}
                  onChange={(e) => put(k, { ...b, optional: e.target.checked || undefined }, a)}
                />
                비워 두어도 됨
              </label>
              <input
                ref={(el) => {
                  drawRef.current[m.key] = el;
                }}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) put(k, { ...b, draw: await shrinkImage(file) }, a);
                }}
              />
            </div>
            <GrowTextarea
              line
              className="a2-textarea a2-textarea-lg"
              value={a}
              disabled={disabled}
              placeholder="채점 메모 — 그림에서 무엇을 보면 인정하는지"
              aria-label={`${name} 채점 메모`}
              onChange={(e) => put(k, b, e.target.value)}
            />
          </SlotLine>
        );
      default:
        return (
          <SlotLine key={m.key} mark={m}>
            <GrowTextarea
              className="a2-textarea a2-textarea-lg"
              rows={m.kind === "essay" ? 3 : 2}
              value={a}
              disabled={disabled}
              placeholder="예시 답 — 만점 답의 예. 채점 기준은 아래 부분점수 칸에 적습니다"
              aria-label={`${name} 예시 답`}
              onChange={(e) => put(k, b, e.target.value)}
            />
          </SlotLine>
        );
    }
  });

  return (
    <>
      {(issues.length > 0 || notes.length > 0) && (
        <div className="a2-cell-pad grid gap-1">
          {issues.map((t) => (
            <p key={t} className="a2-t-sm" style={{ color: "var(--a2-danger)" }}>
              {t}
            </p>
          ))}
          {notes.map((t) => (
            <p key={t} className="a2-t-sm text-(--a2-ink-3)">
              {t}
            </p>
          ))}
        </div>
      )}
      {rows}
      {marks.some((m) => m.kind === "short") && (
        <span className="a2-hint">
          정답이 여럿이면 쉼표로 적습니다. 문서 편집기에서 「[정답1: A]」처럼 표시 안에 적어도 같은 칸에
          들어갑니다.
        </span>
      )}
    </>
  );
}

/* ───────────────────────── 표지 없이 만든 문항 ───────────────────────── */

/** 지금 칸을 한 줄씩 — 「○ 이유 · 쓰는 칸 · 예시 답 있음」 */
function legacyLines(fit: SlotAnswer): string[] {
  const r = fit.response;
  switch (r.kind) {
    case "essay":
      return [`긴 글 한 칸${fit.answers[0]?.trim() ? " · 예시 답 있음" : ""}`];
    case "upload":
      return ["사진 올리기 한 칸"];
    case "match":
      return [`선 잇기 · 왼쪽 ${r.left.length}개 · 오른쪽 ${r.right.length}개 · 정답인 선 ${r.pairs.length}개`];
    case "choice":
      return [];
    case "blanks":
      return r.blanks.map((b, i) => {
        const name = b.label.trim() || `칸 ${i + 1}`;
        const shape =
          b.template !== undefined
            ? "문장 속 괄호"
            : b.options
              ? "고르는 칸"
              : b.draw !== undefined
                ? "그리는 칸"
                : b.short || b.accept?.length
                  ? "짧은 칸"
                  : "쓰는 칸";
        const answer = (b.accept ?? []).join(", ") || fit.answers[i]?.trim();
        return `○ ${name} · ${shape}${answer ? ` · ${answer.length > 24 ? `${answer.slice(0, 24)}…` : answer}` : ""}`;
      });
  }
}

/**
 * 표지가 생기기 전에 만든 답 칸 — 무엇이 있는지 적고 「표지로 바꾸기」를 둔다.
 *
 * 바꾸면 칸마다 표지가 문항 글 끝에 붙고 적어 둔 정답이 그대로 옮겨진다(lib/answerSlots.ts
 * legacySlots). 문서 편집기를 열어도 같은 표지가 붙은 채 열린다 — 그대로 적용하면 바뀐다.
 */
export function LegacyAnswers({
  fit,
  canConvert,
  disabled,
  onConvert,
}: {
  fit: SlotAnswer;
  /** 발문이 글인가 — 그림 · 서식 글로 쓴 발문에는 표지를 붙일 수 없다 */
  canConvert: boolean;
  disabled: boolean;
  onConvert: () => void;
}) {
  const lines = legacyLines(fit);
  if (lines.length === 0) return <SlotStart />;
  return (
    <div className="a2-cell-pad grid gap-2">
      <p className="a2-t-sm font-semibold text-(--a2-ink-2)">
        예전 방식으로 만든 답 칸입니다 — {lines.length}칸
      </p>
      <ul className="grid gap-0.5 a2-t-sm text-(--a2-ink-3)">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="a2-btn a2-btn-sm" disabled={!canConvert} onClick={onConvert}>
            표시로 바꾸기
          </button>
          <span className="a2-t-xs text-(--a2-ink-4)">
            {canConvert
              ? "칸마다 표시가 문항 글 끝에 붙고, 적어 둔 정답은 그대로 옮겨집니다."
              : "발문을 그림 · 서식 글로 쓴 문항입니다. 문서 편집기로 열어 적용하면 글로 바뀐 뒤 바꿀 수 있습니다."}
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 아직 칸이 없는 문항 ───────────────────────── */

/** 표지를 쓰는 법 — 칸이 하나도 없을 때 정답 줄 자리에 선다 */
export function SlotStart() {
  return (
    <div className="a2-cell-pad grid gap-2">
      <p className="a2-t-sm text-(--a2-ink-2)">
        문항을 쓰면서 답이 들어갈 자리에 <b className="a2-mono">[정답1]</b> ·{" "}
        <b className="a2-mono">{"{서술형1}"}</b> 같은 표시를 넣으면, 표시마다 정답을 적는 줄이 여기에
        생깁니다. 객관식은 보기를 ① ② ③ …으로 씁니다.
      </p>
      <p className="flex flex-wrap gap-1.5">
        {slotSpecs.map((s) => (
          <span key={s.kind} className="a2-slot-chip" title={`${s.name} — ${s.shows}`}>
            {slotToken(s.kind, 1)}
            <span className="a2-slot-answer">{s.name}</span>
          </span>
        ))}
      </p>
      <p className="a2-t-xs text-(--a2-ink-4)">
        문서 편집기의 「답 칸」 단추로 넣거나, 답이 될 글자를 끌어 고른 뒤 단추를 누르면 그 글자가 빈칸의
        정답이 됩니다.
      </p>
    </div>
  );
}

/**
 * 표지 안내표 — 표지 · 형식 · 학생 화면 · 정답 적는 것 · 예.
 * 문서 편집기의 「표지 안내」가 펼친다.
 */
export function SlotGuide() {
  return (
    <table className="a2-slot-guide">
      <thead>
        <tr>
          <th>표시</th>
          <th>형식</th>
          <th>학생 화면</th>
          <th>정답 적는 것</th>
          <th>예</th>
        </tr>
      </thead>
      <tbody>
        {slotSpecs.map((s) => (
          <tr key={s.kind}>
            <td className="a2-mono font-bold">{slotToken(s.kind, 1)}</td>
            <td>{s.name}</td>
            <td>{s.shows}</td>
            <td>{s.asks}</td>
            <td className="a2-slot-guide-ex">{s.example}</td>
          </tr>
        ))}
        <tr>
          <td className="font-bold">① ② ③ …</td>
          <td>객관식</td>
          <td>보기 고르기</td>
          <td>정답 번호 — 「정답: ③」 줄도 읽습니다</td>
          <td className="a2-slot-guide-ex">줄 맨 앞에 ① ② ③ …을 붙여 보기를 씁니다.</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ───────────────────────── 선 잇기 ───────────────────────── */

/** 오른쪽 항목의 이름 */
const KOR = "ㄱㄴㄷㄹㅁㅂㅅㅇ";

/**
 * 선 잇기 — 왼쪽 항목마다 이어질 오른쪽 항목을 고른다.
 *
 * 응시 화면은 이 항목과 정답으로 선 긋는 칸을 연다(components/exam/MatchAnswer.tsx).
 *
 * ⚠ 여기서는 왼쪽 항목 하나에 오른쪽 항목 **하나만** 고를 수 있다. 응시 화면은 한 항목에 선
 *   여럿(「2개에 5개」처럼 나누어 잇는 문항)도 받지만, 그런 정답은 아직 이 칸으로 적을 수 없다.
 */
export function MatchFields({
  response: r,
  disabled,
  onChange,
}: {
  response: Extract<Response, { kind: "match" }>;
  disabled: boolean;
  onChange: (next: Extract<Response, { kind: "match" }>) => void;
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
          항목 추가
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
        응시 화면에서는 왼쪽 점과 오른쪽 점을 선으로 잇습니다. 항목에 사진을 넣는 기능은 추후
        추가됩니다.
      </span>
    </>
  );
}
