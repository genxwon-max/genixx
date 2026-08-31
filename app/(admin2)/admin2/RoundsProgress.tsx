"use client";

import Link from "next/link";
import { rounds, roundStates } from "@/lib/admin";
import { n, pct, roundTone } from "@/lib/admin2";
import { planOf, useCurrentRound, usePlans } from "@/lib/roundPlanStore";
import { Bar, Kpi, Panel, Status } from "@/components/admin2/ui";
import TableBox from "@/components/admin2/TableBox";

/**
 * 대시보드 ② 「회차는 어디까지 왔나」와 머리의 지금 회차 한 줄.
 *
 * 회차 상태와 기간은 편성 기록(lib/roundPlanStore.ts)이 브라우저에 들고 있다. 서버에서
 * 그리면 씨앗값이 나와, 편성 화면에서 회차를 연 직후 대시보드만 「준비중」이라고 말한다.
 * 대시보드에서 그것이 가장 나쁜 고장이라 이 두 조각만 클라이언트로 내렸다.
 *
 * 대상·제출·판정·발행 숫자는 예시 그대로다(lib/admin.ts). 그 값들은 응시와 채점이
 * 붙어야 생기는 것이라 지금 저장소에 없다.
 */

/** 머리에 붙는 지금 회차 */
export function CurrentRoundMeta() {
  const plans = usePlans();
  const r = useCurrentRound();
  const plan = planOf(plans, r.id);
  return (
    <>
      <span>{r.label}</span>
      <span aria-hidden>·</span>
      <span className="a2-mono">
        {plan.opensOn} – {plan.closesOn}
      </span>
      <span aria-hidden>·</span>
      <Status tone={roundTone[plan.state]}>{roundStates[plan.state].label}</Status>
    </>
  );
}

/**
 * 지표 넉 줄 중 셋째 칸 — 지금 회차의 제출률.
 *
 * 이 칸만 클라이언트인 까닭은 머리와 같다. 서버에서 씨앗의 「열린 회차」로 세었더니
 * 머리는 4회차라고 적고 바로 아래 제출률은 3회차 값을 보여 주었다. 아직 응시가 시작되지
 * 않아 대상이 0인 회차에서는 0%가 아니라 줄표를 적는다 — 0%는 「아무도 안 냈다」로 읽힌다.
 */
export function CurrentRoundKpi() {
  const r = useCurrentRound();
  return (
    <Kpi
      label="회차 제출률"
      value={r.target ? pct(r.submitted, r.target) : "—"}
      unit={r.target ? "%" : undefined}
      sub={r.target ? `${r.label} · ${n(r.submitted)} / ${n(r.target)}명` : `${r.label} · 아직 제출 없음`}
      href="/admin2/rounds"
    />
  );
}

export default function RoundsProgress() {
  const plans = usePlans();

  return (
    <Panel
      title="회차 진행"
      flush
      actions={
        <Link href="/admin2/rounds" className="a2-btn a2-btn-sm">
          전체
        </Link>
      }
    >
      <TableBox>
        <table className="a2-table">
          <thead>
            <tr>
              <th scope="col" className="a2-th-num" style={{ width: "3rem" }}>
                No
              </th>
              <th scope="col" style={{ width: "10rem" }}>
                회차
              </th>
              <th scope="col" style={{ width: "5rem" }}>
                상태
              </th>
              <th scope="col" className="a2-th-num" style={{ width: "4.5rem" }}>
                대상
              </th>
              <th scope="col" style={{ width: "8rem" }}>
                제출
              </th>
              <th scope="col" style={{ width: "8rem" }}>
                판정
              </th>
              <th scope="col" style={{ width: "8rem" }}>
                발행
              </th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, i) => {
              const st = planOf(plans, r.id).state;
              return (
                <tr key={r.id}>
                  <td className="a2-td-num a2-nowrap a2-t-sm text-(--a2-ink-3)">{rounds.length - i}</td>
                  <td className="a2-td-key a2-nowrap">
                    <Link href={`/admin2/rounds/${r.id}`} className="hover:text-(--a2-accent) hover:underline">
                      {r.label}
                    </Link>
                  </td>
                  <td className="a2-nowrap">
                    <Status tone={roundTone[st]}>{roundStates[st].label}</Status>
                  </td>
                  <td className="a2-td-num">{r.target ? n(r.target) : "—"}</td>
                  <td className="a2-nowrap">
                    {r.target ? <Bar value={r.submitted} total={r.target} /> : <span className="text-(--a2-ink-4)">—</span>}
                  </td>
                  <td className="a2-nowrap">
                    {r.submitted ? (
                      <Bar value={r.graded} total={r.submitted} />
                    ) : (
                      <span className="text-(--a2-ink-4)">—</span>
                    )}
                  </td>
                  <td className="a2-nowrap">
                    {r.submitted ? (
                      <Bar value={r.published} total={r.submitted} />
                    ) : (
                      <span className="text-(--a2-ink-4)">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableBox>
    </Panel>
  );
}
