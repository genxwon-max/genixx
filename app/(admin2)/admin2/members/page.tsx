import Link from "next/link";
import { n } from "@/lib/admin2";
import { parents, teachers } from "@/lib/adminUsers";
import { PageHead, SeedNote } from "@/components/admin2/ui";
import MembersTable from "./MembersTable";

export const metadata = { title: "회원" };

/*
 * ADM-02 회원 — 학부모·교사 명부.
 *
 * 이 화면에 오는 길은 둘이다. ① 문의나 결제에서 들고 온 ID로 사람을 찾아 상태를 본다.
 * ② 「승인 대기가 몇인지」처럼 무리를 센다. 그래서 머리에는 설명 대신 세 숫자만 세운다 —
 * 학부모 수 · 교사 수 · 지금 걸려 있는 승인 대기. 앞의 둘은 규모, 마지막은 오늘 할 일이다.
 *
 * 지표 칸(Kpi)을 쓰지 않았다. 넉 줄짜리 지표 띠를 얹으면 표 머리가 100px쯤 밀리는데,
 * 이 화면에서 실제로 쓰는 숫자는 승인 대기 하나뿐이다. 한 개를 위해 띠를 두르지 않는다.
 *
 * 오른쪽 단추 둘은 이 화면에서 못 하는 일로 나가는 문이다. 승인 처리와 학생 계정은
 * 각각 제 화면(ADM-02-2 · ADM-02-1)에 있고, 여기에 되풀이해 두면 같은 일을 두 곳에서
 * 하게 된다. 동작하지 않는 「내보내기」 같은 단추는 두지 않았다.
 *
 * 개인정보: 원본이 이미 가려 둔 메일·전화만 그린다. 생년월일·주소·주민번호는 데이터에도
 * 없고 칸도 만들지 않는다.
 */

/*
 * 교사 가입은 증빙 확인을 거치므로 승인 대기가 쌓인다. 학부모에는 이 상태가 없다.
 *
 * 이름을 「교사 승인 대기」로 못 박는다 — 그냥 「승인 대기」로 적었더니 바로 옆 단추와
 * 왼쪽 기둥의 「가입 승인 5」(신청 건수, lib/admin2.ts queueCounts)와 같은 말로 다른 수가
 * 되었다. 여기 12는 계정 상태가 승인 대기인 교사 계정 수이고 저기 5는 처리할 신청서 수다.
 */
const waitingApproval = teachers.filter((t) => t.state === "pending").length;

export default function Admin2MembersPage() {
  return (
    <>
      <PageHead
        title="회원"
        meta={
          <>
            <span>
              학부모 <span className="a2-num text-(--a2-ink-2)">{n(parents.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              교사 <span className="a2-num text-(--a2-ink-2)">{n(teachers.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              승인 대기 <span className="a2-num text-(--a2-ink-2)">{n(waitingApproval)}</span>
            </span>
          </>
        }
        actions={
          <>
            <Link href="/admin2/students" className="a2-btn">
              학생·접속코드
            </Link>
            <Link href="/admin2/approvals" className="a2-btn">
              가입 승인
            </Link>
          </>
        }
      />

      <MembersTable />

      <SeedNote>
        이 화면의 회원·연락처는 화면 설계를 위한 예시입니다. 실존 인물이 아니며, 메일과 전화는 데이터를 만들 때부터
        가려진 형태로만 두었습니다 — 관리자 화면 설계본에 온전한 연락처가 남아 있을 이유가 없습니다.
      </SeedNote>
    </>
  );
}
