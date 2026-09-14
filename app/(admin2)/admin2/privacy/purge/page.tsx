import PurgeView from "./PurgeView";

export const metadata = { title: "파기 스케줄러" };

/*
 * ADM-10-1 파기 스케줄러 — 큐에 선 것을 지운다.
 *
 * 개인정보 관리(ADM-10)에서 떼어 낸 화면이다. 저쪽은 명부라 매일 열어 훑고, 여기는
 * 되돌릴 수 없는 단추가 있어 지울 때만 연다.
 *
 * 주소가 [id]와 한 자리를 쓰지만 부딪히지 않는다 — 회원 번호는 M- · S-로 시작하고,
 * 못 박은 마디가 갈라진 마디보다 먼저 걸린다.
 */
export default function Admin2PurgePage() {
  return <PurgeView />;
}
