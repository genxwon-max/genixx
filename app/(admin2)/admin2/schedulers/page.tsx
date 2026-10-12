import SchedulersView from "./SchedulersView";

export const metadata = { title: "스케줄러" };

/*
 * ADM-13-2 스케줄러 — 정해 둔 때에 저절로 일어나는 일을 한곳에서 정한다.
 *
 * 시스템 설정(ADM-13) 아래에 둔다. 한 번 정하면 그 뒤의 모든 리포트와 모든 회원에 걸리는
 * 값이라 성격이 설정에 가깝고, 줄이면 되돌릴 수 없는 일(발행)이 그 자리에서 일어나므로
 * 최상위 관리자가 여는 그룹에 두는 편이 안전하다.
 *
 *   리포트 스케줄러    채점 완료 며칠 뒤 몇 시에 발행하는가(lib/reportSendStore.ts)
 *   개인정보 스케줄러  보관기간이 지난 개인정보를 파기 대기에 올리는가(lib/privacyStore.ts)
 *
 * ── 일하는 화면에는 값만 남긴다 ──
 * 리포트 승인(EXP-08)은 지금 걸린 값을 한 줄로 읽고, 개인정보 파기(ADM-10-1)는 자동 파기가
 * 켜져 있는지만 읽는다. 값을 고치는 자리가 둘이면 어느 쪽이 진짜인지 묻게 된다.
 *
 * ⚠ 저 화면은 예전에 「파기 스케줄러」였다. 값이 여기로 온 뒤로 그 화면이 하는 일은 대기에
 *   오른 것을 지우는 것 하나라, 이름을 「개인정보 파기」로 바꿨다.
 */
export default function Admin2SchedulersPage() {
  return <SchedulersView />;
}
