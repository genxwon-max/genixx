"use client";

import { useRef, useState } from "react";
import { detailModes, renderDetail, type DetailMode } from "@/lib/richText";
import { IMAGE_MAX_BYTES, dataUrlBytes, shrinkImage } from "@/lib/productStore";
import GrowTextarea from "./GrowTextarea";

/**
 * 글 한 덩이를 쓰는 칸 — **갈래를 고르고 그 갈래로 쓴다**(글 · 마크다운 · HTML · 그림).
 *
 * ── 왜 갈래로 나누나 ──
 * 한 칸을 글 하나로만 받던 때는 화면이 성립하지 않는 자리가 생겼다. 「아래 그림에서」로
 * 시작하는 발문에 그림이 없고, 표를 넣어야 하는 곳은 표를 글자로 그려 붙였다. 그렇다고
 * 그림만 받으면 반대가 된다 — 오탈자 하나를 고치려고 디자이너를 거쳐야 하고, 화면
 * 낭독기를 쓰는 사람에게는 내용이 아예 없는 것이 된다.
 *
 * 상품 상세가 쓰던 네 갈래를 그대로 쓴다(lib/richText.ts). 한 덩이는 한 갈래만 쓰고,
 * 마크다운·HTML 안에서 그림을 넣는 길은 열어 둔다. HTML은 소독기를 지나야 화면에
 * 나간다 — class·style·script는 그때 전부 걷힌다.
 *
 * ── 왜 components에 있나 ──
 * 문항 상세(ADM-04-1)의 지문 칸으로 시작했다. 지금은 회차 공지·유의사항(ADM-05-1 ·
 * ADM-05-4)도 같은 칸을 쓴다 — 같은 일을 하는 칸이 화면마다 다른 꼴이면, 한쪽에만
 * 미리보기가 붙거나 한쪽만 그림을 못 넣는 날이 온다.
 *
 * 이름표는 감싸는 폼 줄(FormRow)이 맡는다. 여기서 또 그리면 같은 말이 두 번 선다.
 *
 * ⚠ 그림은 지금 data URL로 값 안에 들어간다. 파일 서버가 붙으면 짧은 주소로 바뀐다.
 *   그때까지는 저장소가 5MB에서 끊기므로 올릴 때 캔버스로 줄인다(lib/productStore.ts).
 */

export type BodyValue = { mode: DetailMode; body: string; images: string[] };

/** 갈래를 고르고 그 갈래로 쓰는 한 덩이 */
export default function BodyEditor({
  name,
  value,
  disabled,
  rows = 6,
  placeholder,
  flush = false,
  onPaste,
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
  /**
   * 문항 카드(.a2-card)의 칸 안에 설 때 — 조각 사이 여백을 걷고 선으로만 가른다.
   *
   * 여백을 유틸리티(mt-3)로 주면 카드의 규칙이 그것을 못 이긴다(admin2.css는 @layer
   * components라 유틸리티가 이긴다). 그래서 갈래를 따로 둔다.
   *
   * 글 칸도 적은 만큼 늘어난다(GrowTextarea) — 문항 상세의 다른 글 칸과 같게. 회차 공지처럼
   * 카드 밖에 선 칸은 rows 높이에 스크롤을 그대로 둔다.
   */
  flush?: boolean;
  /** 글 칸에 붙여 넣을 때 — 발문 칸이 ①~⑤ 보기를 갈라 보기 칸으로 보낸다(QuestionEditor) */
  onPaste?: React.ClipboardEventHandler<HTMLTextAreaElement>;
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
    <div className={flush ? "a2-body-flush w-full" : "w-full"}>
      {/* 갈래 고르개 — 무엇으로 쓸지가 먼저 정해져야 아래 칸이 정해진다 */}
      <div
        className={`flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1${flush ? " a2-cell-pad" : ""}`}
      >
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
        <div className={flush ? "a2-cell-pad grid gap-2" : "mt-3 grid gap-2"}>
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
      ) : flush ? (
        <GrowTextarea
          className={`a2-textarea a2-textarea-lg ${mode === "text" ? "" : "a2-mono"}`}
          rows={rows}
          value={body}
          disabled={disabled}
          placeholder={placeholder}
          onPaste={onPaste}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      ) : (
        <textarea
          className={`a2-textarea a2-textarea-lg mt-3 ${mode === "text" ? "" : "a2-mono"}`}
          rows={rows}
          value={body}
          disabled={disabled}
          placeholder={placeholder}
          onPaste={onPaste}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      )}

      <div className={`flex flex-wrap items-center gap-2 ${flush ? "a2-cell-pad" : "mt-2"}`}>
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
        <div className={flush ? "a2-cell-pad w-full" : "mt-2 w-full"}>
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
