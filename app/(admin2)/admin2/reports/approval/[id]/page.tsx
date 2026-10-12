import ReportDetail from "./ReportDetail";

export const metadata = { title: "리포트 상세" };

/*
 * EXP-08 리포트 상세 — 이 회원에게 나갈 글과, 그것이 언제 나가는가.
 *
 * 목록은 「누구의 리포트가 언제 나가나」까지만 답한다. 예정일 전에 사람이 실제로 하는 일은
 * **읽는 것**이다 — 「리포트 보기」에서 회원이 받는 꼴 그대로 읽고, 그 안에서 고친다. 먼저
 * 내보내야 하면 「지금 발행」을 누르고, 가만히 두면 예정일 아침에 스케줄러가 발행한다.
 *
 * ⚠ 여기서 고치는 것은 이 아이 하나의 문구다. 문구 자체가 잘못됐으면 템플릿을 고쳐야 하고
 *   그 자리는 해석 템플릿(ADM-08-1)이다 — 같은 템플릿이 다음 아이에게도 같은 문제를
 *   일으키기 때문이다.
 *
 * ⚠ key를 리포트 번호로 준다. 같은 경로 꼴 안에서 건만 갈아 끼우면 React가 조각을 그대로
 *   두어, 앞 아이의 화면 상태가 다음 아이에게 남는다.
 */
export default async function Admin2ReportApprovalDetailPage({
  params,
}: PageProps<"/admin2/reports/approval/[id]">) {
  const { id } = await params;
  return <ReportDetail key={id} id={id} />;
}
