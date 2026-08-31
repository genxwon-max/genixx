import { caseStates, currentRound, gradingQueue, type CaseState } from "@/lib/admin";
import { n, queueCounts } from "@/lib/admin2";
import { Kpi, PageHead, SeedNote } from "@/components/admin2/ui";
import QueueTable from "./QueueTable";

export const metadata = { title: "판정 큐" };

/*
 * EXP-07 판정 큐 — 사람이 손대야 하는 케이스만 모아 둔 한 장.
 *
 * 이 화면을 여는 사람이 던지는 질문은 하나다. 「지금 내가 먼저 봐야 할 케이스가 무엇인가」.
 * 그래서 지표 넉 줄과 표 한 장 말고는 아무것도 두지 않았다 —
 *
 *   ① 얼마나 쌓였고 어느 단계에 몰려 있나   지표 넉 줄(전체 · AI · 검토중 · 회의)
 *   ② 그중 무엇부터 보나                     표 한 장, 신뢰도 낮은 순
 *
 * ⚠ 화면 전체에 거는 동작(일괄 확정·일괄 배정 같은 것)은 일부러 두지 않았다. 판정은
 *   케이스를 하나씩 열어 근거를 보고 정하는 일이고, 머리에 일괄 버튼이 서 있으면
 *   급한 날 그것부터 눌린다. 동작은 표 오른쪽 끝의 줄 단위 「열기」 하나뿐이다.
 *
 * ⚠ 숫자는 전부 예시다(lib/admin.ts). 화면 맨 아래에 그렇게 적어 둔다.
 */

const byState = (s: CaseState) => gradingQueue.filter((c) => c.state === s).length;

/** AI가 뱉어 놓았는데 아직 아무도 안 맡은 것 — 이 화면에서 제일 먼저 새는 곳이다 */
const aiUnassigned = gradingQueue.filter((c) => c.state === "ai" && !c.reviewer).length;
/** 검토중을 붙잡고 있는 사람 수 — 한 사람에게 몰렸는지 보는 값 */
const reviewers = new Set(gradingQueue.filter((c) => c.state === "review" && c.reviewer).map((c) => c.reviewer)).size;
/** 회의로 올라간 것 중 신뢰도까지 낮은 것 — 회의에서 제일 오래 걸리는 부류 */
const conferenceLow = gradingQueue.filter((c) => c.state === "conference" && c.confidence < 75).length;

/*
 * 기본 정렬을 신뢰도 오름차순으로 둔다.
 *
 * 이 표를 여는 목적이 「AI를 못 믿을 케이스 찾기」이므로, 첫 화면에서 위쪽 다섯 줄이
 * 곧 오늘 볼 것이어야 한다. 최신순(갱신 시각)으로 두면 방금 AI가 끝낸 신뢰도 94짜리가
 * 맨 위에 서고, 정작 52짜리를 찾으려면 사람이 매번 머리 행을 눌러야 한다.
 *
 * 같은 신뢰도끼리는 갱신이 오래된 것을 위로 올린다 — 오래 방치된 쪽이 급하다.
 * DataTable에 기본 정렬 prop이 없으므로 여기서 미리 정렬해 넘긴다(정렬 상태를 클릭 전에는
 * 건드리지 않으므로 넘긴 순서가 그대로 첫 화면이 된다).
 */
const rows = [...gradingQueue].sort(
  (a, b) => a.confidence - b.confidence || a.updatedAt.localeCompare(b.updatedAt),
);

export default function Admin2QueuePage() {
  return (
    <>
      <PageHead
        title="판정 큐"
        meta={
          <>
            <span>{currentRound.label}</span>
            <span aria-hidden>·</span>
            <span className="a2-mono">{currentRound.period}</span>
            <span aria-hidden>·</span>
            <span>확정 전 {n(queueCounts.cases)}건</span>
          </>
        }
        /* ① 어느 단계에 몰려 있나 — 왼쪽 기둥의 배지와 같은 값을 쓴다(lib/admin2.ts) */
        stats={
          <>
            <Kpi label="전체 케이스" value={n(gradingQueue.length)} unit="건" sub={`확정 전 ${n(queueCounts.cases)}건`} />
            <Kpi
              label={caseStates.ai.label}
              value={n(byState("ai"))}
              unit="건"
              sub={`검토자 미배정 ${n(aiUnassigned)}건`}
            />
            <Kpi label={caseStates.review.label} value={n(byState("review"))} unit="건" sub={`검토자 ${n(reviewers)}명`} />
            <Kpi
              label={caseStates.conference.label}
              value={n(byState("conference"))}
              unit="건"
              sub={`이 중 신뢰도 75 미만 ${n(conferenceLow)}건`}
            />
          </>
        }
      />
      {/* ② 무엇부터 보나 */}
      <QueueTable rows={rows} />

      <SeedNote>
        이 화면의 케이스·신뢰도·검토자는 화면 설계를 위한 예시입니다. 실제 판정 결과가 아니며, 붙일 때는 채점 엔진의
        응답으로 갈아 끼웁니다.
      </SeedNote>
    </>
  );
}
