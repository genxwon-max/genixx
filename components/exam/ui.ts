/**
 * 응시·명부 화면 공통 스타일.
 *
 * 응시 현황·결과·학생 명부가 회원 대시보드 안으로 들어오면서, 짙은 남색(brand-900)
 * 계열이던 이 팔레트만 홀로 튀었다. 한 껍데기 안에 파랑이 두 개 있으면 같은 제품으로
 * 읽히지 않는다. 회원 존이 쓰는 soft-* 로 맞춘다.
 *
 * 실제 응시 화면(/exam/session)도 이 파일을 쓴다. 껍데기(전체화면·타이머)는 그대로
 * 다르되 색과 모서리는 같아야 한 제품이다.
 */

export const panel = "rounded-[14px] border border-soft-line bg-white";
export const panelRaised = "rounded-[14px] border border-soft-line bg-slate-50";

/** 섹션 위의 작은 대문자 라벨 */
export const eyebrow = "text-[12px] font-semibold tracking-[0.08em] text-soft-muted";

export const title = "font-bold tracking-tight text-soft-ink";
export const body = "leading-relaxed text-soft-muted";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-soft-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-soft-primary-dark";
export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-soft-line bg-white px-5 py-2.5 text-sm font-medium text-soft-ink transition-colors hover:bg-slate-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white px-5 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50";
export const btnDisabled =
  "inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-soft-line bg-slate-50 px-6 py-3 text-sm font-medium text-slate-400";

export const input =
  "w-full rounded-[12px] border border-soft-line bg-white px-4 py-3 text-[15px] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft";

export const fieldLabel = "text-[13px] font-semibold text-soft-ink";

/** 표 형태 정보 셀 */
export const dataCell = "rounded-[12px] border border-soft-line bg-slate-50 px-4 py-3";

/** 선택된 보기 / 활성 상태 */
export const selected = "border-soft-primary bg-soft-primary-soft";

/* ── 정부 포털식 표 ── */
export const govTable = "w-full border-collapse text-[13px]";
export const th =
  "border-b border-soft-line bg-slate-50 px-3 py-3 text-center font-semibold text-soft-muted whitespace-nowrap";
export const td = "border-b border-slate-100 px-3 py-3.5 text-center text-soft-muted";
export const tdStrong = "border-b border-slate-100 px-3 py-3.5 text-center font-semibold text-soft-ink";

/** 표 안의 작은 버튼 */
export const btnSm =
  "inline-flex items-center justify-center gap-1 rounded-full bg-soft-primary px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-soft-primary-dark";
export const btnSmGhost =
  "inline-flex items-center justify-center gap-1 rounded-full border border-soft-line bg-white px-3.5 py-1.5 text-[12px] font-medium text-soft-ink transition-colors hover:bg-slate-50";
export const btnSmMuted =
  "inline-flex cursor-default items-center justify-center gap-1 rounded-full border border-soft-line bg-slate-50 px-3.5 py-1.5 text-[12px] font-medium text-slate-400";
