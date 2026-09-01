import NewRoundForm from "./NewRoundForm";

export const metadata = { title: "회차 생성" };

/*
 * ADM-05-1 회차 생성.
 *
 * 회차·편성이 브라우저 저장소라(lib/roundPlanStore.ts) 서버에서 셀 것이 없다. 껍데기만
 * 두고 안을 클라이언트로 내린다.
 *
 * ⚠ 이 폴더 이름(new)은 회차 번호와 부딪히지 않는다. 회차 번호는 늘 「연도-숫자」 꼴이라
 *   (2026-3 · 2027-1) new라는 번호가 나올 수 없고, Next는 고정 경로를 [id]보다 먼저 잡는다.
 */
export default function Admin2NewRoundPage() {
  return <NewRoundForm />;
}
