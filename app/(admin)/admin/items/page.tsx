import { items, itemStates } from "@/lib/admin";
import {
  AnchorSection,
  Badge,
  CountRows,
  Foldable,
  PageHead,
  PlannedSection,
  TableCard,
} from "@/components/admin/Parts";
import PermissionGate from "@/components/admin/PermissionGate";
import * as a from "@/components/admin/ui";

export const metadata = { title: "문항 은행 · GENIXX 관리자" };

/** 문항이 거치는 단계. 순서를 그림 대신 글자로 적는다. */
const flow = [
  { step: "1", label: "작성", desc: "출제위원이 학년별 성취기준에 맞춰 만듭니다" },
  { step: "2", label: "교차 검수", desc: "작성자가 아닌 다른 사람이 반드시 봅니다" },
  { step: "3", label: "승인", desc: "승인된 문항만 회차에 배치할 수 있습니다" },
  { step: "4", label: "출제 후 점검", desc: "정답률이 너무 높거나 낮으면 사용을 멈춥니다" },
];

const countOf = (state: (typeof items)[number]["state"]) =>
  items.filter((i) => i.state === state).length;

const counts = [
  {
    label: "검수를 기다리는 문항",
    value: countOf("review"),
    unit: "건",
    note: "다음 회차 배치 전까지",
  },
  {
    label: "승인된 문항",
    value: countOf("approved"),
    unit: "건",
    note: "회차에 바로 넣을 수 있습니다",
  },
  {
    label: "사용 중지",
    value: countOf("retired"),
    unit: "건",
    note: "정답률이 한쪽으로 치우친 문항",
  },
];

export default function ItemsPage() {
  return (
    <>
      <PageHead
        id="ADM-05"
        title="문항 은행"
        lead="문항을 만들고, 다른 사람이 검수하고, 승인된 것만 회차에 넣습니다. 작성자 본인은 자기 문항을 검수할 수 없습니다."
        action={
          <>
            <button type="button" className={a.btnGhost}>
              문항 내려받기
            </button>
            <button type="button" className={a.btnPrimary}>
              새 문항 만들기
            </button>
          </>
        }
      />

      <PermissionGate need="item.review">
        {/* 단계 설명은 처음 한 번 읽으면 되는 글이다. 매일 오는 사람에게 화면 위쪽
            네 칸을 계속 내주지 않도록 접어 두고, 필요할 때만 펼치게 한다. */}
        <div className="mb-5">
          <Foldable title="문항이 거치는 네 단계">
            <ol>
              {flow.map((f) => (
                <li key={f.step} className="flex flex-wrap items-baseline gap-x-2.5 py-1.5">
                  <span className="adm-t-sm tabular-nums text-exam-muted">{f.step}</span>
                  <span className="adm-t-md font-bold text-exam-text">{f.label}</span>
                  <span className="adm-t-sm text-exam-muted">{f.desc}</span>
                </li>
              ))}
            </ol>
          </Foldable>
        </div>

        <div className="mb-6">
          <CountRows rows={counts} />
        </div>

        <AnchorSection
          id="ADM-04-1"
          title="문항 CRUD · 버전"
          lead="승인된 문항을 좌표·태그·난이도·상태로 훑습니다. 고치는 일은 출제 워크벤치(EXP-02)에서 합니다."
        >
        <TableCard
          title={`전체 문항 ${items.length}건`}
          caption="정답률이 90%를 넘거나 40% 아래로 떨어지면 변별이 되지 않아 다시 봅니다."
        >
          <table className={a.table}>
            <thead>
              <tr>
                <th className={a.th}>문항번호</th>
                <th className={a.th}>과목 · 학년</th>
                <th className={a.th}>유형</th>
                <th className={a.th}>재능 축</th>
                <th className={a.th}>발문</th>
                <th className={a.th}>작성</th>
                <th className={a.th}>검수</th>
                <th className={a.th}>지난 회차 정답률</th>
                <th className={a.th}>상태</th>
                <th className={a.th}>할 일</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => {
                const odd = q.correctRate !== null && (q.correctRate > 90 || q.correctRate < 40);
                return (
                  <tr key={q.id}>
                    <td className={a.tdStrong}>{q.id}</td>
                    <td className={a.td}>
                      {q.subject} · {q.grade}
                    </td>
                    <td className={a.td}>{q.type}</td>
                    <td className={a.td}>{q.axis}</td>
                    <td className={`${a.td} min-w-[18rem] text-left`}>{q.stem}</td>
                    <td className={a.td}>{q.author}</td>
                    <td className={a.td}>{q.reviewer ?? "미배정"}</td>
                    <td className={a.tdNum}>
                      {q.correctRate === null ? (
                        "출제 전"
                      ) : (
                        <span className={odd ? "font-bold text-rose-700" : undefined}>
                          {q.correctRate}%
                          {odd && <span className="block adm-t-sm">다시 볼 것</span>}
                        </span>
                      )}
                    </td>
                    <td className={a.td}>
                      <Badge {...itemStates[q.state]} />
                    </td>
                    <td className={a.td}>
                      <button
                        type="button"
                        className={q.state === "review" ? a.btnRow : a.btnRowGhost}
                      >
                        {q.state === "review" ? "검수하기" : "열어 보기"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
        </AnchorSection>

        <div className="mt-8 space-y-8">
          <PlannedSection
            id="ADM-04-2"
            title="앵커 문항"
            lead="회차가 달라도 같은 잣대로 재려면, 공개하지 않고 오래 쓰는 기준 문항이 필요합니다."
            todo={[
              "앵커군 지정·해제와 노출 이력 — 한 번이라도 공개된 문항은 앵커로 쓸 수 없습니다",
              "회차 간 등화(equating) 계산에 들어간 앵커 목록과 그때의 모수",
              "앵커는 문항 목록에서 따로 감춥니다. 검사지 조립 화면에도 뜨지 않습니다",
            ]}
          />
          <PlannedSection
            id="ADM-04-3"
            title="검사지 조립"
            lead="승인된 문항을 골라 한 회차의 검사지를 만듭니다. AI가 조합을 제안하고 사람이 확정합니다."
            todo={[
              "재능 축 × S1~S4 배분이 발주 사양과 맞는지 대조",
              "forms · form_items 스키마 — 어떤 판의 어떤 문항이 몇 번에 놓였는지",
              "확정 전에는 조립본을 미리보기로만 열 수 있게 합니다",
            ]}
          />
          <PlannedSection
            id="ADM-04-4"
            title="문항 회전 · 보안"
            lead="같은 문항이 같은 자리에 계속 나오면 문항이 새어 나갑니다."
            todo={[
              "응시자별 동적 할당 — 57문항 중 55문항처럼 겹치되 같지 않게",
              "캡처·드래그 차단과 그 한계를 함께 적기 (막을 수 있는 것과 없는 것)",
              "문항별 노출 횟수와 마지막 사용 회차 — 회전 판단의 근거",
            ]}
          />
        </div>
      </PermissionGate>
    </>
  );
}
