import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** 어두운 배경 섹션에서는 대비를 뒤집는다 */
  tone?: "light" | "dark";
  align?: "left" | "center";
  className?: string;
};

/**
 * 섹션 머리말. eyebrow → 제목 → 리드문의 간격을 한 군데서 정해
 * 페이지마다 mt 값이 어긋나는 걸 막는다.
 */
export default function SectionHead({
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "left",
  className = "",
}: Props) {
  const dark = tone === "dark";

  return (
    <div
      className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    >
      {eyebrow && (
        <p className={`type-eyebrow ${dark ? "text-brand-300" : "text-brand-500"}`}>{eyebrow}</p>
      )}
      <h2
        className={`type-h2 font-black ${eyebrow ? "mt-3" : ""} ${
          dark ? "text-white" : "text-brand-950"
        }`}
      >
        {title}
      </h2>
      {lead && (
        <p className={`type-lead mt-4 ${dark ? "text-brand-100" : "text-slate-600"}`}>{lead}</p>
      )}
    </div>
  );
}
