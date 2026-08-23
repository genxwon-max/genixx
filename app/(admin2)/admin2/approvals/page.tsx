import { approvals } from "@/lib/admin";
import { DescList, PageHead, Panel, SeedNote, Status, Tag } from "@/components/admin2/ui";

export const metadata = { title: "가입 승인" };

/*
 * ADM-02-2 가입 승인 — 슈퍼 관리자용.
 *
 * ── 표가 아니라 줄마다 판(Panel)으로 쌓은 이유 ──
 * 이 콘솔의 다른 화면은 전부 DataTable이다. 여기만 아니다. 줄이 다섯뿐인데 한 줄에서
 * 사람이 실제로 읽어야 하는 것이 「신청 내용 한 문장 · 제출 증빙 목록 · 자동 점검 경고
 * 한 문장」으로 길다. 이걸 칸에 넣으면 셋 다 a2-clip 말줄임이 되고, 결국 줄마다 눌러
 * 펼쳐 봐야 판단이 선다. 그러면 표의 유일한 값어치인 「세로로 훑기」가 남지 않는다.
 * 훑는 화면이 아니라 **한 건씩 읽고 두 버튼 중 하나를 누르는** 화면이므로 판으로 간다.
 * 건수가 수십 건으로 늘면 그때는 표로 갈아야 한다 — 판 스무 장은 스크롤로 답이 없다.
 *
 * ── 순서 ──
 * lib/admin.ts의 배열 순서(신청 시각 내림차순) 그대로 둔다. 경고 있는 건을 위로 끌어
 * 올리지 않았다 — 처리 순서가 접수 순서와 어긋나면 「왜 늦게 온 신청이 먼저 됐나」에
 * 답할 수 없고, 다섯 줄에서 정렬로 아낄 시간도 없다.
 *
 * ── 일부러 뺀 것 ──
 * 검색·거르개·쪽넘김: 다섯 줄에 도구 줄을 얹으면 도구가 내용보다 크다.
 * 신청자 연락처·생년월일: 승인 판단에 필요 없고, 이 화면에는 마스킹된 원본조차 없다.
 * 일괄 승인 체크상자: 증빙을 읽지 않고 다섯 개를 한 번에 넘기게 만드는 장치라 두지 않는다.
 *
 * ⚠ 이름·기관·시각은 전부 예시다(lib/admin.ts).
 */

/* 종류는 둘뿐이고 글자가 두 자라 색(a2-tag-accent)까지 나누지 않는다 —
   두 값짜리 구분에 색을 쓰면 정작 색이 필요한 자동 점검 경고가 묻힌다. */
const kindLabel = { teacher: "교사", org: "기관" } as const;

export default function Admin2Approvals() {
  const warned = approvals.filter((a) => a.warning).length;

  return (
    <>
      {/* 머리에 적는 두 숫자가 이 화면의 전부다 — 몇 건 밀렸나, 그중 손이 더 갈 건 몇 건인가.
          경고 건수는 Status로 적어 아래 판들의 경고 표시와 같은 점·같은 색으로 이어 둔다. */}
      <PageHead
        title="가입 승인"
        meta={
          <>
            <span>
              대기 <span className="a2-num text-(--a2-ink)">{approvals.length}</span>건
            </span>
            <span aria-hidden>·</span>
            {warned > 0 ? (
              <Status tone="warn">자동 점검 경고 {warned}건</Status>
            ) : (
              <Status tone="muted">자동 점검 경고 없음</Status>
            )}
          </>
        }
      />

      <div className="grid gap-2">
        {approvals.map((a) => (
          <Panel key={a.id} flush>
            {/* 판의 머리 — 「무엇을 누가」까지만. Panel의 title은 문자열만 받아 신청 ID를
                고정폭으로 세울 수 없어서 a2-panel-head를 직접 짠다.
                칸 순서는 ID → 종류 → 이름 → 소속: 다섯 판을 위아래로 훑을 때 왼쪽 끝이
                자릿수가 같은 ID로 정렬돼야 「아까 그 건」을 눈으로 되찾는다.
                버튼은 콘솔의 다른 판과 같이 머리 오른쪽에 둔다. 본문 네 줄이 100px도
                안 되어 버튼을 아래로 내려도 「읽고 나서 누른다」가 달라지지 않는다. */}
            <div className="a2-panel-head">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="a2-mono a2-t-sm text-(--a2-ink-3)">{a.id}</span>
                <Tag>{kindLabel[a.kind]}</Tag>
                <h2 className="a2-h truncate">{a.name}</h2>
                <span className="truncate a2-t-sm text-(--a2-ink-2)">{a.org}</span>
              </div>
              {/* 아직 붙일 곳이 없어 자리만 세운다. 승인이 주 버튼, 반려는 테두리만 —
                  둘 다 칠해 두면 어느 쪽이 되돌릴 수 없는 쪽인지 순간에 못 가른다.
                  판이 다섯이라 같은 글자의 버튼이 열 개 서므로 aria-label에 ID를 붙인다. */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" aria-label={`${a.id} 승인`} className="a2-btn a2-btn-sm a2-btn-primary">
                  승인
                </button>
                <button type="button" aria-label={`${a.id} 반려`} className="a2-btn a2-btn-sm a2-btn-danger">
                  반려
                </button>
              </div>
            </div>

            {/* 자동 점검을 첫 줄에 올린다. 다섯 판을 훑을 때 머리 바로 아래 같은 자리에서
                경고 유무가 잡혀야 어느 건부터 열어 볼지 정해진다.
                경고가 없을 때도 줄을 지우지 않고 「이상 없음」을 적는다 — 줄이 비어 있으면
                점검을 통과한 건지 점검을 안 돌린 건지 구분되지 않는다.
                아래 셋은 읽는 차례대로 신청 내용 → 제출 증빙 → 신청 시각. 시각을 맨 뒤로
                민 것은 판단을 바꾸는 값이 아니라 밀린 정도만 알려 주기 때문이다. */}
            <div className="p-3">
              <DescList
                rows={[
                  {
                    k: "자동 점검",
                    v: a.warning ? (
                      <>
                        <Status tone="warn">경고</Status>{" "}
                        <span className="text-(--a2-ink)">{a.warning}</span>
                      </>
                    ) : (
                      <Status tone="muted">이상 없음</Status>
                    ),
                  },
                  { k: "신청 내용", v: a.detail },
                  { k: "제출 증빙", v: a.proof },
                  { k: "신청 시각", v: <span className="a2-mono">{a.requestedAt}</span> },
                ]}
              />
            </div>
          </Panel>
        ))}
      </div>

      <SeedNote>
        이 화면의 이름·기관·시각은 화면 설계를 위한 예시입니다. 실제 신청이 아니며, 승인·반려 버튼은 아직 아무 것도
        하지 않습니다.
      </SeedNote>
    </>
  );
}
