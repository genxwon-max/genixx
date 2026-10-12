import PurgeView from "./PurgeView";

export const metadata = { title: "개인정보 파기" };

/*
 * ADM-10-1 개인정보 파기 — 파기 대기에 오른 것을 지운다.
 *
 * 개인정보 관리(ADM-10)에서 떼어 낸 화면이다. 저쪽은 명부라 매일 열어 훑고, 여기는
 * 되돌릴 수 없는 단추가 있어 지울 때만 연다.
 *
 * 예전 이름은 「파기 스케줄러」였다. 언제 대기에 올릴지(자동 파기 · 보관기간)는 시스템 >
 * 스케줄러(ADM-13-2)가 정하고, 이 화면은 그 값을 읽기만 한다.
 *
 * 주소가 [id]와 한 자리를 쓰지만 부딪히지 않는다 — 회원 번호는 M- · S-로 시작하고,
 * 못 박은 마디가 갈라진 마디보다 먼저 걸린다.
 */
export default function Admin2PurgePage() {
  return <PurgeView />;
}
