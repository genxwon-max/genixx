import Link from "next/link";

/**
 * 계정 존(ACC) 공통 조각.
 *
 * 디자인 원본: claude.ai/design 프로젝트 "회원가입 및 로그인 디자인"
 *   — `GeniXX 회원가입·로그인 v2.dc.html` (섹션 3a~3e, 4a~4b)
 *
 * 원본이 세운 규칙 여섯 가지를 그대로 따른다.
 *  ① 입력 필드마다 상단 라벨 + 필수 표시(*)
 *  ② 약관은 요약이 아니라 전문 스크롤 박스, 항목별 개별 동의
 *  ③ 진행 단계를 상단에 상시 표시
 *  ④ [이전]/[다음] 버튼 위치 고정 (하단 중앙)
 *  ⑤ 글자 크기·고대비 접근성 도구를 헤더에 상시 배치
 *  ⑥ 학생 응시 접속을 별도 탭으로 완전히 분리
 *
 * 컨트롤 모서리는 4px, 바깥 껍데기만 8px. 공공 포털의 각진 톤이다.
 */

/* ── 면 ── */
export const panel = "border border-acc-line bg-white";
export const soft = "border border-acc-line bg-acc-panel";
/** 위쪽에 굵은 선을 얹어 강조하는 상자 (원본이 안내 박스에 반복해서 쓴다) */
export const topRule = "border border-acc-line border-t-[3px] border-t-acc-primary bg-acc-panel";

/* ── 버튼 ── */
export const btnPrimary =
  "inline-flex min-h-[3.5rem] items-center justify-center gap-2 rounded px-8 text-[17px] font-bold text-white transition-colors bg-acc-primary hover:bg-acc-primary-dark disabled:cursor-not-allowed disabled:bg-acc-field disabled:text-white";
export const btnOutline =
  "inline-flex min-h-[3.375rem] items-center justify-center gap-2 rounded border border-acc-field bg-white px-10 text-[16px] text-acc-body transition-colors hover:bg-acc-panel";
/** 본문 안에서 쓰는 작은 외곽선 버튼 */
export const btnSm =
  "inline-flex min-h-[3rem] items-center justify-center gap-2 rounded border border-acc-field bg-white px-5 text-[15px] font-semibold text-acc-body transition-colors hover:bg-acc-panel";

/* ── 입력 ── */
export const field =
  "h-[3.25rem] w-full rounded border border-acc-field bg-white px-3.5 text-[15px] text-acc-ink outline-none transition-colors placeholder:text-acc-placeholder focus:border-acc-primary focus:ring-2 focus:ring-acc-primary-line";
export const fieldError = "border-acc-required focus:border-acc-required focus:ring-red-100";
export const labelText = "text-[14px] font-semibold text-acc-ink";

/** 필수 표시 별표 */
export function Req() {
  return (
    <span className="text-acc-required" aria-hidden>
      *
    </span>
  );
}

/** 라벨 + 필수표시 + 입력을 한 덩어리로 */
export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={id} className={labelText}>
        {label} {required && <Req />}
        {required && <span className="sr-only">필수</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[13px] text-acc-muted">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-[7px] text-[13px] text-acc-required">
          <span
            aria-hidden
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-acc-required text-[11px] font-bold text-white"
          >
            !
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── 진행 단계 (원본 3b~3d의 가로 4칸 바) ── */
export const signupStepLabels = [
  "회원 유형 선택",
  "약관 동의",
  "본인확인·법정대리인 동의",
  "가입 완료",
];

export function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex flex-col border border-acc-line bg-acc-panel sm:flex-row">
      {signupStepLabels.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={label}
            aria-current={now ? "step" : undefined}
            className={`flex flex-1 items-center gap-2.5 border-acc-line px-5 py-4 first:border-l-0 first:border-t-0 sm:border-l ${
              i > 0 ? "border-t sm:border-t-0" : ""
            } ${now ? "bg-acc-primary text-white" : done ? "text-acc-primary" : "text-acc-dim"}`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                now
                  ? "bg-white text-acc-primary"
                  : done
                    ? "bg-acc-primary-line text-acc-primary"
                    : "border border-acc-field"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-[14px] ${now ? "font-bold" : done ? "font-semibold" : ""}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** 화면 제목 줄 — 왼쪽 제목, 오른쪽 필수항목 안내 */
export function SectionTitle({
  title,
  note,
  id,
}: {
  title: string;
  note?: React.ReactNode;
  /** 사이트맵 화면 ID */
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[22px] font-bold text-acc-ink">
        {title}
        {id && <span className="ml-2.5 text-[13px] font-normal text-acc-dim">{id}</span>}
      </h2>
      {note && <p className="text-[13px] text-acc-muted">{note}</p>}
    </div>
  );
}

/** 하단 중앙 고정 버튼 쌍 */
export function StepFooter({
  back,
  children,
}: {
  back?: { href: string; label?: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse justify-center gap-3 border-t border-acc-divider pt-6 sm:flex-row">
      {back && (
        <Link href={back.href} className={btnOutline}>
          {back.label ?? "이전"}
        </Link>
      )}
      {children}
    </div>
  );
}

/**
 * 수집·이용 동의 정의표 (원본 3c·3d).
 * 왼쪽 라벨 칸 / 오른쪽 값 칸. 모바일에서는 위아래로 쌓는다.
 */
export function DefTable({ rows }: { rows: { k: string; v: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 text-[13.5px] sm:grid-cols-[150px_1fr]">
      {rows.map((r) => (
        <div key={r.k} className="contents">
          <dt className="border-b border-acc-hairline bg-acc-panel px-4.5 py-3.5 font-semibold text-acc-body">
            {r.k}
          </dt>
          <dd className="border-b border-acc-hairline px-4.5 py-3.5 leading-[1.7] text-acc-ink sm:border-l">
            {r.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 약관 전문 스크롤 상자 */
export function TermsScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[7.5rem] overflow-y-auto bg-white px-4.5 py-4 text-[13px] leading-[1.85] text-acc-body">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   /my 계정 관리 화면이 쓰는 조각.
   가입·로그인만 원본 디자인으로 갈아끼웠으므로, 나머지 화면은 구조를 그대로 두고
   새 팔레트만 받아 가도록 이름을 유지한다. (원본에 해당 화면 시안이 아직 없음)
   ───────────────────────────────────────────────────────────── */
export const card = "border border-acc-line bg-white";
export const cardPad = "p-6 sm:p-8";
export const btnGhost = btnSm;

export function AccHead({
  id,
  title,
  lead,
  back,
}: {
  id: string;
  title: string;
  lead?: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-7">
      {back && (
        <Link
          href={back.href}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-acc-muted hover:text-acc-ink"
        >
          ← {back.label}
        </Link>
      )}
      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-acc-dim">{id}</p>
      <h1 className="mt-2 text-[26px] font-bold leading-tight text-acc-ink sm:text-[30px]">
        {title}
      </h1>
      {lead && <p className="mt-3 text-[15px] leading-relaxed text-acc-muted">{lead}</p>}
    </header>
  );
}

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
    <div className="border border-acc-line border-t-[3px] border-t-acc-primary bg-acc-primary-soft p-5">
      <p className="text-[15px] font-bold text-acc-primary-dark">
        {title}
        {basis && <span className="ml-2 font-semibold text-acc-primary">({basis})</span>}
      </p>
      <div className="mt-2 space-y-1.5 text-[14px] leading-[1.8] text-acc-body">{children}</div>
    </div>
  );
}

/** 안내 상자 — 위쪽 굵은 선 + 제목 + 본문 */
export function NoteBox({
  title,
  children,
  tone = "primary",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "primary" | "ink";
}) {
  return (
    <section
      className={`border border-acc-line bg-acc-panel p-5 ${
        tone === "primary" ? "border-t-[3px] border-t-acc-primary" : "border-t-[3px] border-t-acc-ink"
      }`}
    >
      <h3 className="text-[15px] font-bold text-acc-ink">{title}</h3>
      <div className="mt-2.5 space-y-2.5 text-[13.5px] leading-[1.8] text-acc-muted">{children}</div>
    </section>
  );
}
