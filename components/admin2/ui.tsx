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
   제목을 가운데 크게 세우고 오른쪽에 나가는 문을 둔다. 설명은 두지 않는다 — 매일 오는
   화면에 「여기는 회원을 관리하는 곳입니다」가 붙어 있으면 그 줄만큼 표가 밀린다.

   한동안 제목 아래에 지금 보고 있는 범위(회차·기간·상태)를 한 줄로 적어 두었다. 그 줄도
   걷어 냈다. 「2026 파일럿 3회차 · 2026-08-01 – 2026-08-31 · 응시 진행중」은 읽어서 나쁠 건
   없지만 **읽지 않아도 되는 줄**이었고, 정작 그 값이 필요한 자리(회차 표·편성 화면)에는
   같은 값이 이미 서 있었다. 같은 값을 두 곳에서 세면 언젠가 둘이 갈린다.

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
   admin2.css의 .a2-stats 주석에 적어 두었다.

   ── tabs ──
   조회 조건 탭(Tab)을 넘기면 머리 아래에 한 줄로 눕는다. 지표 띠와 성격이 다르다 —
   지표는 읽는 것이고 탭은 누르는 것이라, 한 화면에서 둘을 겹쳐 세우지 않는다.

   탭 줄에는 탭만 선다. 오른쪽 끝에 「지금 고른 탭 설명」 자리를 두었다가 걷어 냈다 —
   탭을 옮길 때마다 그 자리의 글이 바뀌어, 목록을 보러 온 눈이 자꾸 오른쪽으로 끌려갔다.

   ── 머리 높이를 고정한 까닭 ──
   화면마다 오른쪽 단추가 있기도 하고 없기도 하다. 회원에는 「학생·접속코드」와 「가입
   승인」이 서고, 감사 로그에는 아무것도 서지 않는다. 그 자리를 있을 때만 그리면 머리가
   화면마다 48px씩(단추 32 + 위 여백 16) 자랐다 줄었다 하고, 기둥에서 화면을 옮길 때마다
   표의 첫 줄이 위아래로 튄다. 같은 콘솔인데 목록이 시작하는 높이가 화면마다 다른 것이다.

   그래서 **범위 줄(meta)과 단추 줄(actions)은 비어 있어도 자리를 지킨다.** 위아래 여백을
   넉넉히 두는 것도 같은 이유다 — 여백이 예뻐서가 아니라, 그 여백이 자리를 잡아 두기
   때문이다. 단추가 생겼다고 표가 내려가지 않는다. */
const STAT_COLS = {
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
} as const;

export function PageHead({
  title,
  back,
  actions,
  stats,
  statCols = 4,
  tabs,
  tabsLabel = "조회 조건",
}: {
  title: string;
  /** 상세 화면이 왼쪽 끝에 세우는 되돌아가기. 단추 줄의 왼쪽 자리를 쓴다 */
  back?: React.ReactNode;
  actions?: React.ReactNode;
  /** 제목 아래에 눕힐 지표 칸(Kpi) 여럿 */
  stats?: React.ReactNode;
  statCols?: 3 | 4 | 5;
  /** 머리 아래 한 줄로 눕힐 조회 조건 탭(Tab) 여럿 */
  tabs?: React.ReactNode;
  /** 탭 줄을 읽어 줄 이름 */
  tabsLabel?: string;
}) {
  return (
    <>
      {/* 위아래를 넉넉히 둔다. 제목이 숨 쉬는 만큼 아래 탭 줄이 「제목에 딸린 것」이
          아니라 「고르는 것」으로 갈라져 읽히고, 무엇보다 그 여백이 아래 단추 줄의 자리를
          잡아 둔다. 단추 줄은 비어 있어도 접히지 않는다 — 위 주석 참조. */}
      <div className="border-b border-(--a2-line) px-4 pb-7 pt-9">
        <h1 className="a2-title-lg text-center">{title}</h1>

        {/* 단추 줄 — 단추 하나 높이(.a2-btn 32px)를 늘 비워 둔다.
            되돌아가기는 왼쪽 끝, 동작은 오른쪽 끝. 목록으로 나가는 길과 이 화면에서
            하는 일을 같은 줄에 세우되 반대편에 둔다 */}
        <div className="mt-5 flex min-h-8 flex-wrap items-center justify-end gap-1.5">
          {back && <span className="mr-auto">{back}</span>}
          {actions}
        </div>
      </div>
      {stats && (
        <div className={`a2-stats border-b border-(--a2-line) sm:grid-cols-2 ${STAT_COLS[statCols]}`}>
          {stats}
        </div>
      )}
      {tabs && (
        <div role="group" aria-label={tabsLabel} className="a2-tabs border-b border-(--a2-line)">
          {tabs}
        </div>
      )}
    </>
  );
}

/* ── 조회 조건 탭 한 칸 ──
   이름과 개수만 적는다. 설명을 한 줄 더 붙이면 탭 줄이 띠가 되고, 조건을 바꾸려고 훑는
   자리가 다시 읽는 자리가 된다.

   개수는 0도 적는다. 숨기면 「AI 초안」 탭이 있었는지 없었는지가 화면마다 달라진다. */
export function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number | string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="a2-tab">
      {label}
      {count != null && <span className="a2-tab-n">{count}</span>}
    </button>
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
  lead = false,
  className = "",
  children,
}: {
  title?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** 표를 그대로 담을 때 — 안쪽 여백을 두지 않는다 */
  flush?: boolean;
  /**
   * 이 판이 화면에서 「지금 고치고 있는 것」일 때 — 이름을 가운데 크게 세운다.
   *
   * 판마다 달면 열두 판이 열두 번 제 이름을 외친다. 열어 놓고 고치는 판 하나에만 준다.
   */
  lead?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  /* min-w-0 — 판이 grid·flex 칸 안에 서면 기본값(min-width:auto)이 「안에 든 것보다
     좁아지지 말 것」이라, 폭 박은 표를 담은 판이 좁은 화면에서 칸 밖으로 삐져나가
     잘린다. 0으로 풀어야 판이 칸에 맞고, 가로 스크롤은 표 상자(TableBox)가 맡는다.
     흐름 안에 그냥 선 판에는 아무 일도 일어나지 않는다 */
  return (
    <section className={`a2-panel min-w-0 ${className}`}>
      {(title || actions) &&
        (lead ? (
          <div className="a2-panel-head a2-panel-head-lead">
            {/* 왼쪽 빈 칸 — 오른쪽 동작과 폭을 나눠 가져 가운데를 가운데로 만든다 */}
            <span aria-hidden />
            <div className="grid min-w-0 justify-items-center gap-0.5 text-center">
              {title && <h2 className="a2-title truncate">{title}</h2>}
              {meta && <span className="a2-mono truncate a2-t-xs text-(--a2-ink-4)">{meta}</span>}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5">{actions}</div>
          </div>
        ) : (
          <div className="a2-panel-head">
            <div className="flex min-w-0 items-baseline gap-2">
              {title && <h2 className="a2-h truncate">{title}</h2>}
              {meta && <span className="truncate a2-t-xs text-(--a2-ink-4)">{meta}</span>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
          </div>
        ))}
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

/* ── 상태 — **글자 색**으로만 적는다 ──
   처음에는 점 + 글자를 옅은 면에 얹은 알약이었다. 한 줄에 하나면 읽을 만한데, 목록은 스무
   줄이라 알약 스물이 세로로 늘어서 표가 값이 아니라 알약으로 읽혔다. 점과 면과 테두리를
   걷고 글자에만 색을 남긴다(admin2.css의 .a2-status).

   색만으로 구분하지 않는다는 약속은 그대로다 — 상태는 늘 낱말로도 적혀 있어서 흑백으로
   인쇄해도 뜻이 남는다. 애초에 그 약속을 지키던 것은 점이 아니라 글자였다.

   ⚠ 점(.a2-dot)은 CSS에 남겨 둔다. 이해충돌 표시·열람 사유 표식처럼 **글자 없이 혼자 서서
     무언가를 가리키는** 자리가 일곱 군데 있고, 그것들은 알약이 아니다. */
export function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="a2-status" style={{ color: toneColor[tone] }}>
      {children}
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

   증감은 화살표와 부호를 함께 적는다. 색만 바뀌면 흑백 인쇄와 색약에서 사라진다.

   누르면 화면이 바뀌는 칸(href)은 있어도, 표를 좁히는 칸은 두지 않는다. 그 일은 탭 줄(Tab)이
   맡는다 — 같은 생김새로 「화면이 바뀐다」와 「표가 좁아진다」가 갈리면 한 번 눌러 본 사람이
   다음 칸에서 무엇이 일어날지 모른다. */
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

/* ── 가로 폼 한 줄 — 왼쪽에 이름, 오른쪽에 칸 ──
 *
 * 이름표를 칸 위에 얹던 것을 옆으로 돌린다. 위에 얹으면 한 줄이 두 줄을 먹어서, 열 칸이
 * 넘는 폼은 화면 두 장이 된다. 이름과 값이 같은 눈높이에 서면 훑을 때 눈이 왼쪽 한 줄만
 * 타고 내려가면 되고, 무엇을 안 채웠는지도 한눈에 보인다.
 *
 * 폭은 admin2.css의 .a2-form-row가 잡는다. 좁은 화면(640px 미만)에서는 CSS가 알아서
 * 위아래로 되돌린다 — 10.5rem을 떼고 나면 입력 칸에 남는 자리가 없다.
 *
 * ⚠ 반드시 .a2-form(또는 .a2-form-lg)으로 감싼 안에서 쓴다. 줄 사이 선을 그 클래스가
 *   맡고 있어서, 밖에 두면 줄 하나가 선 없이 떠 있게 된다.
 */
export function FormRow({
  label,
  /** 안 채우면 제출이 막히는 칸 — 별표를 붙인다 */
  req = false,
  /** 칸 아래 한 줄. 규칙·경고처럼 **읽어야 하는 것**만 적는다 */
  hint,
  children,
}: {
  label: React.ReactNode;
  req?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="a2-form-row">
      <div className={`a2-form-label${req ? " a2-form-req" : ""}`}>{label}</div>
      <div className="a2-form-field">
        {children}
        {hint && <span className="a2-hint">{hint}</span>}
      </div>
    </div>
  );
}

/* ── 켜고 끄는 스위치 ──
   누르는 **즉시** 저장소에 걸리는 두 값짜리에만 쓴다. 저장 단추를 거쳐야 나가는 칸은 체크
   (.a2-choice)로 둔다 — 공지의 노출처럼. 한 화면에 둘이 섞여 서도 「이건 누르면 바로 걸린다」가
   생김새로 갈린다.

   이름을 늘 받는다. 스위치 옆에 글자가 있어도 그 글자와 단추를 묶어 주는 것이 없으면
   화면 읽기 프로그램은 「전환 스위치, 켜짐」만 읽는다 — 무엇이 켜졌는지가 빠진다. */
export function Switch({
  on,
  label,
  disabled = false,
  onChange,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="a2-switch"
    />
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
