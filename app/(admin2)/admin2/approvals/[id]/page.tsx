import Link from "next/link";
import { findApproval } from "@/lib/admin";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import ApprovalDetail from "./ApprovalDetail";

export const metadata = { title: "가입 신청 상세" };

/**
 * ADM-02-2-1 가입 신청 상세 — 한 건.
 *
 * 목록(ADM-02-2)이 답하지 못하는 것 셋을 여기서 답한다 —
 *  ① 무엇을 근거로 신청했나 (신청 내용 · 제출 증빙)
 *  ② 자동 점검이 무엇을 걸었나 (경고 전문)
 *  ③ 승인할까 반려할까, 그리고 그 까닭
 *
 * 신청서는 서버에서 읽을 수 있으므로(lib/admin.ts) 건 찾기는 여기서 끝낸다. 처리 결과는
 * 브라우저 저장소에만 있어(lib/approvalStore.ts) 안쪽만 클라이언트다.
 */
export default async function Admin2ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!findApproval(id)) {
    return (
      <>
        <PageHead
          title="신청을 찾지 못했습니다"
          back={
            <Link href="/admin2/approvals" className="a2-btn">
              ← 이전으로
            </Link>
          }
        />
        <Body>
          <Panel title="없는 신청">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 번호를 가진 가입 신청이 없습니다. 주소가
              잘못되었거나 이미 지워진 건일 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* key를 신청 번호로 준다. 같은 경로 꼴 안에서 건만 갈아 끼우면 React가 컴포넌트를
     그대로 두어, 앞 건에 적던 반려 사유가 다음 건 화면에 그대로 남는다. */
  return <ApprovalDetail key={id} id={id} />;
}
