import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { DiagReport, Scored } from "@/lib/diagReport";

/* ───────────────────────── 글 ───────────────────────── */

/**
 * 보고서 글의 표시를 풀어 그린다 — **굵게** · [[강조색]] · {아이} · {이름}.
 * 줄바꿈(\n)은 그대로 줄을 바꾼다(아이가 읽는 곳은 한 문장씩 끊어 쓴다).
 */
export function Rich({ text, r }: { text: string; r: DiagReport }) {
  const filled = text.replaceAll("{아이}", r.student.call).replaceAll("{이름}", r.student.name);
  return (
    <>
      {filled.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/).map((part, j) => {
            if (part.startsWith("**"))
              return (
                <b key={j} className="font-bold text-(--rp-ink)">
                  {part.slice(2, -2)}
                </b>
              );
            if (part.startsWith("[["))
              return (
                <span key={j} className="text-(--rp-accent)">
                  {part.slice(2, -2)}
                </span>
              );
            return <Fragment key={j}>{part}</Fragment>;
          })}
        </Fragment>
      ))}
    </>
  );
}

/* ───────────────────────── 지면 ───────────────────────── */

export function Page({
  r,
  head,
  no,
  total,
  foot,
  kid,
  children,
}: {
  r: DiagReport;
  head: ReactNode;
  no: number;
  total: number;
  foot: string;
  kid?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`rp-page${kid ? " rp-kidpage" : ""}`} aria-label={`${no}면`}>
      <div className="flex items-baseline justify-between border-b border-(--rp-rule) pb-2 text-[11px]">
        <span className="rp-label">{head}</span>
        <span className="text-(--rp-muted)">
          {r.student.name} · {r.student.grade} · {r.date}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <div className="mt-auto flex items-end justify-between pt-3 text-[10px] text-(--rp-muted)">
        <span>{foot}</span>
        <span className="rp-serif text-[11px]">
          <b className="text-[17px] font-bold text-(--rp-ink)">{no}</b> / {total}
        </span>
      </div>
    </section>
  );
}

/** 굵은 줄 밑의 면 제목 — 「02 이 결과는 …」 */
export function BigTitle({
  r,
  no,
  title,
  sub,
  className = "",
}: {
  r: DiagReport;
  no?: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`mt-3 border-t-[2.5px] border-(--rp-rule) pt-2.5 ${className}`}>
      <div className="flex items-baseline gap-3">
        {no && <span className="rp-serif text-[30px] leading-none text-(--rp-muted)">{no}</span>}
        <h2 className="rp-serif text-[25px] leading-tight text-(--rp-ink)">
          <Rich text={title} r={r} />
        </h2>
      </div>
      {sub && (
        <p className={`mt-1.5 text-[12px] text-(--rp-muted) ${no ? "pl-[46px]" : ""}`}>{sub}</p>
      )}
    </div>
  );
}

/** 칸 이름 — 짙은 줄 위의 작은 굵은 글씨. 오른쪽에 단위나 범례를 둔다 */
export function Label({
  children,
  right,
  className = "",
  color,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between border-b pb-1.5 ${className}`}
      style={{ borderColor: color ?? "var(--rp-rule)" }}
    >
      <span className="rp-label" style={color ? { color } : undefined}>
        {children}
      </span>
      {right && <span className="text-[11px] text-(--rp-muted)">{right}</span>}
    </div>
  );
}

/** 학부모께 · {아이}가 읽는 곳 — 거의 모든 면의 아랫단 */
export function ParentKid({
  r,
  parent,
  kid,
  className = "",
}: {
  r: DiagReport;
  parent: string;
  kid: string;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-7 ${className}`}>
      <div>
        <Label>학부모께</Label>
        <p className="mt-2 text-[12.5px] leading-[1.75]">
          <Rich text={parent} r={r} />
        </p>
      </div>
      <div className="bg-(--rp-kid) px-4 py-3">
        <Label color="var(--rp-gold)">
          <span className="text-(--rp-gold)">{r.student.call}가 읽는 곳</span>
        </Label>
        <p className="mt-2 text-[14px] font-medium leading-[1.8] text-(--rp-kid-ink)">
          <Rich text={kid} r={r} />
        </p>
      </div>
    </div>
  );
}

/** 줄 두 칸 사이의 세로 구분 — 칸 사이를 얇은 줄로 나눈다 */
export const colRule = "border-l border-(--rp-line) pl-6";

/* ───────────────────────── 그림 ───────────────────────── */

/** 가로 막대 — 채운 선 + 점, 가운데 검은 눈금이 또래 평균(50) */
export function PeerBar({
  value,
  color = "var(--rp-accent)",
  peer = 50,
  thick = false,
}: {
  value: number;
  color?: string;
  peer?: number;
  thick?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-3 w-full">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-(--rp-line)" />
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${thick ? "h-[3px]" : "h-[2px]"}`}
        style={{ width: `${v}%`, background: color }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-(--rp-ink)"
        style={{ left: `${peer}%` }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${v}%`, background: color }}
      />
    </div>
  );
}

/** 이름 · 막대 · 숫자 한 줄 */
export function BarRow({
  label,
  value,
  shown,
  color,
  labelWidth = 130,
  big,
}: {
  label: ReactNode;
  value: number;
  shown?: ReactNode;
  color?: string;
  labelWidth?: number;
  big?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-4 border-b border-(--rp-line) py-[5px]"
      style={{ gridTemplateColumns: `${labelWidth}px 1fr 44px` }}
    >
      <span className="text-[12.5px] text-(--rp-ink)">{label}</span>
      <PeerBar value={value} color={color} />
      <span
        className={`rp-serif text-right text-(--rp-ink) ${big ? "text-[17px]" : "text-[15px]"}`}
      >
        {shown ?? value}
      </span>
    </div>
  );
}

/**
 * SVG 속성에는 CSS 변수를 쓰지 않고 색을 박는다 — PDF 저장(lib/reportPdf)이 지면을 그림으로
 * 뜰 때 속성 속 var()는 풀리지 않아 선과 면이 통째로 사라진다. 값은 report.css의 .rp와 같다.
 */
export const SVG = {
  line: "#dcd9cf",
  accent: "#a23b2a",
  ink: "#1d1d1a",
  body: "#3b3a36",
  gold: "#a8842f",
};

/** 육각 모양 그래프 */
export function Radar({
  items,
  size = 250,
  small,
  color = SVG.accent,
}: {
  items: Scored[];
  size?: number;
  small?: boolean;
  color?: string;
}) {
  const n = items.length;
  const pad = small ? 22 : 52;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - pad;
  const at = (i: number, k: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k] as const;
  };
  const ring = (k: number) => items.map((_, i) => at(i, k).join(",")).join(" ");
  const shape = items.map((it, i) => at(i, it.score / 100).join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="block overflow-visible"
    >
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={ring(k)} fill="none" stroke={SVG.line} strokeWidth={1} />
      ))}
      {items.map((_, i) => {
        const [x, y] = at(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={SVG.line} strokeWidth={0.8} />;
      })}
      <polygon
        points={shape}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={small ? 1.2 : 1.6}
      />
      {items.map((it, i) => {
        const [x, y] = at(i, it.score / 100);
        return <circle key={i} cx={x} cy={y} r={small ? 1.8 : 2.8} fill={color} />;
      })}
      {items.map((it, i) => {
        const [x, y] = at(i, 1);
        const dx = x - cx;
        const anchor = Math.abs(dx) < 4 ? "middle" : dx > 0 ? "start" : "end";
        const off = small ? 7 : 10;
        const lx = x + (Math.abs(dx) < 4 ? 0 : dx > 0 ? off : -off);
        const ly = y + (y < cy - 4 ? -off - (small ? 8 : 14) : y > cy + 4 ? off + 2 : -6);
        return (
          <text key={it.label} x={lx} y={ly} textAnchor={anchor} fill={SVG.ink}>
            <tspan x={lx} dy="0" fontSize={small ? 7 : 9.5} fill={SVG.body}>
              {it.label}
            </tspan>
            <tspan x={lx} dy={small ? 9 : 14} fontSize={small ? 8.5 : 13} className="rp-serif">
              {it.score}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

/** 세로 막대 — 위에 숫자, 아래에 이름 */
export function VBars({
  items,
  color,
  max = 100,
  height = 64,
}: {
  items: Scored[];
  color: string;
  max?: number;
  height?: number;
}) {
  return (
    <div
      className="grid border-b border-(--rp-line)"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center">
          <span className="rp-serif text-[15px] text-(--rp-ink)">{it.score}</span>
          <div className="mt-2 flex items-end" style={{ height }}>
            <div
              className="w-[4px]"
              style={{ height: `${(it.score / max) * height}px`, background: color }}
            />
          </div>
        </div>
      ))}
      {items.map((it) => (
        <span
          key={`${it.label}-l`}
          className="mt-1.5 pb-1 text-center text-[10.5px] text-(--rp-muted)"
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** 표 칸의 초록 짙기 — 높을수록 진하다 */
export function heat(v: number): CSSProperties {
  const t = Math.max(0, Math.min(1, (v - 70) / 28));
  const light = [220, 228, 222];
  const dark = [58, 106, 79];
  const mix = light.map((l, i) => Math.round(l + (dark[i] - l) * t));
  return { background: `rgb(${mix.join(",")})`, color: t > 0.62 ? "#fff" : "var(--rp-ink)" };
}

/** 과목 색 */
export const subjectColor: Record<string, string> = {
  korean: "var(--rp-ko)",
  math: "var(--rp-ma)",
  science: "var(--rp-sc)",
};

export const koNum = ["하나", "둘", "셋", "넷", "다섯"];
