import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { d4 } from "../paths";

type Item = { href: string; label: string; desc: string };

/** /design4 하위 화면 카드 — 둥근 테두리 상자, 오른쪽 아래 검은 동그라미 화살표 */
export default function LinkCards({ items, cta }: { items: Item[]; cta: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={d4(item.href)}
            className="group flex h-full flex-col rounded-[22px] border border-slate-200 bg-white p-6 transition-colors hover:border-[var(--d4-blue)]"
          >
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-slate-900 group-hover:text-[var(--d4-blue)]">
              {item.label}
            </h2>
            <p className="mt-2 flex-1 text-[14px] leading-[1.7] text-slate-600">{item.desc}</p>
            <span className="mt-5 flex items-center justify-between text-[13px] font-bold text-slate-500">
              {cta}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
