import Link from "next/link";
import { findOrg } from "@/lib/adminUsers";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import OrgDetail from "./OrgDetail";

export const metadata = { title: "기관 상세" };

/**
 * ORG-02-1 기관 상세 — 한 곳의 계약과 응시권.
 *
 * 명부는 서버에서 읽을 수 있으므로(lib/adminUsers.ts orgDirectory) 기관 찾기는 여기서
 * 끝낸다. 고친 값은 브라우저 저장소에만 있어(lib/directoryStore.ts) 안쪽만 클라이언트다.
 */
export default async function Admin2OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = findOrg(id);

  if (!row) {
    return (
      <>
        <PageHead
          title="기관을 찾지 못했습니다"
          actions={
            <Link href="/admin2/orgs" className="a2-btn">
              기관 목록
            </Link>
          }
        />
        <Body>
          <Panel title="없는 기관">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 번호를 가진 기관이 명부에 없습니다. 주소가 잘못되었거나
              회원·학생 번호일 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  return <OrgDetail key={id} row={row} />;
}
