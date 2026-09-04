import Link from "next/link";
import { policyLinks } from "@/lib/nav";

/**
 * 푸터 맨 위에 눕는 정책 띠.
 *
 * 회사소개 · 이용약관 · 운영정책 · **개인정보처리방침** · 청소년보호정책 · 광고제휴 …
 * 국내 서비스가 관행처럼 같은 차례로 세우는 줄이라, 어느 존에 있든 같은 자리에서
 * 같은 순서로 보이는 편이 낫다. 목록은 lib/nav.ts의 policyLinks 하나로 둔다.
 *
 * 구분선은 **앞 항목에 붙인다.** 뒤에 붙이면 좁은 화면에서 줄이 넘어갈 때 다음 줄이
 * 「| 광고제휴」처럼 막대로 시작한다.
 *
 * 색만 존별로 갈아입는다. 공개 사이트 푸터는 남색 계열 연한 판 위에, 계정 존 푸터는
 * 회색 판 위에 선다.
 */

const tones = {
  site: {
    line: "border-brand-100",
    link: "text-slate-600 hover:text-brand-700",
    strong: "font-bold text-slate-900 hover:text-brand-700",
    sep: "text-brand-200",
  },
  account: {
    line: "border-soft-line/70",
    link: "text-soft-muted hover:text-soft-primary",
    strong: "font-bold text-soft-ink hover:text-soft-primary",
    sep: "text-soft-line",
  },
} as const;

export default function PolicyBar({ tone = "site" }: { tone?: keyof typeof tones }) {
  const c = tones[tone];

  return (
    <nav
      aria-label="정책·고지"
      className={`container-x flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-4 text-[13px] ${c.line}`}
    >
      {policyLinks.map((l, i) => (
        <span key={l.href} className="inline-flex items-center gap-x-3">
          <Link href={l.href} className={`transition-colors ${l.strong ? c.strong : c.link}`}>
            {l.label}
          </Link>
          {i < policyLinks.length - 1 && (
            <span aria-hidden className={c.sep}>
              |
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
