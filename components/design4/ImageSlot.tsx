import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

/**
 * /design4의 그림 자리. public/design4/<file>이 있으면 그 그림을, 없으면 파일 이름과
 * 한 줄 설명을 적은 빈 자리를 그린다. 그림은 아직 없다 — 무엇을 그려야 하는지는
 * docs/design4-image-prompts.md에 파일 이름별로 적어 두었다. 그림을 만들어 그 이름으로
 * public/design4/에 넣으면 코드를 고치지 않아도 이 자리에 들어간다.
 *
 * 부모가 크기와 relative를 정한다. 그림은 투명 배경 PNG를 전제로 contain으로 놓는다.
 */
export default function ImageSlot({
  file,
  label,
  sizes = "320px",
  preload = false,
  tone = "light",
}: {
  /** public/design4/ 아래 파일 이름 */
  file: string;
  /** 빈 자리에 적는 설명 · 그림의 alt */
  label: string;
  sizes?: string;
  preload?: boolean;
  /** 빈 자리를 어두운 바탕 위에 둘 때는 dark */
  tone?: "light" | "dark";
}) {
  const exists = fs.existsSync(path.join(process.cwd(), "public", "design4", file));

  if (exists) {
    return (
      <Image
        src={`/design4/${file}`}
        alt={label}
        fill
        sizes={sizes}
        preload={preload}
        className="object-contain"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`그림 자리: ${label}`}
      className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-3 text-center ${
        tone === "dark" ? "border-white/40 text-white/85" : "border-slate-900/20 text-slate-600"
      }`}
    >
      <ImageIcon aria-hidden className="h-5 w-5 opacity-70" />
      <span className="text-[11px] font-bold leading-tight">{label}</span>
      <span className="font-mono text-[10px] leading-tight opacity-70">{file}</span>
    </div>
  );
}
