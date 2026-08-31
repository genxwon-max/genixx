import Link from "next/link";
import { findStudent } from "@/lib/adminUsers";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import StudentDetail from "./StudentDetail";

export const metadata = { title: "학생 상세" };

/**
 * ADM-02-1-1 학생 상세 — 한 아이의 계정과 접속코드.
 *
 * 목록(ADM-02-1)이 답하지 못하는 것 셋을 여기서 답한다 —
 *  ① 이 코드가 진짜 이 아이 것인가 (재발급하면 옛 코드가 기록에 남는다)
 *  ② 보호자가 누구인가 (회원 상세로 건너간다)
 *  ③ 이 계정을 막을까 열까
 *
 * 명부는 서버에서 읽을 수 있으므로(lib/adminUsers.ts) 학생 찾기는 여기서 끝낸다.
 * 고친 값은 브라우저 저장소에만 있어(lib/directoryStore.ts) 안쪽만 클라이언트다.
 */
export default async function Admin2StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = findStudent(id);

  if (!row) {
    return (
      <>
        <PageHead
          title="학생을 찾지 못했습니다"
          actions={
            <Link href="/admin2/students" className="a2-btn">
              학생 목록
            </Link>
          }
        />
        <Body>
          <Panel title="없는 학생">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 번호를 가진 학생이 명부에 없습니다. 주소가 잘못되었거나
              보호자·교사·기관 번호일 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* key를 학생 번호로 준다 — 앞 아이에게 적던 정지 사유가 다음 아이 화면에 남지 않게 */
  return <StudentDetail key={id} row={row} />;
}
