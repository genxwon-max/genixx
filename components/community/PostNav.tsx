import Link from "next/link";

type Neighbor = { href: string; title: string } | null;

/** 글 아래 — 이전 글 · 다음 글 · 목록 */
export default function PostNav({
  prev,
  next,
  listHref,
}: {
  prev: Neighbor;
  next: Neighbor;
  listHref: string;
}) {
  const row = (label: string, n: Neighbor) => (
    <li className="flex gap-4 border-b border-brand-100 px-2 py-3.5">
      <span className="type-meta w-14 shrink-0 font-bold text-slate-500">{label}</span>
      {n ? (
        <Link href={n.href} className="type-meta truncate text-slate-800 hover:text-brand-800 hover:underline">
          {n.title}
        </Link>
      ) : (
        <span className="type-meta text-slate-400">없습니다</span>
      )}
    </li>
  );

  return (
    <>
      <ul className="mt-12 border-t border-brand-200">
        {row("이전 글", prev)}
        {row("다음 글", next)}
      </ul>
      <div className="mt-8 text-center">
        <Link href={listHref} className="btn btn-md bg-brand-900 text-white hover:bg-brand-800">
          목록으로
        </Link>
      </div>
    </>
  );
}
