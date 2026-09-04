import FormsView from "./FormsView";

export const metadata = { title: "평가별 문항관리" };

/*
 * ADM-04-3 평가별 문항관리 — 회차 한 줄, 과목은 그 줄 안에.
 *
 * 목록이 답하는 것은 「어느 회차부터 손대야 하나」이고, 담는 일은 상세(forms/[round])의
 * 과목 탭에서 한다.
 *
 * 검사지·문항·편성이 전부 브라우저 저장소라(lib/formStore.ts · itemStore.ts ·
 * roundPlanStore.ts) 서버에서 셀 것이 없다. 껍데기만 두고 안을 클라이언트로 내린다.
 */
export default function Admin2FormsPage() {
  return <FormsView />;
}
