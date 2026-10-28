/**
 * 설문이 나가는 학년대.
 *
 * 초3에게 묻는 말과 초6에게 묻는 말이 같을 수 없다. 그렇다고 학년마다 따로 두면
 * 한 갈래에 넷, 네 갈래면 열여섯 벌이 되어 아무도 관리하지 못한다. 묻는 말이
 * 실제로 갈리는 자리에서만 끊는다 — 둘이다.
 *
 *   초등 3~4학년   놀이와 호기심이 중심이다.
 *   초등 5~6학년   같은 틀이되 학습 습관·또래 관계 쪽 물음이 는다.
 *
 * 한동안 중1 · 중2~3 두 칸을 더 들고 있었다. 진단평가 절차가 대상 학년을 초3~6으로
 * 정하면서 그 둘은 쓰이지 않게 되었다 — 저장분에 남은 옛 칸은 설문 저장소가 읽을 때
 * 걸러 버린다(lib/surveyStore.ts).
 *
 * 문항 은행의 GradeBand(3-4 · 5-6)와 이름이 겹치지만 일부러 따로 둔다. 저쪽은 성취기준
 * 코드 접두 숫자에 매인 값이고, 설문은 코드와 아무 상관이 없다. 한 타입으로 묶으면
 * 둘 중 하나는 반드시 거짓말을 하게 된다.
 */

/**
 * 2026-10-28 사용자: 「모든 학년 선택은 초1~6 · 중1~3 · 고1~3」 — 학년대를 다섯으로 늘려 열두 학년이 모두 제
 * 칸을 갖는다. 초1~2 · 중1~3 · 고1~3 칸도 처음에는 설문지 v1.0으로 시작한다(그 설문지가 초1~고3을 한 벌로
 * 묻는다, lib/survey.ts). 학년대마다 말을 고르는 일은 관리자가 그 칸의 설문지에서 한다.
 */
export type SurveyBand = "e12" | "e34" | "e56" | "m13" | "h13";

export const surveyBands: { id: SurveyBand; label: string; short: string }[] = [
  { id: "e12", label: "초등 1~2학년", short: "초1~2" },
  { id: "e34", label: "초등 3~4학년", short: "초3~4" },
  { id: "e56", label: "초등 5~6학년", short: "초5~6" },
  { id: "m13", label: "중학교 1~3학년", short: "중1~3" },
  { id: "h13", label: "고등학교 1~3학년", short: "고1~3" },
];

export const surveyBandIds: SurveyBand[] = surveyBands.map((b) => b.id);

export const surveyBandOf = (id: SurveyBand) =>
  surveyBands.find((b) => b.id === id) ?? surveyBands[0];

export const isSurveyBand = (v: string): v is SurveyBand =>
  surveyBandIds.includes(v as SurveyBand);

/**
 * 학생 명부에 적힌 학년 글자에서 학년대를 고른다.
 *
 * 명부의 학년 칸에는 「초등 4학년」 · 「초4」 · 「4학년」 · 「중등 2학년」이 섞여 들어온다. 「중」 · 「고」가
 * 있으면 그 학교급의 칸, 아니면 숫자 하나로 초등 칸을 고른다.
 *
 * 못 읽으면 초등 3~4학년으로 둔다 — 진단 대상 학년의 가장 어린 칸이고, 설문이 아예 안 나가는 것보다 낫다.
 */
export function bandFromGrade(grade?: string): SurveyBand {
  const t = (grade ?? "").trim();
  if (!t) return "e34";
  if (t.includes("중")) return "m13";
  if (t.includes("고")) return "h13";
  const n = Number(t.match(/\d/)?.[0] ?? "");
  return n === 1 || n === 2 ? "e12" : n === 5 || n === 6 ? "e56" : "e34";
}
