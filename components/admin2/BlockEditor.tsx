"use client";

import { useRef, useState } from "react";
import { blockKinds, type Block, type BlockKind, type Figure, type Table } from "@/lib/content";
import { IMAGE_MAX_BYTES, dataUrlBytes, shrinkImage } from "@/lib/productStore";
import { sanitizeHtml } from "@/lib/richText";
import GrowTextarea from "./GrowTextarea";

/**
 * 자료 블록 편집기 — 지문(보기)과 발문 아래 자료를 **블록을 쌓아** 쓴다(lib/content.ts Block).
 *
 * 시험지의 보기 상자는 글 한 칸으로 옮겨지지 않는다. 문단 사이에 사진 두 장이 나란히 서고,
 * 사진 위에 A · B 화살표가 붙고, 그 아래 표가 온다. 그래서 칸 하나에 몰아 쓰지 않고, 쓰는
 * 차례대로 블록을 쌓는다. 응시 화면은 이 차례 그대로 그린다(components/exam/ExamSession.tsx
 * BlockList).
 *
 *   문단         ( ㄱ )처럼 괄호 안에 자음을 쓰면 시험지의 빈칸 모양으로 선다
 *   목록         한 줄에 하나. [측정 방법]은 굵은 머리, ○로 시작하면 들여 쓴다
 *   〈보기〉 상자  이름을 윗선 가운데에 얹은 네모 칸
 *   사진         여러 장을 나란히, 또는 ⇨로 이어 시간 순서로. 사진을 눌러 A · B 표시를 찍는다
 *   표           칸을 바로 쓴다. 첫 머리 칸을 비우면 첫 열이 줄 이름(학생 A)이 된다
 *   영상 · 음성   파일과 설명, 대본
 *   알림         「※ 위 표에서 단위는 초이다.」
 *
 * 보기 상자의 네모 테두리와 「[1~4] 다음을 읽고 …」 머리는 응시 화면이 그린다 — 출제자는
 * 상자를 따로 그리지 않고 안에 들어갈 것만 쌓는다.
 */

const ADDABLE: BlockKind[] = ["text", "list", "box", "images", "table", "video", "audio", "note"];

const labelOf = (k: BlockKind) => blockKinds.find((b) => b.id === k)?.label ?? k;

/** 새 블록의 빈 모양 */
function blankBlock(kind: BlockKind): Block {
  switch (kind) {
    case "list":
      return { kind, items: [""] };
    case "box":
      return { kind, title: "보기", text: "" };
    case "images":
      return { kind, layout: "row", images: [] };
    case "table":
      return { kind, table: { head: ["", ""], rows: [["", ""]] } };
    case "video":
    case "audio":
      return { kind, src: "", caption: "", transcript: "" };
    case "note":
      return { kind, text: "※ " };
    case "rich":
      return { kind, format: "markdown", body: "" };
    case "animation":
      return { kind, preset: "pendulum", periodSec: 1, caption: "" };
    default:
      return { kind: "text", text: "" };
  }
}

export default function BlockEditor({
  blocks,
  disabled,
  onChange,
  empty = "아직 쌓은 블록이 없습니다. 아래에서 문단 · 사진 · 표를 더하세요.",
  kinds = ADDABLE,
}: {
  blocks: Block[];
  disabled: boolean;
  onChange: (next: Block[]) => void;
  /** 블록이 하나도 없을 때의 한 줄 */
  empty?: string;
  /** 더할 수 있는 블록 — 발문 아래 자료는 짧게 둔다 */
  kinds?: BlockKind[];
}) {
  const put = (k: number, b: Block) => onChange(blocks.map((x, n) => (n === k ? b : x)));
  const move = (k: number, dir: -1 | 1) => {
    const next = [...blocks];
    [next[k + dir], next[k]] = [next[k], next[k + dir]];
    onChange(next);
  };

  return (
    <div className="a2-body-flush w-full">
      {blocks.length === 0 && <p className="a2-cell-pad a2-t-sm text-(--a2-ink-4)">{empty}</p>}

      {blocks.map((b, k) => (
        <div key={k} className="a2-block-part">
          <div className="a2-block-part-head">
            <span className="a2-mono text-(--a2-ink-4)">{k + 1}</span>
            <span className="ml-1">{labelOf(b.kind)}</span>
            <span className="ml-auto flex gap-1">
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={disabled || k === 0}
                aria-label={`${k + 1}번 블록 위로`}
                onClick={() => move(k, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={disabled || k === blocks.length - 1}
                aria-label={`${k + 1}번 블록 아래로`}
                onClick={() => move(k, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-danger"
                disabled={disabled}
                aria-label={`${k + 1}번 블록 지우기`}
                onClick={() => onChange(blocks.filter((_, n) => n !== k))}
              >
                ×
              </button>
            </span>
          </div>
          <BlockFields block={b} disabled={disabled} onChange={(next) => put(k, next)} />
        </div>
      ))}

      {/* 더하기 — 쓰는 차례대로 아래에 붙는다 */}
      <div className="a2-cell-pad flex flex-wrap items-center gap-1.5">
        <span className="a2-t-sm mr-1 font-bold text-(--a2-ink-3)">+ 더하기</span>
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            className="a2-btn a2-btn-sm"
            disabled={disabled}
            onClick={() => onChange([...blocks, blankBlock(kind)])}
          >
            {labelOf(kind)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── 블록 하나 ───────────────────────── */

function BlockFields({
  block: b,
  disabled,
  onChange,
}: {
  block: Block;
  disabled: boolean;
  onChange: (next: Block) => void;
}) {
  switch (b.kind) {
    case "text":
      return (
        <div className="a2-body-flush">
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={3}
            value={b.text}
            disabled={disabled}
            aria-label="문단"
            placeholder="문단을 씁니다. 빈칸은 ( ㄱ ) 처럼 괄호 안에 자음을 넣습니다."
            onChange={(e) => onChange({ ...b, text: e.target.value })}
          />
        </div>
      );

    case "list":
      return (
        <div className="a2-body-flush">
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={3}
            value={b.items.join("\n")}
            disabled={disabled}
            aria-label="목록 — 한 줄에 하나"
            placeholder={"[측정 방법]\n○ 학생 A : …\n○ 학생 B : …"}
            onChange={(e) => onChange({ ...b, items: e.target.value.split("\n") })}
          />
          <span className="a2-hint">
            한 줄에 하나씩 씁니다. [ ]로 시작하는 줄은 굵은 머리, ○로 시작하는 줄은 둘째 줄부터 들여
            씁니다.
          </span>
        </div>
      );

    case "box":
      return (
        <div className="a2-body-flush">
          <div className="a2-cell-line">
            <span className="a2-cell-line-label">상자 이름</span>
            <div className="a2-cell-line-field">
              <input
                className="a2-input"
                value={b.title}
                disabled={disabled}
                placeholder="보기"
                onChange={(e) => onChange({ ...b, title: e.target.value })}
              />
            </div>
          </div>
          <GrowTextarea
            className="a2-textarea a2-textarea-lg"
            rows={3}
            value={b.text}
            disabled={disabled}
            aria-label="상자 안 글"
            placeholder={"ㄱ. …\nㄴ. …\nㄷ. …"}
            onChange={(e) => onChange({ ...b, text: e.target.value })}
          />
        </div>
      );

    case "note":
      return (
        <div className="a2-body-flush">
          <input
            className="a2-input"
            value={b.text}
            disabled={disabled}
            aria-label="알림"
            onChange={(e) => onChange({ ...b, text: e.target.value })}
          />
        </div>
      );

    case "images":
      return <ImagesFields block={b} disabled={disabled} onChange={onChange} />;

    case "table":
      return (
        <TableFields
          table={b.table}
          disabled={disabled}
          onChange={(table) => onChange({ ...b, table })}
        />
      );

    case "video":
    case "audio":
      return <MediaFields block={b} disabled={disabled} onChange={onChange} />;

    case "animation":
      return (
        <p className="a2-cell-pad a2-t-sm text-(--a2-ink-3)">
          화면이 직접 그리는 진자 — 주기 {b.periodSec}초 · {b.caption || "설명 없음"}
        </p>
      );

    case "rich":
      /* 문서 편집기가 남긴 서식 글(굵게 · 밑줄 · 첨자가 든 문단)은 태그 대신 보이는 그대로 세운다.
         태그를 날것으로 고치게 두면 한 글자 실수로 서식이 통째로 깨진다 — 고치는 곳은 문서 편집기다 */
      if (b.format === "html") {
        return (
          <div className="a2-body-flush">
            <div
              className="a2-cell-pad a2-prose-doc a2-t-sm text-(--a2-ink)"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(b.body) }}
            />
            <span className="a2-hint">
              굵게 · 밑줄 같은 꾸밈이 든 글입니다. 고치려면 왼쪽 「문서 편집기」를 여세요.
            </span>
          </div>
        );
      }
      return (
        <div className="a2-body-flush">
          <GrowTextarea
            className="a2-textarea a2-textarea-lg a2-mono"
            rows={4}
            value={b.body}
            disabled={disabled}
            aria-label="서식 글"
            onChange={(e) => onChange({ ...b, body: e.target.value })}
          />
          <span className="a2-hint">
            예전에 마크다운으로 쓴 지문입니다. 새로 쓰는 자료는 블록으로 나눠 쌓으세요.
          </span>
        </div>
      );
  }
}

/* ───────────────────────── 사진 ───────────────────────── */

/**
 * 사진 묶음 — 올리고, 설명과 대체 글을 달고, 사진 위를 눌러 표시(A · B)를 찍는다.
 *
 * 표시는 사진에 굽지 않는다. 좌표(%)만 적어 두고 응시 화면이 글자로 그린다 — 사진을 줄여도
 * 글자가 흐려지지 않는다. 표시를 고른 뒤 사진의 다른 곳을 누르면 화살표 끝이 그리로 간다.
 */
function ImagesFields({
  block: b,
  disabled,
  onChange,
}: {
  block: Extract<Block, { kind: "images" }>;
  disabled: boolean;
  onChange: (next: Block) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** 화살표 끝을 찍을 표시 — [사진 번호, 표시 번호] */
  const [aiming, setAiming] = useState<[number, number] | null>(null);

  const setImage = (k: number, f: Figure) =>
    onChange({ ...b, images: b.images.map((x, n) => (n === k ? f : x)) });

  async function load(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const made: Figure[] = [];
    for (const file of Array.from(files)) {
      try {
        const src = await shrinkImage(file);
        if (dataUrlBytes(src) > IMAGE_MAX_BYTES) {
          setError(`${file.name}은(는) 줄여도 너무 큽니다.`);
          continue;
        }
        made.push({ src, caption: "", alt: "" });
      } catch {
        setError(`${file.name}을(를) 읽지 못했습니다.`);
      }
    }
    setBusy(false);
    if (made.length > 0) onChange({ ...b, images: [...b.images, ...made] });
  }

  return (
    <div className="a2-body-flush">
      <div className="a2-cell-pad flex flex-wrap items-center gap-x-5 gap-y-1">
        <span className="a2-t-sm font-bold text-(--a2-ink-3)">놓는 방식</span>
        {(
          [
            ["row", "나란히"],
            ["sequence", "순서대로 ⇨"],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className="a2-choice">
            <input
              type="radio"
              checked={b.layout === id}
              disabled={disabled}
              onChange={() => onChange({ ...b, layout: id })}
            />
            {label}
          </label>
        ))}
      </div>

      {b.images.map((f, k) => (
        <div
          key={k}
          className="grid gap-3 p-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
          style={{ alignItems: "start" }}
        >
          {/* 사진 — 누르면 표시를 찍는다 */}
          <div>
            <div
              className={`relative overflow-hidden rounded border border-(--a2-line) ${
                disabled ? "" : "cursor-crosshair"
              }`}
              onClick={(e) => {
                if (disabled) return;
                const r = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - r.left) / r.width) * 100);
                const y = Math.round(((e.clientY - r.top) / r.height) * 100);
                const marks = f.marks ?? [];
                if (aiming && aiming[0] === k) {
                  setImage(k, {
                    ...f,
                    marks: marks.map((m, n) => (n === aiming[1] ? { ...m, toX: x, toY: y } : m)),
                  });
                  setAiming(null);
                  return;
                }
                const label = String.fromCharCode(65 + marks.length);
                setImage(k, { ...f, marks: [...marks, { label, x, y }] });
              }}
            >
              {/* 올린 그림 미리보기 — data URL은 next/image 최적화를 못 거친다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt="" className="block w-full" />
              {(f.marks ?? []).map((m, n) => (
                <span key={n}>
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-(--a2-accent) px-1 text-[11px] font-bold text-white"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                  >
                    {m.label}
                  </span>
                  {m.toX !== undefined && m.toY !== undefined && (
                    <span
                      className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--a2-accent) bg-white"
                      style={{ left: `${m.toX}%`, top: `${m.toY}%` }}
                    />
                  )}
                </span>
              ))}
            </div>
            <p className="a2-t-xs mt-1 text-(--a2-ink-4)">
              {aiming && aiming[0] === k
                ? `「${f.marks?.[aiming[1]]?.label}」 화살표가 가리킬 곳을 누르세요`
                : "사진을 누르면 A · B … 표시가 찍힙니다"}
            </p>
          </div>

          {/* 설명 · 대체 글 · 표시 */}
          <div className="grid gap-2">
            <label className="grid gap-1">
              <span className="a2-t-sm font-bold text-(--a2-ink-2)">사진 아래 이름</span>
              <input
                className="a2-input rounded border! border-(--a2-line)!"
                value={f.caption}
                disabled={disabled}
                placeholder="(가) · 등잔 · ㉮ 10년 전 모습"
                onChange={(e) => setImage(k, { ...f, caption: e.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="a2-t-sm font-bold text-(--a2-ink-2)">
                대체 글{" "}
                <span className="font-normal text-(--a2-ink-4)">— 화면 낭독기가 읽습니다</span>
              </span>
              <GrowTextarea
                line
                className="a2-textarea rounded border! border-(--a2-line)!"
                value={f.alt}
                disabled={disabled}
                placeholder="사진에 무엇이 어디에 있는지 한두 문장으로"
                onChange={(e) => setImage(k, { ...f, alt: e.target.value })}
              />
            </label>
            {(f.marks ?? []).length > 0 && (
              <div className="grid gap-1">
                <span className="a2-t-sm font-bold text-(--a2-ink-2)">표시</span>
                <ul className="flex flex-wrap gap-1.5">
                  {(f.marks ?? []).map((m, n) => (
                    <li
                      key={n}
                      className="flex items-center gap-1 rounded border border-(--a2-line) py-0.5 pl-1 pr-0.5"
                    >
                      <input
                        className="a2-t-sm w-12 bg-transparent px-1 font-bold outline-none"
                        value={m.label}
                        disabled={disabled}
                        aria-label={`${n + 1}번 표시 글자`}
                        onChange={(e) =>
                          setImage(k, {
                            ...f,
                            marks: f.marks!.map((x, i) =>
                              i === n ? { ...x, label: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled}
                        aria-pressed={aiming?.[0] === k && aiming[1] === n}
                        onClick={() => setAiming([k, n])}
                      >
                        화살표
                      </button>
                      <button
                        type="button"
                        className="a2-btn a2-btn-sm"
                        disabled={disabled}
                        aria-label={`${m.label} 표시 지우기`}
                        onClick={() =>
                          setImage(k, { ...f, marks: f.marks!.filter((_, i) => i !== n) })
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                className="a2-btn a2-btn-sm"
                disabled={disabled || k === 0}
                onClick={() => {
                  const next = [...b.images];
                  [next[k - 1], next[k]] = [next[k], next[k - 1]];
                  onChange({ ...b, images: next });
                }}
              >
                앞으로
              </button>
              <button
                type="button"
                className="a2-btn a2-btn-sm a2-btn-danger"
                disabled={disabled}
                onClick={() => onChange({ ...b, images: b.images.filter((_, n) => n !== k) })}
              >
                사진 빼기
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="a2-cell-pad flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="a2-btn"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "줄이는 중…" : "사진 올리기"}
        </button>
        {b.images.length === 0 && (
          <span className="a2-t-sm text-(--a2-ink-4)">여러 장을 한 번에 고를 수 있습니다.</span>
        )}
      </div>
      {error && (
        <p className="a2-hint" style={{ color: "var(--a2-danger)" }}>
          {error}
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          void load(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ───────────────────────── 표 ───────────────────────── */

/** 표 — 칸에 바로 쓴다. 줄 · 열을 더하고 뺀다 */
function TableFields({
  table: t,
  disabled,
  onChange,
}: {
  table: Table;
  disabled: boolean;
  onChange: (next: Table) => void;
}) {
  const cols = t.head.length;
  const cell =
    "w-full min-w-[4.5rem] bg-transparent px-2 py-1.5 text-center text-[13px] outline-none focus:bg-(--a2-accent-soft)";
  const border = { border: "1px solid var(--a2-line)" };

  return (
    <div className="a2-body-flush">
      <div className="a2-cell-line">
        <span className="a2-cell-line-label">표 제목</span>
        <div className="a2-cell-line-field">
          <input
            className="a2-input"
            value={t.caption ?? ""}
            disabled={disabled}
            placeholder="[측정 결과] — 없으면 비워 둡니다"
            onChange={(e) => onChange({ ...t, caption: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="overflow-x-auto p-3">
        <table className="border-collapse">
          <thead>
            <tr>
              {t.head.map((h, c) => (
                <th key={c} style={{ ...border, background: "var(--a2-thead)" }} className="p-0">
                  <input
                    className={`${cell} font-bold`}
                    value={h}
                    disabled={disabled}
                    aria-label={`머리 ${c + 1}`}
                    placeholder={c === 0 ? "(줄 이름)" : "머리"}
                    onChange={(e) =>
                      onChange({ ...t, head: t.head.map((x, i) => (i === c ? e.target.value : x)) })
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, r) => (
              <tr key={r}>
                {row.map((v, c) => (
                  <td key={c} style={border} className="p-0">
                    <input
                      className={cell}
                      value={v}
                      disabled={disabled}
                      aria-label={`${r + 1}줄 ${c + 1}칸`}
                      onChange={(e) =>
                        onChange({
                          ...t,
                          rows: t.rows.map((x, i) =>
                            i === r ? x.map((y, j) => (j === c ? e.target.value : y)) : x,
                          ),
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="a2-cell-pad flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled}
          onClick={() => onChange({ ...t, rows: [...t.rows, Array(cols).fill("")] })}
        >
          줄 더하기
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled || t.rows.length <= 1}
          onClick={() => onChange({ ...t, rows: t.rows.slice(0, -1) })}
        >
          마지막 줄 빼기
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...t,
              head: [...t.head, ""],
              rows: t.rows.map((x) => [...x, ""]),
              /* 묶음 머리가 있으면 끝 칸을 이름 없는 묶음으로 잇는다 */
              groups: t.groups && [...t.groups, { label: "", span: 1 }],
            })
          }
        >
          열 더하기
        </button>
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled || cols <= 1}
          onClick={() =>
            onChange({
              ...t,
              head: t.head.slice(0, -1),
              rows: t.rows.map((x) => x.slice(0, -1)),
              groups: undefined,
            })
          }
        >
          마지막 열 빼기
        </button>
        <span className="a2-t-xs ml-1 text-(--a2-ink-4)">
          첫 머리 칸을 비우면 첫 열이 줄 이름(학생 A)으로 굵게 섭니다. 칸 안의 ( ㄱ )은 빈칸으로
          섭니다.
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── 영상 · 음성 ───────────────────────── */

function MediaFields({
  block: b,
  disabled,
  onChange,
}: {
  block: Extract<Block, { kind: "video" | "audio" }>;
  disabled: boolean;
  onChange: (next: Block) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const video = b.kind === "video";
  return (
    <div className="a2-body-flush">
      <div className="a2-cell-line">
        <span className="a2-cell-line-label">파일</span>
        <div className="a2-cell-line-field">
          <div className="flex items-center gap-2 pr-2">
            <input
              className="a2-input min-w-0 flex-1"
              value={b.src.startsWith("blob:") ? "(올린 파일)" : b.src}
              disabled={disabled}
              placeholder="주소를 붙이거나 파일을 올립니다"
              onChange={(e) => onChange({ ...b, src: e.target.value })}
            />
            <button
              type="button"
              className="a2-btn a2-btn-sm"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
            >
              파일 올리기
            </button>
          </div>
        </div>
      </div>
      {b.src && (
        <div className="p-3">
          {video ? (
            <video src={b.src} controls className="max-h-56 rounded border border-(--a2-line)" />
          ) : (
            <audio src={b.src} controls className="w-full max-w-md" />
          )}
        </div>
      )}
      <div className="a2-cell-line">
        <span className="a2-cell-line-label">설명</span>
        <div className="a2-cell-line-field">
          <input
            className="a2-input"
            value={b.caption}
            disabled={disabled}
            placeholder={video ? "괘종시계의 시계추" : "대화 1 — 두 사람이 날씨를 이야기합니다"}
            onChange={(e) => onChange({ ...b, caption: e.target.value })}
          />
        </div>
      </div>
      <GrowTextarea
        className="a2-textarea a2-textarea-lg"
        rows={2}
        value={b.transcript}
        disabled={disabled}
        aria-label="대본"
        placeholder={
          video
            ? "대본 — 소리를 못 듣는 학생이 같은 내용을 글로 읽습니다"
            : "대본 — 채점 · 검수용이며 학생 화면에는 나오지 않습니다"
        }
        onChange={(e) => onChange({ ...b, transcript: e.target.value })}
      />
      <input
        ref={fileRef}
        type="file"
        accept={video ? "video/*" : "audio/*"}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          /* 화면 설계용 — 파일 서버가 붙기 전에는 이 창 안에서만 재생되는 주소를 쓴다 */
          if (file) onChange({ ...b, src: URL.createObjectURL(file) });
          e.target.value = "";
        }}
      />
    </div>
  );
}
