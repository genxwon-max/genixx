import Link from "next/link";
import { ArrowRight } from "@/components/Icons";

type Item = { href: string; label: string; desc: string };

/**
 * 허브 화면(소개·서비스·샘플·콘텐츠·고객지원·파트너·법적 고지)의 하위 화면 카드.
 *
 * 넓은 화면에서는 한 줄에 모두 세운다(grid-flow-col). 몇 개 안 되는 하위 화면을 두세 줄로
 * 쌓으면 목록보다 벽처럼 보인다. 다만 다섯 개가 넘으면(법적 고지 7종) 한 칸이 너무 좁아
 * 제목이 두세 줄로 꺾이므로 네 칸씩 접는다.
 *
 * 마우스를 올려도 카드가 떠오르지 않는다 — 그림자가 짙어지면 카드가 커지는 것처럼
 * 읽혀서 걷었다. 대신 테두리 색과 제목 색만 바뀐다.
 */
export default function LinkCards({ items, cta }: { items: Item[]; cta: string }) {
  return (
    <ul
      className={`grid gap-3 sm:grid-cols-2 ${
        items.length <= 5 ? "lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none" : "lg:grid-cols-4"
      }`}
    >
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-5 transition-colors hover:border-brand-300"
          >
            <h2 className="type-h4 font-black text-brand-950 group-hover:text-brand-700">
              {item.label}
            </h2>
            <p className="type-meta mt-1.5 flex-1 text-slate-600">{item.desc}</p>
            <span className="type-meta mt-4 inline-flex items-center gap-1 font-bold text-brand-700">
              {cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
