import type { ReactNode } from "react";
import type { Block } from "@/lib/pageContent";
import ReportPreview from "@/components/report/ReportPreview";
import { Aside, Chapter, Rows, Steps } from "./Article";

type Headed = Exclude<Block, { kind: "note" } | { kind: "quote" }>;

/**
 * /design4 하위 화면 본문 — 공개 사이트 components/site/Blocks.tsx와 같은 규칙으로 블록을 구간에
 * 묶고, 모양만 design4 조각(Article)을 입힌다. 표는 둥근 테두리 상자 안에 회색 머리줄을 둔다.
 */
export default function Blocks({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = [];
  let chapter: { block: Headed; notes: string[] } | null = null;
  let no = 0;

  const flush = () => {
    if (!chapter) return;
    const { block, notes } = chapter;
    no += 1;
    out.push(
      <Chapter key={`c${no}`} title={block.heading} lead={block.lead}>
        <Body block={block} />
        {notes.map((n) => (
          <Aside key={n}>{n}</Aside>
        ))}
      </Chapter>,
    );
    chapter = null;
  };

  blocks.forEach((b, i) => {
    if (b.kind === "note") {
      if (chapter) chapter.notes.push(b.text);
      else out.push(<Aside key={`n${i}`}>{b.text}</Aside>);
      return;
    }
    if (b.kind === "quote") {
      flush();
      out.push(<Quote key={`q${i}`} text={b.text} by={b.by} />);
      return;
    }
    flush();
    chapter = { block: b, notes: [] };
  });
  flush();

  return <div>{out}</div>;
}

function Body({ block }: { block: Headed }) {
  switch (block.kind) {
    case "points":
      return <Rows items={block.items} />;

    case "steps":
      return <Steps items={block.items} />;

    case "table":
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[var(--d4-tint)]">
                {block.head.map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[13.5px] font-bold text-slate-800">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-b border-slate-100 last:border-b-0">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-5 py-4 align-top leading-[1.7] ${
                        c === 0 ? "whitespace-nowrap font-bold text-slate-900" : "text-slate-600"
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
      );

    case "reportPreview":
      return <ReportPreview />;
  }
}

function Quote({ text, by }: { text: string; by?: string }) {
  return (
    <figure className="mt-12 rounded-2xl border-l-[5px] border-[var(--d4-blue)] bg-[var(--d4-tint)] px-6 py-7 md:px-8">
      <blockquote className="text-[18px] font-bold leading-relaxed tracking-[-0.02em] text-slate-900">
        &ldquo;{text}&rdquo;
      </blockquote>
      {by && <figcaption className="mt-3 text-[13px] text-slate-500">{by}</figcaption>}
    </figure>
  );
}
