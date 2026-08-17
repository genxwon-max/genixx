import type { ReactNode } from "react";
import Image from "next/image";
import { findPublicImage } from "@/lib/assets";

type Props = {
  /** public/ 아래 확장자를 뺀 파일 이름. 문서: docs/home2-images.md */
  name: string;
  alt: string;
  /** next/image sizes — 자리 폭에 맞춰 주면 전송량이 준다 */
  sizes?: string;
  /** 자리 비율. 사진이 아직 없을 때도 레이아웃이 흔들리지 않도록 여기서 고정한다 */
  ratio?: string;
  className?: string;
  priority?: boolean;
  /**
   * 사진 아래쪽에 얹는 내용.
   *
   * 사진만 덩그러니 놓으면 장식으로 읽히고 지나친다. 그 사진이 왜 거기 있는지를
   * 사진 위에 적어 두면 한 덩어리로 읽힌다.
   */
  overlay?: ReactNode;
};

/**
 * 홍보 존 사진 자리.
 *
 * public/{name}.{png|webp|jpg|…}가 있으면 그 사진을, 없으면 무엇을 넣어야 하는지
 * 적힌 자리표를 렌더한다. 사진을 나중에 채우더라도 지금 화면 흐름을 그대로 보고
 * 판단할 수 있어야 하고, 빈 회색 상자만 두면 어느 파일이 빠졌는지 알 수 없다.
 *
 * ⚠ overlay는 사진이 없을 때도 반드시 그린다. 거기 들어가는 「소질 → 발현 조건 →
 *   재능」 같은 것은 사진에 붙은 설명이 아니라 이 화면이 해야 할 말이다. 파일
 *   하나가 빠졌다고 말이 사라지면 안 된다.
 *
 * 서버 컴포넌트 전용이다 — findPublicImage가 파일 시스템을 읽는다.
 */
export default function PromoImage({
  name,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  ratio = "aspect-[4/3]",
  className = "",
  priority = false,
  overlay,
}: Props) {
  const image = findPublicImage(name);

  return (
    <div className={`relative ${ratio} w-full overflow-hidden rounded-md bg-brand-50 ${className}`}>
      {image ? (
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 border border-dashed border-brand-200 bg-brand-50/60 px-4 text-center">
          <span aria-hidden className="type-tag rounded-sm bg-white px-2 py-1 text-brand-500">
            사진 자리
          </span>
          <code className="type-caption font-bold break-all text-brand-700">{name}</code>
          <span className="type-caption line-clamp-2 text-slate-500">{alt}</span>
        </div>
      )}

      {overlay && (
        <>
          {/* 사진 위에서는 그러데이션을 깔고, 자리표 위에서는 글 상자 자체를
              단색으로 채운다. 어느 쪽이든 흰 글씨가 읽혀야 한다. */}
          {image && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-brand-950/90 via-brand-950/55 to-transparent"
            />
          )}
          <div
            className={`absolute inset-x-0 bottom-0 p-4 text-white sm:p-5 ${
              image ? "" : "bg-brand-950"
            }`}
          >
            {overlay}
          </div>
        </>
      )}
    </div>
  );
}
