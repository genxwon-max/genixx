import Link from "next/link";
import BrandMark from "./BrandMark";

/**
 * 존마다 워드마크 잉크가 다르다 — 홍보·응시는 남색, 관리자 콘솔은 흰색, 계정 존 머리띠는
 * 밝은 파랑. ink는 원본 로고의 먹빛으로, 색을 입히지 않는 자리(계정 존 푸터)에 쓴다.
 */
const tones = {
  brand: "text-brand-900",
  white: "text-white",
  soft: "text-soft-primary",
  ink: "text-soft-ink",
} as const;

type Tone = keyof typeof tones;

/**
 * 로고 잠금(심벌 + 워드마크). 링크가 필요 없는 자리에 쓴다.
 *
 * 크기는 text-* 하나로 정한다. 심벌 높이와 자간을 em으로 묶어 두었으므로
 * className에 text-[1.25rem]만 넘기면 전체가 같은 비율로 줄고 는다.
 *
 * 원본 로고는 심벌을 워드마크 **위에** 얹은 세로 잠금이지만, 머리띠와 푸터는 높이가
 * 정해진 가로 줄이라 옆으로 눕혀 쓴다. 대신 색은 원본을 그대로 따른다 — 심벌은
 * 청록(--color-mark) 하나로 고정하고, 워드마크만 존에 맞춰 갈아입는다. 남색 바탕
 * (관리자 콘솔)에서도 청록은 그대로 읽히므로 심벌까지 흰색으로 뒤집지 않는다.
 */
export function LogoLockup({
  tone = "brand",
  className = "text-[1.625rem]",
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-[0.34em] leading-none ${tones[tone]} ${className}`}>
      <BrandMark className="h-[1.15em] w-auto shrink-0 text-mark" />
      <span className="font-brand font-semibold tracking-[0.005em]">GENIXX</span>
    </span>
  );
}

/** 로고 — 기본은 홈으로 가는 링크. */
export default function Logo({
  inverted = false,
  tone,
  href = "/",
  className = "text-[1.625rem]",
}: {
  inverted?: boolean;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} aria-label="GENIXX 홈" className="inline-flex">
      <LogoLockup tone={tone ?? (inverted ? "white" : "brand")} className={className} />
    </Link>
  );
}
