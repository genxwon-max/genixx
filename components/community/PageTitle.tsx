/** 커뮤니티 칸마다 가운데 세우는 제목 */
export default function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-10 text-center">
      <h1 className="type-h2 font-black text-brand-950">{title}</h1>
      {lead && <p className="type-body mt-3 text-slate-600">{lead}</p>}
    </div>
  );
}
