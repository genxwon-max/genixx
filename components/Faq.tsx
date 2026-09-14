"use client";

import { useState } from "react";
import { ChevronDown } from "./Icons";

/**
 * 답은 글 한 줄이 기본이고, 서식이 있으면 `html`로 온다.
 *
 * 콘솔에서 답을 마크다운·HTML로도 쓸 수 있게 되면서(lib/contentStore.ts) 그린 결과를
 * 받을 자리가 필요해졌다. 소독은 넘기는 쪽에서 renderDetail이 끝내 둔다(lib/richText.ts).
 */
export type FaqItem = { q: string; a: string; html?: string };

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
                {item.html ? (
                  <div
                    className="type-body prose-faq rounded-xl bg-brand-50/70 px-5 py-4 text-slate-600"
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                ) : (
                  <p className="type-body rounded-xl bg-brand-50/70 px-5 py-4 text-slate-600">
                    {item.a}
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
