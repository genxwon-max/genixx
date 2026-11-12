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
 * 서비스 이름 워드마크 「모두의재능」(2026-11-12 요청 — GENIXX에서 이름을 바꿨다).
 *
 * 줄임말 「모재」가 눈에 먼저 들어오도록 **모**와 **재**를 크게, 나머지(두의 · 능)는 작게 쓴다.
 * 글자 밑줄(baseline)을 맞춰 큰 글자가 위로만 솟게 한다. 크기는 부모의 text-* 하나를 따른다.
 *
 * 화면 읽기 프로그램에는 조각이 아니라 「모두의재능」 한 낱말로 읽히게 한다.
 * 라틴 문자가 필요한 자리(응시 워터마크 등)에서는 MOJAI로 쓴다.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-black leading-none tracking-[-0.05em] ${className}`}>
      <span className="sr-only">모두의재능</span>
      <span aria-hidden className="text-[1.3em]">모</span>
      <span aria-hidden className="text-[0.84em]">두의</span>
      <span aria-hidden className="ml-[0.04em] text-[1.3em]">재</span>
      <span aria-hidden className="text-[0.84em]">능</span>
    </span>
  );
}

/**
 * 로고 잠금(심벌 + 워드마크). 링크가 필요 없는 자리에 쓴다.
 *
 * 크기는 text-* 하나로 정한다. 심벌 높이와 자간을 em으로 묶어 두었으므로
 * className에 text-[1.25rem]만 넘기면 전체가 같은 비율로 줄고 는다.
 *
 * 앞의 세모 심벌은 운영사 제닉스의 로고를 그대로 쓴다(서비스 이름만 모두의재능으로 바뀌었다).
 * 색은 원본을 따른다 — 심벌은 청록(--color-mark) 하나로 고정하고, 워드마크만 존에 맞춰
 * 갈아입는다. 남색 바탕(관리자 콘솔)에서도 청록은 그대로 읽히므로 심벌까지 흰색으로 뒤집지 않는다.
 *
 * 한글 워드마크는 큰 글자(모 · 재)가 1.3배로 솟으므로 전체를 0.86배로 줄여, 예전 GENIXX
 * 잠금과 같은 자리 높이에 들어가게 한다.
 */
export function LogoLockup({
  tone = "brand",
  className = "text-[1.625rem]",
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] leading-none ${tones[tone]} ${className}`}>
      <BrandMark className="h-[1.1em] w-auto shrink-0 text-mark" />
      <Wordmark className="text-[0.86em]" />
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
    <Link href={href} aria-label="모두의재능 홈" className="inline-flex">
      <LogoLockup tone={tone ?? (inverted ? "white" : "brand")} className={className} />
    </Link>
  );
}
