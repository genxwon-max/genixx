import Link from "next/link";
import BrandMark from "./BrandMark";

/** 존마다 잉크 색이 다르다 — 홍보·응시는 남색, 관리자 콘솔은 흰색, 계정 존은 밝은 파랑. */
const tones = {
  brand: "text-brand-900",
  white: "text-white",
  soft: "text-soft-primary",
} as const;

type Tone = keyof typeof tones;

/**
 * 로고 잠금(심벌 + 워드마크). 링크가 필요 없는 자리에 쓴다.
 *
 * 크기는 text-* 하나로 정한다. 심벌 높이와 자간을 em으로 묶어 두었으므로
 * className에 text-[1.25rem]만 넘기면 전체가 같은 비율로 줄고 는다.
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
      <BrandMark className="h-[0.92em] w-auto shrink-0" />
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
