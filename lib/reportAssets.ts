import type { AxisId } from "./result";
import { axes } from "./result";
import type { SurveyBand } from "./surveyBands";

/**
 * 리포트 자산 (ADM-08) — 조립되는 문구와 그 문구를 부르는 규칙.
 *
 * 이 콘솔이 파는 것은 「사람이 확정한 판정」이고, 그 판정을 이루는 문장은 LLM이 그때그때
 * 지어내지 않는다. **검수된 문구를 규칙으로 조립한다**(사이트맵 ADM-08). 그런데 여태
 * 그 문구와 규칙이 전부 코드에 박혀 있었다 —
 *
 *   lib/result.ts의 expertNotes()   「강하게 나타난 축」·「지금은 낮게 나온 축」 네 문단
 *   lib/result.ts의 directionMap    축마다 활동 제안 세 개
 *   lib/reportStore.ts의 ensureReport()  "R-01 · …" "R-04 · …" "R-12 · …" 규칙 문자열
 *
 * 그래서 문구 한 줄을 고치려면 배포를 해야 했고, 정작 그 문구를 고쳐야 하는 사람(검수
 * 담당)은 손댈 자리가 없었다. 리포트 승인 화면이 문구를 아이마다 덮어쓰게(override) 열어
 * 둔 것도 그 때문인데, 같은 템플릿이 다음 아이에게 같은 문제를 또 일으켰다.
 *
 * 이 파일은 그 문구와 규칙을 **데이터로 세운다.**
 *
 * ── 왜 지시자가 없나 ──
 * 씨앗이라서다. 운영자가 고친 것은 lib/reportAssetStore.ts가 브라우저 저장소에 덮어 든다 —
 * 문의(lib/admin.ts)와 답변(lib/inquiryStore.ts)이 갈라선 것과 같은 자리다. 지시자를
 * 붙이지 않아 뒤에 서버 컴포넌트가 이 씨앗을 그대로 읽을 수 있게 열어 둔다.
 *
 * ── 학년 축을 SurveyBand로 잡은 까닭 ──
 * 저장소에 학년 갈래가 둘 있고 lib/surveyBands.ts가 **일부러** 갈라 두었다 —
 * 「한 타입으로 묶으면 둘 중 하나는 반드시 거짓말을 하게 된다」.
 *
 *   GradeBand   3-4 · 5-6      성취기준 코드 접두에 매인 값. **중학교가 없다**
 *   SurveyBand  e34·e56·m1·m23 묻는 말이 실제로 갈리는 자리에서 끊은 값
 *
 * 리포트는 중1·중2에게도 나가므로 GradeBand로는 그 아이들의 문구를 둘 자리가 없다. 게다가
 * ReportDoc.grade는 「초등 4학년」 같은 자유 입력 글자인데, 그것을 학년대로 옮겨 주는
 * bandFromGrade()가 저쪽에 이미 있다. 이 축을 쓰면 새로 지을 것이 없다.
 *
 * ⚠ 문구를 고쳐도 **이미 발행된 리포트는 그대로 둔다.** 리포트는 조립되는 순간 블록에
 *   문장을 복사해 담고(lib/reportStore.ts의 ReportBlock.text), 그 뒤로는 이 템플릿을 다시
 *   보지 않는다. 보호자가 이미 읽은 글이 뒤에서 소리 없이 바뀌면 안 되기 때문이다 —
 *   고친 문구는 **다음 조립부터** 나간다.
 */

/* ───────────────────────── 발현 밴드 ───────────────────────── */

/**
 * 발현 밴드 셋.
 *
 * 사이트맵이 「재능 × 밴드(L1/L2/L3)」라고만 적어 두고 코드에는 없던 값이다. 여기서 세운다.
 *
 * ⚠ 이름에 상·중·하를 쓰지 않는다. 진단 윤리 헌장 7조가 막는 것은 등급 표현 자체가 아니라
 *   **아이를 줄 세우는 말**이고, 「상」이라고 적는 순간 그 옆 아이는 「하」가 된다. 밴드는
 *   점수 구간이 아니라 **이번 회차에 얼마나 드러났나**를 가리키는 말이라, 그렇게 읽히도록
 *   이름을 짓는다. 이 이름은 운영자 화면에만 서고 리포트에는 나가지 않는다.
 */
export type Band = "L1" | "L2" | "L3";

export const bands: { id: Band; label: string; desc: string }[] = [
  { id: "L3", label: "뚜렷하게 나타남", desc: "이번 회차 응답 전반에서 반복해 드러난 축" },
  { id: "L2", label: "나타나는 중", desc: "드러나기는 하나 문항에 따라 갈리는 축" },
  { id: "L1", label: "덜 나타남", desc: "이번 회차에 보여줄 기회가 적었던 축. 능력의 없음이 아니다" },
];

export const bandOf = (id: Band) => bands.find((b) => b.id === id)!;

/**
 * 밴드를 가르는 점수.
 *
 * 값을 이 파일에 박아 두되 **고칠 수 있게** 저장소가 덮는다(lib/reportAssetStore.ts).
 * 컷을 옮기면 같은 아이가 다른 문구를 받으므로, 고치는 자리에 그 사실을 적어 둔다.
 *
 * ⚠ 컷은 「이 점수 **이상**」이다. L1은 나머지라 컷이 없다 — 세 구간에 컷 셋을 두면
 *   가운데가 비거나 겹치는 값을 만들 수 있다.
 */
export type BandCuts = { L3: number; L2: number };

export const defaultCuts: BandCuts = { L3: 75, L2: 55 };

export function bandFromScore(score: number, cuts: BandCuts): Band {
  if (score >= cuts.L3) return "L3";
  if (score >= cuts.L2) return "L2";
  return "L1";
}

/* ───────────────────────── 문구가 놓이는 자리 ───────────────────────── */

/**
 * 슬롯 — 리포트에서 이 문구가 놓이는 자리.
 *
 * 축과 밴드만으로는 열쇠가 되지 않는다. 같은 「언어 × L3」이라도 유형을 설명하는 문단과
 * 집에서 해 볼 것을 적는 문단은 아주 다른 글이기 때문이다. 자리를 먼저 가르고, 자리마다
 * 「축이 붙느냐 · 밴드가 붙느냐」를 정한다 — 그래야 격자가 실제로 채울 수 있는 크기가 된다.
 *
 * 미측정 안내처럼 축도 밴드도 붙지 않는 자리는 학년대마다 한 벌이면 된다. 축·밴드를
 * 전부 붙이면 8 × 3 × 4 = 96칸이 되는데 그중 아흔 칸은 같은 글을 복사한 것이 된다.
 */
export type BuiltinSlotId = "type" | "top" | "low" | "unmeasured" | "sources" | "activity" | "cross";

/**
 * 자리 열쇠 — 씨앗 자리 여섯(+ cross)과 운영자가 해석 템플릿 화면에서 더한 자리.
 *
 * 더한 자리는 「c」로 시작하는 글자다(c + 만든 시각). 열쇠를 「-」로 이어 붙이므로(keyOf) 그 글자를
 * 쓰지 않는다.
 */
export type SlotId = BuiltinSlotId | `c${string}`;

/* ⚠ cross는 슬롯 목록(slots)에 없다. 교차 해석 문구는 학년대가 아니라 **교차 셀**마다
   갈리므로 아래 crossCells가 든다 — 템플릿 격자에 두면 같은 글을 셀 수만큼 복사하게 된다 */

export type Slot = {
  id: SlotId;
  label: string;
  /** 리포트에서 이 블록이 서는 절 이름 — ReportBlock.section이 된다 */
  section: string;
  /** 이 자리의 글이 무엇을 말해야 하는가. 고치는 화면에 그대로 적는다 */
  guide: string;
  /** 축마다 다른 글인가 */
  byAxis: boolean;
  /** 밴드마다 다른 글인가 */
  byBand: boolean;
};

export const slots: Slot[] = [
  {
    id: "type",
    label: "유형 판정",
    section: "재능 유형",
    guide: "이 아이의 재능 유형을 한 문단으로 풉니다. 유형 이름을 되풀이하지 말고 무엇에서 힘이 드러나는지 적습니다.",
    byAxis: true,
    byBand: false,
  },
  {
    id: "top",
    label: "강하게 나타난 축",
    section: "강하게 나타난 축",
    guide: "그 축이 어떤 모습으로 드러났는지 적습니다. 점수가 아니라 응답에서 보인 행동을 근거로 씁니다.",
    byAxis: true,
    byBand: true,
  },
  {
    id: "low",
    label: "지금은 낮게 나온 축",
    section: "지금은 낮게 나온 축",
    guide: "능력의 없음으로 적지 않습니다. 「보여줄 기회가 적었을 가능성」을 함께 적는 것이 이 자리의 규칙입니다.",
    byAxis: true,
    byBand: false,
  },
  {
    id: "unmeasured",
    label: "미측정 축 안내",
    section: "미측정 축",
    guide: "빈 축이 「없음」이 아니라 「아직 재지 않음」임을 못 박습니다. 학년대에 맞는 말로 적습니다.",
    byAxis: false,
    byBand: false,
  },
  {
    id: "sources",
    label: "정보원 구성",
    section: "정보원 구성",
    guide: "이 판정이 어떤 자료로 이루어졌는지 적습니다. 설문이 없으면 해석의 폭이 좁다는 것을 밝힙니다.",
    byAxis: false,
    byBand: false,
  },
  {
    id: "activity",
    label: "집에서 해 볼 것",
    section: "집에서 해 볼 것",
    guide: "보호자가 오늘 저녁에 할 수 있는 크기로 적습니다. 학습지·문제집을 권하지 않습니다.",
    byAxis: true,
    byBand: false,
  },
];

/**
 * 운영자가 더한 자리 — 저장소(lib/reportAssetStore.ts)가 읽을 때마다 여기에 올려 둔다.
 *
 * slotOf · parseKey는 화면 여러 곳(목록 · 상세 · 조립 규칙 · 조립)이 부르는데 저장소 값을 모른다.
 * 그 모두에 더한 자리를 넘기게 고치는 대신, 저장소가 이 목록을 갈아 끼우고 두 함수가 함께 본다.
 */
export type CustomSlot = Slot & { createdAt: string; createdBy: string };

const customSlots: CustomSlot[] = [];

export function setCustomSlots(list: CustomSlot[]) {
  customSlots.splice(0, customSlots.length, ...list);
}

export const isCustomSlot = (id: SlotId) => customSlots.some((s) => s.id === id);

export const slotOf = (id: SlotId) =>
  (slots.find((s) => s.id === id) ?? customSlots.find((s) => s.id === id))!;

/**
 * 격자에 세우는 자리의 차례 — 리포트에 서는 순서 그대로.
 *
 * ⚠ 손으로 적은 배열을 두지 않는다. 화면과 저장소가 각자 ["type","top",…]를 적어 두었다가
 *   slots에서 cross를 뺀 날 그 둘만 남아, slotOf가 undefined를 돌려주고 화면이 통째로
 *   죽었다. 차례가 필요한 자리는 전부 이것을 쓴다.
 */
export const slotOrder: SlotId[] = slots.map((s) => s.id);

/** 2026 파일럿에서 실제로 재는 축 — 템플릿 격자는 이 셋만 세운다 */
export const measuredAxes = axes.filter((a) => a.subject);

/**
 * 한 슬롯의 격자가 실제로 요구하는 칸.
 *
 * 화면과 저장소가 각자 세면 「빈 칸 12개」와 실제 목록이 갈린다. 세는 곳을 여기 하나로 둔다.
 */
export function cellsOf(slot: Slot): { axis: AxisId | null; band: Band | null }[] {
  const axisList: (AxisId | null)[] = slot.byAxis ? measuredAxes.map((a) => a.id) : [null];
  const bandList: (Band | null)[] = slot.byBand ? bands.map((b) => b.id) : [null];
  return axisList.flatMap((axis) => bandList.map((band) => ({ axis, band })));
}

/**
 * 템플릿 한 벌의 열쇠 — 화면·저장소·주소가 같은 글자를 쓴다.
 *
 * 칸마다 제 주소가 있다(/admin2/reports/templates/top-e34-language-L3). 그래서 열쇠는 **주소에
 * 그대로 설 수 있는 글자**여야 한다 — 처음에 `|`로 이어 붙였더니 주소에서 %7C로 부풀어,
 * 「이 칸 좀 봐 달라」고 건네는 링크가 읽을 수 없는 글자가 되었다.
 *
 * 빈 자리를 `-`가 아니라 `all`로 적는 까닭도 같다. `-`를 사이 글자로 쓰는데 빈 자리까지 `-`면
 * 열쇠를 도로 풀 때 어디가 사이인지 알 수 없다.
 */
/**
 * 템플릿의 학년 — 초등 1~6학년 · 중학교 1~3학년을 하나씩 (2026-09-22 요청).
 *
 * 한동안 학년대 넷(초3~4 · 초5~6 · 중1 · 중2~3, SurveyBand)으로 문구를 갈랐다. 문항 은행이 학년을
 * 하나씩 적게 되면서 여기도 학년마다 따로 쓴다 — 3학년과 4학년에게 하는 말이 다를 수 있다.
 * 옛 학년대 문구는 그 학년대에 드는 학년마다 옮겨 담는다(씨앗은 seedTemplates, 고친 것은
 * lib/reportAssetStore.ts의 read가 옮긴다).
 */
export type TemplateGrade = "e1" | "e2" | "e3" | "e4" | "e5" | "e6" | "m1" | "m2" | "m3";

export const templateGrades: { id: TemplateGrade; label: string; short: string; band: SurveyBand }[] = [
  { id: "e1", label: "초등 1학년", short: "초1", band: "e34" },
  { id: "e2", label: "초등 2학년", short: "초2", band: "e34" },
  { id: "e3", label: "초등 3학년", short: "초3", band: "e34" },
  { id: "e4", label: "초등 4학년", short: "초4", band: "e34" },
  { id: "e5", label: "초등 5학년", short: "초5", band: "e56" },
  { id: "e6", label: "초등 6학년", short: "초6", band: "e56" },
  { id: "m1", label: "중학교 1학년", short: "중1", band: "m1" },
  { id: "m2", label: "중학교 2학년", short: "중2", band: "m23" },
  { id: "m3", label: "중학교 3학년", short: "중3", band: "m23" },
];

/** 옛 학년대 → 그 학년대에 드는 학년. 1 · 2학년은 옛 학년대가 없어 빈 칸으로 시작한다 */
export const gradesOfBand: Record<SurveyBand, TemplateGrade[]> = {
  e34: ["e3", "e4"],
  e56: ["e5", "e6"],
  m1: ["m1"],
  m23: ["m2", "m3"],
};

/**
 * 명부의 학년 글자(「초4」 · 「4학년」 · 「중2」)에서 템플릿 학년을 고른다. 못 읽으면 초등 3학년.
 * lib/surveyBands.ts의 bandFromGrade와 같은 규칙으로 읽는다.
 */
export function templateGradeFrom(grade?: string): TemplateGrade {
  const t = (grade ?? "").trim();
  const n = Number(t.match(/\d/)?.[0] ?? "");
  if (t.includes("고")) return "m3";
  if (t.includes("중")) return n >= 1 && n <= 3 ? (`m${n}` as TemplateGrade) : "m1";
  return n >= 1 && n <= 6 ? (`e${n}` as TemplateGrade) : "e3";
}

export const keyOf = (slot: SlotId, grade: TemplateGrade, axis: AxisId | null, band: Band | null) =>
  `${slot}-${grade}-${axis ?? "all"}-${band ?? "all"}`;

/**
 * 열쇠를 도로 푼다 — 상세 화면이 주소에서 받은 글자로 칸을 찾는다.
 *
 * 아무 글자나 주소에 칠 수 있으므로 네 토막을 전부 확인한다. 하나라도 아는 값이 아니면
 * null을 돌려주고, 화면은 「없는 칸」을 그린다 — 모르는 값으로 빈 칸을 만들어 두면 저장까지
 * 되어 격자에 없는 유령 칸이 생긴다.
 */
export function parseKey(
  id: string,
): { slot: SlotId; grade: TemplateGrade; axis: AxisId | null; band: Band | null } | null {
  const p = id.split("-");
  if (p.length !== 4) return null;
  const [slotRaw, gradeRaw, axisRaw, bandRaw] = p;

  const slot = slots.find((x) => x.id === slotRaw) ?? customSlots.find((x) => x.id === slotRaw);
  if (!slot) return null;
  if (!templateGrades.some((b) => b.id === gradeRaw)) return null;

  /* 그 자리에 축·밴드가 붙는지까지 본다. 붙지 않는 자리에 축이 적힌 열쇠는
     격자에 없는 칸이라 받아 주지 않는다 */
  const axis = axisRaw === "all" ? null : (axisRaw as AxisId);
  if (slot.byAxis === (axis === null)) return null;
  if (axis && !measuredAxes.some((a) => a.id === axis)) return null;

  const band = bandRaw === "all" ? null : (bandRaw as Band);
  if (slot.byBand === (band === null)) return null;
  if (band && !bands.some((b) => b.id === band)) return null;

  return { slot: slot.id, grade: gradeRaw as TemplateGrade, axis, band };
}

/* ───────────────────────── 해석 템플릿 ───────────────────────── */

export type Template = {
  /** keyOf가 낸 값 */
  id: string;
  slot: SlotId;
  grade: TemplateGrade;
  axis: AxisId | null;
  band: Band | null;
  /** 리포트 블록의 제목 */
  title: string;
  /** 나가는 문구 */
  text: string;
};

/* 씨앗은 옛 학년대로 적어 두고, 그 학년대에 드는 학년마다 한 벌씩 편다(gradesOfBand) */
const t = (
  slot: SlotId,
  grade: SurveyBand,
  axis: AxisId | null,
  band: Band | null,
  title: string,
  text: string,
): Template[] =>
  gradesOfBand[grade].map((g) => ({ id: keyOf(slot, g, axis, band), slot, grade: g, axis, band, title, text }));

/**
 * 씨앗 문구.
 *
 * lib/result.ts의 expertNotes()와 directionMap에 박혀 있던 문장을 여기로 옮겨 학년대로
 * 갈랐다. 저쪽 문장은 학년 구분이 없어 초3과 중2가 같은 글을 받고 있었다.
 *
 * ⚠ **일부러 다 채우지 않았다.** 초등 3~4학년은 온전히 채우고, 초등 5~6학년은 절반만,
 *   중학교 둘은 비워 둔다. 이 화면이 답해야 하는 첫 물음이 「어느 칸이 비었나」인데, 씨앗이
 *   빈틈없이 차 있으면 그 물음을 화면에서 볼 수가 없다. 빈 칸은 조립할 때 같은 슬롯의
 *   초등 3~4학년 문구로 물러선다(lib/reportAssetStore.ts의 templateFor).
 */
export const seedTemplates: Template[] = ([
  /* ── 유형 판정 ── */
  t("type", "e34", "language", null, "이야기 탐험가형",
    "글에서 필요한 정보를 골라내고, 그것을 자기 문장으로 바꾸어 설명하는 데서 힘이 드러납니다. 읽기 자체보다 「읽고 나서 무엇을 하느냐」에서 차이가 납니다."),
  t("type", "e34", "logic", null, "규칙 발견가형",
    "수와 자료를 보면 먼저 규칙을 찾으려 합니다. 계산이 빠른 것보다 「왜 그렇게 되는지」를 설명하려는 태도에서 강점이 드러납니다."),
  t("type", "e34", "nature", null, "관찰 탐구가형",
    "관찰한 사실과 자기 생각을 구분할 줄 알고, 조건이 달라지면 결과가 어떻게 달라지는지를 연결해 봅니다."),
  t("type", "e56", "language", null, "이야기 탐험가형",
    "읽은 것을 요약하는 데서 그치지 않고 글쓴이의 의도까지 짚어 봅니다. 여러 자료를 견주어 자기 판단을 세우는 모습이 나타납니다."),
  t("type", "e56", "logic", null, "규칙 발견가형",
    "규칙을 찾는 데서 나아가 그 규칙이 언제 깨지는지를 함께 봅니다. 조건을 바꿔 가며 확인하려는 태도가 드러납니다."),

  /* ── 강하게 나타난 축 (축 × 밴드) ── */
  t("top", "e34", "language", "L3", "언어 축",
    "서술형 답에서 답만 쓰지 않고 그렇게 생각한 까닭을 함께 적었습니다. 자료에서 찾은 표현을 자기 말로 바꾸어 쓰는 모습이 반복해서 나타납니다."),
  t("top", "e34", "language", "L2", "언어 축",
    "짧은 글에서는 필요한 정보를 잘 찾아냅니다. 글이 길어지면 끝까지 붙드는 데 힘이 들어, 분량보다 자주 읽는 쪽이 지금은 잘 맞습니다."),
  t("top", "e34", "language", "L1", "언어 축",
    "이번 회차에서는 언어 축이 뚜렷하게 드러나지 않았습니다. 답을 적는 칸이 비어 있는 문항이 있어, 읽기보다 쓰기에서 멈춘 것인지 함께 볼 필요가 있습니다."),
  t("top", "e34", "logic", "L3", "수리·논리 축",
    "답을 내는 것보다 풀이를 설명하는 문항에서 더 안정적이었습니다. 규칙을 찾아 다른 문제에 옮겨 쓰는 모습이 나타납니다."),
  t("top", "e34", "logic", "L2", "수리·논리 축",
    "익숙한 꼴의 문제에서는 규칙을 잘 찾습니다. 조건이 하나 더 붙으면 잠시 멈추는데, 이는 아직 겪어 본 꼴이 적기 때문일 수 있습니다."),
  t("top", "e34", "logic", "L1", "수리·논리 축",
    "이번 회차에서는 수리·논리 축이 뚜렷하게 드러나지 않았습니다. 계산 문항과 설명 문항 가운데 어느 쪽에서 멈췄는지를 함께 보면 다음 회차의 관찰 범위를 좁힐 수 있습니다."),
  t("top", "e34", "nature", "L3", "자연·탐구 축",
    "본 것과 생각한 것을 나누어 적었고, 조건이 바뀌면 결과가 어떻게 달라지는지를 스스로 물었습니다. 관찰을 근거로 삼는 태도가 반복해서 나타납니다."),
  t("top", "e34", "nature", "L2", "자연·탐구 축",
    "관찰한 것을 적는 데는 익숙합니다. 그것에서 원인을 되짚는 문항에서는 답이 짧아져, 아직 그 연결을 소리 내어 해 본 적이 적을 수 있습니다."),
  t("top", "e34", "nature", "L1", "자연·탐구 축",
    "이번 회차에서는 자연·탐구 축이 뚜렷하게 드러나지 않았습니다. 관찰 문항에 무응답이 있어, 재지 못한 것인지 드러나지 않은 것인지 가릴 필요가 있습니다."),
  t("top", "e56", "language", "L3", "언어 축",
    "여러 자료에서 공통점과 차이를 짚어 내고, 자기 판단을 근거와 함께 적었습니다. 읽은 것을 자기 문제로 옮겨 오는 모습이 나타납니다."),
  t("top", "e56", "logic", "L3", "수리·논리 축",
    "규칙을 찾는 데서 그치지 않고 그 규칙이 통하지 않는 자리를 함께 짚었습니다. 반례를 떠올리는 태도가 드러납니다."),

  /* ── 지금은 낮게 나온 축 ── */
  t("low", "e34", "language", null, "언어 축",
    "언어 영역은 이번 회차에서 낮게 측정되었습니다. 다만 이는 능력이 없다는 뜻이 아니라, 이 영역을 보여줄 기회가 적었을 가능성을 함께 봅니다."),
  t("low", "e34", "logic", null, "수리·논리 축",
    "수리·논리 영역은 이번 회차에서 낮게 측정되었습니다. 문항을 끝까지 읽을 시간이 모자랐을 수도 있어, 점수만으로 판단하지 않습니다."),
  t("low", "e34", "nature", null, "자연·탐구 축",
    "자연·탐구 영역은 이번 회차에서 낮게 측정되었습니다. 다만 이는 능력이 없다는 뜻이 아니라, 이 영역을 보여줄 기회가 적었을 가능성을 함께 봅니다."),
  t("low", "e56", "language", null, "언어 축",
    "언어 영역은 이번 회차에서 낮게 측정되었습니다. 이 나이대는 관심 있는 글과 그렇지 않은 글에서 차이가 크게 벌어지므로, 무엇을 읽을 때 오래 붙드는지를 함께 보아 주세요."),

  /* ── 미측정 축 안내 ── */
  t("unmeasured", "e34", null, null, "다섯 축 안내",
    "공간·청각·신체·사회관계·자기이해 다섯 축은 지필로 재기 어려워 2027 심화진단에서 측정합니다. 이번 결과의 빈 축은 「없음」이 아니라 「아직 재지 않음」입니다."),
  t("unmeasured", "e56", null, null, "다섯 축 안내",
    "공간·청각·신체·사회관계·자기이해 다섯 축은 지필로 재기 어려워 2027 심화진단에서 측정합니다. 이번 결과의 빈 축은 「없음」이 아니라 「아직 재지 않음」입니다."),

  /* ── 정보원 구성 ── */
  t("sources", "e34", null, null, "신뢰도",
    "이번 판정은 학생 응답만으로 이루어졌습니다. 보호자·교사 관찰이 더해지면 발현 조건에 대한 해석의 폭이 넓어집니다."),
  t("sources", "e56", null, null, "신뢰도",
    "이번 판정은 학생 응답만으로 이루어졌습니다. 보호자·교사 관찰이 더해지면 발현 조건에 대한 해석의 폭이 넓어집니다."),

  /* ── 집에서 해 볼 것 ── */
  t("activity", "e34", "language", null, "읽은 뒤 한 문장으로 옮기기",
    "책이나 기사를 읽고 「한 줄 요약 → 내 생각 한 줄」 형식으로 적어 보게 하세요. 분량보다 매일 하는 것이 중요합니다."),
  t("activity", "e34", "logic", null, "생활 속 규칙 찾기",
    "버스 시간표, 영수증, 게임 점수처럼 실제 자료에서 규칙을 찾아보는 활동이 잘 맞습니다."),
  t("activity", "e34", "nature", null, "조건 하나만 바꿔 보기",
    "집에서 하는 간단한 관찰에서도 「한 번에 하나만 바꾸기」를 지키면 실험 설계 감각이 생깁니다."),
  t("activity", "e56", "language", null, "다른 결말 써 보기",
    "이야기의 결말을 바꿔 쓰게 하면 이해와 창작이 같이 자랍니다. 왜 그렇게 바꿨는지 한 줄 덧붙이게 해 주세요."),
] as Template[][]).flat();

/* ───────────────────────── 교차 셀 ─────────────────────────
   사이트맵 ADM-08-4가 이 화면에 요구한 것 — 「학력 부진 × 재능 강세」 같은 교차 셀에
   어떤 블록이 붙는지 편집.

   판정 협진(EXP-07)의 크로스 6셀과 **같은 이름을 쓰되 다른 값이다.** 저쪽은 사람이 지필·
   설문·관찰·면담을 놓고 확정하는 셀이고, 여기는 조립하는 순간 점수 둘로 자동으로 걸리는
   칸이다. 이름을 새로 짓지 않는 까닭은 운영자가 두 화면에서 같은 말을 보아야 하기 때문이고,
   값을 따로 드는 까닭은 조립 시점에 사람이 확정한 셀이 아직 없기 때문이다.

   넷은 학력 × 재능 2×2로 걸리고, 배제영역 둘은 재지 않은 다섯 축에 대한 것이라 이번
   회차에는 걸리지 않는다 — 그래도 격자에 세워 둔다. 2027 심화진단에서 쓸 문구를 지금부터
   써 둘 자리이고, 빼 두면 그 자리가 있다는 것을 아무도 모른다. */

export type CrossKey = "confirm" | "gap" | "mismatch" | "later" | "excluded-high" | "excluded-none";

/** 격자에서의 자리. null이면 2×2 밖(배제영역) */
export type Side = "high" | "low";

export type CrossCellRule = {
  id: CrossKey;
  label: string;
  /** 학력(과목 점수) 쪽 */
  paper: Side | null;
  /** 재능(축 점수) 쪽 */
  talent: Side | null;
  /** 이 칸이 무엇인가 — 격자 칸에 한 줄로 선다 */
  desc: string;
  /** 리포트에 붙는 문구 */
  text: string;
  /** 다음 회차에 무엇을 하는가 */
  next: string;
  on: boolean;
};

/**
 * 2×2를 가르는 점수.
 *
 * 학력은 「이 점수 미만이면 부진」, 재능은 「이 점수 이상이면 강세」다. 부등호 방향이 서로
 * 반대인 까닭은 두 축이 재는 것이 달라서다 — 학력은 낮은 쪽이, 재능은 높은 쪽이 이 화면에서
 * 손이 가는 자리다.
 */
export type CrossCuts = { paper: number; talent: number };

export const defaultCrossCuts: CrossCuts = { paper: 50, talent: 70 };

/** 점수 둘로 2×2 가운데 한 칸을 고른다 */
export function crossKeyOf(paperScore: number, talentScore: number, cuts: CrossCuts): CrossKey {
  const strong = talentScore >= cuts.talent;
  const weak = paperScore < cuts.paper;
  if (weak && strong) return "gap";
  if (!weak && strong) return "confirm";
  if (!weak && !strong) return "mismatch";
  return "later";
}

export const seedCross: CrossCellRule[] = [
  {
    id: "confirm",
    label: "강신호 확증",
    paper: "high",
    talent: "high",
    desc: "학력 우수 × 재능 강세",
    text: "과목 점수와 재능 축이 같은 방향을 가리킵니다. 지금 잘 되고 있는 방식을 바꾸지 않아도 되고, 같은 축을 조금 더 깊게 다루는 활동이 잘 맞습니다.",
    next: "그 축의 심화 활동 모듈을 배정합니다.",
    on: true,
  },
  {
    id: "gap",
    label: "잠재-발현 갭",
    paper: "low",
    talent: "high",
    desc: "학력 부진 × 재능 강세",
    text: "과목 점수만 보면 낮게 보이지만, 관찰과 추론을 요구한 문항에서는 다른 모습이 나타났습니다. 지금 필요한 것은 더 많은 문제 풀이가 아니라, 이 아이가 잘 다루는 방식으로 배울 기회입니다.",
    next: "능력 부족으로 적지 않습니다. 보여줄 기회를 늘리는 모듈을 배정합니다.",
    on: true,
  },
  {
    id: "mismatch",
    label: "능력-흥미 불일치",
    paper: "high",
    talent: "low",
    desc: "학력 우수 × 재능 약세",
    text: "과목 점수는 안정적인데 응답에서 그 축을 스스로 끌고 가는 모습은 덜 보였습니다. 더 밀기보다, 아이가 관심을 두는 다른 축과 이어 주는 편이 지금은 낫습니다.",
    next: "밀지 않습니다. 흥미 축과 잇는 활동을 먼저 제안합니다.",
    on: true,
  },
  {
    id: "later",
    label: "현시점 비우선",
    paper: "low",
    talent: "low",
    desc: "학력 부진 × 재능 약세",
    text: "이번 회차에서는 어느 축도 뚜렷하게 드러나지 않았습니다. 한 번의 결과로 판단을 서두르지 않고, 다음 회차에 보는 범위를 넓혀 다시 봅니다.",
    next: "판정을 서두르지 않고 다음 회차의 관찰 범위를 넓힙니다.",
    on: true,
  },
  {
    id: "excluded-high",
    label: "배제영역 고신호",
    paper: null,
    talent: null,
    desc: "재지 않은 다섯 축에서 강한 신호",
    text: "이번 회차에 재지 않은 축에서 눈에 띄는 모습이 함께 나타났습니다. 지필로는 확인할 길이 없어 면담으로 다시 봅니다.",
    next: "면담으로 확인하고 2027 심화진단 대상으로 표시합니다.",
    on: false,
  },
  {
    id: "excluded-none",
    label: "배제영역 무신호",
    paper: null,
    talent: null,
    desc: "재지 않은 축에도 별다른 신호 없음",
    text: "재지 않은 다섯 축에서도 특별히 눈에 띄는 것은 없었습니다. 다만 이는 그 축이 낮다는 뜻이 아니라, 이번 회차가 그 축을 재지 않았다는 뜻입니다.",
    next: "미측정을 낮은 점수로 적지 않도록 리포트 문구를 고정합니다.",
    on: false,
  },
];

export const crossOf = (id: CrossKey) => seedCross.find((c) => c.id === id)!;

/* ───────────────────────── 조립 규칙 ───────────────────────── */

/**
 * 규칙이 걸리는 조건.
 *
 * 조건을 자유 식(式)으로 두지 않는다. 「score > 70 && surveys < 2」 같은 것을 적게 하면
 * 운영자가 리포트를 통째로 멈추는 식을 쓸 수 있고, 그것이 틀렸는지는 아이 리포트가 나간
 * 뒤에야 안다. 갈래를 다섯으로 못 박고 그 안의 숫자만 고치게 한다.
 */
export type RuleCond =
  /** 늘 붙는다 — 미측정 안내처럼 모든 리포트에 서는 블록 */
  | { kind: "always" }
  /** 가장 높게 나온 축에 붙는다 */
  | { kind: "topAxis" }
  /** 가장 낮게 나온 축에 붙는다. 측정된 축이 둘 이상일 때만 */
  | { kind: "lowAxis" }
  /** 관찰 설문이 n건 미만일 때 붙는다 */
  | { kind: "sourcesBelow"; n: number }
  /**
   * 걸린 교차 셀에 붙는다.
   *
   * 점수 둘을 이 조건 안에 들고 있던 것을 걷어 냈다. 컷은 셀 격자가 들고(CrossCuts), 어느
   * 칸이 걸렸는지도 격자가 정한다 — 조건이 제 컷을 따로 들면 격자에서 옮긴 컷과 갈린다.
   */
  | { kind: "cross" };

export type Rule = {
  /** R-01 · R-04 … 리포트 블록에 근거로 적히는 번호 */
  id: string;
  label: string;
  /** 검토 화면의 블록에 「왜 이 블록이 붙었나」로 적히는 줄. ReportBlock.rule이 된다 */
  desc: string;
  /** 이 규칙이 채우는 자리 */
  slot: SlotId;
  cond: RuleCond;
  /** 리포트 안에서 서는 차례. 작을수록 위 */
  order: number;
  /** 끄면 이 블록이 다음 조립부터 빠진다 */
  on: boolean;
  /**
   * 끌 수 없는 규칙이면 그 까닭.
   *
   * 켜고 끄기를 열어 두면 **꺼서는 안 되는 것까지 꺼진다.** 미측정 안내(R-09)가 그렇다 —
   * 그 블록이 빠지면 리포트에 빈 축 다섯이 점수 없이 남고, 보호자는 그것을 「0점」으로
   * 읽는다. 「재지 않음 ≠ 낮음」은 이 진단이 헌장에 적어 둔 약속이라 운영자 실수로
   * 사라질 수 있는 자리에 두지 않는다.
   *
   * 유형 판정(R-01)도 잠근다. 그것이 빠지면 리포트가 「강하게 나타난 축」부터 시작해,
   * 무엇에 대한 글인지 없이 해석만 서게 된다.
   *
   * ⚠ 잠그는 것은 **켜고 끄기뿐**이다. 차례·근거 줄·조건 숫자는 그대로 고칠 수 있다.
   */
  locked?: string;
};

/**
 * 씨앗 규칙.
 *
 * lib/reportStore.ts의 ensureReport()와 씨앗 리포트에 문자열로만 있던 R-번호를 데이터로
 * 세운 것이다. 번호를 그대로 쓴다 — 이미 발행된 리포트의 블록에 그 번호가 적혀 있어서,
 * 새 번호를 매기면 옛 리포트의 근거 줄이 가리키는 규칙이 콘솔에 없게 된다.
 */
export const seedRules: Rule[] = [
  {
    id: "R-01",
    label: "유형 판정",
    desc: "측정된 축 가운데 상위 두 축의 조합으로 유형을 정한다",
    slot: "type",
    cond: { kind: "topAxis" },
    order: 10,
    on: true,
    locked: "이 블록이 빠지면 무엇에 대한 리포트인지 없이 해석만 서게 됩니다.",
  },
  {
    id: "R-04",
    label: "강하게 나타난 축",
    desc: "최상위 축에 그 축의 발현 밴드 문구를 붙인다",
    slot: "top",
    cond: { kind: "topAxis" },
    order: 20,
    on: true,
  },
  {
    id: "R-05",
    label: "지금은 낮게 나온 축",
    desc: "최하위 축에 붙는 해석 블록. 능력 부족으로 서술하지 않는다",
    slot: "low",
    cond: { kind: "lowAxis" },
    order: 30,
    on: true,
  },
  {
    id: "R-31",
    label: "교차 해석",
    desc: "걸린 교차 셀의 문구를 붙인다",
    slot: "cross",
    cond: { kind: "cross" },
    order: 40,
    on: true,
  },
  {
    id: "R-09",
    label: "미측정 축 안내",
    desc: "1단계 진단에서 재지 않은 다섯 축에 늘 붙는 고정 블록",
    slot: "unmeasured",
    cond: { kind: "always" },
    order: 50,
    on: true,
    locked:
      "이 블록이 빠지면 재지 않은 다섯 축이 점수 없이 남아 「0점」으로 읽힙니다. 「재지 않음 ≠ 낮음」은 헌장이 적어 둔 약속이라 끌 수 없습니다.",
  },
  {
    id: "R-20",
    label: "정보원 구성",
    desc: "관찰 설문이 들어오지 않았을 때 해석의 폭을 밝히는 블록",
    slot: "sources",
    cond: { kind: "sourcesBelow", n: 1 },
    order: 60,
    on: true,
  },
  {
    id: "R-12",
    label: "집에서 해 볼 것",
    desc: "최상위 축 × 학년대로 활동 모듈을 뽑는다",
    slot: "activity",
    cond: { kind: "topAxis" },
    order: 70,
    on: true,
  },
];

/** 조건을 사람이 읽는 한 줄로 — 규칙 목록과 미리보기가 같은 글자를 쓴다 */
export function condText(c: RuleCond): string {
  switch (c.kind) {
    case "always":
      return "늘 붙는다";
    case "topAxis":
      return "가장 높은 축";
    case "lowAxis":
      return "가장 낮은 축";
    case "sourcesBelow":
      return `관찰 설문이 ${c.n}건 미만일 때 붙는다`;
    case "cross":
      return "걸린 교차 셀";
  }
}

/** 학년대 이름 — 화면이 여러 곳에서 쓴다 */
export const gradeLabel = (g: TemplateGrade) => templateGrades.find((b) => b.id === g)?.label ?? g;
