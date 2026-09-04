import Link from "next/link";
import { PageHead } from "@/components/admin2/ui";
import ApprovalsLink from "./ApprovalsLink";
import MembersTable from "./MembersTable";

export const metadata = { title: "회원" };

/*
 * ADM-02 회원 — 학부모·교사 명부.
 *
 * 이 화면에 오는 길은 둘이다. ① 문의나 결제에서 들고 온 ID로 사람을 찾아 상태를 본다.
 * ② 「승인 대기가 몇인지」처럼 무리를 센다. 머리에는 그 어느 쪽 설명도 두지 않는다 —
 * 규모는 표 위 도구 줄의 결과 수가, 할 일은 오른쪽 「가입 승인 N」 단추가 이미 말한다.
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
        actions={
          <>
            <Link href="/admin2/students" className="a2-btn">
              학생·접속코드
            </Link>
            <ApprovalsLink />
          </>
        }
      />

      <MembersTable />
    </>
  );
}
