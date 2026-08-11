/**
 * 로그인·회원가입 화면의 두 가지 시안.
 *
 *  v1 「전문가」 — 공공·영재교육 포털 관행. 각진 모서리(4px), 짙은 남색 파랑,
 *                 얇은 회색 선. claude.ai/design 원본(3a~3d)을 따른다.
 *  v2 「둥글둥글」 — clipo.ai 계열. 알약 버튼, 넉넉한 라운드(12~16px), 밝은 파랑,
 *                 선을 옅게 쓰고 여백으로 구분한다.
 *
 * 화면 로직은 하나만 두고 껍데기만 갈아끼운다. 두 시안을 비교한 뒤 하나를 고르면
 * 이 파일과 변형 라우트(/login1·/login2 등)를 지우고 정본으로 승격하면 된다.
 */

export type Variant = 1 | 2;

export type AuthTheme = {
  id: Variant;
  label: string;
  /** 다른 시안으로 건너뛰는 경로 접미사 */
  other: Variant;
  loginHref: string;
  signupHref: string;

  page: string;
  column: string;
  heading: string;
  lead: string;
  crumb: string;

  /** 탭 */
  tabBar: string;
  tabOn: string;
  tabOff: string;

  /** 면 */
  card: string;
  cardSoft: string;

  /** 버튼 */
  btnPrimary: string;
  btnNeutral: string;
  /** 소셜 버튼 공통(색은 제공자별로 따로 붙인다) */
  btnSocial: string;
  /** 본문 안에 끼워 넣는 작은 버튼 — 폭이 글자에 맞춰 줄어든다 */
  btnQuiet: string;
  /** 제목 옆에 세우는 주 액션 버튼. btnPrimary와 달리 폭을 채우지 않는다 */
  btnAction: string;
  /** btnAction과 나란히 놓는 보조 액션. 같은 무게로 읽히되 채우지 않는다 */
  btnOutline: string;

  /** 선택 카드 */
  pick: string;
  pickOn: string;
  pickOff: string;
  /** 라디오 점 */
  dotOn: string;
  dotOff: string;

  field: string;
  fieldLabel: string;
  required: string;
  muted: string;
  divider: string;
};

const v1: AuthTheme = {
  id: 1,
  label: "전문가",
  other: 2,
  loginHref: "/login1",
  signupHref: "/signup1",

  page: "bg-acc-bg text-acc-ink",
  column: "mx-auto w-full max-w-[27.5rem]",
  heading: "text-[26px] font-bold text-acc-ink",
  lead: "text-[14px] leading-[1.7] text-acc-muted",
  crumb: "text-[12px] text-acc-faint",

  tabBar: "flex border-b border-acc-line",
  tabOn: "border-b-[3px] border-acc-primary font-bold text-acc-primary",
  tabOff: "border-b-[3px] border-transparent text-acc-muted hover:text-acc-ink",

  card: "border border-acc-line bg-white",
  cardSoft: "border border-acc-line bg-acc-panel",

  btnPrimary:
    "flex h-[3.375rem] w-full items-center justify-center rounded bg-acc-primary text-[16px] font-bold text-white transition-colors hover:bg-acc-primary-dark disabled:cursor-not-allowed disabled:bg-acc-field",
  btnNeutral:
    "flex h-[3.375rem] w-full items-center justify-center rounded border border-acc-field bg-white text-[16px] font-semibold text-acc-body transition-colors hover:bg-acc-panel",
  btnSocial:
    "flex h-[3.375rem] w-full items-center justify-center gap-2.5 rounded text-[16px] font-bold transition hover:brightness-95",
  btnQuiet:
    "inline-flex h-[3rem] shrink-0 items-center justify-center rounded border border-acc-field bg-white px-5 text-[15px] font-semibold text-acc-body transition-colors hover:bg-acc-panel",
  btnAction:
    "inline-flex h-[3rem] shrink-0 items-center justify-center gap-1.5 rounded bg-acc-primary px-5 text-[15px] font-bold text-white transition-colors hover:bg-acc-primary-dark",
  btnOutline:
    "inline-flex h-[3rem] shrink-0 items-center justify-center gap-1.5 rounded border border-acc-primary bg-white px-5 text-[15px] font-bold text-acc-primary transition-colors hover:bg-acc-primary-soft",

  pick: "flex w-full flex-col gap-2 p-4 text-left transition-colors",
  pickOn: "border-2 border-acc-primary bg-acc-primary-soft",
  pickOff: "border border-acc-line bg-white hover:border-acc-primary",
  dotOn: "border-[5px] border-acc-primary bg-white",
  dotOff: "border border-acc-field bg-white",

  field:
    "h-[3.25rem] w-full rounded border border-acc-field bg-white px-3.5 text-[15px] text-acc-ink outline-none transition-colors placeholder:text-acc-placeholder focus:border-acc-primary focus:ring-2 focus:ring-acc-primary-line",
  fieldLabel: "text-[14px] font-semibold text-acc-ink",
  required: "text-acc-required",
  muted: "text-acc-muted",
  divider: "bg-acc-divider",
};

const v2: AuthTheme = {
  id: 2,
  label: "둥글둥글",
  other: 1,
  loginHref: "/login2",
  signupHref: "/signup2",

  page: "bg-[#eef3fe] text-soft-ink",
  column: "mx-auto w-full max-w-[28.5rem]",
  heading: "text-[26px] font-bold tracking-tight text-soft-ink",
  lead: "text-[15px] leading-[1.7] text-soft-muted",
  crumb: "text-[13px] text-soft-muted",

  tabBar: "flex border-b border-soft-line",
  tabOn: "border-b-[3px] border-soft-primary font-bold text-soft-primary",
  tabOff: "border-b-[3px] border-transparent text-soft-muted hover:text-soft-ink",

  card: "rounded-[14px] border border-soft-line bg-white",
  cardSoft: "rounded-[14px] border border-soft-line bg-soft-primary-soft",

  btnPrimary:
    "flex h-[3.25rem] w-full items-center justify-center rounded-full bg-soft-primary text-[16px] font-semibold text-white transition-colors hover:bg-soft-primary-dark disabled:cursor-not-allowed disabled:bg-soft-line disabled:text-white",
  btnNeutral:
    "flex h-[3.25rem] w-full items-center justify-center rounded-full border border-soft-line bg-white text-[16px] font-medium text-soft-ink transition-colors hover:bg-slate-50",
  btnSocial:
    "flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-semibold transition hover:brightness-95",
  btnQuiet:
    "inline-flex h-[3rem] shrink-0 items-center justify-center rounded-full border border-soft-line bg-white px-5 text-[15px] font-medium text-soft-ink transition-colors hover:bg-slate-50",
  btnAction:
    "inline-flex h-[3rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-soft-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-soft-primary-dark",
  btnOutline:
    "inline-flex h-[3rem] shrink-0 items-center justify-center gap-1.5 rounded-full border border-soft-primary bg-white px-6 text-[15px] font-semibold text-soft-primary transition-colors hover:bg-soft-primary-soft",

  pick: "flex w-full flex-col gap-2 rounded-[14px] p-5 text-left transition-all",
  pickOn: "border-2 border-soft-primary bg-soft-primary-soft shadow-[0_2px_10px_rgba(54,94,239,0.14)]",
  pickOff: "border border-soft-line bg-white hover:border-soft-primary hover:shadow-[0_2px_10px_rgba(0,0,0,0.05)]",
  dotOn: "border-[6px] border-soft-primary bg-white",
  dotOff: "border border-soft-line bg-white",

  field:
    "h-[3.25rem] w-full rounded-[12px] border border-soft-line bg-white px-4 text-[15px] text-soft-ink outline-none transition-colors placeholder:text-slate-400 focus:border-soft-primary focus:ring-2 focus:ring-soft-primary-soft",
  fieldLabel: "text-[14px] font-semibold text-soft-ink",
  required: "text-[#e5484d]",
  muted: "text-soft-muted",
  divider: "bg-soft-line",
};

export const themes: Record<Variant, AuthTheme> = { 1: v1, 2: v2 };

export function themeOf(v: Variant) {
  return themes[v];
}
