import Image from "next/image";
import { findPublicImage } from "@/lib/assets";

/**
 * 잡지 문법의 사진 자리. 크게 둥글고, 종이 톤 필터를 입힌다.
 *
 * 사진은 /home2용으로 뽑아 둔 public/promo-*.webp를 그대로 쓴다. 같은 사진이라도
 * 모서리와 색 처리가 다르면 다른 화면으로 읽힌다. 파일이 없으면 종이색 빈 자리와
 * 파일 이름을 남겨 무엇이 빠졌는지 보이게 한다. 서버 전용(fs를 읽는다).
 */
export default function Photo({
  name,
  alt,
  ratio = "aspect-[4/3]",
  sizes = "(max-width: 1024px) 100vw, 50vw",
  radius = "rounded-[1.75rem]",
  className = "",
  preload = false,
}: {
  name: string;
  alt: string;
  ratio?: string;
  sizes?: string;
  radius?: string;
  className?: string;
  /** 첫 화면 사진 한 장만 true — Next 16에서 priority는 preload로 바뀌었다 */
  preload?: boolean;
}) {
  const image = findPublicImage(name);

  return (
    <div className={`relative w-full overflow-hidden bg-(--paper-3) ${ratio} ${radius} ${className}`}>
      {image ? (
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          className="ed-photo object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="ed-small font-bold text-(--ink-2)">사진 자리</span>
          <code className="ed-small break-all text-(--accent)">{name}</code>
        </div>
      )}
    </div>
  );
}
