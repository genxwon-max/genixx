import type { ReactNode } from "react";

/**
 * /design4 로그인 화면들이 함께 쓰는 판 — 왼쪽에 안내, 오른쪽에 입력.
 * 학생 응시 로그인(/design4/login/student)이 왼쪽 안내 판까지 쓴다. 회원 로그인(/design4/login)은
 * 안내 판을 걷고(2026-11-12 요청) 입력 판 하나만 가운데 세운다 — steps를 넘기지 않으면 그렇게 된다.
 *
 * 왼쪽 안내 판은 옅은 파랑 한 색이다. 처음에는 남색 그라데이션이었는데 「어두워 보인다」는 말에
 * 바꿨다(2026-11-12). 그림 · 아이콘으로 꾸미지 않는다(「AI 아이콘 같은 것 사용 금지」).
 *
 * 좁은 화면에서는 입력 판을 먼저 세운다 — 휴대폰으로 들어온 사람이 설명을 내려 읽지 않고 바로 적게.
 */
export default function AuthCard({
  tag,
  title,
  lead,
  steps,
  note,
  children,
}: {
  tag?: string;
  title?: ReactNode;
  lead?: ReactNode;
  /** 없으면 왼쪽 안내 판 없이 입력 판 하나만 가운데 세운다(회원 로그인) */
  steps?: { t: string; d: ReactNode }[];
  note?: ReactNode;
  /** 오른쪽 입력 판 */
  children: ReactNode;
}) {
  if (!steps) {
    return (
      <div className="d4-container py-10 md:py-16">
        <div className="mx-auto max-w-[480px] rounded-[28px] bg-white px-6 py-9 shadow-[0_24px_48px_-28px_rgba(15,31,75,0.3)] ring-1 ring-slate-100 sm:px-10 md:py-12">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="d4-container py-10 md:py-16">
      <div className="mx-auto grid max-w-[960px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_48px_-28px_rgba(15,31,75,0.3)] ring-1 ring-slate-100 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* 왼쪽 — 안내 */}
        <div className="bg-[var(--d4-blue-soft)] px-7 py-9 sm:px-10 md:py-12">
          <p className="inline-block rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[var(--d4-blue)] ring-1 ring-[var(--d4-blue)]/25">
            {tag}
          </p>
          <h1 className="mt-4 text-[26px] font-bold leading-snug tracking-[-0.03em] text-slate-900 md:text-[28px]">
            {title}
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">{lead}</p>

          <ol className="mt-8 space-y-5">
            {steps.map((s, k) => (
              <li key={s.t} className="flex gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--d4-blue)] text-[13px] font-bold tabular-nums text-white">
                  {k + 1}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-slate-900">{s.t}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-600">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          {note && (
            <div className="mt-9 border-t border-[var(--d4-blue)]/15 pt-5 text-[13px] leading-relaxed text-slate-600">
              {note}
            </div>
          )}
        </div>

        {/* 오른쪽 — 입력 */}
        <div className="order-first px-6 py-9 sm:px-10 md:order-none md:py-12">{children}</div>
      </div>
    </div>
  );
}

/** 오른쪽 판에서 함께 쓰는 입력 칸 · 단추 모양 */
export const d4Field =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--d4-blue)] focus:bg-white aria-[invalid=true]:border-rose-400 sm:h-13";
export const d4Primary =
  "flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--d4-blue)] text-[16px] font-bold text-white transition-colors hover:bg-[#1c45c4] disabled:bg-slate-200 disabled:text-slate-500 sm:h-14";
export const d4Secondary =
  "flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50";
