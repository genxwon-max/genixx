import CounselorsView from "./CounselorsView";

export const metadata = { title: "상담사 관리" };

/*
 * EXP-06-2 상담사 관리 — 결과 해석 면담을 맡는 사람과 그 값.
 *
 * 명단과 값이 브라우저 저장소에만 있어(lib/counselorStore.ts) 서버에서 그릴 것이 없다.
 * 붙일 때는 이 자리에서 상담사 API를 부르고, 첫 화면을 서버가 그리게 옮긴다.
 */
export default function Admin2CounselorsPage() {
  return <CounselorsView />;
}
