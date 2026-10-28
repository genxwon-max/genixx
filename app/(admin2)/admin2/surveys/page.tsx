import SurveysView from "./SurveysView";

export const metadata = { title: "설문지" };

/*
 * ADM-14 설문 관리 — 학생 · 학부모 · 지도교사 설문을 고치고 발행하는 자리.
 *
 * 9월 27일 옛 콘솔(/admin/surveys 「설문 원본」)을 걷어 낼 때 함께 사라졌다가 2026-10-28 다시 세웠다.
 * 그동안 저장소(lib/surveyStore.ts)는 남아 응답자 화면이 계속 읽었지만 고칠 자리가 없어, 문항 하나를
 * 고치려면 코드를 고쳐야 했다.
 */
export default function Admin2SurveysPage() {
  return <SurveysView />;
}
