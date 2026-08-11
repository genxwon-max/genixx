"use client";

import { useState } from "react";
import { ChevronDown } from "./Icons";

export type FaqItem = { q: string; a: string };

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100 bg-white">
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <li key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                // 마우스를 올려도 배경은 그대로 두고 커서만 바뀌게 한다
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left md:px-6"
              >
                <span className="type-lead font-bold leading-snug text-brand-950">
                  <span className="mr-2 text-brand-400">Q.</span>
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-brand-400 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </h3>
            {expanded && (
              <div className="px-5 pb-6 md:px-6">
                <p className="type-body rounded-xl bg-brand-50/70 px-5 py-4 text-slate-600">
                  {item.a}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
