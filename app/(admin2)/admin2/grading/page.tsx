import GradingView from "./GradingView";

export const metadata = { title: "평가 채점" };

/*
 * EXP-04 평가 채점 — AI 1차 채점을 사람이 확정한다.
 *
 * 자료는 전문가 콘솔의 저장소(lib/expertStore.ts)를 그대로 쓴다. 같은 일을 두 콘솔이
 * 각자의 값으로 들고 있으면 한쪽에서 확정한 것이 다른 쪽에서는 대기로 남는다.
 */
export default function Admin2GradingPage() {
  return <GradingView />;
}
