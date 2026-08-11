import Link from "next/link";

/**
 * 계정 존(ACC) 공통 조각.
 *
 * 디자인은 새로 만들지 않고, 국내 검사·진단 포털의 관례를 그대로 가져왔다.
 * 참고한 화면 —
 *  · 인싸이트(inpsyt.co.kr) 로그인: 400px 안팎의 좁은 중앙 상자, 44px 입력칸(라운드 8px),
 *    50px 남색 제출 버튼, 아이디/비밀번호 찾기를 가운데 구분점으로 나눈 작은 링크,
 *    맨 아래 "아직 회원이 아니신가요? 회원가입".
 *  · GED 영재교육종합DB(ged.kedi.re.kr) 회원가입: STEP 1~4 번호 원형 인디케이터,
 *    약관 전문을 담은 스크롤 상자(280px 안팎, 얇은 회색 테두리, 13px), 하단 중앙 버튼 쌍.
 *  · 인싸이트 회원가입: 유형을 먼저 고르게 하고 "회원 유형별 가입 절차 안내"를 점 목록으로 붙임.
 *
 * 이 관례를 따르는 이유는 학부모가 이미 다른 검사 사이트에서 같은 순서를 겪어 봤기 때문이다.
 */

/* ── 면 ── */
export const card = "rounded-xl border border-exam-line bg-white";
export const cardPad = "p-6 sm:p-8";

/** 로그인처럼 폭이 좁아야 하는 화면 (인싸이트 기준 400px) */
export const narrow = "mx-auto w-full max-w-[26rem]";

/* ── 버튼 ── */
export const btnPrimary =
  "inline-flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-lg bg-brand-900 px-6 text-[16px] font-bold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white";
export const btnGhost =
  "inline-flex min-h-[3.125rem] items-center justify-center gap-2 rounded-lg border border-exam-line bg-white px-6 text-[16px] font-bold text-exam-text transition-colors hover:bg-exam-raised";

/** 입력칸 — 44px, 라운드 8px, 16px (모바일 자동 확대 방지 겸용) */
export const field =
  "w-full min-h-[2.75rem] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[16px] text-exam-text outline-none transition-colors placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
export const fieldError = "border-rose-400 focus:border-rose-500 focus:ring-rose-100";
export const fieldLabel = "block text-[14px] font-bold text-exam-text";

/** 화면 머리말 — 화면 ID를 함께 적어 사이트맵과 대조할 수 있게 한다 */
export function AccHead({
  id,
  title,
  lead,
  back,
  center = false,
}: {
  id: string;
  title: string;
  lead?: string;
  back?: { href: string; label: string };
  center?: boolean;
}) {
  return (
    <header className={`mb-7 ${center ? "text-center" : ""}`}>
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-exam-muted hover:text-exam-text"
        >
          ← {back.label}
        </Link>
      )}
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-exam-muted">{id}</p>
      <h1 className="mt-2 text-[26px] font-black leading-tight tracking-tight text-exam-text sm:text-[30px]">
        {title}
      </h1>
      {lead && (
        <p className={`mt-3 text-[15px] leading-relaxed text-exam-muted ${center ? "" : ""}`}>
          {lead}
        </p>
      )}
    </header>
  );
}

/**
 * STEP 1~4 인디케이터.
 * GED가 쓰는 번호 원형 + 라벨 방식. 지금 단계는 색을 채우고, 지난 단계는 체크 표시로 바꾼다.
 */
const signupSteps = ["가입 유형 선택", "본인확인", "약관·동의", "가입 완료"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {signupSteps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="text-center">
            <span
              aria-hidden
              className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-black tabular-nums ${
                now
                  ? "bg-brand-900 text-white"
                  : done
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`mt-2 block text-[11px] font-bold ${
                now ? "text-brand-800" : done ? "text-brand-600" : "text-slate-400"
              }`}
            >
              STEP {i + 1}
            </span>
            <span
              className={`mt-0.5 block text-[13px] leading-tight ${
                now ? "font-bold text-exam-text" : "text-exam-muted"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * 약관 전문 스크롤 상자.
 * 요약만 두지 않고 조문을 그대로 넣는 것이 국내 포털의 관례이고,
 * 「동의했다」는 의사표시의 근거로도 이쪽이 안전하다.
 */
export function TermsBox({ body }: { body: { h: string; p: string }[] }) {
  return (
    <div className="h-[13rem] overflow-y-auto rounded-lg border border-slate-300 bg-slate-50/70 p-4 text-[13px] leading-[1.8] text-exam-muted">
      {body.map((b) => (
        <div key={b.h} className="mb-3 last:mb-0">
          <p className="font-bold text-exam-text">{b.h}</p>
          <p className="mt-0.5">{b.p}</p>
        </div>
      ))}
    </div>
  );
}

/** 하단 중앙 버튼 쌍 (이전 / 다음) — GED·커리어넷 공통 */
export function StepButtons({
  back,
  children,
}: {
  back?: { href: string; label?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-center">
      {back && (
        <Link href={back.href} className={`${btnGhost} sm:min-w-[9rem]`}>
          {back.label ?? "이전"}
        </Link>
      )}
      <div className="sm:min-w-[13rem]">{children}</div>
    </div>
  );
}

/** 법적 근거를 밝히는 안내 상자 */
export function LegalNote({
  title,
  basis,
  children,
}: {
  title: string;
  basis?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-5">
      <p className="text-[14px] font-black text-brand-900">
        {title}
        {basis && <span className="ml-2 font-bold text-brand-700">({basis})</span>}
      </p>
      <div className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-brand-900/90">
        {children}
      </div>
    </div>
  );
}

/** 점 목록 안내 — GED가 폼 아래에 붙이는 "• …" 주의사항 */
export function Notes({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-exam-muted">
          <span aria-hidden className="text-slate-400">
            •
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
