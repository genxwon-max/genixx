import Link from "next/link";
import PersonAvatar from "./PersonAvatar";
import { groupOf, type Person } from "@/lib/people";
import { ArrowRight } from "@/components/Icons";

export default function PersonCard({ person }: { person: Person }) {
  const group = groupOf(person.group);

  return (
    <Link
      href={`/about/team/${person.id}`}
      className="group flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-6 shadow-card transition-shadow hover:shadow-float"
    >
      <div className="flex items-center gap-3.5">
        <PersonAvatar person={person} size={52} />
        <div className="min-w-0">
          <p className="type-h3 font-black text-brand-950">{person.name}</p>
          <p className="type-caption mt-0.5 truncate text-slate-500">{person.role}</p>
        </div>
      </div>

      <span className={`type-tag mt-4 w-fit rounded-full px-2.5 py-1 ${group.tone}`}>
        {group.label}
      </span>

      <p className="type-body mt-3 flex-1 text-slate-600">{person.headline}</p>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {person.tags.map((t) => (
          <li key={t} className="type-tag rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
            {t}
          </li>
        ))}
      </ul>

      <span className="type-meta mt-5 inline-flex items-center gap-1.5 font-bold text-brand-700">
        프로필 보기
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
