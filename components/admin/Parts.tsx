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

/**
 * 메뉴의 하위 항목이 내려앉는 구역.
 *
 * id는 사이트맵 화면 ID를 그대로 쓴다(lib/admin.ts의 subHref 참조). 상단 바가 고정
 * 이라 그냥 두면 제목이 바 뒤로 숨으므로, 스크롤이 멈추는 자리를 바 아래로 내려 둔다.
 */
export function AnchorSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
        <h2 className={a.cardTitle}>{title}</h2>
        <span className="adm-t-xs font-bold text-exam-muted">{id}</span>
      </div>
      {lead && <p className={`${a.bodyText} mb-4`}>{lead}</p>}
      {children}
    </section>
  );
}

/**
 * 아직 만들지 않은 구역.
 *
 * 메뉴에서 눌러 여기 왔는데 아무것도 없으면 잘못 눌렀나 하게 된다. 무엇이 들어올
 * 자리인지, 지금은 왜 비어 있는지를 적어 둔다.
 */
export function PlannedSection({
  id,
  title,
  lead,
  todo,
}: {
  id: string;
  title: string;
  lead?: string;
  todo?: string[];
}) {
  return (
    <AnchorSection id={id} title={title} lead={lead}>
      <div className="border-l-4 border-exam-line pl-4">
        <p className="adm-t-md font-bold text-exam-text">아직 만들지 않은 자리입니다</p>
        <p className={`${a.bodyText} mt-1`}>
          화면 설계가 확정되면 이 구역이 채워집니다. 지금은 무엇을 담을지만 적어 둡니다.
        </p>
        {todo && todo.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {todo.map((t) => (
              <li key={t} className="adm-t-md text-exam-text">
                · {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AnchorSection>
  );
}

export type CountRow = {
  label: string;
  value: number | string;
  unit?: string;
  note?: string;
  href?: string;
};

/**
 * 건수 줄.
 *
 * 숫자를 카드로 세우지 않는다. 카드는 한 칸에 하나씩만 담기고, 색으로 급한 것과 안 급한
 * 것을 나누기 시작하면 화면이 알록달록해지는데 정작 눈은 숫자를 세로로 훑지 못한다.
 * 한 줄에 하나씩 눕히고 숫자를 오른쪽 끝에 모으면 위에서 아래로 한 번에 읽힌다.
 */
export function CountRows({ rows }: { rows: CountRow[] }) {
  return (
    <ul className="border-b border-exam-line">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="adm-t-md font-bold text-exam-text">{r.label}</span>
            {r.note && <span className="adm-t-sm text-exam-muted">{r.note}</span>}
            <span className="ml-auto adm-t-md font-bold tabular-nums text-exam-text">
              {typeof r.value === "number" ? r.value.toLocaleString("ko-KR") : r.value}
              {r.unit && <span className="ml-0.5 font-bold text-exam-muted">{r.unit}</span>}
            </span>
            {r.href && <span className="adm-t-sm font-bold text-brand-700">→</span>}
          </>
        );
        const shape = "flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-3";
        return (
          <li key={r.label} className="border-t border-exam-line">
            {r.href ? (
              <Link href={r.href} className={`${shape} transition-colors hover:bg-exam-raised`}>
                {inner}
              </Link>
            ) : (
              <div className={shape}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * 접었다 펴는 설명.
 *
 * 규칙·절차 설명은 처음 한 번 읽으면 되는 글이다. 매일 오는 사람에게 화면 위쪽을 계속
 * 내주지 않도록 접어 두고, 필요할 때만 펼치게 한다.
 */
export function Foldable({
  title,
  open,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-y border-exam-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 adm-t-md font-bold text-exam-text marker:content-none">
        <span className="adm-t-sm text-exam-muted group-open:hidden">펼치기 ▾</span>
        <span className="hidden adm-t-sm text-exam-muted group-open:inline">접기 ▴</span>
        {title}
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

/**
 * 짚고 넘어갈 것.
 *
 * 면을 깔지 않고 왼쪽 굵은 선으로 세운다. 노란 상자·붉은 상자를 늘어놓으면 정작 급한
 * 것이 묻힌다. 색은 선과 제목 글자에만 얹고 본문은 늘 같은 색으로 읽는다.
 */
export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "good";
  title?: string;
  children: React.ReactNode;
}) {
  const rule = { info: "border-brand-700", warn: "border-rose-500", good: "border-emerald-500" }[
    tone
  ];
  const head = { info: "text-brand-800", warn: "text-rose-700", good: "text-emerald-700" }[tone];
  return (
    <div className={`border-l-4 pl-4 ${rule}`}>
      {title && <p className={`adm-t-md font-bold ${head}`}>{title}</p>}
      <div className={`${title ? "mt-1.5 " : ""}adm-t-md leading-relaxed text-exam-text`}>
        {children}
      </div>
    </div>
  );
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
        {/* 이름은 이름표 칸, 숫자는 읽는 글 칸 — 숫자가 이 줄의 내용이다 */}
        <span className={a.label}>{label}</span>
        <span className={a.strongText}>
          <span className="tabular-nums">
            {value.toLocaleString("ko-KR")} / {total.toLocaleString("ko-KR")}
          </span>
          <span className="ml-2 adm-t-sm text-exam-muted">{pct}%</span>
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
    <div className="border-y border-exam-line py-7">
      <h2 className={a.cardTitle}>이 화면을 볼 권한이 없습니다</h2>
      <p className="mt-2.5 adm-t-md text-exam-text">
        지금 <b>{role}</b> 역할로 보고 있습니다. 이 화면은 <b>{need}</b> 권한이 있어야 열립니다.
      </p>
      <p className={`${a.bodyText} mt-1.5`}>
        권한이 필요하시면 총괄 관리자에게 요청하세요. 요청과 승인 내역은 감사 로그에 남습니다.
      </p>
      <Link href="/admin" className={`${a.btnGhost} mt-5`}>
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
