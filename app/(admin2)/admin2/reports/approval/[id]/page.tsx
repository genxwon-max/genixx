import ReportDetail from "./ReportDetail";

export const metadata = { title: "리포트 상세" };

/*
 * EXP-08 리포트 상세 — 이 회원에게 나갈 글 전문.
 *
 * 목록은 「누구에게 언제 보내나」까지만 답한다. 보내기 전에 사람이 실제로 하는 일은 **읽는
 * 것**이고, 그것은 블록 전문과 그 블록이 어떤 규칙으로 뽑혔는지를 나란히 놓아야 된다 —
 * 근거 없이 문장만 보여 주면 검토자는 읽기 좋은 글인지만 보게 되고, 정작 이 아이 자료에서
 * 나온 말인지는 확인할 수 없다.
 *
 * ⚠ 문구를 여기서 고치지 않는다. 아이 하나의 문구를 덮어쓰는 일은 구식 콘솔의 리포트 승인
 *   화면에 이미 있고(components/admin/ReportApproval.tsx), 같은 값을 두 자리에서 고치면
 *   뒤엣것이 이긴다. 이 화면은 읽고 내보내는 자리다. 문구 자체가 잘못됐으면 템플릿을 고쳐야
 *   하고 그 자리는 해석 템플릿(ADM-08-1)이다 — 같은 템플릿이 다음 아이에게도 같은 문제를
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
