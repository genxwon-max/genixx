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
};

/**
 * 홍보 존 사진 자리.
 *
 * public/{name}.{png|webp|jpg|…}가 있으면 그 사진을, 없으면 무엇을 넣어야 하는지
 * 적힌 자리표를 렌더한다. 사진을 나중에 채우더라도 지금 화면 흐름을 그대로 보고
 * 판단할 수 있어야 하고, 빈 회색 상자만 두면 어느 파일이 빠졌는지 알 수 없다.
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
}: Props) {
  const image = findPublicImage(name);

  if (!image) {
    return (
      <div
        className={`flex ${ratio} w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-4 text-center ${className}`}
      >
        <span aria-hidden className="type-tag rounded-full bg-white px-2.5 py-1 text-brand-500">
          사진 자리
        </span>
        <code className="type-caption font-bold break-all text-brand-700">{name}</code>
        <span className="type-caption line-clamp-2 text-slate-500">{alt}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${ratio} w-full overflow-hidden rounded-2xl bg-brand-50 ${className}`}
    >
      <Image
        src={image.src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
