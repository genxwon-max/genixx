import FormsView from "./FormsView";

export const metadata = { title: "평가별 문항관리" };

/*
 * ADM-04-3 평가별 문항관리 — 회차 × 과목 × 학년군 검사지 전체 목록.
 *
 * 검사지·문항·편성이 전부 브라우저 저장소라(lib/formStore.ts · itemStore.ts ·
 * roundPlanStore.ts) 서버에서 셀 것이 없다. 껍데기만 두고 안을 클라이언트로 내린다.
 */
export default function Admin2FormsPage() {
  return <FormsView />;
}
