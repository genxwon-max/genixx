/**
 * 결과 산출.
 *
 * 8개 재능 축 가운데 2026 파일럿에서는 국어(언어)·수학·과학 3과목만 측정한다.
 * 나머지 5축은 2027 심화진단에서 측정 예정이며, 미측정을 저점수로 오독하지 않도록
 * 결과 화면에서 따로 표기한다.
 */

import { questionsOf, type SubjectId } from "./exam";
import type { ExamRecord } from "./examStore";

export type AxisId =
  | "language"
  | "logic"
  | "nature"
  | "space"
  | "audio"
  | "physical"
  | "social"
  | "self";

export type Axis = {
  id: AxisId;
  label: string;
  short: string;
  /** 이 축을 측정하는 과목 (없으면 미측정) */
  subject?: SubjectId;
  desc: string;
};

/** 팔각형 순서 그대로 */
export const axes: Axis[] = [
  { id: "language", label: "언어", short: "언어", subject: "korean", desc: "말과 글로 의미를 만들고 정교하게 다루는 힘" },
  { id: "logic", label: "수리·논리", short: "수리", subject: "math", desc: "수와 규칙, 인과 구조를 다루는 힘" },
  { id: "nature", label: "자연·탐구", short: "탐구", subject: "science", desc: "관찰한 것에서 원인을 찾아내는 힘" },
  { id: "space", label: "공간", short: "공간", desc: "형태와 위치를 머릿속에서 조작하는 힘" },
  { id: "audio", label: "청각·리듬", short: "청각", desc: "소리의 높낮이와 박자를 구별하고 표현하는 힘" },
  { id: "physical", label: "신체·운동", short: "신체", desc: "몸의 움직임을 계획하고 정밀하게 실행하는 힘" },
  { id: "social", label: "사회·관계", short: "관계", desc: "타인의 상태를 읽고 관계를 조정하는 힘" },
  { id: "self", label: "자기이해", short: "자기", desc: "자신의 감정과 동기를 알아차리고 조절하는 힘" },
];

export type AxisScore = {
  axis: Axis;
  /** 0~100. 미측정 축은 null */
  score: number | null;
  measured: boolean;
};

/** 서술형 충실도 — 글자 수 기준의 임시 배점 (실서비스는 전문가 채점으로 대체) */
function essayScore(text: string) {
  const n = text.trim().length;
  if (n === 0) return 0;
  if (n < 20) return 40;
  if (n < 60) return 70;
  if (n < 140) return 88;
  return 100;
}

export function scoreSubject(record: ExamRecord, subject: SubjectId) {
  const list = questionsOf(subject);
  const rec = record.subjects[subject];
  const choice = list.filter((q) => q.type === "choice");
  const essay = list.filter((q) => q.type === "essay");

  const correct = choice.filter((q) => rec.answers[q.id] === q.answer).length;
  const objective = choice.length ? (correct / choice.length) * 100 : 0;
  const subjective = essay.length
    ? essay.reduce((sum, q) => {
        const v = rec.answers[q.id];
        return sum + essayScore(typeof v === "string" ? v : "");
      }, 0) / essay.length
    : 0;

  return {
    correct,
    total: choice.length,
    /** 객관식 70% + 서술형 30% */
    score: Math.round(objective * 0.7 + subjective * 0.3),
  };
}

export function scoreAxes(record: ExamRecord): AxisScore[] {
  return axes.map((axis) => {
    if (!axis.subject) return { axis, score: null, measured: false };
    const submitted = record.subjects[axis.subject].status === "submitted";
    if (!submitted) return { axis, score: null, measured: false };
    return { axis, score: scoreSubject(record, axis.subject).score, measured: true };
  });
}

/* ───────────────────────── 유형 판정 ───────────────────────── */

export type TalentType = {
  code: string;
  name: string;
  tagline: string;
  summary: string;
  directions: { t: string; d: string }[];
};

const primary: Record<AxisId, { code: string; name: string; tagline: string; summary: string }> = {
  language: {
    code: "L",
    name: "이야기 탐험가",
    tagline: "읽은 것을 자기 말로 다시 짜는 아이",
    summary:
      "글에서 필요한 정보를 골라내고, 그것을 자기 문장으로 바꾸어 설명하는 데서 힘이 드러납니다. 읽기 자체보다 '읽고 나서 무엇을 하느냐'에서 차이가 납니다.",
  },
  logic: {
    code: "M",
    name: "규칙 발견가",
    tagline: "흩어진 것에서 규칙을 먼저 찾는 아이",
    summary:
      "수와 자료를 보면 먼저 패턴을 찾으려 합니다. 계산 속도보다 '왜 그렇게 되는지'를 설명하려는 태도에서 강점이 드러납니다.",
  },
  nature: {
    code: "N",
    name: "관찰 탐구가",
    tagline: "본 것에서 원인을 되짚는 아이",
    summary:
      "관찰한 사실과 자기 생각을 구분할 줄 알고, 조건이 달라지면 결과가 어떻게 달라지는지를 연결해 봅니다. 실험형 과제에서 특히 잘 드러납니다.",
  },
  space: { code: "S", name: "공간 설계가", tagline: "머릿속에서 형태를 돌려 보는 아이", summary: "" },
  audio: { code: "A", name: "소리 감각가", tagline: "소리의 결을 세밀하게 듣는 아이", summary: "" },
  physical: { code: "P", name: "움직임 조율가", tagline: "몸으로 먼저 익히는 아이", summary: "" },
  social: { code: "R", name: "관계 조율가", tagline: "사람 사이를 먼저 살피는 아이", summary: "" },
  self: { code: "E", name: "자기 조절가", tagline: "자기 상태를 스스로 읽는 아이", summary: "" },
};

const directionMap: Record<AxisId, { t: string; d: string }[]> = {
  language: [
    { t: "읽은 뒤 한 문장으로 옮기기", d: "책이나 기사를 읽고 '한 줄 요약 → 내 생각 한 줄' 형식으로 적어 보게 하세요. 분량보다 매일 하는 것이 중요합니다." },
    { t: "말로 설명하는 자리 만들기", d: "가족에게 오늘 배운 것을 설명하는 3분을 정해 두면, 이해가 덜 된 부분이 스스로 드러납니다." },
    { t: "다른 결말 써 보기", d: "이야기의 결말을 바꿔 쓰게 하면 이해와 창작이 같이 자랍니다." },
  ],
  logic: [
    { t: "풀이 과정 말로 남기기", d: "답만 쓰지 말고 '왜 그렇게 했는지'를 한 줄 덧붙이게 하세요. 실수 유형이 눈에 보이기 시작합니다." },
    { t: "생활 속 규칙 찾기", d: "버스 시간표, 영수증, 게임 점수처럼 실제 자료에서 규칙을 찾아보는 활동이 잘 맞습니다." },
    { t: "한 문제 여러 방법으로", d: "같은 문제를 두 가지 방법으로 풀어 보게 하면 유연성이 자랍니다." },
  ],
  nature: [
    { t: "조건 하나만 바꿔 보기", d: "집에서 하는 간단한 관찰에서도 '한 번에 하나만 바꾸기'를 지키면 실험 설계 감각이 생깁니다." },
    { t: "관찰 일지 쓰기", d: "본 것과 생각한 것을 칸을 나누어 적게 하세요. 사실과 추측을 구분하는 훈련이 됩니다." },
    { t: "왜냐고 되묻기", d: "아이의 설명에 '왜 그렇게 생각했어?'를 한 번 더 물어보는 것만으로 추론이 깊어집니다." },
  ],
  space: [], audio: [], physical: [], social: [], self: [],
};

export function decideType(scores: AxisScore[]): TalentType | null {
  const measured = scores.filter((s) => s.measured && s.score !== null);
  if (measured.length === 0) return null;

  const ranked = [...measured].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = ranked[0];
  const second = ranked[1];
  const base = primary[top.axis.id];

  const code = ranked
    .slice(0, Math.min(3, ranked.length))
    .map((s) => primary[s.axis.id].code)
    .join("");

  const directions = [
    ...(directionMap[top.axis.id] ?? []),
    ...(second ? (directionMap[second.axis.id] ?? []).slice(0, 1) : []),
  ].slice(0, 4);

  return {
    code: `${code}형`,
    name: `${base.name}형`,
    tagline: base.tagline,
    summary: second
      ? `${base.summary} 여기에 ${second.axis.label} 축이 함께 받쳐 주고 있어, ${top.axis.label}만 강한 경우보다 과제를 끝까지 밀고 갈 힘이 있습니다.`
      : base.summary,
    directions,
  };
}

/* ───────────────────────── 전문가 코멘트 ───────────────────────── */

export function expertNotes(scores: AxisScore[], record: ExamRecord) {
  const measured = scores.filter((s) => s.measured && s.score !== null);
  const ranked = [...measured].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const doneSurveys = (["mother", "father", "teacher"] as const).filter(
    (k) => record.surveys[k] === "done",
  ).length;

  const notes: { title: string; body: string }[] = [];

  if (top) {
    notes.push({
      title: "강하게 나타난 축",
      body: `${top.axis.label} 영역에서 또래 발달 단계 상한 대비 상위 구간에 위치합니다. 정답 여부보다 서술 응답에서 근거를 함께 적은 점이 확인됩니다. 이 축은 다음 회차에서도 이어서 관찰할 가치가 있습니다.`,
    });
  }
  if (low && ranked.length > 1 && (low.score ?? 0) < (top?.score ?? 0)) {
    notes.push({
      title: "지금은 낮게 나온 축",
      body: `${low.axis.label} 영역은 이번 회차에서 상대적으로 낮게 측정되었습니다. 다만 이는 능력의 부족이 아니라 해당 영역을 보여줄 기회가 적었을 가능성을 함께 봅니다. 약점으로 규정하지 않습니다.`,
    });
  }
  notes.push({
    title: "미측정 5개 축",
    body: "공간·청각·신체·사회관계·자기이해 다섯 축은 지필로 재기 어려워 2027 심화진단(멀티모달 수행과제)에서 측정합니다. 이번 결과에 표시된 빈 축은 '없음'이 아니라 '아직 측정하지 않음'입니다.",
  });
  notes.push({
    title: "정보원 구성",
    body:
      doneSurveys === 0
        ? "이번 판정은 학생 응답만으로 이루어졌습니다. 보호자·교사 관찰이 더해지면 발현 조건에 대한 해석의 폭이 넓어집니다."
        : `학생 응답에 관찰 설문 ${doneSurveys}건이 더해져 교차 검증했습니다. 응답 간 큰 불일치는 발견되지 않았습니다.`,
  });

  return notes;
}

/** 리포트 신뢰도 표기 — 참여한 정보원 수에 따라 */
export function confidenceOf(record: ExamRecord) {
  const done = (["mother", "father", "teacher"] as const).filter(
    (k) => record.surveys[k] === "done",
  ).length;
  if (done >= 2) return { label: "높음", desc: "학생 응답 + 관찰 설문 2건 이상으로 교차 검증됨" };
  if (done === 1) return { label: "보통", desc: "학생 응답 + 관찰 설문 1건" };
  return { label: "참고", desc: "학생 응답만 반영됨 — 해석 범위가 제한됩니다" };
}
