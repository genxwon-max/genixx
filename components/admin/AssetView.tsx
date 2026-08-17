"use client";

import { useEffect, useState } from "react";
import type { ItemAsset } from "@/lib/itemStore";
import * as a from "./ui";

/**
 * 붙임 파일을 보는 자리 — 출제 화면과 검수 화면이 같은 것을 쓴다.
 *
 * 예전에는 출제 쪽이 40px짜리 네모를, 검수 쪽이 112px짜리 줄을 따로 그렸다.
 * 그 크기로는 지문 그림에 무엇이 그려져 있는지 알 수 없어서, 그림이 있는 문항은
 * 사실상 검수를 못 했다. 그림이 문항의 일부인 이상 발문과 같은 무게로 보여야 한다.
 *
 * 그래서 한 벌로 합치고, 눌러서 원본 크기로 여는 길을 열어 둔다.
 */

const kindLabel: Record<ItemAsset["kind"], string> = {
  image: "그림",
  pdf: "PDF",
  sheet: "엑셀 · CSV",
};

const sizeText = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;

export default function AssetView({
  assets,
  onRemove,
  onAlt,
}: {
  assets: ItemAsset[];
  /** 주면 「빼기」가 보인다 — 출제 화면에서만 준다 */
  onRemove?: (assetId: string) => void;
  /** 주면 대체 텍스트를 고칠 수 있다 */
  onAlt?: (assetId: string, alt: string) => void;
}) {
  const [zoom, setZoom] = useState<ItemAsset | null>(null);

  if (assets.length === 0) return null;

  const images = assets.filter((f) => f.kind === "image" && f.dataUrl);
  const files = assets.filter((f) => f.kind !== "image" || !f.dataUrl);

  return (
    <>
      {images.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {images.map((f) => (
            <li key={f.id} className="rounded-md border border-exam-line bg-white p-2">
              <button
                type="button"
                onClick={() => setZoom(f)}
                className="block w-full cursor-zoom-in overflow-hidden rounded bg-exam-raised"
                title="크게 보기"
              >
                {/* 사람이 올린 자료라 빌드 시점에 알 수 없다 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.dataUrl} alt={f.alt || f.name} className="mx-auto h-40 w-auto" />
              </button>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate adm-t-xs text-exam-muted">
                  {f.name} · {sizeText(f.size)}
                </span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="shrink-0 adm-t-xs font-bold text-rose-600 underline underline-offset-4"
                  >
                    빼기
                  </button>
                )}
              </div>

              {/* 대체 텍스트 — 없으면 저시력·전맹 학생에게 문항이 성립하지 않는다 */}
              {onAlt ? (
                <label className="mt-2 block">
                  <span className="adm-t-xs font-bold text-exam-text">
                    대체 텍스트{" "}
                    {!f.alt?.trim() && <span className="text-rose-600">— 아직 없습니다</span>}
                  </span>
                  <input
                    value={f.alt ?? ""}
                    onChange={(e) => onAlt(f.id, e.target.value)}
                    placeholder="그림에 무엇이 있는지 글로 적어 주세요"
                    className={`mt-1 ${a.input}`}
                  />
                </label>
              ) : (
                <p className="mt-2 adm-t-xs leading-relaxed">
                  <b className="font-bold text-exam-text">대체 텍스트</b>{" "}
                  {f.alt?.trim() ? (
                    <span className="text-exam-muted">{f.alt}</span>
                  ) : (
                    <span className="font-bold text-rose-600">
                      없습니다 — 이 그림이 있어야 풀리는 문항이면 걸림입니다
                    </span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 원본 시험지 PDF·표는 참고 자료라 이름만 둔다. 아이 화면에는 나가지 않는다. */}
      {files.length > 0 && (
        <ul className="mt-3 border-t border-exam-line">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-b border-exam-line py-2.5">
              <span className="shrink-0 rounded border border-exam-line px-2 py-1 adm-t-xs font-bold text-exam-muted">
                {kindLabel[f.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate adm-t-sm text-exam-text">{f.name}</span>
              <span className="shrink-0 adm-t-xs text-exam-muted">{sizeText(f.size)}</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  className="shrink-0 adm-t-xs font-bold text-rose-600 underline underline-offset-4"
                >
                  빼기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {zoom && <Zoom asset={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

/** 크게 보기 — 지문 그림은 세부가 보여야 검수가 된다 */
function Zoom({ asset, onClose }: { asset: ItemAsset; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${asset.name} 크게 보기`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-exam-text/85 p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.dataUrl}
        alt={asset.alt || asset.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-full bg-white"
      />
      <p className="text-center adm-t-sm text-white">
        {asset.alt?.trim() || asset.name}
        <span className="ml-2 text-white/70">아무 데나 누르거나 Esc를 누르면 닫힙니다</span>
      </p>
    </div>
  );
}
