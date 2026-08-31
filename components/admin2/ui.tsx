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
   제목을 가운데 크게 세우고, 그 아래에 지금 보고 있는 범위(회차·건수·기준 시각)를,
   오른쪽에 나가는 문을 둔다. 설명 문단은 두지 않는다 — 매일 오는 화면에 「여기는
   회원을 관리하는 곳입니다」가 붙어 있으면 그 줄만큼 표가 밀린다.

   ── 왜 판 안에 넣고 가운데로 세웠나 ──
   처음에는 회색 바탕 위 왼쪽에 18px 제목을 두고 오른쪽에 단추를 세웠다. 그러면 흰 판은
   표에서야 시작하므로 제목·숫자·단추 셋이 판 바깥에 흩어져 뜨고, 어디까지가 이 화면인지가
   안 읽힌다. 제목부터 표까지를 판 하나에 넣으면 그 물음이 사라진다.

   단추는 가운데로 모으지 않는다. 이 콘솔은 줄에서도(수정하기) 판에서도 동작을 오른쪽
   끝에 세우고, 그것까지 가운데로 가면 「어느 쪽이 이 화면의 동작인가」가 사라진다.

   판 껍데기를 스스로 두르지 않는다. 본문 전체가 이미 판 하나이므로(Shell) 여기서 또
   두르면 판 안에 판이 서서 1px 선이 두 겹으로 보인다. 이 머리는 그 판의 맨 위 칸이다.

   ── stats ──
   지표 칸(Kpi)을 넘기면 제목 아래에 띠로 눕는다. 판 넉 장으로 따로 세우지 않는 까닭은
   admin2.css의 .a2-stats 주석에 적어 두었다. */
const STAT_COLS = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
} as const;

export function PageHead({
  title,
  meta,
  actions,
  stats,
  statCols = 4,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** 제목 아래에 눕힐 지표 칸(Kpi) 여럿 */
  stats?: React.ReactNode;
  statCols?: 3 | 4 | 5;
}) {
  return (
    <>
      <div className="border-b border-(--a2-line) px-3 pb-3 pt-5">
        <h1 className="a2-title-lg text-center">{title}</h1>
        {meta && (
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 a2-t-sm text-(--a2-ink-3)">
            {meta}
          </div>
        )}
        {actions && <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">{actions}</div>}
      </div>
      {stats && (
        <div className={`a2-stats border-b border-(--a2-line) sm:grid-cols-2 ${STAT_COLS[statCols]}`}>
          {stats}
        </div>
      )}
    </>
  );
}

/* ── 머리 아래 본문 ──
   표를 판 끝까지 붙여 내보내는 화면(목록)은 이것을 쓰지 않는다. 판 여럿·칸 여럿을
   늘어놓는 화면(대시보드·설정·상세)만 이 안쪽 여백을 두른다. */
export function Body({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-3 ${className}`}>{children}</div>;
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

/* ── 상태 — 점 + 글자. 색만으로 구분하지 않는다 ──
   글자를 회색(--a2-ink-2)으로 눌러 두었더니 표에서 상태를 읽는 단서가 6px 점 하나뿐이
   되었다. 글자도 같은 색으로 적는다 — 점이 사라져도(흑백 인쇄) 글자는 남으므로 색만으로
   구분하지 않는다는 약속은 그대로다. 면은 admin2.css에서 --a2-raised로 눌러 둔다. */
export function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="a2-status" style={{ color: toneColor[tone] }}>
      <span aria-hidden className="a2-dot" />
      <span>{children}</span>
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
   판이 아니라 **띠 안의 한 칸**이다(.a2-stats). 제 테두리를 두르지 않고 바탕만 흰색으로
   깔아, 띠의 1px 틈이 칸 사이 선으로 보이게 한다.

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

  const cls = "block bg-(--a2-panel) p-3 transition-colors";
  return href ? (
    <Link href={href} className={`${cls} hover:bg-(--a2-hover)`}>
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
    <p className="border-t border-(--a2-line) bg-(--a2-raised) px-3 py-2 a2-t-xs text-(--a2-ink-4)">
      {children ?? "이 화면의 숫자는 화면 설계를 위한 예시입니다. 실제 집계가 아닙니다."}
    </p>
  );
}
