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

export type SurveyBand = "e34" | "e56";

export const surveyBands: { id: SurveyBand; label: string; short: string }[] = [
  { id: "e34", label: "초등 3~4학년", short: "초3~4" },
  { id: "e56", label: "초등 5~6학년", short: "초5~6" },
];

export const surveyBandIds: SurveyBand[] = surveyBands.map((b) => b.id);

export const surveyBandOf = (id: SurveyBand) =>
  surveyBands.find((b) => b.id === id) ?? surveyBands[0];

export const isSurveyBand = (v: string): v is SurveyBand =>
  surveyBandIds.includes(v as SurveyBand);

/**
 * 학생 명부에 손으로 적힌 학년 글자에서 학년대를 고른다.
 *
 * 명부의 학년 칸은 자유 입력이라 「4학년」·「초4」·「6학년」이 섞여 들어온다. 숫자 하나만
 * 본다 — 5·6이면 위 칸, 나머지는 아래 칸이다.
 *
 * 못 읽으면 초등 3~4학년으로 둔다. 설문이 아예 안 나가는 것보다 낫고, 어린 쪽 문항은
 * 어느 학년이 읽어도 뜻이 통한다. 대상이 아닌 학년(중·고)이 명부에 들어와 있어도
 * 마찬가지다 — 접수는 학년 칸에서 이미 막힌다(lib/examCatalog.ts trackFromGrade).
 */
export function bandFromGrade(grade?: string): SurveyBand {
  const t = (grade ?? "").trim();
  if (!t) return "e34";
  if (t.includes("중") || t.includes("고")) return "e34";
  const n = Number(t.match(/\d/)?.[0] ?? "");
  return n === 5 || n === 6 ? "e56" : "e34";
}
