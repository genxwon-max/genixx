import Link from "next/link";
import { Body, PageHead, SeedNote } from "@/components/admin2/ui";
import RoundsTable from "./RoundsTable";

/**
 * ADM-05 평가 회차.
 *
 * 이 화면은 회차 목록 하나다. 답하는 것도 하나 — 「어느 회차를 손대야 하나」.
 *
 * 한동안 위에 지표 넉 줄(대상·제출·판정·발행)과 「이번 회차」 요약 한 줄을 세워 두었다.
 * 전부 뺐다. 이 화면에 오는 까닭은 대개 **다른** 회차를 열거나 새로 만들려는 것이었고,
 * 지금 회차의 진행은 대시보드가, 무엇이 나가는지는 편성 화면이 훨씬 자세히 답한다 —
 * 같은 값을 세 곳에서 세면 셋이 갈리는 날이 온다. 머리에는 제목과 나가는 문만 둔다.
 *
 * 살아 있는 값을 읽던 것은 그 한 줄뿐이어서, 이 파일에는 이제 클라이언트 코드가 없다.
 * 표(RoundsTable)가 제 몫의 경계를 따로 들고 있다.
 */
export default function RoundsView() {
  return (
    <>
      <PageHead
        title="평가 회차"
        actions={
          <>
            <Link href="/admin2/forms" className="a2-btn">
              평가별 문항관리
            </Link>
            {/* 만드는 일은 목록 위에서 판을 펼치지 않고 제 주소로 간다(ADM-05-1).
                「이번 회차 편성」은 뺐다 — 이 화면에 오는 까닭은 대개 다른 회차를 열려는
                것이고, 지금 회차로 가는 길은 표의 수정하기가 이미 낸다 */}
            <Link href="/admin2/rounds/new" className="a2-btn a2-btn-primary">
              회차 생성
            </Link>
          </>
        }
      />

      <Body>
        <RoundsTable />
      </Body>
      <SeedNote>
        대상 · 제출 · 판정 · 발행 숫자는 화면 설계를 위한 예시입니다(lib/admin.ts). 상태 · 기간 · 편성 칸은 이
        브라우저에 저장된 편성 기록에서 읽고, 여기서 만든 회차도 이 브라우저에만 남습니다.
      </SeedNote>
    </>
  );
}
