import { items, itemStates, type ItemRow } from "@/lib/admin";
import { n, pct } from "@/lib/admin2";
import { Kpi, PageHead, SeedNote } from "@/components/admin2/ui";
import ItemsTable from "./ItemsTable";
import { selfReview, stateRank } from "./order";

export const metadata = { title: "문항 은행" };

/*
 * ADM-04 문항 은행 — 문항 한 벌을 상태별로 보는 한 장.
 *
 * 이 화면을 여는 사람이 던지는 질문은 둘이다.
 *   ① 지금 검수가 몇 건 걸려 있나        지표 다섯 칸
 *   ② 그중 무엇부터 보나 · 이 문항 어디 갔나  표 한 장, 검수 대기 먼저
 *
 * 지표를 다섯으로 끊은 것은 문항 하나가 지나는 자리가 다섯이기 때문이다(작성중 · 검수
 * 대기 · 승인 · 사용 중지 + 전체). 여섯 번째가 될 뻔한 「수정 요청」은 칸을 따로 세우지
 * 않고 검수 대기 아래에 붙였다 — 둘 다 사람 손이 가야 하는 같은 무리이고, 다섯 칸 띠가
 * 여섯이 되면 1440 폭에서 한 줄에 안 들어와 표 머리가 한 줄만큼 더 밀린다.
 *
 * 오른쪽 동작 단추를 두지 않았다. 이 화면에서 실제로 할 수 있는 일(문항 만들기 · 상세
 * 열기)의 화면이 /admin2에 아직 없다. 동작하지 않는 단추를 자리만 잡아 두지 않는다.
 *
 * ⚠ 숫자는 전부 예시다(lib/admin.ts). 화면 맨 아래에 그렇게 적어 둔다.
 */

const byState = (s: ItemRow["state"]) => items.filter((i) => i.state === s).length;

/** 검수자가 아직 안 붙은 문항 — 검수 대기가 안 줄어드는 날 대개 여기가 원인이다 */
const unassigned = items.filter((i) => i.reviewer === null).length;
/** 지난 회차에 실제로 나간 문항 — 정답률이 있는 줄이 곧 그것이다 */
const used = items.filter((i) => i.correctRate !== null).length;
/** 이해충돌(출제자 = 검수자) 위반 줄. 0이면 머리에 아무 줄도 세우지 않는다 —
 *  늘 서 있는 「위반 0건」은 며칠이면 눈에서 사라져 정작 1이 되어도 안 보인다 */
const conflicts = items.filter(selfReview).length;

/*
 * 기본 줄 순서 — 손이 가야 하는 상태(검수 대기 → 수정 요청)를 위로 올린다(order.ts).
 * 같은 상태끼리는 문항 ID 오름차순으로 못 박는다. 원본 배열 순서 그대로 두면 데이터를
 * 한 줄 끼워 넣을 때마다 표가 다르게 서서 「아까 그 줄」로 못 돌아간다.
 * DataTable에 기본 정렬 prop이 없으므로 여기서 미리 정렬해 넘긴다.
 */
const rows = [...items].sort(
  (a, b) => stateRank(a.state) - stateRank(b.state) || a.id.localeCompare(b.id),
);

export default function Admin2ItemsPage() {
  return (
    <>
      <PageHead
        title="문항 은행"
        meta={
          <>
            <span>
              전체 <span className="a2-num text-(--a2-ink-2)">{n(items.length)}</span>
            </span>
            <span aria-hidden>·</span>
            <span>
              과목 {new Set(items.map((i) => i.subject)).size} · 재능 축 {new Set(items.map((i) => i.axis)).size}
            </span>
            {conflicts > 0 && (
              <>
                <span aria-hidden>·</span>
                <span style={{ color: "var(--a2-danger)" }}>자가 검수 {n(conflicts)}건</span>
              </>
            )}
          </>
        }
      />

      {/* ① 어느 상태에 몰려 있나 */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="전체 문항" value={n(items.length)} unit="문항" sub={`지난 회차 출제 ${n(used)}건`} />
        <Kpi
          label={itemStates.draft.label}
          value={n(byState("draft"))}
          unit="문항"
          sub={`검수자 미배정 ${n(unassigned)}건`}
        />
        <Kpi
          label={itemStates.review.label}
          value={n(byState("review"))}
          unit="문항"
          sub={`${itemStates.revise.label} ${n(byState("revise"))}건`}
        />
        <Kpi
          label={itemStates.approved.label}
          value={n(byState("approved"))}
          unit="문항"
          sub={`전체의 ${pct(byState("approved"), items.length)}%`}
        />
        <Kpi
          label={itemStates.retired.label}
          value={n(byState("retired"))}
          unit="문항"
          sub="회차 편성에서 제외"
        />
      </div>

      {/* ② 무엇부터 보나 */}
      <div className="mt-3">
        <ItemsTable rows={rows} />
      </div>

      <SeedNote>
        이 화면의 문항·출제자·정답률은 화면 설계를 위한 예시입니다. 실제 문항 은행이 아니며, 붙일 때는 문항 API의
        응답으로 갈아 끼웁니다. 목록에는 보기와 정답을 그리지 않습니다 — 문항 상세에서만 엽니다.
      </SeedNote>
    </>
  );
}
