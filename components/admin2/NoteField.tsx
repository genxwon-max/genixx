"use client";

import { useRef, useState } from "react";
import type { RoundNote } from "@/lib/roundPlanStore";

/**
 * 글 + 그림 한 칸 — 회차 공지·유의사항이 쓴다.
 *
 * 기존 콘솔은 이 자리에 위지윅 편집기를 두었다(글꼴·크기·정렬·표·사진). 여기서는 두지
 * 않는다. 이 칸에 실제로 들어가는 것은 두세 문장과 안내 그림 한두 장이고, 그것을 위해
 * 편집기를 얹으면 화면에서 가장 큰 덩어리가 도구 모음이 된다. 글은 그대로 치고, 그림은
 * 아래에 붙인다.
 *
 * ── 그림을 담는 법 ──
 * 파일 서버가 없어서 올릴 데가 없다. data URL로 저장소에 담되, 담기 전에 **가로 1200px로
 * 줄이고 JPEG 80%로 다시 굽는다**. 브라우저 저장소는 5MB 남짓이라 원본 사진 두 장이면
 * 문항·검사지·회차 기록이 통째로 못 들어간다 — 실제로 4MB짜리 사진 하나를 그대로 담았더니
 * 그 회차를 저장하는 순간 저장소가 가득 차 다른 화면의 값이 사라졌다.
 *
 * 붙일 때는 이 자리가 업로드 주소로 바뀐다. 그때 줄이는 일은 서버가 한다.
 */

/** 한 칸에 붙일 수 있는 그림 수 — 넷을 넘기면 공지가 아니라 앨범이다 */
const MAX_IMAGES = 4;
/** 담기 전에 줄이는 가로 길이 */
const MAX_W = 1200;

/** 캔버스로 줄여 다시 굽는다. 원본 그대로 담지 않는 까닭은 위 주석에 */
function shrink(file: File): Promise<string> {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onerror = () => fail(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => fail(new Error("그림 파일이 아닙니다."));
      img.onload = () => {
        const scale = Math.min(1, MAX_W / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail(new Error("그림을 줄이지 못했습니다."));
        /* 투명한 PNG를 JPEG로 구우면 검게 나온다 — 흰 바탕을 먼저 깐다 */
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        done(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function NoteField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  hint,
}: {
  label: string;
  value: RoundNote;
  onChange: (next: RoundNote) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - value.images.length;
    if (room <= 0) return setError(`그림은 ${MAX_IMAGES}장까지 붙일 수 있습니다.`);

    const picked = [...files].slice(0, room);
    try {
      const made = await Promise.all(picked.map(shrink));
      onChange({ ...value, images: [...value.images, ...made] });
      if (files.length > room) setError(`${MAX_IMAGES}장까지만 붙였습니다.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "그림을 붙이지 못했습니다.");
    }
    /* 같은 파일을 다시 고를 수 있게 비운다 — 비우지 않으면 두 번째 고르기가 안 먹는다 */
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (i: number) =>
    onChange({ ...value, images: value.images.filter((_, k) => k !== i) });

  return (
    <div className="a2-field block">
      <span className="a2-label">{label}</span>
      <textarea
        className="a2-textarea"
        value={value.text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="a2-btn a2-btn-sm"
          disabled={disabled || value.images.length >= MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
        >
          그림 붙이기
        </button>
        <span className="a2-t-xs text-(--a2-ink-4)">
          {value.images.length}/{MAX_IMAGES}장 · 가로 {MAX_W}px로 줄여 담습니다
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {value.images.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {value.images.map((src, i) => (
            <li key={src.slice(-24) + i} className="relative">
              {/* next/image를 쓰지 않는다 — data URL이라 최적화할 원본이 없고,
                  loader가 붙으면 오히려 빈 그림이 뜬다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${label} 그림 ${i + 1}`}
                className="h-20 w-28 rounded-(--a2-radius) border border-(--a2-line) object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`${label} 그림 ${i + 1} 빼기`}
                  className="a2-btn a2-btn-sm absolute right-1 top-1 h-5 px-1.5"
                >
                  빼기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="a2-hint" style={{ color: "var(--a2-danger)" }}>
          {error}
        </p>
      )}
      {hint && <span className="a2-hint">{hint}</span>}
    </div>
  );
}
