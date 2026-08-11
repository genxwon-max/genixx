import { items, itemStates } from "@/lib/admin";
import { PageHead, TableCard, Badge, StatCard } from "@/components/admin/Parts";
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

export default function ItemsPage() {
  const waiting = items.filter((i) => i.state === "review").length;

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
        <ol className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {flow.map((f) => (
            <li key={f.step} className="rounded-lg border border-exam-line bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 adm-t-sm font-black text-white">
                {f.step}
              </span>
              <p className="mt-3 adm-t-lg font-black text-exam-text">{f.label}</p>
              <p className="mt-1 adm-t-sm text-exam-muted">{f.desc}</p>
            </li>
          ))}
        </ol>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="검수를 기다리는 문항"
            value={waiting}
            unit="건"
            note="다음 회차 배치 전까지 끝내야 합니다"
            tone="warn"
          />
          <StatCard
            label="승인된 문항"
            value={items.filter((i) => i.state === "approved").length}
            unit="건"
            note="회차에 바로 넣을 수 있습니다"
            tone="good"
          />
          <StatCard
            label="사용 중지"
            value={items.filter((i) => i.state === "retired").length}
            unit="건"
            note="정답률이 한쪽으로 치우친 문항"
          />
        </div>

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
                          {q.correctRate}%{odd && <span className="block adm-t-sm">다시 볼 것</span>}
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
      </PermissionGate>
    </>
  );
}
