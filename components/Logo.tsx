import Link from "next/link";

export default function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="inline-flex flex-col leading-none" aria-label="GENIXX 홈">
      <span
        className={`text-2xl font-black tracking-tight ${
          inverted ? "text-white" : "text-brand-900"
        }`}
      >
        GENIXX
      </span>
      <span
        className={`mt-0.5 text-[9px] font-medium tracking-[0.18em] ${
          inverted ? "text-brand-200" : "text-brand-500"
        }`}
      >
        AI TALENT EDUCATION
      </span>
    </Link>
  );
}
