/**
 * 설문이 나가는 학년대.
 *
 * 초3에게 묻는 말과 중3에게 묻는 말이 같을 수 없다. 그렇다고 학년마다 따로 두면
 * 한 갈래에 여섯 벌, 세 갈래면 열여덟 벌이 되어 아무도 관리하지 못한다. 묻는 말이
 * 실제로 갈리는 자리에서만 끊는다 — 넷이다.
 *
 *   초등 3~4학년   보호자·교사가 관찰로 답한다. 아이의 놀이와 호기심이 중심이다.
 *   초등 5~6학년   같은 틀이되 학습 습관·또래 관계 쪽 물음이 는다.
 *   중1            자유학기라 성적이 아니라 탐색이 중심이다. 따로 끊는 까닭이 여기다.
 *   중2~3          진로와 과목 선택이 실제 결정이 되는 구간이다.
 *
 * 문항 은행의 GradeBand(3-4 · 5-6)와 일부러 따로 둔다. 그쪽은 성취기준 코드
 * 접두 숫자에 매인 값이라 중학이 없고, 설문은 코드와 아무 상관이 없다. 한 타입으로
 * 묶으면 둘 중 하나는 반드시 거짓말을 하게 된다.
 */

export type SurveyBand = "e34" | "e56" | "m1" | "m23";

export const surveyBands: { id: SurveyBand; label: string; short: string }[] = [
  { id: "e34", label: "초등 3~4학년", short: "초3~4" },
  { id: "e56", label: "초등 5~6학년", short: "초5~6" },
  { id: "m1", label: "중학교 1학년", short: "중1" },
  { id: "m23", label: "중학교 2~3학년", short: "중2~3" },
];

export const surveyBandIds: SurveyBand[] = surveyBands.map((b) => b.id);

export const surveyBandOf = (id: SurveyBand) =>
  surveyBands.find((b) => b.id === id) ?? surveyBands[0];

export const isSurveyBand = (v: string): v is SurveyBand =>
  surveyBandIds.includes(v as SurveyBand);

/**
 * 학생 명부에 손으로 적힌 학년 글자에서 학년대를 고른다.
 *
 * 명부의 학년 칸은 자유 입력이라 「4학년」·「초4」·「중2」·「2학년(중)」이 섞여 들어온다.
 * 숫자 하나와 「중」·「고」가 있는지만 본다 — 그 둘이면 넷 중 어디인지 갈린다.
 *
 * 못 읽으면 초등 3~4학년으로 둔다. 설문이 아예 안 나가는 것보다 낫고, 가장 어린
 * 쪽 문항은 어느 학년이 읽어도 뜻이 통한다.
 */
export function bandFromGrade(grade?: string): SurveyBand {
  const t = (grade ?? "").trim();
  if (!t) return "e34";

  const n = Number(t.match(/\d/)?.[0] ?? "");
  const middle = t.includes("중");
  /* 고등학생은 이 진단의 대상이 아니지만, 명부에 들어와 있으면 가장 위 칸으로 본다 */
  if (t.includes("고")) return "m23";

  if (middle) return n === 1 ? "m1" : "m23";
  if (n === 5 || n === 6) return "e56";
  return "e34";
}
