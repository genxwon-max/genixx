import type { ReactNode } from "react";

/** 정부 포털식 제목 — 왼쪽 세로 막대 + 굵은 제목 */
export default function SectionTitle({
  children,
  right,
  note,
}: {
  children: ReactNode;
  right?: ReactNode;
  note?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2.5 text-[17px] font-black tracking-tight text-exam-text md:text-[18px]">
          <span aria-hidden className="inline-block h-[18px] w-[4px] bg-brand-800" />
          {children}
        </h2>
        {note && <p className="mt-1.5 pl-[14px] text-[12px] text-exam-muted">{note}</p>}
      </div>
      {right}
    </div>
  );
}
