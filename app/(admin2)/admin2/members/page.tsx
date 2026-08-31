import Link from "next/link";
import { n, queueCounts } from "@/lib/admin2";
import { PageHead, SeedNote } from "@/components/admin2/ui";
import MemberCounts from "./MemberCounts";
import MembersTable from "./MembersTable";

export const metadata = { title: "회원" };

/*
 * ADM-02 회원 — 학부모·교사 명부.
 *
 * 이 화면에 오는 길은 둘이다. ① 문의나 결제에서 들고 온 ID로 사람을 찾아 상태를 본다.
 * ② 「승인 대기가 몇인지」처럼 무리를 센다. 그래서 머리에는 설명 대신 세 숫자만 세운다 —
 * 학부모 수 · 교사 수 · 지금 걸려 있는 교사 승인 대기. 앞의 둘은 규모, 마지막은 할 일이다.
 *
 * ── 판 하나로 두른 까닭 ──
 * 다른 화면(PageHead + 지표 띠 + 표)은 제목이 판 바깥의 회색 바탕 위에 선다. 그 자리는
 * 원래 제목 오른쪽에 동작 단추를 세우려고 비워 둔 자리인데, 이 화면은 지표 띠가 없어서
 * 판이 표 하나뿐이다. 그러면 제목·숫자·단추 셋이 회색 바탕 위에 흩어져 뜨고, 정작 흰
 * 판은 표에서만 시작한다 — 어디까지가 이 화면인지가 안 읽힌다.
 * 제목부터 쪽 넘김까지를 흰 판 하나에 넣고 제목을 가운데 세운다. 안쪽은 가로선으로만
 * 나눈다(머리 / 탭 / 도구 줄 / 표 / 쪽 넘김): 판 안에 판을 또 두르면 1px 선이 두 겹이 된다.
 *
 * 지표 칸(Kpi)은 여기 쓰지 않는다. 넉 줄짜리 지표 띠를 얹으면 표 머리가 100px쯤 밀리는데,
 * 이 화면에서 실제로 쓰는 숫자는 승인 대기 하나뿐이다. 한 개를 위해 띠를 두르지 않는다.
 *
 * 숫자 셋은 클라이언트에서 센다(MemberCounts). 상세 화면에서 고친 상태가 브라우저
 * 저장소에 있어, 서버에서 세어 박아 두면 교사 하나를 정지시키고 돌아온 화면의 머리만
 * 옛 수로 남는다.
 *
 * 오른쪽 단추 둘은 이 화면에서 못 하는 일로 나가는 문이다. 승인 처리와 학생 계정은
 * 각각 제 화면(ADM-02-2 · ADM-02-1)에 있고, 여기에 되풀이해 두면 같은 일을 두 곳에서
 * 하게 된다. 한 사람을 고치는 일은 표 오른쪽 끝의 「수정하기」로 상세(ADM-02-3)에서 한다.
 *
 * 개인정보: 원본이 이미 가려 둔 메일·전화만 그린다. 생년월일·주소·주민번호는 데이터에도
 * 없고 칸도 만들지 않는다.
 */
export default function Admin2MembersPage() {
  return (
    <>
      <PageHead
        title="회원"
        meta={<MemberCounts />}
        actions={
          <>
            <Link href="/admin2/students" className="a2-btn">
              학생·접속코드
            </Link>
            {/* 둘 다 이 화면에서 못 하는 일로 나가는 문이지만, 신청이 걸려 있는 동안에는
                그쪽이 오늘의 동작이다. 단추 둘을 똑같이 그려 두면 「나가는 문이 둘 있다」
                까지만 읽히고 어느 쪽이 급한지는 안 읽힌다.
                ⚠ 여기 수는 queueCounts.approvals(처리할 신청서)다. 위 머리의 「교사 승인
                대기」(계정 상태가 승인 대기인 교사)가 아니다 — 눌러서 가는 화면에 서 있는
                줄 수와 기둥의 배지가 이 수와 같아야 한다 */}
            <Link
              href="/admin2/approvals"
              className={`a2-btn ${queueCounts.approvals ? "a2-btn-primary" : ""}`}
            >
              가입 승인
              {queueCounts.approvals > 0 && <span className="a2-num">{n(queueCounts.approvals)}</span>}
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
