/**
 * 관리자 존(ADM) 공통 스타일.
 *
 * 이 콘솔의 주 사용자는 50~60대 운영자·평가위원이다. 그래서 흔한 관리자 화면과
 * 반대로 가는 규칙을 몇 개 세워 두었다.
 *
 *  - 버튼: 최소 높이 44px, 아이콘만 있는 버튼 금지 — 반드시 글자 라벨을 붙인다.
 *  - 동작: hover에서만 나타나는 버튼을 만들지 않는다. 늘 보이게 둔다.
 *  - 색: 회색 글자는 --color-exam-muted(#5e6a88)까지만. 그보다 옅게 쓰지 않는다.
 *  - 상태: 색만으로 구분하지 않고 항상 글자 라벨을 함께 붙인다.
 *
 * ── 글자 규칙 ──
 *
 * 눈금은 app/globals.css의 adm-t-xl/lg/md/sm/xs 다섯이고 20 / 17 / 15 / 13 / 12다.
 * **화면에서는 크기를 직접 고르지 않고 아래 이름을 쓴다.** 크기를 직접 고르게 두면
 * 「이 줄은 조금 작게」가 쌓여 탭마다 어긋난다 — 실제로 그렇게 어긋났다.
 *
 *   pageTitle   xl  화면 제목. 한 화면에 하나(PageHead가 이미 쓴다).
 *                   대화상자 제목도 여기다 — 대화상자는 그 순간 화면 전체다.
 *   cardTitle   lg  구역 제목(h2·h3). 화면 안에서 펼쳐지는 판의 제목도 여기다.
 *   metric      lg  강조하는 숫자.
 *   bodyText    md  읽는 글. 문단·설명. **의심스러우면 이것.**
 *   strongText  md  읽는 글 중 값에 해당하는 것.
 *   label       sm  입력·구역에 딸린 이름표.
 *   hint        sm  그 줄에 곁들이는 설명·단위·시각.
 *   badge       xs  상태 꼬리표 안 글자.
 *
 * ⚠ 사람이 읽고 판단하는 글은 bodyText(15px) 아래로 내리지 않는다. label·hint(13px)는
 *   15px 글에 딸려 나오는 자리이지 본문을 줄이는 칸이 아니다.
 */

/* ── 면 ── */
export const panel = "rounded-lg border border-exam-line bg-white";

/* ── 글자 ── */
export const pageTitle = "adm-t-xl font-black tracking-tight text-exam-text";
export const cardTitle = "adm-t-lg font-black text-exam-text";
/** 강조하는 숫자 — 자릿수를 고정해야 세로로 훑힌다 */
export const metric = "adm-t-lg font-black tabular-nums text-exam-text";
export const bodyText = "adm-t-md text-exam-muted";
/** 읽는 글 중 값에 해당하는 것 */
export const strongText = "adm-t-md font-bold text-exam-text";
export const label = "adm-t-sm font-bold text-exam-text";
/** 줄에 곁들이는 설명·단위·시각 */
export const hint = "adm-t-sm text-exam-muted";
/** 대문자 라벨은 한글에서 의미가 없어, 굵기와 색으로만 구분한다 */
export const eyebrow = "adm-t-sm font-bold text-brand-700";

/* ── 버튼 ──
   높이를 44px 이상으로 고정한다. 마우스가 정확하지 않아도 누를 수 있어야 한다. */
const btnBase =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-md px-5 adm-t-md font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export const btnPrimary = `${btnBase} border border-brand-900 bg-brand-900 text-white hover:bg-brand-800`;
export const btnGhost = `${btnBase} border border-exam-line bg-white text-exam-text hover:bg-exam-raised`;
export const btnDanger = `${btnBase} border border-rose-400 bg-white text-rose-700 hover:bg-rose-50`;
export const btnDisabled = `${btnBase} cursor-not-allowed border border-exam-line bg-exam-raised text-exam-muted`;

/** 표 안에서 쓰는 버튼도 36px 아래로 내리지 않는다 */
const btnRowBase =
  "inline-flex min-h-[2.25rem] items-center justify-center gap-1.5 rounded-md px-3.5 adm-t-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";

export const btnRow = `${btnRowBase} border border-brand-900 bg-brand-900 text-white hover:bg-brand-800`;
export const btnRowGhost = `${btnRowBase} border border-exam-line bg-white text-exam-text hover:bg-exam-raised`;

/* ── 입력 ── */
export const input =
  "w-full min-h-[2.75rem] rounded-md border border-exam-line bg-white px-4 py-2.5 adm-t-md text-exam-text outline-none transition-colors placeholder:text-exam-muted/70 focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export const select = `${input} appearance-none pr-10`;

/* ── 표 ──
   행 높이를 넉넉히 잡고 줄무늬 대신 굵은 구분선을 쓴다.
   옅은 줄무늬는 대비가 낮아 노안에서 오히려 읽기 어렵다. */
export const table = "w-full border-collapse adm-t-md";
export const th =
  "border-b-2 border-exam-line bg-exam-panel px-4 py-3.5 text-left adm-t-sm font-bold text-exam-text whitespace-nowrap";
export const td = "border-b border-exam-line px-4 py-4 align-middle text-exam-muted";
export const tdStrong = "border-b border-exam-line px-4 py-4 align-middle font-bold text-exam-text";
/** 숫자 칸 — 자릿수 고정 */
export const tdNum = `${td} text-right tabular-nums`;

/* ── 상태 ──
   면을 두지 않는다. 표 한 칸마다 색 상자가 서면 정작 읽어야 할 지문과 숫자가 뒤로
   밀린다. 상태는 글자로 적고 색은 글자에만 얹는다 — 색을 못 보아도 라벨이 남는다. */
export const badge = "inline-flex items-center adm-t-xs font-bold";

/** 색약·저시력을 고려해 색과 함께 쓰는 상태 점 */
export const dot = "inline-block h-2.5 w-2.5 shrink-0 rounded-full";
