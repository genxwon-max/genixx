const map: Record<string, { label: string; className: string }> = {
  ready: { label: "미시작", className: "border-exam-line text-exam-muted" },
  progress: { label: "진행중", className: "border-amber-300 bg-amber-50 text-amber-700" },
  done: { label: "완료", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  forfeited: { label: "포기", className: "border-rose-300 bg-rose-50 text-rose-600" },
  none: { label: "미완료", className: "border-exam-line text-exam-muted" },
  skipped: { label: "미실시 선택", className: "border-exam-line bg-exam-raised text-exam-muted" },
};

export default function StatusBadge({ state }: { state: string }) {
  const item = map[state] ?? map.none;
  return (
    <span
      className={`shrink-0 rounded border px-2.5 py-1 text-[11px] font-bold tracking-wide ${item.className}`}
    >
      {item.label}
    </span>
  );
}
