import MembersView from "./MembersView";

export const metadata = { title: "회원 채점" };

/*
 * EXP-04-1 회원 채점 — 답안지 한 장 단위로 본다.
 *
 * 평가 채점(EXP-04)과 같은 자료를 보되 묶는 단위가 다르다. 저쪽은 응답, 여기는 사람 —
 * 리포트에 실리는 것이 응답 하나가 아니라 답안지 한 장이기 때문이다.
 */
export default function Admin2GradingMembersPage() {
  return <MembersView />;
}
