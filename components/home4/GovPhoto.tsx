import Image from "next/image";
import { findPublicImage } from "@/lib/assets";

/**
 * 공공 문법의 사진 자리 — 각진 모서리, 필터 없음.
 *
 * 사진은 /home2·/home3과 같은 public/promo-*.webp를 쓴다. 파일이 없으면 회색 빈
 * 자리와 파일 이름을 남긴다. 서버 전용(fs를 읽는다).
 */
export default function GovPhoto({
  name,
  alt,
  ratio = "aspect-[4/3]",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  className = "",
  preload = false,
}: {
  name: string;
  alt: string;
  ratio?: string;
  sizes?: string;
  className?: string;
  /** 첫 화면 사진 한 장만 true */
  preload?: boolean;
}) {
  const image = findPublicImage(name);

  return (
    <div className={`relative w-full overflow-hidden bg-(--g-bg-2) ${ratio} ${className}`}>
      {image ? (
        <Image src={image.src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="gv-small font-bold text-(--g-ink-2)">사진 자리</span>
          <code className="gv-small break-all text-(--g-blue)">{name}</code>
        </div>
      )}
    </div>
  );
}
