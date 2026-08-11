import Image from "next/image";
import { getStock } from "@/lib/stock";

type Props = {
  id: string;
  /** 이미지가 없을 때 대신 칠할 배경 클래스 */
  fallbackClass?: string;
  /** next/image sizes — 레이아웃에 맞게 지정하면 전송량이 줄어든다 */
  sizes?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
};

/**
 * 사진 자리를 채우는 컴포넌트. 부모에 크기(aspect/height)와 relative가 있어야 한다.
 * `npm run images` 를 아직 돌리지 않았다면 배경색만 렌더한다.
 */
export default function StockPhoto({
  id,
  fallbackClass = "bg-brand-100",
  sizes = "(max-width: 768px) 100vw, 33vw",
  alt,
  className = "",
  priority = false,
}: Props) {
  const image = getStock(id);

  if (!image) {
    return <div aria-hidden className={`h-full w-full ${fallbackClass} ${className}`} />;
  }

  return (
    <Image
      src={image.file}
      alt={alt ?? image.alt}
      title={`© ${image.credit.name} / ${image.credit.source}`}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
