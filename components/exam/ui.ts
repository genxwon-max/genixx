/**
 * 응시 존 공통 스타일.
 * 홍보 페이지(둥글고 컬러풀한 톤)와 달리,
 * 눈이 편한 오프화이트 바탕 + 각진 면 + 얇은 구분선 + 대문자 라벨로 통일한다.
 */

export const panel = "rounded-md border border-exam-line bg-exam-panel";
export const panelRaised = "rounded-md border border-exam-line bg-exam-raised";

/** 섹션 위의 작은 대문자 라벨 */
export const eyebrow = "text-[11px] font-bold uppercase tracking-[0.16em] text-exam-muted";

export const title = "font-black tracking-tight text-exam-text";
export const body = "leading-relaxed text-exam-muted";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800";
export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-exam-line bg-exam-panel px-5 py-2.5 text-sm font-bold text-exam-text transition-colors hover:bg-exam-raised";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-300 bg-exam-panel px-5 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50";
export const btnDisabled =
  "inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-md border border-exam-line bg-exam-raised px-6 py-3 text-sm font-bold text-exam-muted";

export const input =
  "w-full rounded-md border border-exam-line bg-exam-panel px-4 py-3 text-[15px] text-exam-text outline-none transition-colors placeholder:text-exam-muted/60 focus:border-brand-500";

export const fieldLabel = "text-[13px] font-bold text-exam-text";

/** 표 형태 정보 셀 */
export const dataCell = "rounded-md border border-exam-line bg-exam-raised px-4 py-3";

/** 선택된 보기 / 활성 상태 */
export const selected = "border-brand-700 bg-brand-50";

/* ── 정부 포털식 표 ── */
export const govTable = "w-full border-collapse text-[13px]";
export const th =
  "border border-exam-line bg-exam-raised px-3 py-3 text-center font-bold text-exam-text whitespace-nowrap";
export const td = "border border-exam-line px-3 py-3.5 text-center text-exam-muted";
export const tdStrong = "border border-exam-line px-3 py-3.5 text-center font-bold text-exam-text";

/** 표 안의 작은 버튼 */
export const btnSm =
  "inline-flex items-center justify-center gap-1 rounded border border-brand-700 bg-brand-900 px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-800";
export const btnSmGhost =
  "inline-flex items-center justify-center gap-1 rounded border border-exam-line bg-exam-panel px-3.5 py-1.5 text-[12px] font-bold text-exam-text transition-colors hover:bg-exam-raised";
export const btnSmMuted =
  "inline-flex cursor-default items-center justify-center gap-1 rounded border border-exam-line bg-exam-raised px-3.5 py-1.5 text-[12px] font-bold text-exam-muted";
