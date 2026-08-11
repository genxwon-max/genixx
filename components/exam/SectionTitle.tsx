import type { ReactNode } from "react";

/**
 * 화면 안 구획 제목 — 왼쪽 세로 막대 + 제목 + 한 줄 설명.
 * 학생 명부에서 쓰던 것을 회원 존 전체가 함께 쓴다.
 */
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
        <h2 className="flex items-center gap-2.5 text-[16px] font-bold tracking-tight text-soft-ink md:text-[17px]">
          <span aria-hidden className="inline-block h-[16px] w-[3px] rounded-full bg-soft-primary" />
          {children}
        </h2>
        {note && <p className="mt-1.5 pl-[13px] text-[13px] text-soft-muted">{note}</p>}
      </div>
      {right}
    </div>
  );
}
