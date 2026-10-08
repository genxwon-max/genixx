import ApprovalDetail from "./ApprovalDetail";

export const metadata = { title: "가입 신청 상세" };

/**
 * ADM-02-2-1 가입 신청 상세 — 한 건.
 *
 * 목록(ADM-02-2)이 답하지 못하는 것 셋을 여기서 답한다 —
 *  ① 무엇을 근거로 신청했나 (신청 내용 · 제출 증빙)
 *  ② 자동 점검이 무엇을 걸었나 (경고 전문)
 *  ③ 승인할까 반려할까, 그리고 그 까닭 — 전문가 신청이면 **무슨 권한을 줄까**
 *
 * 건 찾기는 안쪽(ApprovalDetail)이 한다. 한동안 여기서 씨앗(lib/admin.ts)을 뒤져 없는
 * 번호를 걸렀는데, 전문가 회원가입으로 들어온 신청은 브라우저 저장소에만 있어서
 * (lib/expertAccountStore.ts) 서버가 「없는 신청」이라고 답해 버린다.
 */
export default async function Admin2ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /* key를 신청 번호로 준다. 같은 경로 꼴 안에서 건만 갈아 끼우면 React가 컴포넌트를
     그대로 두어, 앞 건에 적던 반려 사유가 다음 건 화면에 그대로 남는다. */
  return <ApprovalDetail key={id} id={id} />;
}
