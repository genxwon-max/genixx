import Link from "next/link";
import { findMember } from "@/lib/adminUsers";
import { Body, PageHead, Panel } from "@/components/admin2/ui";
import MemberDetail from "./MemberDetail";

export const metadata = { title: "회원 상세" };

/**
 * ADM-02-3 회원 상세 — 한 사람.
 *
 * 목록(ADM-02)이 답하지 못하는 것 셋을 여기서 답한다 —
 *  ① 이 사람이 무엇을 들고 있나 (등록한 학생 · 담당 학급)
 *  ② 이 계정을 막을까 열까 (정지 · 해제 · 탈퇴)
 *  ③ 이 계정에 그동안 무슨 조치가 있었나 (기록)
 *
 * 명부는 서버에서 읽을 수 있으므로(lib/adminUsers.ts) 사람 찾기는 여기서 끝낸다.
 * 고친 값은 브라우저 저장소에만 있어(lib/directoryStore.ts) 안쪽만 클라이언트다.
 */
export default async function Admin2MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = findMember(id);

  if (!found) {
    return (
      <>
        <PageHead
          title="회원을 찾지 못했습니다"
          actions={
            <Link href="/admin2/members" className="a2-btn">
              회원 목록
            </Link>
          }
        />
        <Body>
          <Panel title="없는 회원">
            <p className="a2-t-sm text-(--a2-ink-2)">
              <span className="a2-mono">{id}</span> 번호를 가진 학부모·교사가 명부에 없습니다. 주소가 잘못되었거나
              학생·기관·운영자 번호일 수 있습니다.
            </p>
          </Panel>
        </Body>
      </>
    );
  }

  /* key를 회원 번호로 준다. 같은 경로 꼴 안에서 사람만 갈아 끼우면 React가 컴포넌트를
     그대로 두어, 앞 사람에게 적던 정지 사유가 다음 사람 화면에 그대로 남는다. */
  return <MemberDetail key={id} {...found} />;
}
