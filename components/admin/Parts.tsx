import Link from "next/link";
import * as a from "./ui";

/** 화면 제목 줄 — 왼쪽에 제목·설명, 오른쪽에 주 동작 */
export function PageHead({
  id,
  title,
  lead,
  action,
}: {
  /** 사이트맵 화면 ID */
  id: string;
  title: string;
  lead: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="adm-t-xs font-bold text-exam-muted">{id}</p>
        <h1 className={`${a.pageTitle} mt-1.5`}>{title}</h1>
        <p className={`${a.bodyText} mt-2`}>{lead}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/** 숫자 카드. 숫자만 크게 두지 않고 무슨 숫자인지 항상 함께 적는다. */
export function StatCard({
  label,
  value,
  unit,
  note,
  tone = "plain",
  href,
}: {
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  tone?: "plain" | "warn" | "good";
  href?: string;
}) {
  const toneClass =
    tone === "warn"
      ? "border-rose-300 bg-rose-50"
      : tone === "good"
        ? "border-emerald-300 bg-emerald-50"
        : "border-exam-line bg-white";

  const inner = (
    <>
      <p className="adm-t-sm font-bold text-exam-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="adm-num font-black text-exam-text">
          {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
        </span>
        {unit && <span className="adm-t-md font-bold text-exam-muted">{unit}</span>}
      </p>
      {note && <p className="mt-1.5 adm-t-xs text-exam-muted">{note}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-lg border p-5 transition-colors hover:border-brand-500 ${toneClass}`}
      >
        {inner}
        <span className="mt-3 inline-block adm-t-xs font-bold text-brand-700">바로 가기 →</span>
      </Link>
    );
  }
  return <div className={`rounded-lg border p-5 ${toneClass}`}>{inner}</div>;
}

/** 상태 — 상자 없이 글자만. 색은 거들 뿐이고 라벨이 본체다. */
export function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`${a.badge} ${className}`}>{label}</span>;
}

/** 진행률 막대. 숫자를 막대 옆에 반드시 적는다. */
export function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="adm-t-sm font-bold text-exam-text">{label}</span>
        <span className="adm-t-sm font-bold tabular-nums text-exam-text">
          {value.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}
          <span className="ml-2 text-exam-muted">{pct}%</span>
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-exam-raised">
        <div
          className="h-full rounded-full bg-brand-700"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={label}
        />
      </div>
    </div>
  );
}

/** 표를 감싸는 상자. 가로가 좁으면 표만 옆으로 밀린다. */
export function TableCard({
  title,
  caption,
  children,
  action,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={a.panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-exam-line px-5 py-4">
        <div>
          <h2 className={a.cardTitle}>{title}</h2>
          {caption && <p className="mt-1 adm-t-sm text-exam-muted">{caption}</p>}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/** 권한이 없을 때 보여 주는 안내. 빈 화면 대신 이유와 다음 행동을 적는다. */
export function NoPermission({ need, role }: { need: string; role: string }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-7">
      <h2 className="adm-t-lg font-black text-amber-900">이 화면을 볼 권한이 없습니다</h2>
      <p className="mt-2.5 adm-t-md text-amber-900">
        지금 <b>{role}</b> 역할로 보고 있습니다. 이 화면은 <b>{need}</b> 권한이 있어야 열립니다.
      </p>
      <p className="mt-1.5 adm-t-sm text-amber-900/90">
        권한이 필요하시면 총괄 관리자에게 요청하세요. 요청과 승인 내역은 감사 로그에 남습니다.
      </p>
      <Link href="/admin" className={`${a.btnGhost} mt-5 border-amber-400`}>
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
