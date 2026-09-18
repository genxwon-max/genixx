import type { ReactNode } from "react";
import type { Block } from "@/lib/pageContent";
import ReportPreview from "@/components/report/ReportPreview";
import { Aside, Chapter, Rows, Steps } from "./Article";

type Headed = Exclude<Block, { kind: "note" } | { kind: "quote" }>;

/**
 * 하위 화면 본문 — 소개·서비스 갈래와 같은 「읽는 글」 모양으로 편다.
 *
 * 제목이 있는 블록(points·steps·table·reportPreview) 하나가 한 구간(Chapter)이 되고,
 * 그 뒤에 오는 note는 같은 구간 끝의 한마디(Aside)로 붙는다. 카드·그림자 없이
 * 가는 줄과 여백만 쓴다. quote는 구간 밖에 크게 싣는다.
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
      <Chapter
        key={`c${no}`}
        no={String(no).padStart(2, "0")}
        title={block.heading}
        lead={block.lead}
      >
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
        <div className="overflow-x-auto">
          <table className="type-body w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b-2 border-brand-900">
                {block.head.map((h) => (
                  <th key={h} className="type-meta py-3 pr-6 font-bold text-brand-900">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-b border-brand-100">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`py-4 pr-6 align-top ${
                        c === 0 ? "whitespace-nowrap font-bold text-brand-950" : "text-slate-600"
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
    <figure className="mx-auto max-w-3xl py-12 text-center md:py-16">
      <blockquote className="type-h3 font-bold leading-relaxed text-brand-950">
        &ldquo;{text}&rdquo;
      </blockquote>
      {by && <figcaption className="type-meta mt-4 text-slate-500">{by}</figcaption>}
    </figure>
  );
}
