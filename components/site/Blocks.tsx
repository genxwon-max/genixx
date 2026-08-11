import type { Block } from "@/lib/pageContent";

export default function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-12 md:space-y-16">
      {blocks.map((block, i) => (
        <section key={i}>
          {block.kind === "points" && (
            <>
              <Heading title={block.heading} lead={block.lead} />
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {block.items.map((it) => (
                  <li
                    key={it.t}
                    className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
                  >
                    <h3 className="type-h3 font-black text-brand-950">{it.t}</h3>
                    <p className="type-body mt-2 text-slate-600">{it.d}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {block.kind === "steps" && (
            <>
              <Heading title={block.heading} lead={block.lead} />
              <ol className="mt-6 space-y-3">
                {block.items.map((it, n) => (
                  <li
                    key={it.t}
                    className="flex gap-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
                  >
                    <span className="type-h4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 font-black text-white">
                      {n + 1}
                    </span>
                    <div>
                      <h3 className="type-h3 font-black text-brand-950">{it.t}</h3>
                      <p className="type-body mt-2 text-slate-600">{it.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {block.kind === "table" && (
            <>
              <Heading title={block.heading} lead={block.lead} />
              <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-card">
                <table className="type-body w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-brand-100 bg-brand-50/60">
                      {block.head.map((h) => (
                        <th key={h} className="px-5 py-3.5 font-black text-brand-900">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row[0]} className="border-b border-brand-50 last:border-0">
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={`px-5 py-4 leading-relaxed ${
                              c === 0 ? "font-bold text-brand-900" : "text-slate-600"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {block.kind === "note" && (
            <p className="type-body rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-5 text-slate-600">
              {block.text}
            </p>
          )}

          {block.kind === "quote" && (
            <blockquote className="rounded-3xl bg-brand-900 px-6 py-8 text-white md:px-10 md:py-10">
              <p className="type-h3 font-bold leading-relaxed">“{block.text}”</p>
              {block.by && (
                <footer className="type-meta mt-4 text-brand-200">{block.by}</footer>
              )}
            </blockquote>
          )}
        </section>
      ))}
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead?: string }) {
  return (
    <div>
      <h2 className="type-h3 font-black text-brand-950">
        {title}
      </h2>
      {lead && <p className="type-body mt-2.5 text-slate-600">{lead}</p>}
    </div>
  );
}
