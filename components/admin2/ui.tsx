import Link from "next/link";
import { toneColor, type Tone } from "@/lib/admin2";

/**
 * /admin2 공통 조각.
 *
 * 표를 그리는 일은 DataTable이 맡고, 여기에는 그 둘레를 두르는 것만 둔다.
 * 크기·색은 전부 admin2.css의 클래스로 간다 — 화면마다 px를 직접 고르게 두면
 * 열두 화면이 열두 밀도가 된다.
 */

/* ── 화면 머리 ──
   제목 한 줄에 오른쪽 동작을 붙인다. 설명 문단을 기본으로 두지 않는다 — 매일 오는
   화면에 「여기는 회원을 관리하는 곳입니다」가 붙어 있으면 그 줄만큼 표가 밀린다.
   대신 meta에 지금 보고 있는 범위(회차·건수·기준 시각)를 적는다. */
export function PageHead({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="a2-title">{title}</h1>
        {meta && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 a2-t-sm text-(--a2-ink-3)">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/* ── 판 ── */
export function Panel({
  title,
  meta,
  actions,
  flush = false,
  className = "",
  children,
}: {
  title?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** 표를 그대로 담을 때 — 안쪽 여백을 두지 않는다 */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`a2-panel ${className}`}>
      {(title || actions) && (
        <div className="a2-panel-head">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2 className="a2-h truncate">{title}</h2>}
            {meta && <span className="truncate a2-t-xs text-(--a2-ink-4)">{meta}</span>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

/* ── 상태 — 점 + 글자. 색만으로 구분하지 않는다 ── */
export function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="a2-status" style={{ color: toneColor[tone] }}>
      <span aria-hidden className="a2-dot" />
      <span className="text-(--a2-ink-2)">{children}</span>
    </span>
  );
}

/* ── 분류 꼬리표 — 역할·과목·종류처럼 값이 정해진 것에만 ── */
export function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <span className={`a2-tag ${accent ? "a2-tag-accent" : ""}`}>{children}</span>;
}

/* ── 진행 막대 — 표 한 줄 안에서도 높이를 넘지 않는다 ── */
export function Bar({ value, total, width = "3.5rem" }: { value: number; total: number; width?: string }) {
  const p = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="a2-bar" style={{ width }} role="img" aria-label={`${p}%`}>
        <span style={{ width: `${p}%` }} />
      </span>
      <span className="a2-num a2-t-xs text-(--a2-ink-3)">{p}%</span>
    </span>
  );
}

/* ── 지표 한 칸 ──
   증감은 화살표와 부호를 함께 적는다. 색만 바뀌면 흑백 인쇄와 색약에서 사라진다. */
export function Kpi({
  label,
  value,
  unit,
  delta,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  /** 지난 기간 대비 % — 부호 포함 */
  delta?: number | null;
  sub?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="a2-label">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="a2-metric text-(--a2-ink)">{value}</span>
        {unit && <span className="a2-t-sm text-(--a2-ink-3)">{unit}</span>}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 a2-t-xs text-(--a2-ink-4)">
        {delta != null && (
          <span
            className="a2-num font-semibold"
            style={{ color: delta >= 0 ? "var(--a2-ok)" : "var(--a2-danger)" }}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub}
      </p>
    </>
  );

  const cls = "a2-panel block p-3 transition-colors";
  return href ? (
    <Link href={href} className={`${cls} hover:border-(--a2-line-2) hover:bg-(--a2-raised)`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ── 값 목록 — 설정·상세에서 이름:값을 세로로 쌓는다 ── */
export function DescList({ rows }: { rows: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-(--a2-line)">
      {rows.map((r) => (
        <div key={r.k} className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5 first:pt-0 last:pb-0">
          <dt className="a2-t-sm text-(--a2-ink-3)">{r.k}</dt>
          <dd className="a2-t-sm text-(--a2-ink)">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── 예시 데이터 고지 ──
   이 콘솔의 숫자는 전부 화면 설계를 위해 지어낸 값이다. 화면에도 그렇게 적어 둔다 —
   적어 두지 않으면 시연에서 실적으로 읽힌다. */
export function SeedNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mt-3 a2-t-xs text-(--a2-ink-4)">
      {children ?? "이 화면의 숫자는 화면 설계를 위한 예시입니다. 실제 집계가 아닙니다."}
    </p>
  );
}
